"use strict";
function triangulate(points) {
    return pipe([addNoise, sortByX, flatten, expand])(points);
}
function addNoise(points) {
    points.forEach(function (p) {
        p[0] += Math.random() / 1000000;
        p[1] += Math.random() / 1000000;
    });
    return points;
}
/**
 * Sort points by x so we can do a left-to-right scan later
 * @param points a 2D array of points, where each point is an array of 2 numbers
 */
function sortByX(points) {
    return points.sort(function (a, b) { return a[0] - b[0]; });
}
/**
 * Flatten into a typed array
 * @param points a 1D array of point coordinate numbers
 */
function flatten(points) {
    var result = new Float64Array(points.length * 2);
    points.forEach(function (point, idx) {
        result[idx * 2] = point[0];
        result[idx * 2 + 1] = point[1];
    });
    return result;
}
function expand(points) {
    // console.log(`points: ${ points }`);
    var maxTriangles = Math.max(2 * points.length / 2 - 5, 0);
    var triangles = new Uint32Array(maxTriangles * 3);
    var triangleNeighbors = new Uint32Array(maxTriangles * 3);
    triangleNeighbors.fill(maxTriangles + 1);
    var numTriangles = 0;
    var rootHullEdge;
    // Add first 3 points
    var is3rdPointOnRightSide = isOnRightSide(points, 0, 1, 2);
    if (is3rdPointOnRightSide) {
        // p1p0p2
        triangles[0] = 1;
        triangles[1] = 0;
        triangles[2] = 2;
        rootHullEdge = HullEdge.fromTriangle(1, 0, 2, 0);
    }
    else {
        // p0p1p2
        triangles[0] = 0;
        triangles[1] = 1;
        triangles[2] = 2;
        rootHullEdge = HullEdge.fromTriangle(0, 1, 2, 0);
    }
    numTriangles++;
    // Expand 4th point
    for (var i = 3; i < points.length / 2; i++) {
        var hullEdge = rootHullEdge;
        while (hullEdge) {
            // console.log(`hullEdge: ${ hullEdge.from },${ hullEdge.to }`);
            var prevEdge = hullEdge.prev;
            var nextEdge = hullEdge.next;
            // prevEdge && // console.log(`  - prevEdge: ${ prevEdge.from },${ prevEdge.to }`);
            // nextEdge && // console.log(`  - nextEdge: ${ nextEdge.from },${ nextEdge.to }`);
            if (isOnRightSide(points, hullEdge.from, hullEdge.to, i)) {
                // NEW TRIANGLE!!!
                triangles[numTriangles * 3 + 0] = hullEdge.to;
                triangles[numTriangles * 3 + 1] = hullEdge.from;
                triangles[numTriangles * 3 + 2] = i;
                var a = triangles[hullEdge.triangle * 3 + 0];
                var b = triangles[hullEdge.triangle * 3 + 1];
                var idx = a === hullEdge.to
                    ? 1
                    : b === hullEdge.to
                        ? 2
                        : 0;
                triangleNeighbors[hullEdge.triangle * 3 + idx] = numTriangles;
                triangleNeighbors[numTriangles * 3 + 2] = hullEdge.triangle;
                // Remove hullEdge from the linked list
                prevEdge && (prevEdge.next = nextEdge);
                nextEdge && (nextEdge.prev = prevEdge);
                var newUpperEdge = new HullEdge(i, hullEdge.to, numTriangles, nextEdge);
                var newLowerEdge = new HullEdge(hullEdge.from, i, numTriangles, newUpperEdge, prevEdge);
                // console.log(`  - newUpperEdge: ${ newUpperEdge.from },${ newUpperEdge.to }`);
                // console.log(`  - newLowerEdge: ${ newLowerEdge.from },${ newLowerEdge.to }`);
                // INCREASE NUM TRIANGLES
                numTriangles++;
                // Check if lower edge is equal to reverse of prevEdge
                if (prevEdge && prevEdge.from === i) {
                    // Equal to reverse of prevEdge, then remove prevEdge
                    triangleNeighbors[prevEdge.triangle * 3 + 1] = numTriangles - 1;
                    triangleNeighbors[(numTriangles - 1) * 3 + 0] = prevEdge.triangle;
                    if (prevEdge.prev) {
                        prevEdge.prev.next = newUpperEdge;
                    }
                    else {
                        // prevEdge.prev is null so prevEdge must be the root
                        rootHullEdge = newUpperEdge;
                    }
                    newUpperEdge.prev = prevEdge.prev;
                    newLowerEdge = undefined;
                }
                else {
                    // Add new lower edge into the linked list
                    if (prevEdge) {
                        prevEdge.next = newLowerEdge;
                    }
                    else {
                        rootHullEdge = newLowerEdge;
                    }
                    newUpperEdge.prev = newLowerEdge;
                }
                // Check if upper edge is equal to reverse of next/root edge
                var nextOrRoot = nextEdge || rootHullEdge;
                if (nextOrRoot.from === newUpperEdge.to && nextOrRoot.to === newUpperEdge.from) {
                    // Equal to reverse of next/root edge, then remove next/rootEdge
                    triangleNeighbors[(numTriangles - 1) * 3 + 1] = nextOrRoot.triangle;
                    triangleNeighbors[nextOrRoot.triangle * 3 + 0] = numTriangles - 1;
                    if (nextOrRoot === rootHullEdge) {
                        rootHullEdge = rootHullEdge.next;
                        rootHullEdge.prev = undefined;
                        newUpperEdge.prev.next = undefined;
                    }
                    else {
                        nextOrRoot.next.prev = newUpperEdge.prev;
                        newUpperEdge.prev.next = nextOrRoot.next;
                    }
                    newUpperEdge = undefined;
                }
                else {
                    // Add new upper edge into the linked list
                    nextEdge && (nextEdge.prev = newUpperEdge);
                }
                // Clean up
                hullEdge.next = undefined;
                hullEdge.prev = undefined;
                legalize(points, triangles, triangleNeighbors, rootHullEdge, maxTriangles, numTriangles - 1);
                // console.log(`  - hull: ${ rootHullEdge }\n    triangles : ${ triangles }\n    trianglesN: ${ triangleNeighbors }`);
            }
            hullEdge = nextEdge;
            // console.log(`-> hull: ${ rootHullEdge }`);
        }
        // console.log(`Added point ${ i }\n  triangles : ${ triangles }\n  trianglesN: ${ triangleNeighbors }\n---`);
    }
    // console.log(`DONE!! -> triangle: ${ triangles.subarray(0, numTriangles * 3) }`);
    return { triangles: triangles.subarray(0, numTriangles * 3), points: points };
}
var needCheckTriangles = new Uint32Array(512);
var tempCheckNeighbours = new Uint32Array(3);
function legalize(points, triangles, triangleNeighbors, rootHullEdge, maxTriangles, triangle) {
    var checkTrianglePairIndex = 0;
    var numCheckTriangles = 1;
    needCheckTriangles[0] = triangle;
    while (checkTrianglePairIndex < numCheckTriangles) {
        var checkingTriangle = needCheckTriangles[checkTrianglePairIndex];
        // console.log(`  - Check triangle ${ checkingTriangle } with its neighbours...`);
        tempCheckNeighbours[0] = triangleNeighbors[checkingTriangle * 3 + 0];
        tempCheckNeighbours[1] = triangleNeighbors[checkingTriangle * 3 + 1];
        tempCheckNeighbours[2] = triangleNeighbors[checkingTriangle * 3 + 2];
        for (var i = 0; i < 3; i++) {
            var oldTriangle = tempCheckNeighbours[i];
            var a = triangles[oldTriangle * 3 + 0];
            var b = triangles[oldTriangle * 3 + 1];
            var c = triangles[oldTriangle * 3 + 2];
            if (oldTriangle > maxTriangles) {
                continue;
            }
            var p = i === 0
                ? triangles[checkingTriangle * 3 + 0]
                : i === 1
                    ? triangles[checkingTriangle * 3 + 1]
                    : triangles[checkingTriangle * 3 + 2];
            var oldToBottom = triangles[checkingTriangle * 3 + 0] > triangles[checkingTriangle * 3 + 1];
            // console.log(`    -> Check neighbor triangles: new (${triangles[checkingTriangle * 3 + 0]},${triangles[checkingTriangle * 3 + 1]},${triangles[checkingTriangle * 3 + 2]}) vs old (${a},${b},${c}) to handle new point ${p} with oldToBottom ${oldToBottom}`);
            if (oldToBottom ? inCircle(points, a, b, c, p) : inCircle(points, b, c, a, p)) {
                // console.log(`     ⟳ Need to flip edge between new ${ checkingTriangle } and old ${ oldTriangle }`);
                triangles[oldTriangle * 3 + 2] = p; // abc -> abi
                var tr = triangleNeighbors[checkingTriangle * 3 + 1];
                var br = triangleNeighbors[checkingTriangle * 3 + 0];
                var tl = oldToBottom
                    ? triangleNeighbors[oldTriangle * 3 + 1]
                    : triangleNeighbors[oldTriangle * 3 + 2];
                var bl = oldToBottom
                    ? triangleNeighbors[oldTriangle * 3 + 2]
                    : triangleNeighbors[oldTriangle * 3 + 0];
                if (oldToBottom) {
                    triangles[checkingTriangle * 3 + 1] = a; // cbi -> cai
                    for (var idx = 0; idx < 3; idx++) {
                        if (triangleNeighbors[tl * 3 + idx] === oldTriangle) {
                            triangleNeighbors[tl * 3 + idx] = checkingTriangle;
                            break;
                        }
                    }
                    for (var idx = 0; idx < 3; idx++) {
                        if (triangleNeighbors[br * 3 + idx] === checkingTriangle) {
                            triangleNeighbors[br * 3 + idx] = oldTriangle;
                            break;
                        }
                    }
                    triangleNeighbors[oldTriangle * 3 + 0] = br;
                    triangleNeighbors[oldTriangle * 3 + 1] = checkingTriangle;
                    triangleNeighbors[oldTriangle * 3 + 2] = bl;
                    triangleNeighbors[checkingTriangle * 3 + 0] = oldTriangle;
                    triangleNeighbors[checkingTriangle * 3 + 1] = tr;
                    triangleNeighbors[checkingTriangle * 3 + 2] = tl;
                }
                else {
                    triangles[checkingTriangle * 3 + 0] = b; // aci -> bci
                    for (var idx = 0; idx < 3; idx++) {
                        if (triangleNeighbors[bl * 3 + idx] === oldTriangle) {
                            triangleNeighbors[bl * 3 + idx] = checkingTriangle;
                            break;
                        }
                    }
                    for (var idx = 0; idx < 3; idx++) {
                        if (triangleNeighbors[tr * 3 + idx] === checkingTriangle) {
                            triangleNeighbors[tr * 3 + idx] = oldTriangle;
                            break;
                        }
                    }
                    triangleNeighbors[oldTriangle * 3 + 0] = checkingTriangle;
                    triangleNeighbors[oldTriangle * 3 + 1] = tr;
                    triangleNeighbors[oldTriangle * 3 + 2] = tl;
                    triangleNeighbors[checkingTriangle * 3 + 0] = br;
                    triangleNeighbors[checkingTriangle * 3 + 1] = oldTriangle;
                    triangleNeighbors[checkingTriangle * 3 + 2] = bl;
                }
                // Correct hullEdge.triangle fields
                var correctingHullEdge = rootHullEdge;
                var numCorrected = 0;
                while (correctingHullEdge) {
                    if (correctingHullEdge.triangle === oldTriangle) {
                        if (oldToBottom && correctingHullEdge.from === c) {
                            correctingHullEdge.triangle = checkingTriangle;
                            numCorrected++;
                        }
                        else if (!oldToBottom && correctingHullEdge.from === b) {
                            correctingHullEdge.triangle = checkingTriangle;
                            numCorrected++;
                        }
                    }
                    else if (correctingHullEdge.triangle === checkingTriangle) {
                        if (oldToBottom && correctingHullEdge.from === b) {
                            correctingHullEdge.triangle = oldTriangle;
                            numCorrected++;
                        }
                        else if (!oldToBottom && correctingHullEdge.from === p) {
                            correctingHullEdge.triangle = oldTriangle;
                            numCorrected++;
                        }
                    }
                    if (numCorrected === 2) {
                        break;
                    }
                    correctingHullEdge = correctingHullEdge.next;
                }
                // console.log(`      after flipped:\n       triangles : ${ triangles }\n       trianglesN: ${ triangleNeighbors }`);
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
function orientIfSure(px, py, rx, ry, qx, qy) {
    var l = (ry - py) * (qx - px);
    var r = (rx - px) * (qy - py);
    return Math.abs(l - r) >= 3.3306690738754716e-16 * Math.abs(l + r) ? l - r : 0;
}
// a more robust orientation test that's stable in a given triangle (to fix robustness issues)
function isOnRightSide(points, p0, p1, p2) {
    var x0 = points[p0 * 2];
    var y0 = points[p0 * 2 + 1];
    var x1 = points[p1 * 2];
    var y1 = points[p1 * 2 + 1];
    var x2 = points[p2 * 2];
    var y2 = points[p2 * 2 + 1];
    return (orientIfSure(x0, y0, x1, y1, x2, y2) ||
        orientIfSure(x1, y1, x2, y2, x0, y0) ||
        orientIfSure(x2, y2, x0, y0, x1, y1)) < 0;
}
function inCircle(points, a, b, c, p) {
    var ax = points[a * 2];
    var ay = points[a * 2 + 1];
    var bx = points[b * 2];
    var by = points[b * 2 + 1];
    var cx = points[c * 2];
    var cy = points[c * 2 + 1];
    var px = points[p * 2];
    var py = points[p * 2 + 1];
    var dx = ax - px;
    var dy = ay - py;
    var ex = bx - px;
    var ey = by - py;
    var fx = cx - px;
    var fy = cy - py;
    var ap = dx * dx + dy * dy;
    var bp = ex * ex + ey * ey;
    var cp = fx * fx + fy * fy;
    return dx * (ey * cp - bp * fy) -
        dy * (ex * cp - bp * fx) +
        ap * (ex * fy - ey * fx) < 0;
}
/**
 * Pipe functions to be executed from left to right
 * @param funcs an array of functions
 */
function pipe(funcs) {
    return function (input) { return funcs.reduce(function (result, currentFunc) { return currentFunc(result); }, input); };
}
var HullEdge = /** @class */ (function () {
    function HullEdge(
    // From point index
    from, 
    // To point index
    to, triangle, 
    // Pointer to next hull edge 
    next, prev) {
        this.from = from;
        this.to = to;
        this.triangle = triangle;
        this.next = next;
        this.prev = prev;
    }
    HullEdge.fromTriangle = function (p0, p1, p2, triangle) {
        var e1 = new HullEdge(p0, p1, triangle);
        var e2 = new HullEdge(p1, p2, triangle);
        var e3 = new HullEdge(p2, p0, triangle);
        e1.next = e2;
        e2.prev = e1;
        e2.next = e3;
        e3.prev = e2;
        return e1;
    };
    HullEdge.prototype.toString = function () {
        var _a, _b;
        if (this.next && this.next.prev !== this) {
            throw new Error("I'm (" + this.from + "," + this.to + "). My next is (" + this.next.from + "," + this.next.to + "), but my next's prev is (" + ((_a = this.next.prev) === null || _a === void 0 ? void 0 : _a.from) + "," + ((_b = this.next.prev) === null || _b === void 0 ? void 0 : _b.to) + ")");
        }
        return "(" + this.from + "," + this.to + ",trig " + this.triangle + ")->" + (this.next || '🛑');
    };
    return HullEdge;
}());
