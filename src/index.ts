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

function expand (points: Float32Array): Float32Array {
  return points;
}

/**
 * Pipe functions to be executed from left to right
 * @param funcs an array of functions
 */
function pipe (funcs: Function[]) {
  return (input: any) => funcs.reduce((result, currentFunc) => currentFunc(result), input)
}