function triangulate (points: number[][]): { triangles: Uint32Array, points: Float64Array } {
  return pipe([ addNoise, sortByX, flatten, expand ])(points);
}

function addNoise (points: number[][]): number[][] {
  points.forEach((p) => {
    p[0] += Math.random() / 1_000_000;
    p[1] += Math.random() / 1_000_000;
  });
  return points;
}

/**
 * Sort points by x so we can do a left-to-right scan later
 * @param points a 2D array of points, where each point is an array of 2 numbers
 */
function sortByX (points: number[][]): number[][] {
  return points.sort((a: number[], b: number[]) => a[0] - b[0]);
}

/**
 * Flatten into a typed array
 * @param points a 1D array of point coordinate numbers
 */
function flatten (points: number[][]): Float64Array {
  const result = new Float64Array(points.length * 2);
  points.forEach((point, idx) => {
    result[idx * 2]     = point[0];
    result[idx * 2 + 1] = point[1];
  });
  return result;
} 

function expand (points: Float64Array): { triangles: Uint32Array, points: Float64Array } {
  console.log(`points: ${ points }`);
  const maxTriangles = Math.max(2 * points.length/2 - 5, 0);
  const triangles = new Uint32Array(maxTriangles * 3);
  const triangleNeighbors = new Uint32Array(maxTriangles * 3);
  triangleNeighbors.fill(maxTriangles + 1);

  let numTriangles = 0;
  let rootHullEdge: HullEdge;

  // Add first 3 points
  const is3rdPointOnRightSide = isOnRightSide(points, 0, 1, 2);
  if (is3rdPointOnRightSide) {
    // p1p0p2
    triangles[0] = 1;
    triangles[1] = 0;
    triangles[2] = 2;
    rootHullEdge = HullEdge.fromTriangle(1, 0, 2, 0);
  } else {
    // p0p1p2
    triangles[0] = 0;
    triangles[1] = 1;
    triangles[2] = 2;
    rootHullEdge = HullEdge.fromTriangle(0, 1, 2, 0);
  }
  numTriangles++;

  // Expand 4th point
  for (let i = 3; i < points.length / 2; i++) {
    let hullEdge: HullEdge | undefined = rootHullEdge;
    while (hullEdge) {
      console.log(`hullEdge: ${ hullEdge.from },${ hullEdge.to }`);
      const prevEdge: HullEdge | undefined = hullEdge.prev;
      const nextEdge: HullEdge | undefined = hullEdge.next;
      // prevEdge && console.log(`  - prevEdge: ${ prevEdge.from },${ prevEdge.to }`);
      // nextEdge && console.log(`  - nextEdge: ${ nextEdge.from },${ nextEdge.to }`);
      if (isOnRightSide(points, hullEdge.from, hullEdge.to, i)) {
        // NEW TRIANGLE!!!
        triangles[numTriangles * 3 + 0] = hullEdge.to;
        triangles[numTriangles * 3 + 1] = hullEdge.from;
        triangles[numTriangles * 3 + 2] = i;

        const a = triangles[hullEdge.triangle * 3 + 0];
        const b = triangles[hullEdge.triangle * 3 + 1];
        const idx = a === hullEdge.to
          ? 1
          : b === hullEdge.to
            ? 2
            : 0;
        triangleNeighbors[hullEdge.triangle * 3 + idx] = numTriangles;
        triangleNeighbors[numTriangles * 3 + 2] = hullEdge.triangle;

        // Remove hullEdge from the linked list
        prevEdge && (prevEdge.next = nextEdge);
        nextEdge && (nextEdge.prev = prevEdge);

        let newUpperEdge: HullEdge | undefined = new HullEdge(i, hullEdge.to, numTriangles, nextEdge);
        let newLowerEdge: HullEdge | undefined = new HullEdge(hullEdge.from, i, numTriangles, newUpperEdge, prevEdge);
        console.log(`  - newUpperEdge: ${ newUpperEdge.from },${ newUpperEdge.to }`);
        console.log(`  - newLowerEdge: ${ newLowerEdge.from },${ newLowerEdge.to }`);

        // INCREASE NUM TRIANGLES
        numTriangles++;

        // Check if lower edge is equal to reverse of prevEdge
        if (prevEdge && prevEdge.from === i) {
          // Equal to reverse of prevEdge, then remove prevEdge
          triangleNeighbors[prevEdge.triangle * 3 + 1] = numTriangles - 1;
          triangleNeighbors[(numTriangles - 1) * 3 + 0] = prevEdge.triangle;
          if (prevEdge.prev) {
            prevEdge.prev.next = newUpperEdge;
          } else {
            // prevEdge.prev is null so prevEdge must be the root
            rootHullEdge = newUpperEdge;
          }

          newUpperEdge.prev = prevEdge.prev;
          newLowerEdge = undefined;
        } else {
          // Add new lower edge into the linked list
          if (prevEdge) {
            prevEdge.next = newLowerEdge;
          } else {
            rootHullEdge = newLowerEdge;
          }
          newUpperEdge.prev = newLowerEdge;
        }

        // Check if upper edge is equal to reverse of next/root edge
        const nextOrRoot = nextEdge || rootHullEdge;
        if (nextOrRoot.from === newUpperEdge.to && nextOrRoot.to === newUpperEdge.from) {
          // Equal to reverse of next/root edge, then remove next/rootEdge
          triangleNeighbors[(numTriangles - 1) * 3 + 1] = nextOrRoot.triangle;
          triangleNeighbors[nextOrRoot.triangle * 3 + 0] = numTriangles - 1;
          if (nextOrRoot === rootHullEdge) {
            rootHullEdge = rootHullEdge.next!;
            rootHullEdge.prev = undefined;
            newUpperEdge.prev!.next = undefined;
          } else {
            nextOrRoot.next!.prev = newUpperEdge.prev;
            newUpperEdge.prev!.next = nextOrRoot.next!;
          }
          newUpperEdge = undefined;
        } else {
          // Add new upper edge into the linked list
          nextEdge && (nextEdge.prev = newUpperEdge);
        }

        // Clean up
        hullEdge.next = undefined;
        hullEdge.prev = undefined;

        legalize(points, triangles, triangleNeighbors, rootHullEdge, maxTriangles, numTriangles - 1);

        console.log(`  - hull: ${ rootHullEdge }\n    triangles : ${ triangles }\n    trianglesN: ${ triangleNeighbors }`);
      }

      hullEdge = nextEdge;
      console.log(`-> hull: ${ rootHullEdge }`);
    }
    console.log(`Added point ${ i }\n  triangles : ${ triangles }\n  trianglesN: ${ triangleNeighbors }\n---`);
  }

  console.log(`DONE!! -> triangle: ${ triangles.subarray(0, numTriangles * 3) }`);
  return { triangles: triangles.subarray(0, numTriangles * 3), points: points };
}

const needCheckTriangles = new Uint32Array(512);
const tempCheckNeighbours = new Uint32Array(3);
function legalize (points: Float64Array, triangles: Uint32Array, triangleNeighbors: Uint32Array, rootHullEdge: HullEdge, maxTriangles: number, triangle: number) {
  let checkTrianglePairIndex = 0;
  let numCheckTriangles = 1;
  needCheckTriangles[0] = triangle;

  while (checkTrianglePairIndex < numCheckTriangles) {
    const checkingTriangle = needCheckTriangles[checkTrianglePairIndex];
    console.log(`  - Check triangle ${ checkingTriangle } with its neighbours...`);

    tempCheckNeighbours[0] = triangleNeighbors[checkingTriangle * 3 + 0];
    tempCheckNeighbours[1] = triangleNeighbors[checkingTriangle * 3 + 1];
    tempCheckNeighbours[2] = triangleNeighbors[checkingTriangle * 3 + 2];

    for (let i = 0; i < 3; i++) {
      const oldTriangle = tempCheckNeighbours[i];
      const a = triangles[oldTriangle * 3 + 0];
      const b = triangles[oldTriangle * 3 + 1];
      const c = triangles[oldTriangle * 3 + 2];
      if (oldTriangle > maxTriangles) {
        continue;
      }
      const p = i === 0
        ? triangles[checkingTriangle * 3 + 0]
        : i === 1
          ? triangles[checkingTriangle * 3 + 1]
          : triangles[checkingTriangle * 3 + 2];
      const oldToBottom = triangles[checkingTriangle * 3 + 0] > triangles[checkingTriangle * 3 + 1];

      console.log(`    -> Check neighbor triangles: new (${triangles[checkingTriangle * 3 + 0]},${triangles[checkingTriangle * 3 + 1]},${triangles[checkingTriangle * 3 + 2]}) vs old (${a},${b},${c}) to handle new point ${p} with oldToBottom ${oldToBottom}`);
      if (oldToBottom ? inCircle(points, a, b, c, p) : inCircle(points, b, c, a, p)) {
        console.log(`     ⟳ Need to flip edge between new ${ checkingTriangle } and old ${ oldTriangle }`);

        triangles[oldTriangle * 3 + 2] = p; // abc -> abi

        const tr = triangleNeighbors[checkingTriangle * 3 + 1];
        const br = triangleNeighbors[checkingTriangle * 3 + 0];
        const tl = oldToBottom
          ? triangleNeighbors[oldTriangle * 3 + 1]
          : triangleNeighbors[oldTriangle * 3 + 2];
        const bl = oldToBottom
          ? triangleNeighbors[oldTriangle * 3 + 2]
          : triangleNeighbors[oldTriangle * 3 + 0];
        if (oldToBottom) {
          triangles[checkingTriangle * 3 + 1] = a; // cbi -> cai
          triangleNeighbors[oldTriangle * 3 + 0] = br;
          triangleNeighbors[oldTriangle * 3 + 1] = checkingTriangle;
          triangleNeighbors[oldTriangle * 3 + 2] = bl;
          triangleNeighbors[checkingTriangle * 3 + 0] = oldTriangle;
          triangleNeighbors[checkingTriangle * 3 + 1] = tr;
          triangleNeighbors[checkingTriangle * 3 + 2] = tl;
        } else {
          triangles[checkingTriangle * 3 + 0] = b; // aci -> bci
          triangleNeighbors[oldTriangle * 3 + 0] = checkingTriangle;
          triangleNeighbors[oldTriangle * 3 + 1] = tr;
          triangleNeighbors[oldTriangle * 3 + 2] = tl;
          triangleNeighbors[checkingTriangle * 3 + 0] = br;
          triangleNeighbors[checkingTriangle * 3 + 1] = oldTriangle;
          triangleNeighbors[checkingTriangle * 3 + 2] = bl;
        }

        // Correct hullEdge.triangle fields
        let correctingHullEdge: HullEdge | undefined = rootHullEdge;
        let numCorrected = 0;
        while (correctingHullEdge) {
          if (correctingHullEdge.triangle === oldTriangle) {
            if (oldToBottom && correctingHullEdge.from === c) {
              correctingHullEdge.triangle = checkingTriangle;
              numCorrected++;
            } else if (!oldToBottom && correctingHullEdge.from === b) {
              correctingHullEdge.triangle = checkingTriangle;
              numCorrected++;
            }
          }
          else if (correctingHullEdge.triangle === checkingTriangle) {
            if (oldToBottom && correctingHullEdge.from === b) {
              correctingHullEdge.triangle = oldTriangle;
              numCorrected++;
            } else if (!oldToBottom && correctingHullEdge.from === p) {
              correctingHullEdge.triangle = oldTriangle
              numCorrected++;
            }
          }

          if (numCorrected === 2) {
            break;
          }
          correctingHullEdge = correctingHullEdge.next;
        }

        console.log(`      after flipped:\n       triangles : ${ triangles }\n       trianglesN: ${ triangleNeighbors }`);

        // Add these 2 new triangles into check list
        needCheckTriangles[numCheckTriangles++] = checkingTriangle;
        needCheckTriangles[numCheckTriangles++] = oldTriangle;
        break;
      } // for neighbours
    } // if need flip
    checkTrianglePairIndex++;
  } // while loop
}

// return 2d orientation sign if we're confident in it through J. Shewchuk's error bound check
function orientIfSure(px: number, py: number, rx: number, ry: number, qx: number, qy: number) {
  const l = (ry - py) * (qx - px);
  const r = (rx - px) * (qy - py);
  return Math.abs(l - r) >= 3.3306690738754716e-16 * Math.abs(l + r) ? l - r : 0;
}

// a more robust orientation test that's stable in a given triangle (to fix robustness issues)
function isOnRightSide(points: Float64Array, p0: number, p1: number, p2: number): boolean {
  const x0 = points[p0 * 2];
  const y0 = points[p0 * 2 + 1];
  const x1 = points[p1 * 2];
  const y1 = points[p1 * 2 + 1];
  const x2 = points[p2 * 2];
  const y2 = points[p2 * 2 + 1];
  return (
    orientIfSure(x0, y0, x1, y1, x2, y2) ||
    orientIfSure(x1, y1, x2, y2, x0, y0) ||
    orientIfSure(x2, y2, x0, y0, x1, y1)
  ) < 0;
}

function inCircle(points: Float64Array, a: number, b: number, c: number, p: number): boolean {
  const ax = points[a * 2];
  const ay = points[a * 2 + 1];
  const bx = points[b * 2];
  const by = points[b * 2 + 1];
  const cx = points[c * 2];
  const cy = points[c * 2 + 1];
  const px = points[p * 2];
  const py = points[p * 2 + 1];
  const dx = ax - px;
  const dy = ay - py;
  const ex = bx - px;
  const ey = by - py;
  const fx = cx - px;
  const fy = cy - py;

  const ap = dx * dx + dy * dy;
  const bp = ex * ex + ey * ey;
  const cp = fx * fx + fy * fy;

  return dx * (ey * cp - bp * fy) -
         dy * (ex * cp - bp * fx) +
         ap * (ex * fy - ey * fx) < 0;
}

/**
 * Pipe functions to be executed from left to right
 * @param funcs an array of functions
 */
function pipe (funcs: Function[]) {
  return (input: any) => funcs.reduce((result, currentFunc) => currentFunc(result), input)
}

class HullEdge {
  static fromTriangle (p0: number, p1: number, p2: number, triangle: number): HullEdge {
    const e1 = new HullEdge(p0, p1, triangle);
    const e2 = new HullEdge(p1, p2, triangle);
    const e3 = new HullEdge(p2, p0, triangle);
    e1.next = e2;
    e2.prev = e1;
    e2.next = e3;
    e3.prev = e2;
    return e1;
  }

  constructor (
    // From point index
    public from: number,
    // To point index
    public to: number,
    public triangle: number,
    // Pointer to next hull edge 
    public next?: HullEdge,
    public prev?: HullEdge
  ) {}

  toString (): string {
    if (this.next && this.next.prev !== this) {
      throw new Error(`I'm (${ this.from },${ this.to }). My next is (${ this.next.from },${ this.next.to }), but my next's prev is (${ this.next.prev?.from },${ this.next.prev?.to })`);
    }
    return `(${ this.from },${ this.to },trig ${ this.triangle })->${ this.next || '🛑' }`;
  }
}