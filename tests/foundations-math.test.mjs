import test from "node:test";
import assert from "node:assert/strict";
import {
  affine, splitTotal, solveTwoEquations, tabulate, slopeBetween,
  linearValue, xIntercept, exponentialValue, growthSequence,
  additionSequence, stepsToReach,
} from "../assets/js/foundations-math.mjs";

test("affine evaluates a·x + b", () => {
  assert.equal(affine(3, 4, 2), 14);
  assert.equal(affine(0, 9, 5), 5);
});

test("splitTotal keeps x + y equal to the total", () => {
  const pts = splitTotal(4, [-1, 0, 1, 4]);
  assert.deepEqual(pts, [
    { x: -1, y: 5 }, { x: 0, y: 4 }, { x: 1, y: 3 }, { x: 4, y: 0 },
  ]);
  for (const p of pts) assert.equal(p.x + p.y, 4);
});

test("solveTwoEquations: unique, parallel and identical cases", () => {
  // x + y = 4 and x - y = 2  ->  (3, 1)
  assert.deepEqual(
    solveTwoEquations({ a: 1, b: 1, c: 4 }, { a: 1, b: -1, c: 2 }),
    { kind: "unique", x: 3, y: 1 },
  );
  assert.deepEqual(
    solveTwoEquations({ a: 1, b: 1, c: 4 }, { a: 2, b: 2, c: 9 }),
    { kind: "none" },
  );
  assert.deepEqual(
    solveTwoEquations({ a: 1, b: 1, c: 4 }, { a: 2, b: 2, c: 8 }),
    { kind: "infinite" },
  );
});

test("tabulate applies a function to each input", () => {
  assert.deepEqual(tabulate((x) => 2 * x + 1, [0, 1, 2]), [
    { x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 5 },
  ]);
});

test("slopeBetween is rise over run, null when vertical", () => {
  assert.equal(slopeBetween({ x: 1, y: 3 }, { x: 3, y: 7 }), 2);
  assert.equal(slopeBetween({ x: 0, y: 5 }, { x: 4, y: 1 }), -1);
  assert.equal(slopeBetween({ x: 2, y: 0 }, { x: 2, y: 9 }), null);
});

test("linearValue and xIntercept", () => {
  assert.equal(linearValue(2, 3, 1), 7);
  assert.equal(xIntercept(2, -6), 3);
  assert.equal(xIntercept(0, 5), null);
});

test("exponential growth and decay", () => {
  assert.equal(exponentialValue(1, 2, 10), 1024);
  assert.equal(exponentialValue(100, 0.5, 3), 12.5);
  assert.deepEqual(growthSequence(1, 2, 4), [1, 2, 4, 8, 16]);
});

test("addition sequence is linear, growth is multiplicative", () => {
  assert.deepEqual(additionSequence(1, 2, 4), [1, 3, 5, 7, 9]);
  // doubling overtakes adding 2 each step after a few steps
  assert.ok(growthSequence(1, 2, 5)[5] > additionSequence(1, 2, 5)[5]);
});

test("stepsToReach counts multiplications", () => {
  assert.equal(stepsToReach(1, 2, 1000), 10);
  assert.equal(stepsToReach(1, 2, 1), 0);
  assert.equal(stepsToReach(1, 1, 5), null);
});

import {
  namedFunctions, lineEndpoints, total, remainingTokens,
} from "../assets/js/foundations-math.mjs";

test("namedFunctions evaluate as labelled", () => {
  assert.equal(namedFunctions.doublePlusOne.fn(3), 7);
  assert.equal(namedFunctions.square.fn(-3), 9);
  assert.equal(namedFunctions.absolute.fn(-3), 3);
});

test("lineEndpoints lie on the line, including vertical", () => {
  const eq = { a: 1, b: 1, c: 4 };
  for (const p of lineEndpoints(eq, -2, 8, -2, 8)) assert.equal(p.x + p.y, 4);
  assert.deepEqual(lineEndpoints({ a: 2, b: 0, c: 6 }, -2, 8, -2, 8), [
    { x: 3, y: -2 }, { x: 3, y: 8 },
  ]);
});

test("total and the LLM illustrations", () => {
  assert.equal(total([0.5, 0.25, 0.125, 0.125]), 1);
  assert.equal(1 - total([0.5, 0.25, 0.125]), 0.125);
  assert.equal(remainingTokens(2048, 1500), 548);
  assert.equal(exponentialValue(1, 37000, 2), 1369000000);
});
