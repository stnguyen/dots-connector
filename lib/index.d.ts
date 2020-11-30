declare function triangulate(points: number[][]): {
    triangles: Uint32Array;
    points: Float64Array;
};
declare function addNoise(points: number[][]): number[][];
/**
 * Sort points by x so we can do a left-to-right scan later
 * @param points a 2D array of points, where each point is an array of 2 numbers
 */
declare function sortByX(points: number[][]): number[][];
/**
 * Flatten into a typed array
 * @param points a 1D array of point coordinate numbers
 */
declare function flatten(points: number[][]): Float64Array;
declare function expand(points: Float64Array): {
    triangles: Uint32Array;
    points: Float64Array;
};
declare const needCheckTriangles: Uint32Array;
declare const tempCheckNeighbours: Uint32Array;
declare function legalize(points: Float64Array, triangles: Uint32Array, triangleNeighbors: Uint32Array, rootHullEdge: HullEdge, maxTriangles: number, triangle: number): void;
declare function orientIfSure(px: number, py: number, rx: number, ry: number, qx: number, qy: number): number;
declare function isOnRightSide(points: Float64Array, p0: number, p1: number, p2: number): boolean;
declare function inCircle(points: Float64Array, a: number, b: number, c: number, p: number): boolean;
/**
 * Pipe functions to be executed from left to right
 * @param funcs an array of functions
 */
declare function pipe(funcs: Function[]): (input: any) => any;
declare class HullEdge {
    from: number;
    to: number;
    triangle: number;
    next?: HullEdge | undefined;
    prev?: HullEdge | undefined;
    static fromTriangle(p0: number, p1: number, p2: number, triangle: number): HullEdge;
    constructor(from: number, to: number, triangle: number, next?: HullEdge | undefined, prev?: HullEdge | undefined);
    toString(): string;
}
