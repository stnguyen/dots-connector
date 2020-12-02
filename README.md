Dots Connector
===

A fast 2D [Delaunay Triangulation](https://en.wikipedia.org/wiki/Delaunay_triangulation) TypeScript library.
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

It returns a an array of points because the algorithm requires adding small random noise to the original points, and also sort the points horizontally from left to right.

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
