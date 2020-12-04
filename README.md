Dots Connector
===

A 2D [Delaunay Triangulation](https://en.wikipedia.org/wiki/Delaunay_triangulation) TypeScript library.
It works in modern browser and NodeJS environments.

- [Interactive Demo](https://stnguyen.github.io/dots-connector/)
- This library is an implementation of [A simple sweep-line Delaunay triangulation algorithm, 2013, Liu Yonghe, Feng Jinming and Shao Yuehong](http://www.academicpub.org/jao/paperInfo.aspx?paperid=15630) paper.

This library is still a **work in progress**. If you need a fast, feature-rich library, use [delaunator](https://github.com/mapbox/delaunator) instead.

## Example

```js
const originalPoints = [[0,0],[1,-2],[2,-0.5],...];

const { points, triangles } = triangulate(originalPoints);
console.log(delaunay.triangles);
// [0,1,2,...]
```

It returns an array of points because the algorithm requires adding small random noise to the original points, and also sort the points horizontally from left to right.

## Install

Install with NPM (`npm install dots-connector`) then:

```js
import triangulate from 'dots-connector'
```

Or use a browser build directly:

```html
<script src="https://unpkg.com/dots-connector/umd/dots-connector.min.js"></script> <!-- minified build -->
<script src="https://unpkg.com/dots-connector/umd/dots-connector.js"></script> <!-- dev build -->
```

## Bench

Results of running [delaunator](https://github.com/mapbox/delaunator/blob/master/bench.js) bench script on Macbook Pro 16" 2019, Node v10.18.1

|| uniform 100k | gauss 100k | grid 100k | degen 100k | uniform 1million | gauss 1million | grid 1million | degen 1million
:-- | --: | --: | --: | --: | --: | --: | --: | --:
dots-connector | 384ms | 427ms | 1010ms | failed | 5553ms | 5540ms | 11558ms | failed
[delaunator](https://github.com/mapbox/delaunator) | 73ms | 61ms | 86ms | 31ms | 1046ms | 1118ms | 945ms | 428ms