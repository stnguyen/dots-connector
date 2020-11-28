function triangulate (points: number[][]): { triangles: Uint32Array, points: Float32Array } {
  return pipe([ sortByX, flattenWithNoise, expand ])(points);
}

/**
 * Sort points by x so we can do a left-to-right scan later
 * @param points an array of points, where each point is an array of 2 numbers
 */
function sortByX (points: number[][]): number[][] {
  return points.sort((a: number[], b: number[]) => a[0] - b[0]);
}

/**
 * Flatten into a typed array. Also add small random noise to avoid collinear point issue
 * @param points an array of points, where each point is an array of 2 numbers
 */
function flattenWithNoise (points: number[][]): Float32Array {
  const result = new Float32Array(points.length * 2);
  points.forEach((point, idx) => {
    result[idx * 2]     = point[0] + Math.random() / 1_000_000_000;
    result[idx * 2 + 1] = point[1] + Math.random() / 1_000_000_000;
  });
  return result;
} 

function expand (points: Float32Array): { triangles: Uint32Array, points: Float32Array } {
  // console.log(`points: ${ points }`);
  const maxTriangles = Math.max(2 * points.length/2 - 5, 0);
  const triangles = new Uint32Array(maxTriangles * 3);
  const neighborTriangles = new Int32Array(3);
  neighborTriangles.fill(-1);
  let numTriangles = 0;
  let rootHullEdge: HullEdge;

  // Add first 3 points
  const is3rdPointOnRightSide = isP2OnRightSide(points, 0, 1, 2);
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
  // console.log(`triangle: ${ triangles }, hull: ${ rootHullEdge }`);

  // Expand 4th point
  for (let i = 3; i < points.length / 2; i++) {
    let hullEdge: HullEdge | undefined = rootHullEdge;
    while (hullEdge) {
      // console.log(`hullEdge: ${ hullEdge.from },${ hullEdge.to }`);
      const prevEdge: HullEdge | undefined = hullEdge.prev;
      const nextEdge: HullEdge | undefined = hullEdge.next;
      // prevEdge && console.log(`  - prevEdge: ${ prevEdge.from },${ prevEdge.to }`);
      // nextEdge && console.log(`  - nextEdge: ${ nextEdge.from },${ nextEdge.to }`);
      if (isP2OnRightSide(points, hullEdge.from, hullEdge.to, i)) {
        // Form new triangle
        triangles[numTriangles * 3 + 0] = hullEdge.to;
        triangles[numTriangles * 3 + 1] = hullEdge.from;
        triangles[numTriangles * 3 + 2] = i;

        neighborTriangles.fill(-1);
        neighborTriangles[0] = hullEdge.triangle;

        // Remove hullEdge from the linked list
        prevEdge && (prevEdge.next = nextEdge);
        nextEdge && (nextEdge.prev = prevEdge);

        let newUpperEdge: HullEdge | undefined = new HullEdge(i, hullEdge.to, numTriangles, nextEdge);
        let newLowerEdge: HullEdge | undefined = new HullEdge(hullEdge.from, i, numTriangles, newUpperEdge, prevEdge);
        // console.log(`  - newUpperEdge: ${ newUpperEdge.from },${ newUpperEdge.to }`);
        // console.log(`  - newLowerEdge: ${ newLowerEdge.from },${ newLowerEdge.to }`);

        numTriangles++;

        // Check if lower edge is equal to reverse of prevEdge
        if (prevEdge && prevEdge.from === i) {
          // Equal to reverse of prevEdge, then remove prevEdge
          neighborTriangles[1] = prevEdge.triangle;
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
          neighborTriangles[1] = nextOrRoot.triangle;
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

        // console.log(`  - Neighbor triangles: ${ neighborTriangles.filter((t) => t >= 0).join(', ') }`);
        for (let j = 0; j < neighborTriangles.length; j++) {
          const trigIdx = neighborTriangles[j];
          if (trigIdx < 0) {
            break;
          }

          const a = triangles[trigIdx * 3 + 0];
          const b = triangles[trigIdx * 3 + 1];
          const c = triangles[trigIdx * 3 + 2];
          if (inCircle(points, a, b, c, i)) {
            // console.log(`  ⟳ Need to flip edge between ${ numTriangles - 1 } and ${ trigIdx }`);
            // console.log(`     before: hull: ${ rootHullEdge }, triangles: ${ triangles }`);
            const leftToBottom = hullEdge.to > hullEdge.from;
            triangles[trigIdx * 3 + 2] = i; // abc -> abi
            if (leftToBottom) {
              triangles[(numTriangles - 1) * 3 + 1] = a; // cbi -> cai
            } else {
              triangles[(numTriangles - 1) * 3 + 0] = b; // aci -> bci
            }

            let correctingHullEdge: HullEdge | undefined = rootHullEdge;
            let numCorrected = 0;
            while (correctingHullEdge) {
              if (correctingHullEdge.triangle === trigIdx) {
                if (leftToBottom && correctingHullEdge.from === c) {
                  correctingHullEdge.triangle = numTriangles - 1;
                  numCorrected++;
                } else if (!leftToBottom && correctingHullEdge.from === b) {
                  correctingHullEdge.triangle = numTriangles - 1;
                  numCorrected++;
                }
              }
              else if (correctingHullEdge.triangle === numTriangles - 1) {
                if (leftToBottom && correctingHullEdge.from === b) {
                  correctingHullEdge.triangle = trigIdx;
                  numCorrected++;
                } else if (!leftToBottom && correctingHullEdge.from === i) {
                  correctingHullEdge.triangle = trigIdx
                  numCorrected++;
                }
              }

              if (numCorrected === 2) {
                break;
              }
              correctingHullEdge = correctingHullEdge.next;
            }

            // console.log(`   after flipped, triangle: ${ triangles }`);
          }
        }
      }

      hullEdge = nextEdge;
      // console.log(`-> hull: ${ rootHullEdge }`);
    }
    // console.log(`Added point ${ i } -> triangle: ${ triangles }\n---`);
  }

  // console.log(`DONE!! -> triangle: ${ triangles.subarray(0, numTriangles * 3) }`);
  return { triangles: triangles.subarray(0, numTriangles * 3), points: points };
}

function isP2OnRightSide(points: Float32Array, p0: number, p1: number, p2: number): boolean {
  const x0 = points[p0 * 2];
  const y0 = points[p0 * 2 + 1];
  const x1 = points[p1 * 2];
  const y1 = points[p1 * 2 + 1];
  const x2 = points[p2 * 2];
  const y2 = points[p2 * 2 + 1];
  return (x2-x0)*(y1-y0)-(x1-x0)*(y2-y0) < 0;
}

function inCircle(points: Float32Array, a: number, b: number, c: number, p: number): boolean {
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