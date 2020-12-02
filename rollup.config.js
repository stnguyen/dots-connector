import {terser} from 'rollup-plugin-terser';

export default {
  input: 'lib/index.js',
  output: [
    {
      file: 'umd/dots-connector.js',
      format: 'umd',
      name: 'triangulate',
    },
    {
      file: 'umd/dots-connector.min.js',
      format: 'umd',
      name: 'triangulate',
      plugins: [terser()]
    }
  ]
};