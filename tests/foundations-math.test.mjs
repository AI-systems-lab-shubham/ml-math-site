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

import {
  logSteps, magnitudeAmplitudeRatio, magnitudeEnergyRatio, decibelsFromPowerRatio,
  decibelsFromAmplitudeRatio, powerRatioFromDecibels, amplitudeRatioFromDecibels, pH,
  octavesBetween, bitsToChoose, product, sumOfLogs, perplexityFromNats, natsToBits,
  sigma, sigmaTerms, sigmaRules, dotProduct, totalSurpriseBits, mean, median,
  percentOf, percentChange, cosSinDegrees, forceComponents, positionEncodingPair, entryAt,
} from "../assets/js/foundations-math.mjs";

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

test("logSteps counts multiplications, free of float noise", () => {
  assert.equal(logSteps(2, 8), 3);
  assert.equal(logSteps(10, 1000), 3);
  assert.equal(logSteps(10, 1), 0);
  assert.equal(logSteps(2, 1024), 10);
  close(logSteps(10, 50), 1.69897, 1e-5);
});

test("log of a product is the sum of logs", () => {
  assert.equal(logSteps(10, 100 * 1000), logSteps(10, 100) + logSteps(10, 1000));
  close(logSteps(2, 6 * 7), logSteps(2, 6) + logSteps(2, 7));
});

test("earthquake magnitude: ~10x amplitude but ~31.6x energy per step", () => {
  assert.equal(magnitudeAmplitudeRatio(1), 10);
  close(magnitudeEnergyRatio(1), 31.6227766, 1e-6);
  assert.equal(Math.round(magnitudeEnergyRatio(1)), 32);
  assert.equal(magnitudeAmplitudeRatio(2), 100);
  close(magnitudeEnergyRatio(2), 1000, 1e-9);
});

test("decibels: +10 dB is 10x power, +20 dB is 10x amplitude", () => {
  assert.equal(decibelsFromPowerRatio(10), 10);
  assert.equal(decibelsFromAmplitudeRatio(10), 20);
  close(decibelsFromPowerRatio(2), 3.0103, 1e-4);
  close(powerRatioFromDecibels(10), 10);
  close(amplitudeRatioFromDecibels(20), 10);
  close(powerRatioFromDecibels(20), 100);
  // doubling amplitude quadruples power, so both rules agree
  assert.equal(decibelsFromAmplitudeRatio(2), decibelsFromPowerRatio(4));
});

test("pH, octaves and bits are logs", () => {
  assert.equal(pH(1e-7), 7);
  assert.equal(pH(1e-3), 3);
  assert.equal(octavesBetween(440, 880), 1);
  assert.equal(octavesBetween(110, 880), 3);
  assert.equal(bitsToChoose(8), 3);
  assert.equal(bitsToChoose(1024), 10);
});

test("summing logs avoids underflow that multiplying probabilities hits", () => {
  const probs = Array(400).fill(0.01);
  assert.equal(product(probs), 0);
  close(sumOfLogs(probs), 400 * Math.log(0.01), 1e-9);
  close(sumOfLogs(probs), -1842.0680743952367, 1e-6);
});

test("perplexity is exp of the average surprise in nats", () => {
  close(perplexityFromNats(Math.log(4)), 4);
  close(natsToBits(Math.log(4)), 2);
  close(natsToBits(Math.LN2), 1);
});

test("sigma sums terms and handles an empty range", () => {
  assert.equal(sigma(1, 4, sigmaRules.square.fn), 30);
  assert.deepEqual(sigmaTerms(1, 4, sigmaRules.square.fn).map((t) => t.value), [1, 4, 9, 16]);
  assert.equal(sigma(3, 2, (i) => i), 0);
  assert.equal(sigma(1, 5, sigmaRules.odd.fn), 25);
  for (const n of [1, 5, 10, 100]) assert.equal(sigma(1, n, (i) => i), (n * (n + 1)) / 2);
});

test("dotProduct is a sum of products", () => {
  assert.equal(dotProduct([2, -1, 3], [4, 5, 1]), 6);
  assert.throws(() => dotProduct([1], [1, 2]));
});

test("total surprise of probabilities 1/2, 1/4, 1/8 is 6 bits", () => {
  assert.equal(totalSurpriseBits([0.5, 0.25, 0.125]), 6);
  assert.equal(totalSurpriseBits([0.5, 0.25, 0.125]) / 3, 2);
});

test("mean, median and percentages", () => {
  assert.equal(mean([3, 4, 5, 6, 7]), 5);
  assert.equal(median([3, 4, 5, 6, 7]), 5);
  assert.equal(mean([3, 4, 5, 6, 60]), 15.6);
  assert.equal(median([3, 4, 5, 6, 60]), 5);
  assert.equal(median([1, 2, 3, 10]), 2.5);
  assert.equal(percentOf(15, 60), 25);
  assert.equal(percentChange(80, 100), 25);
  assert.equal(percentChange(100, 80), -20);
  assert.equal(percentChange(2, 3), 50);
});

test("cosine and sine of common angles", () => {
  close(cosSinDegrees(60).cos, 0.5);
  close(cosSinDegrees(30).sin, 0.5);
  assert.deepEqual(cosSinDegrees(90), { cos: 0, sin: 1 });
  assert.deepEqual(cosSinDegrees(180), { cos: -1, sin: 0 });
  assert.deepEqual(cosSinDegrees(-90), { cos: 0, sin: -1 });
  for (const d of [0, 17, 45, 123, 250, 359]) {
    const { cos, sin } = cosSinDegrees(d);
    close(cos * cos + sin * sin, 1);
  }
});

test("force at 60 degrees: half along the ground, 0.866 of it upward", () => {
  const f = forceComponents(50, 60);
  close(f.along, 25);
  close(f.up, 43.30127, 1e-5);
});

test("position encoding at position 0 is sin 0, cos 1", () => {
  assert.deepEqual(positionEncodingPair(0, 0, 512), { sin: 0, cos: 1 });
  const p = positionEncodingPair(1, 0, 512);
  close(p.sin, Math.sin(1));
  close(p.cos, Math.cos(1));
});

test("entryAt is one-based", () => {
  assert.equal(entryAt([4, 7, 1], 3), 1);
  assert.equal(entryAt([4, 7, 1], 1), 4);
  assert.equal(entryAt([4, 7, 1], 4), undefined);
});
