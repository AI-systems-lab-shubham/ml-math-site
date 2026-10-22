import test from "node:test";
import assert from "node:assert/strict";
import {
  average,
  calculateSlope,
  exponentialValue,
  linearValue,
  logarithm,
  percentOf,
  solveLinearSystem,
  sum,
  unitCircle,
} from "../assets/js/foundations-math.mjs";

test("linearValue evaluates a slope and intercept", () => {
  assert.equal(linearValue(3, 2, 4), 14);
});

test("calculateSlope measures rise divided by run", () => {
  assert.equal(calculateSlope(1, 2, 3, 8), 3);
  assert.throws(() => calculateSlope(2, 1, 2, 4), RangeError);
});

test("exponentialValue models growth and decay", () => {
  assert.equal(exponentialValue(5, 2, 3), 40);
  assert.equal(exponentialValue(80, 0.5, 2), 20);
});

test("logarithm counts powers of its base", () => {
  assert.equal(logarithm(2, 8), 3);
  assert.throws(() => logarithm(1, 8), RangeError);
  assert.throws(() => logarithm(2, 0), RangeError);
});

test("sum and average calculate from provided values", () => {
  assert.equal(sum([2, 3, 5]), 10);
  assert.equal(average([2, 3, 5]), 10 / 3);
  assert.throws(() => average([]), RangeError);
});

test("percentOf calculates a percentage of a quantity", () => {
  assert.equal(percentOf(15, 80), 12);
});

test("solveLinearSystem finds the unique intersection", () => {
  assert.deepEqual(solveLinearSystem(1, 1, 4, 1, -1, 0), { x: 2, y: 2 });
  assert.throws(() => solveLinearSystem(1, 1, 4, 2, 2, 8), RangeError);
});

test("unitCircle returns cosine and sine coordinates", () => {
  const point = unitCircle(Math.PI / 2);
  assert.ok(Math.abs(point.cosine) < 1e-12);
  assert.equal(point.sine, 1);
});
