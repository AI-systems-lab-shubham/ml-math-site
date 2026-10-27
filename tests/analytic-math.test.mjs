import test from "node:test";
import assert from "node:assert/strict";
import {
  norm1, norm2, distance, dot, isZero, unit, cosineSimilarity, angleBetween, toDegrees, toRadians, dotFromAngle,
  dotSign, isOrthogonal, work, polar, project, projectionCoefficient, leftover, shadowLength, unitBall,
  seededRandom, drawUnit, simulateDotVariance, exactCoinDotStats, dotVarianceFormula, attentionScale, baseDK,
} from "../assets/js/analytic-math.mjs";

const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} is not within ${tol} of ${b}`);

// A fixed pseudo-random set of vectors, so the "many vectors" tests are repeatable.
function manyVectors(count, dim, seed) {
  const rand = seededRandom(seed);
  return Array.from({ length: count }, () => Array.from({ length: dim }, () => Math.round((rand() * 2 - 1) * 20) / 2));
}

// ---- Norms and distance ----

test("norm2 is Pythagoras: (3, 4) has length 5; norm1 is the grid walk: 7", () => {
  assert.equal(norm2([3, 4]), 5);
  assert.equal(norm1([3, 4]), 7);
  assert.equal(norm1([-3, 4]), 7);
  assert.equal(norm2([1, 2, 2]), 3);
  assert.equal(norm2([0, 0]), 0);
});

test("norms are never negative, are zero only for the zero vector, and scale with |c|", () => {
  for (const v of manyVectors(200, 4, 11)) {
    for (const n of [norm1, norm2]) {
      assert.ok(n(v) >= 0);
      assert.equal(n(v) === 0, isZero(v));
      close(n(v.map((x) => -3 * x)), 3 * n(v), 1e-9);
    }
  }
});

test("the L1 norm is never smaller than the L2 norm, and never more than √n times it", () => {
  for (const v of manyVectors(300, 5, 12)) {
    assert.ok(norm1(v) >= norm2(v) - 1e-12);
    assert.ok(norm1(v) <= Math.sqrt(v.length) * norm2(v) + 1e-9);
  }
});

test("the triangle inequality holds for both norms", () => {
  const vs = manyVectors(120, 3, 13);
  for (let i = 0; i + 1 < vs.length; i += 2) {
    const s = vs[i].map((x, j) => x + vs[i + 1][j]);
    for (const n of [norm1, norm2]) assert.ok(n(s) <= n(vs[i]) + n(vs[i + 1]) + 1e-9);
  }
});

test("distance is the norm of the difference, and is symmetric", () => {
  assert.equal(distance([1, 2], [4, 6]), 5);
  assert.equal(distance([1, 2], [4, 6], 1), 7);
  assert.equal(distance([4, 6], [1, 2]), 5);
  assert.equal(distance([2, 2], [2, 2]), 0);
  for (const [a, b] of [[[1, 2, 3], [4, 6, 3]], [[0, 0], [-3, 4]]]) {
    assert.equal(distance(a, b), norm2(a.map((v, i) => v - b[i])));
    assert.equal(distance(a, b), distance(b, a));
  }
  assert.throws(() => distance([1, 2], [1, 2, 3]), RangeError);
  assert.throws(() => distance([1], [2], 3), RangeError);
});

test("unitBall points all have norm 1 under their own norm", () => {
  for (const p of [1, 2]) for (const pt of unitBall(p, 40)) close((p === 1 ? norm1 : norm2)(pt), 1);
});

// ---- Dot product ----

test("dot multiplies entry by entry and adds; it is symmetric and linear", () => {
  assert.equal(dot([3, 1], [2, 2]), 8);
  assert.equal(dot([1, 2, 3], [4, -5, 6]), 12);
  assert.throws(() => dot([1, 2], [1]), RangeError);
  for (const [a, b] of [[[1, 2], [3, 4]], [[-2, 5, 0], [7, 1, 3]]]) {
    assert.equal(dot(a, b), dot(b, a));
    assert.equal(dot(a.map((v) => 4 * v), b), 4 * dot(a, b));
  }
  assert.equal(dot([3, 4], [3, 4]), norm2([3, 4]) ** 2);
});

test("Σ aᵢbᵢ equals ‖a‖‖b‖cos θ on many vectors, in 2, 3 and 6 dimensions", () => {
  let tested = 0;
  for (const dim of [2, 3, 6]) {
    const vs = manyVectors(400, dim, 20 + dim);
    for (let i = 0; i + 1 < vs.length; i += 2) {
      if (isZero(vs[i]) || isZero(vs[i + 1])) continue;
      const lhs = dot(vs[i], vs[i + 1]);
      const rhs = norm2(vs[i]) * norm2(vs[i + 1]) * Math.cos(angleBetween(vs[i], vs[i + 1]));
      close(lhs, rhs, 1e-8);
      close(dotFromAngle(vs[i], vs[i + 1]), lhs, 1e-8);
      tested++;
    }
  }
  assert.ok(tested > 500);
});

test("dotFromAngle gives 0 when either vector is the zero vector", () => {
  assert.equal(dotFromAngle([0, 0], [1, 2]), 0);
});

test("the sign of the dot product says same direction, perpendicular or opposite", () => {
  assert.equal(dotSign([1, 0], [2, 1]), "same");
  assert.equal(dotSign([1, 0], [0, 5]), "perpendicular");
  assert.equal(dotSign([1, 0], [-2, 1]), "opposite");
  assert.equal(dotSign([1, 0], [-3, 0]), "opposite");
  assert.equal(dotSign([0, 0], [1, 1]), "perpendicular");
  // sign agrees with the angle: below 90° is positive, above is negative
  for (const deg of [10, 45, 80, 100, 135, 170]) {
    const a = [1, 0], b = polar(2, deg);
    assert.equal(dotSign(a, b), deg < 90 ? "same" : "opposite");
  }
});

test("work is force · displacement: 20 N at 30° over 5 m is 20·5·cos 30° ≈ 86.6 J", () => {
  const force = polar(20, 30), displacement = [5, 0];
  close(work(force, displacement), 20 * 5 * Math.cos(toRadians(30)), 1e-9);
  assert.equal(Math.round(work(force, displacement) * 10) / 10, 86.6);
  assert.equal(work([10, 5], [4, 0]), 40);
  close(work([0, 7], [4, 0]), 0);   // a force at right angles to the motion does no work
});

// ---- Angle and cosine similarity ----

test("angleBetween: parallel is 0°, perpendicular 90°, opposite 180°, and (1,0),(1,1) is 45°", () => {
  close(toDegrees(angleBetween([1, 0], [1, 1])), 45, 1e-9);
  close(toDegrees(angleBetween([1, 0], [0, 3])), 90, 1e-9);
  close(toDegrees(angleBetween([1, 0], [-2, 0])), 180, 1e-9);
  close(toDegrees(angleBetween([2, 0], [5, 0])), 0, 1e-9);
});

test("parallel vectors never make acos fail: the argument is clamped to [−1, 1]", () => {
  // These pairs are parallel (or opposite), but floating point can make the quotient 1.0000000000000002.
  const pairs = [
    [[0.1, 0.2, 0.3], [0.3, 0.6, 0.9]],
    [[0.1, 0.7, 0.3], [0.7, 4.9, 2.1]],
    [[1 / 3, 1 / 7], [1 / 3 * 5, 1 / 7 * 5]],
    [[0.1, 0.2], [-0.1, -0.2]],
    [[3, 4, 12], [3 * 1e8, 4 * 1e8, 12 * 1e8]],
  ];
  for (const [a, b] of pairs) {
    const c = cosineSimilarity(a, b);
    assert.ok(c >= -1 && c <= 1, `cosine ${c} is outside [−1, 1]`);
    const theta = angleBetween(a, b);
    assert.ok(Number.isFinite(theta), "angle must be a number, not NaN");
    assert.ok(Math.abs(theta) < 1e-7 || Math.abs(theta - Math.PI) < 1e-7);
  }
  // a sweep of parallel pairs, so a rounding overshoot would be caught somewhere
  const rand = seededRandom(5);
  for (let i = 0; i < 2000; i++) {
    const a = [rand() * 10 - 5, rand() * 10 - 5, rand() * 10 - 5];
    if (isZero(a)) continue;
    const s = (rand() < 0.5 ? -1 : 1) * (0.1 + rand() * 100);
    const b = a.map((v) => v * s);
    const theta = angleBetween(a, b);
    assert.ok(Number.isFinite(theta));
    assert.ok(cosineSimilarity(a, b) >= -1 && cosineSimilarity(a, b) <= 1);
  }
});

test("cosine similarity lies in [−1, 1] for many vectors", () => {
  for (const dim of [2, 5, 10]) {
    const vs = manyVectors(300, dim, 30 + dim);
    for (let i = 0; i + 1 < vs.length; i += 2) {
      const c = cosineSimilarity(vs[i], vs[i + 1]);
      if (c === null) continue;
      assert.ok(c >= -1 && c <= 1);
    }
  }
});

test("cosine similarity ignores length: scaling by a positive number changes nothing, a negative flips the sign", () => {
  const a = [1, 2], b = [3, -1];
  close(cosineSimilarity(a, b), cosineSimilarity(a.map((v) => 10 * v), b.map((v) => 0.5 * v)));
  close(cosineSimilarity(a, b), -cosineSimilarity(a.map((v) => -3 * v), b));
  close(cosineSimilarity([1, 2], [2, 4]), 1);
  close(cosineSimilarity([1, 2], [-1, -2]), -1);
  close(cosineSimilarity([1, 0], [0, 4]), 0);
});

test("for unit vectors the cosine similarity is the dot product", () => {
  for (const [a, b] of [[[3, 4], [1, 2]], [[1, -2, 2], [4, 0, 3]], [[0.5, 0.5], [-2, 7]]]) {
    close(cosineSimilarity(a, b), dot(unit(a), unit(b)));
    close(norm2(unit(a)), 1);
  }
});

test("the zero vector has no angle: cosine similarity and angle are null, never NaN", () => {
  assert.equal(cosineSimilarity([0, 0], [1, 2]), null);
  assert.equal(cosineSimilarity([1, 2], [0, 0]), null);
  assert.equal(cosineSimilarity([0, 0], [0, 0]), null);
  assert.equal(angleBetween([0, 0, 0], [1, 2, 3]), null);
  assert.throws(() => unit([0, 0]), RangeError);
});

// ---- Orthogonality ----

test("orthogonal means a·b = 0; the zero vector is orthogonal to everything, even itself", () => {
  assert.ok(isOrthogonal([2, 1], [-1, 2]));
  assert.ok(isOrthogonal([1, 0, 0], [0, 5, 7]));
  assert.ok(!isOrthogonal([1, 1], [1, 2]));
  assert.ok(isOrthogonal([0, 0], [3, 4]));
  assert.ok(isOrthogonal([3, 4], [0, 0]));
  assert.ok(isOrthogonal([0, 0], [0, 0]));
  // rotating by 90° gives an orthogonal vector
  for (const v of manyVectors(100, 2, 40)) assert.ok(isOrthogonal(v, [-v[1], v[0]]));
});

test("orthogonal non-zero vectors are at 90°", () => {
  close(toDegrees(angleBetween([2, 1], [-1, 2])), 90, 1e-9);
});

// ---- Projections ----

test("projection of (3, 1) onto (1, 1) is 2·(1, 1) = (2, 2), leftover (1, −1)", () => {
  assert.equal(projectionCoefficient([3, 1], [1, 1]), 2);
  assert.deepEqual(project([3, 1], [1, 1]), [2, 2]);
  assert.deepEqual(leftover([3, 1], [1, 1]), [1, -1]);
  assert.deepEqual(project([3, 4], [2, 0]), [3, 0]);
  assert.deepEqual(leftover([3, 4], [2, 0]), [0, 4]);
});

test("the leftover a − proj is orthogonal to b, on many vectors", () => {
  let tested = 0;
  for (const dim of [2, 3, 7]) {
    const vs = manyVectors(400, dim, 50 + dim);
    for (let i = 0; i + 1 < vs.length; i += 2) {
      const a = vs[i], b = vs[i + 1];
      if (isZero(b)) continue;
      const r = leftover(a, b);
      close(dot(r, b), 0, 1e-8 * Math.max(1, norm2(r) * norm2(b)));
      assert.ok(isOrthogonal(r, b, 1e-9));
      // a = projection + leftover
      const p = project(a, b);
      a.forEach((v, j) => close(p[j] + r[j], v, 1e-9));
      tested++;
    }
  }
  assert.ok(tested > 500);
});

test("projecting twice changes nothing more; the projection is parallel to b", () => {
  for (const [a, b] of [[[3, 1], [1, 1]], [[-2, 5, 1], [4, 0, 3]]]) {
    const p = project(a, b);
    p.forEach((v, i) => close(project(p, b)[i], v, 1e-9));
    close(Math.abs(cosineSimilarity(p, b)), 1, 1e-9);
  }
});

test("the shadow length is (a·b)/‖b‖ and matches ‖a‖cos θ; it is negative when a points against b", () => {
  close(shadowLength([3, 4], [2, 0]), 3);
  close(shadowLength([3, 4], [2, 0]), norm2([3, 4]) * Math.cos(angleBetween([3, 4], [2, 0])), 1e-9);
  close(shadowLength([-3, 4], [2, 0]), -3);
  assert.equal(shadowLength([1, 2], [0, 0]), null);
});

test("projecting onto the zero vector is undefined, not NaN", () => {
  assert.equal(project([1, 2], [0, 0]), null);
  assert.equal(projectionCoefficient([1, 2], [0, 0]), null);
  assert.equal(leftover([1, 2], [0, 0]), null);
});

test("projecting onto a vector is the same as the matrix b bᵀ/(bᵀb) applied to a", () => {
  const b = [1, 2], a = [5, -1];
  const bb = dot(b, b);
  const M = b.map((bi) => b.map((bj) => (bi * bj) / bb));
  const viaMatrix = M.map((row) => dot(row, a));
  project(a, b).forEach((v, i) => close(v, viaMatrix[i], 1e-12));
});

// ---- The variance of a dot product ----

test("seededRandom repeats for the same seed and stays in [0, 1)", () => {
  const r1 = seededRandom(7), r2 = seededRandom(7), r3 = seededRandom(8);
  const a = Array.from({ length: 50 }, r1), b = Array.from({ length: 50 }, r2), c = Array.from({ length: 50 }, r3);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  assert.ok(a.every((x) => x >= 0 && x < 1));
});

test("drawUnit: coins are exactly ±1; normal draws have mean ≈ 0 and variance ≈ 1", () => {
  const rc = seededRandom(1);
  assert.ok(Array.from({ length: 1000 }, () => drawUnit(rc, "coin")).every((x) => x === 1 || x === -1));
  const rn = seededRandom(2);
  const xs = Array.from({ length: 200000 }, () => drawUnit(rn, "normal"));
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  const v = xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1);
  // The mean's standard error is 1/√200000 ≈ 0.0022 and the variance's is √(2/200000) ≈ 0.0032, so 0.02 is about 6 of them.
  assert.ok(Math.abs(m) < 0.02, `mean ${m}`);
  assert.ok(Math.abs(v - 1) < 0.02, `variance ${v}`);
  assert.throws(() => drawUnit(rn, "uniform"), RangeError);
});

test("exact check, no sampling: for ±1 entries the mean of q·k is 0 and its variance is exactly d (d = 1 to 5)", () => {
  for (let d = 1; d <= 5; d++) {
    const s = exactCoinDotStats(d);
    assert.equal(s.mean, 0);
    assert.equal(s.variance, d);
  }
  assert.throws(() => exactCoinDotStats(7), RangeError);
});

// Tolerance for the simulations. With N = 20,000 pairs and d = 64 the sample variance of q·k has standard error
// d·√(2/(N−1)) ≈ 0.64 for normal entries (a little less for coins, whose fourth moment is smaller), i.e. 1% of 64.
// We allow 5% (about five standard errors) so a seeded run cannot fail by bad luck yet a wrong formula
// (for example variance d² = 4096, or √d = 8) fails by a mile. The mean has standard error √(64/20000) ≈ 0.057; we allow 0.3.
const N = 20000;
for (const dist of ["normal", "coin"]) {
  test(`simulation (${dist}, d = 64, ${N} pairs, seed 2017): q·k has mean ≈ 0 and variance ≈ 64; dividing by √64 gives variance ≈ 1`, () => {
    const s = simulateDotVariance({ d: baseDK, samples: N, seed: 2017, dist });
    assert.equal(s.raw.length, N);
    assert.ok(Math.abs(s.rawStats.mean) < 0.3, `mean ${s.rawStats.mean}`);
    assert.ok(Math.abs(s.rawStats.variance - 64) < 0.05 * 64, `variance ${s.rawStats.variance}`);
    assert.ok(Math.abs(s.scaledStats.mean) < 0.3 / 8, `scaled mean ${s.scaledStats.mean}`);
    assert.ok(Math.abs(s.scaledStats.variance - 1) < 0.05, `scaled variance ${s.scaledStats.variance}`);
  });

  test(`simulation (${dist}): the raw variance grows with d, the scaled variance stays near 1 (d = 1, 4, 16, 64, 256)`, () => {
    for (const d of [1, 4, 16, 64, 256]) {
      const s = simulateDotVariance({ d, samples: N, seed: 100 + d, dist });
      assert.ok(Math.abs(s.rawStats.variance - d) < 0.05 * d, `d=${d}: raw variance ${s.rawStats.variance}`);
      assert.ok(Math.abs(s.scaledStats.variance - 1) < 0.05, `d=${d}: scaled variance ${s.scaledStats.variance}`);
    }
  });
}

test("the assumption matters: with entries of variance 4 (not 1) the variance of q·k is d·4·4, and √d no longer restores 1", () => {
  const s = simulateDotVariance({ d: 16, samples: N, seed: 9, dist: "normal", scaleVariance: 4 });
  const want = dotVarianceFormula(16, 4, 4);
  assert.equal(want, 256);
  assert.ok(Math.abs(s.rawStats.variance - want) < 0.07 * want, `variance ${s.rawStats.variance}`);
  assert.ok(s.scaledStats.variance > 10, "scaled variance is nowhere near 1 when the entries do not have variance 1");
});

test("the same seed gives the same simulation; the formula and the scale agree with it", () => {
  const a = simulateDotVariance({ d: 8, samples: 500, seed: 3 });
  const b = simulateDotVariance({ d: 8, samples: 500, seed: 3 });
  assert.deepEqual(a.raw, b.raw);
  assert.equal(dotVarianceFormula(64), 64);
  close(attentionScale(64), 1 / 8);
  assert.equal(baseDK, 64);
});

// ---- Identities used on the cards ----

import { dotFromLengths, sgdStepWithPenalty, sgdStepWithDecay } from "../assets/js/analytic-math.mjs";

test("the dot product can be recovered from lengths alone: (‖a+b‖² − ‖a‖² − ‖b‖²)/2", () => {
  for (const dim of [2, 3, 5]) {
    const vs = manyVectors(200, dim, 60 + dim);
    for (let i = 0; i + 1 < vs.length; i += 2) close(dotFromLengths(vs[i], vs[i + 1]), dot(vs[i], vs[i + 1]), 1e-8);
  }
  assert.equal(dotFromLengths([3, 2], [4, 0]), 12);
});

test("L2 penalty and weight decay give the same step under plain SGD, and differ if the penalty is not rescaled", () => {
  const w = [2, -1], g = [0.5, 0.5];
  const viaPenalty = sgdStepWithPenalty(w, g, 0.1, 0.01);
  const viaDecay = sgdStepWithDecay(w, g, 0.1, 0.01);
  viaPenalty.forEach((v, i) => close(v, viaDecay[i], 1e-12));
  close(viaPenalty[0], 1.948, 1e-12);
  close(viaPenalty[1], -1.049, 1e-12);
  // many random cases
  const rand = seededRandom(77);
  for (let t = 0; t < 500; t++) {
    const ww = [rand() * 4 - 2, rand() * 4 - 2, rand() * 4 - 2], gg = [rand() - 0.5, rand() - 0.5, rand() - 0.5];
    const eta = 0.001 + rand() * 0.5, lam = rand() * 0.1;
    sgdStepWithPenalty(ww, gg, eta, lam).forEach((v, i) => close(v, sgdStepWithDecay(ww, gg, eta, lam)[i], 1e-12));
  }
  // with weight decay strength λ' = ηλ folded in, decay uses the same factor: equal; a different factor is a different step
  assert.notEqual(sgdStepWithDecay(w, g, 0.1, 0.02)[0], viaPenalty[0]);
});

test("projecting onto the x-axis direction (1, 0) is the projection matrix of the Transformations card", () => {
  // `+ 0` turns a harmless −0 into 0 so deepEqual does not tell them apart.
  for (const a of [[3, 2], [3, -5], [-4, 7]]) assert.deepEqual(project(a, [1, 0]).map((v) => v + 0), [a[0], 0]);
});

test("the card examples: (2, 1)·(k, 4) = 0 for k = −2, and a query and key of three entries have dot product 4", () => {
  assert.equal(dot([2, 1], [-2, 4]), 0);
  assert.equal(dot([1, 0, 2], [2, 1, 1]), 4);
  assert.equal(norm2([1, 2, 2]), 3);
  assert.equal(dotVarianceFormula(16, 4, 4), 256);
});
