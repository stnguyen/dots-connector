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
  const maxTriangles = Math.max(2 * points.length/2 - 5, 0);
  const triangles = new Uint32Array(maxTriangles * 3);
  let hull: HullEdge;

  // Add first 3 points
  const is3rdPointOnRightSide = isOnRightSide(points[0], points[1], points[2], points[3], points[4], points[5]);
  if (is3rdPointOnRightSide) {
    // p1p0p2
    triangles[0] = 1;
    triangles[1] = 0;
    triangles[2] = 2;
    hull = HullEdge.fromTriangle(1, 0, 2);
  } else {
    // p0p1p2
    triangles[0] = 0;
    triangles[1] = 1;
    triangles[2] = 2;
    hull = HullEdge.fromTriangle(0, 1, 2);
  }

  console.log(`triangle: ${ triangles }, hull: ${ hull }`);

  // Expand 4th point
  return triangles;
}

function isOnRightSide(x0: number, y0: number, x1: number, y1: number, xnew: number, ynew: number) {
  return (xnew-x0)*(y1-y0)-(x1-x0)*(ynew-y0) > 0;
}

/**
 * Pipe functions to be executed from left to right
 * @param funcs an array of functions
 */
function pipe (funcs: Function[]) {
  return (input: any) => funcs.reduce((result, currentFunc) => currentFunc(result), input)
}

class HullEdge {
  constructor (
    // From point index
    private from: number,
    // To point index
    private to: number,
    // Pointer to next hull edge 
    private next?: HullEdge,
    private prev?: HullEdge,
  ) {}

  toString (): string {
    return `(${ this.from },${ this.to })->${ this.next || '🛑' }`;
  }

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
}