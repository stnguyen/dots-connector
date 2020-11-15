export default function triangulate (points: number[][]): number[] {
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
    result[idx * 2]     = point[0] + Math.random() / 100;
    result[idx * 2 + 1] = point[1] + Math.random() / 100;
  });
  return result;
} 

function expand (points: Float32Array): Uint32Array {
  console.log(`points: ${ points }`);
  const maxTriangles = Math.max(2 * points.length/2 - 5, 0);
  const triangles = new Uint32Array(maxTriangles * 3);
  let numTriangles = 0;
  let rootHullEdge: HullEdge | undefined;

  // Add first 3 points
  const is3rdPointOnRightSide = isP2OnRightSide(points, 0, 1, 2);
  if (is3rdPointOnRightSide) {
    // p1p0p2
    triangles[0] = 1;
    triangles[1] = 0;
    triangles[2] = 2;
    rootHullEdge = HullEdge.fromTriangle(1, 0, 2);
  } else {
    // p0p1p2
    triangles[0] = 0;
    triangles[1] = 1;
    triangles[2] = 2;
    rootHullEdge = HullEdge.fromTriangle(0, 1, 2);
  }
  numTriangles++;
  console.log(`triangle: ${ triangles }, hull: ${ rootHullEdge }`);

  // Expand 4th point
  for (let i = 3; i < points.length / 2; i++) {
    console.log(`triangle: ${ triangles }, hull: ${ rootHullEdge }`);
    let hullEdge: HullEdge | undefined = rootHullEdge;
    while (hullEdge) {
      let prevEdge: HullEdge | undefined = hullEdge.prev;
      const nextEdge: HullEdge | undefined = hullEdge.next;
      if (isP2OnRightSide(points, hullEdge.from, hullEdge.to, i)) {
        // Form new triangle
        triangles[numTriangles * 3] = hullEdge.to;
        triangles[numTriangles * 3 + 1] = hullEdge.from;
        triangles[numTriangles * 3 + 2] = i;
        numTriangles++;

        // Remove hullEdge from the linked list
        prevEdge && (prevEdge.next = nextEdge);
        nextEdge && (nextEdge.prev = prevEdge);

        // New lower edge goes from hullEdge.from (which is equal to prevEdge.to) to i
        if (prevEdge && prevEdge.from === i) {
          // if its reverse is equal to prevEdge, then remove prevEdge
          if (prevEdge.prev) {
            prevEdge.prev.next = nextEdge;
            nextEdge && (nextEdge.prev = prevEdge.prev);
          } else if (prevEdge === rootHullEdge) {
            rootHullEdge = nextEdge;
            nextEdge && (nextEdge.prev = undefined);
          }
        } else {
          // Add new lower edge into the linked list
          const newLowerEdge = new HullEdge(hullEdge.from, i, nextEdge, prevEdge);
          prevEdge && (prevEdge.next = newLowerEdge);
          !prevEdge && (rootHullEdge = newLowerEdge);
          nextEdge && (nextEdge.prev = newLowerEdge);
          prevEdge = newLowerEdge;
        }

        // Add new upper edge into the linked list
        const newUpperEdge = new HullEdge(i, hullEdge.to, nextEdge, prevEdge);
        prevEdge && (prevEdge.next = newUpperEdge);
        !prevEdge && (rootHullEdge = newUpperEdge);
        nextEdge && (nextEdge.prev = newUpperEdge);

        // Clean up
        hullEdge.next = undefined;
        hullEdge.prev = undefined;
      }

      hullEdge = nextEdge;
    }
  }

  console.log(`triangle: ${ triangles }, hull: ${ rootHullEdge }`);
  return triangles.subarray(0, numTriangles * 3);
}

function isP2OnRightSide(points: Float32Array, p0: number, p1: number, p2: number): boolean {
  const x0 = points[p0 * 2];
  const y0 = points[p0 * 2 + 1];
  const x1 = points[p1 * 2];
  const y1 = points[p1 * 2 + 1];
  const x2 = points[p2 * 2];
  const y2 = points[p2 * 2 + 1];
  return (x2-x0)*(y1-y0)-(x1-x0)*(y2-y0) > 0;
}

/**
 * Pipe functions to be executed from left to right
 * @param funcs an array of functions
 */
function pipe (funcs: Function[]) {
  return (input: any) => funcs.reduce((result, currentFunc) => currentFunc(result), input)
}

class HullEdge {
  static fromTriangle (p0: number, p1: number, p2: number): HullEdge {
    const e1 = new HullEdge(p0, p1);
    const e2 = new HullEdge(p1, p2);
    const e3 = new HullEdge(p2, p0);
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
    // Pointer to next hull edge 
    public next?: HullEdge,
    public prev?: HullEdge,
  ) {}

  toString (): string {
    return `(${ this.from },${ this.to })->${ this.next || '🛑' }`;
  }
}