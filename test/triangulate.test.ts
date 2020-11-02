import triangulate from '../src/index'
import * as mocha from 'mocha';
import assert = require('assert');
const testCases = require('./test-cases.json');


describe('triangulate', function() {
  testCases.forEach((testCase: { points: number[][], trigs: number[] }, idx: number) => 
    it(`test ${ idx }`, function() {
      assert.deepStrictEqual(triangulate(testCase.points), testCase.trigs);
    })
  );
});