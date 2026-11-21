import test from "node:test";
import assert from "node:assert/strict";
import {
  EPS, transpose, identity, matMul, matVec, matSub, matAdd, diag, frobeniusSq, frobenius, maxAbsDiff, inverse, matPower,
  rotation, shear, scaling, projectionX, det2, unitSquareImage, signedArea, orientation, imageShape, trace,
  discriminant2, eigenvalues2, isEigenpair, eigen2, parallelGap, stretchAt, eigenAngles, eigendecompose2, powerViaEigen,
  isSymmetric, symmetricEigen, rankTolerance, rankFromSingular, svd, svdReconstruct, singularFromGram, circleImage, svdStages,
  truncatedSvd, bestErrorFrobSq, bestErrorSpectral, storageTruncated, storageFull, storageLoRA, breakEvenRank, loraUpdate, mergeUpdate,
  pattern16, randomMatrix,
} from "../assets/js/decomposition-math.mjs";

const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} is not within ${tol} of ${b}`);
const closeM = (A, B, tol = 1e-9) => assert.ok(maxAbsDiff(A, B) <= tol, `matrices differ by ${maxAbsDiff(A, B)}:\n${JSON.stringify(A)}\n${JSON.stringify(B)}`);
const isOrthonormalCols = (U, tol = 1e-12) => closeM(matMul(transpose(U), U), identity(U[0].length), tol);

// ---- determinant ----
test("det2 is ad − bc, and equals the signed area of the unit square's image", () => {
  assert.equal(det2([[2, 1], [1, 3]]), 5);
  for (const A of [rotation(0.7), shear(1.5), scaling(2, 3), scaling(2, -3), projectionX(), [[1, 2], [3, 4]], [[0, 1], [1, 0]]]) {
    close(signedArea(unitSquareImage(A)), det2(A), 1e-12);
  }
});
test("named cases: rotation 1, shear 1, scaling sx·sy, projection onto the x-axis 0", () => {
  close(det2(rotation(1.1)), 1, 1e-12);
  assert.equal(det2(shear(7)), 1);
  assert.equal(det2(scaling(2, 3)), 6);
  assert.equal(det2(projectionX()), 0);
});
test("a negative determinant flips orientation, zero collapses to a line or a point", () => {
  assert.equal(orientation(det2([[0, 1], [1, 0]])), "flips");
  assert.equal(orientation(det2(rotation(2))), "keeps");
  assert.equal(orientation(det2(projectionX())), "collapses");
  assert.equal(imageShape(projectionX()), "a line segment");
  assert.equal(imageShape([[0, 0], [0, 0]]), "a point");
  assert.equal(imageShape([[1, 2], [3, 4]]), "a parallelogram");
  assert.ok(signedArea(unitSquareImage([[0, 1], [1, 0]])) < 0);
});
test("det(AB) = det(A) det(B) on 200 seeded pairs", () => {
  for (let i = 0; i < 200; i++) {
    const A = randomMatrix(2, 2, 100 + i), B = randomMatrix(2, 2, 900 + i);
    close(det2(matMul(A, B)), det2(A) * det2(B), 1e-9);
  }
});
test("det = 0 exactly when there is no inverse", () => {
  assert.throws(() => inverse([[1, 2], [2, 4]]), /no inverse/);
  closeM(matMul([[1, 2], [3, 5]], inverse([[1, 2], [3, 5]])), identity(2), 1e-12);
  assert.throws(() => det2([[1, 2, 3], [4, 5, 6], [7, 8, 9]]), /2x2/);
});

// ---- trace ----
test("trace is the sum of the diagonal; tr(AB) = tr(BA), even for rectangular A, B", () => {
  assert.equal(trace([[2, 1], [1, 3]]), 5);
  assert.equal(trace(identity(4)), 4);
  assert.throws(() => trace([[1, 2, 3], [4, 5, 6]]), /square/);
  for (let i = 0; i < 100; i++) {
    const A = randomMatrix(3, 4, i), B = randomMatrix(4, 3, 500 + i);
    close(trace(matMul(A, B)), trace(matMul(B, A)), 1e-9);
  }
  const A = [[1, 2], [3, 4]], B = [[0, 1], [1, 0]];
  assert.notDeepEqual(matMul(A, B), matMul(B, A));      // AB ≠ BA in general
});
test("trace is linear: tr(A + B) = tr(A) + tr(B), tr(cA) = c tr(A)", () => {
  const A = randomMatrix(3, 3, 1), B = randomMatrix(3, 3, 2);
  close(trace(matAdd(A, B)), trace(A) + trace(B));
  close(trace(A.map((r) => r.map((v) => 3 * v))), 3 * trace(A));
});

// ---- eigenvalues and eigenvectors ----
test("2x2 eigenvalues are (tr ± √(tr² − 4 det))/2: [[4,1],[2,3]] gives 5 and 2 with vectors along (1,1) and (1,−2)", () => {
  const A = [[4, 1], [2, 3]];
  assert.deepEqual(eigenvalues2(A), [5, 2]);
  const e = eigen2(A);
  assert.equal(e.kind, "distinct");
  assert.equal(e.directions, 2);
  close(e.vectors[0][0] / e.vectors[0][1], 1);
  close(e.vectors[1][0] / e.vectors[1][1], -0.5);
  e.values.forEach((l, i) => assert.ok(isEigenpair(A, l, e.vectors[i])));
});
test("trace = sum of eigenvalues and det = product of eigenvalues, for 300 seeded matrices with real eigenvalues", () => {
  let seen = 0;
  for (let i = 0; i < 600 && seen < 300; i++) {
    const A = randomMatrix(2, 2, 2000 + i);
    const v = eigenvalues2(A);
    if (v === null) continue;
    seen++;
    close(v[0] + v[1], trace(A), 1e-9);
    close(v[0] * v[1], det2(A), 1e-9);
    const e = eigen2(A);
    e.vectors.forEach((vec, k) => assert.ok(isEigenpair(A, e.values[k], vec, 1e-9), `${JSON.stringify(A)} λ=${e.values[k]}`));
  }
  assert.equal(seen, 300);
});
test("an eigenvector is only defined up to scale: any non-zero multiple (negative too) is still one; the zero vector is not", () => {
  const A = [[4, 1], [2, 3]];
  for (const c of [1, -1, 0.25, 40, -7]) assert.ok(isEigenpair(A, 5, [c, c]));
  assert.equal(isEigenpair(A, 5, [0, 0]), false);
  assert.equal(isEigenpair(A, 4, [1, 1]), false);
});
test("case: the projection onto the x-axis has eigenvalues 1 and 0 (it collapses the y-direction)", () => {
  const e = eigen2(projectionX());
  assert.equal(e.kind, "distinct");
  assert.deepEqual(e.values, [1, 0]);
  assert.deepEqual(e.vectors, [[1, 0], [0, 1]]);
});
test("case: scaling by (2, 3) has eigenvalues 3 and 2 along the axes", () => {
  const e = eigen2(scaling(2, 3));
  assert.deepEqual(e.values, [3, 2]);
  assert.deepEqual(e.vectors, [[0, 1], [1, 0]]);
});
test("case: a rotation by an angle that is not a multiple of π has no real eigenvalues (tr² − 4 det < 0) and no real eigenvector", () => {
  for (const theta of [0.3, Math.PI / 2, 2, 3, 4]) {
    const R = rotation(theta);
    assert.ok(discriminant2(R) < 0, `theta ${theta}`);
    const e = eigen2(R);
    assert.equal(e.kind, "none");
    assert.equal(e.vectors.length, 0);
    assert.equal(eigenvalues2(R), null);
    // no direction stays on its line: the cross product of v and Rv is sin θ for every unit v
    for (let a = 0; a < 3.14; a += 0.05) close(parallelGap(R, a), Math.sin(theta), 1e-12);
  }
});
test("rotation by 0 and by π: every direction is an eigen-direction (eigenvalue 1, and −1)", () => {
  const e0 = eigen2(rotation(0));
  assert.equal(e0.kind, "repeated"); assert.equal(e0.defective, false); assert.deepEqual(e0.values, [1, 1]);
  const ePi = eigen2(rotation(Math.PI));
  ePi.values.forEach((l) => close(l, -1, 1e-9));
  assert.equal(ePi.diagonalisable, true);
});
test("case: the shear [[1,k],[0,1]] (k ≠ 0) has eigenvalue 1 repeated and only one eigen-direction: defective, not diagonalisable", () => {
  for (const k of [1, 0.5, -2, 10]) {
    const S = shear(k);
    const e = eigen2(S);
    assert.equal(e.kind, "repeated");
    assert.deepEqual(e.values, [1, 1]);
    assert.equal(e.directions, 1);
    assert.equal(e.defective, true);
    assert.equal(e.diagonalisable, false);
    assert.deepEqual(e.vectors, [[1, 0]]);
    assert.ok(isEigenpair(S, 1, [1, 0]));
    assert.equal(isEigenpair(S, 1, [0, 1]), false);
    assert.equal(eigendecompose2(S).ok, false);
    // the gap v × Sv = k·sin θ·... is zero only at θ = 0 and π (the x-axis direction)
    for (let a = 0.05; a < 3.1; a += 0.05) assert.ok(Math.abs(parallelGap(S, a)) > 1e-3 * Math.abs(k) * 0.01, `k ${k} angle ${a}`);
  }
  const I = eigen2(shear(0));
  assert.equal(I.defective, false); assert.equal(I.directions, 2);
});
test("a scalar multiple of the identity is repeated but not defective", () => {
  const e = eigen2(scaling(3, 3));
  assert.equal(e.kind, "repeated"); assert.equal(e.defective, false); assert.equal(e.directions, 2);
});
test("parallelGap is zero exactly at the eigen-angles and stretchAt there equals |λ|", () => {
  const A = [[4, 1], [2, 3]];
  const angles = eigenAngles(A), e = eigen2(A);
  angles.forEach((t, i) => { close(parallelGap(A, t), 0, 1e-12); close(stretchAt(A, t), Math.abs(e.values[i]), 1e-12); });
  assert.ok(Math.abs(parallelGap(A, 0.2)) > 0.1);
});

// ---- eigendecomposition ----
test("A = P D P⁻¹ for the worked example, and A^n = P D^n P⁻¹ matches repeated multiplication for n = 0..12", () => {
  const A = [[4, 1], [2, 3]];
  const f = eigendecompose2(A);
  assert.equal(f.ok, true);
  closeM(matMul(matMul(f.P, f.D), f.Pinv), A, 1e-12);
  for (let n = 0; n <= 12; n++) closeM(powerViaEigen(A, n), matPower(A, n), 1e-12 * 5 ** n + 1e-12);
});
test("A^n = P D^n P⁻¹ on 100 seeded diagonalisable matrices; it refuses the shear and the rotation", () => {
  let seen = 0;
  for (let i = 0; i < 400 && seen < 100; i++) {
    const A = randomMatrix(2, 2, 7000 + i);
    if (!eigendecompose2(A).ok) continue;
    seen++;
    for (const n of [2, 5]) closeM(powerViaEigen(A, n), matPower(A, n), 1e-8 * Math.max(1, frobenius(matPower(A, n))));
  }
  assert.equal(seen, 100);
  assert.throws(() => powerViaEigen(shear(1), 3), /independent eigenvectors/);
  assert.throws(() => powerViaEigen(rotation(1), 3), /independent eigenvectors/);
  assert.equal(eigendecompose2(rotation(1)).reason, "no real eigenvalues");
});
test("symmetric matrices: real eigenvalues, orthonormal eigenvectors, A = Q Λ Qᵀ (n = 2, 3, 5)", () => {
  for (const [n, seed] of [[2, 1], [3, 2], [5, 3], [5, 4]]) {
    for (let r = 0; r < 20; r++) {
      const B = randomMatrix(n, n, seed * 100 + r);
      const S = matAdd(B, transpose(B));
      const { values, Q } = symmetricEigen(S);
      assert.ok(values.every(Number.isFinite));
      assert.deepEqual([...values].sort((a, b) => b - a), values);
      isOrthonormalCols(Q);
      closeM(matMul(matMul(Q, diag(values)), transpose(Q)), S, 1e-10);
      close(values.reduce((a, b) => a + b, 0), trace(S), 1e-10);
    }
  }
  assert.throws(() => symmetricEigen([[1, 2], [0, 1]]), /symmetric/);
  assert.equal(isSymmetric([[1, 2], [2, 1]]), true);
});
test("the symmetric worked example [[2,1],[1,2]] has eigenvalues 3 and 1 with eigenvectors (1,1)/√2 and (1,−1)/√2", () => {
  const { values, Q } = symmetricEigen([[2, 1], [1, 2]]);
  close(values[0], 3); close(values[1], 1);
  close(Math.abs(Q[0][0]), Math.SQRT1_2); close(Math.abs(Q[1][0]), Math.SQRT1_2);
  close(Q[0][0] * Q[1][0], 0.5); close(Q[0][1] * Q[1][1], -0.5);
  assert.deepEqual(eigen2([[2, 1], [1, 2]]).values, [3, 1]);
});

// ---- SVD ----
test("SVD of the shear [[1,1],[0,1]]: singular values (√5+1)/2 and (√5−1)/2, product 1 (= det), sum of squares 3 (= 2 + k²)", () => {
  const A = shear(1);
  const { s } = svd(A);
  close(s[0], (Math.sqrt(5) + 1) / 2, 1e-12);
  close(s[1], (Math.sqrt(5) - 1) / 2, 1e-12);
  close(s[0] * s[1], 1, 1e-12);
  close(s[0] ** 2 + s[1] ** 2, 3, 1e-12);
  close(s[0], 1.618, 5e-4); close(s[1], 0.618, 5e-4);
  const G = matMul(transpose(A), A);
  assert.deepEqual(G, [[1, 1], [1, 2]]);
  assert.equal(trace(G), 3); assert.equal(det2(G), 1);
  for (const k of [0.5, 2, -3]) { const t = svd(shear(k)).s; close(t[0] ** 2 + t[1] ** 2, 2 + k * k, 1e-11); close(t[0] * t[1], 1, 1e-11); }
});
test("SVD reconstructs and has orthonormal U and V on the named cases", () => {
  const cases = [shear(1), rotation(0.4), scaling(3, 2), scaling(2, -3), projectionX(), [[0, 1], [1, 0]], [[0, 0], [0, 0]], [[2, 0], [0, 2]], [[4, 1], [2, 3]], [[1, 2], [2, 4]], identity(3)];
  for (const A of cases) {
    const f = svd(A);
    closeM(svdReconstruct(f), A, 1e-12);
    isOrthonormalCols(f.U); isOrthonormalCols(f.V);
    assert.ok(f.s.every((v) => v >= 0));
    assert.deepEqual([...f.s].sort((a, b) => b - a), f.s);
  }
});
test("SVD on 300 seeded random matrices of many shapes: reconstruction to 1e-12, orthonormal U and V, singular values ≥ 0 and descending", () => {
  const shapes = [[2, 2], [3, 3], [4, 4], [6, 6], [5, 3], [3, 5], [8, 2], [2, 8], [1, 4], [4, 1], [10, 10]];
  let count = 0;
  for (let i = 0; i < 300; i++) {
    const [m, n] = shapes[i % shapes.length];
    const A = randomMatrix(m, n, 31000 + i);
    const f = svd(A);
    assert.equal(f.U.length, m); assert.equal(f.V.length, n); assert.equal(f.s.length, Math.min(m, n));
    closeM(svdReconstruct(f), A, 1e-12);
    isOrthonormalCols(f.U); isOrthonormalCols(f.V);
    assert.ok(f.s.every((v) => v >= 0));
    assert.deepEqual([...f.s].sort((a, b) => b - a), f.s);
    count++;
  }
  assert.equal(count, 300);
});
test("singular values are the square roots of the eigenvalues of AᵀA (never negative); sum of squared entries = sum of squared singular values", () => {
  for (let i = 0; i < 60; i++) {
    const [m, n] = [[3, 3], [4, 2], [2, 4], [5, 5]][i % 4];
    const A = randomMatrix(m, n, 4400 + i);
    const f = svd(A);
    const g = singularFromGram(A);
    f.s.forEach((v, j) => close(v, g[j], 1e-7));
    close(frobeniusSq(A), f.s.reduce((t, v) => t + v * v, 0), 1e-9);
    assert.ok(g.every((v) => v >= 0));
  }
  const L = symmetricEigen(matMul(transpose(shear(1)), shear(1))).values;
  close(Math.sqrt(L[0]), 1.618033988749895, 1e-12);
});
test("largest stretch = σ₁ and smallest = σ₂: the unit circle maps to an ellipse with those semi-axes", () => {
  for (const A of [shear(1), [[4, 1], [2, 3]], scaling(3, 0.5), rotation(1)]) {
    const { s } = svd(A);
    const lengths = circleImage(A, 3600).map((p) => Math.hypot(...p));
    close(Math.max(...lengths), s[0], 1e-5);
    close(Math.min(...lengths), s[1], 1e-5);
  }
});
test("svdStages: the last stage is A applied to the circle; Σ stretches along the axes by σ₁ and σ₂; Vᵀ keeps lengths", () => {
  const A = [[4, 1], [2, 3]];
  const { stages, s } = svdStages(A, 72);
  const direct = circleImage(A, 72);
  stages[3].forEach((p, i) => { close(p[0], direct[i][0], 1e-12); close(p[1], direct[i][1], 1e-12); });
  // 72 sample points are 5° apart, so the largest sampled |x| is within cos(2.5°) of σ₁ (and never above it)
  const ax = Math.max(...stages[2].map((p) => Math.abs(p[0])));
  assert.ok(ax <= s[0] + 1e-12 && ax >= s[0] * Math.cos(Math.PI / 72) - 1e-12);
  stages[2].forEach((p) => assert.ok(Math.abs(p[0]) <= s[0] + 1e-12 && Math.abs(p[1]) <= s[1] + 1e-12));
  stages[1].forEach((p) => close(Math.hypot(...p), 1, 1e-12));
});
test("U and V are not unique: flipping a matching pair of signs is another valid SVD; equal singular values allow any rotation", () => {
  const A = [[4, 1], [2, 3]];
  const f = svd(A);
  const U2 = f.U.map((r) => [-r[0], r[1]]), V2 = f.V.map((r) => [-r[0], r[1]]);
  closeM(svdReconstruct({ U: U2, s: f.s, V: V2 }), A, 1e-12);
  const R = [[2 * Math.cos(0.3), -2 * Math.sin(0.3)], [2 * Math.sin(0.3), 2 * Math.cos(0.3)]];   // 2 × a rotation: σ₁ = σ₂ = 2
  const g = svd(R);
  close(g.s[0], 2, 1e-12); close(g.s[1], 2, 1e-12);
  const Q = rotation(0.9);
  closeM(svdReconstruct({ U: matMul(g.U, Q), s: g.s, V: matMul(g.V, Q) }), R, 1e-12);
});
test("U and V may include reflections: det(U)·det(V) has the sign of det(A)", () => {
  for (const A of [[[0, 1], [1, 0]], scaling(2, -3), [[1, 0], [0, -1]], shear(1)]) {
    const f = svd(A);
    assert.equal(Math.sign(det2(f.U) * det2(f.V)), Math.sign(det2(A)));
    closeM(svdReconstruct(f), A, 1e-12);
  }
});
test("rank = number of singular values above the tolerance max(m,n)·ε·σ₁", () => {
  assert.equal(rankTolerance(2, 2, 1), 2 * EPS);
  assert.equal(rankFromSingular(svd([[1, 2], [2, 4]]).s, 2, 2), 1);
  assert.equal(rankFromSingular(svd(projectionX()).s, 2, 2), 1);
  assert.equal(rankFromSingular(svd([[0, 0], [0, 0]]).s, 2, 2), 0);
  assert.equal(rankFromSingular(svd(shear(1)).s, 2, 2), 2);
  assert.equal(rankFromSingular(svd(identity(5)).s, 5, 5), 5);
  for (let i = 0; i < 30; i++) {
    const A = matMul(randomMatrix(5, 2, 800 + i), randomMatrix(2, 5, 900 + i));
    const s = svd(A).s;
    assert.ok(rankFromSingular(s, 5, 5) <= 2, `rank ${rankFromSingular(s, 5, 5)} for singular values ${s}`);
  }
  assert.equal(rankFromSingular([1, 1e-10], 2, 2), 2);
  assert.equal(rankFromSingular([1, 1e-17], 2, 2), 1);
});

// ---- low-rank approximation ----
test("A_k is the sum of the first k terms σᵢ uᵢ vᵢᵀ; A_p is A and A_0 is zero", () => {
  const A = randomMatrix(5, 4, 77);
  const f = svd(A);
  closeM(truncatedSvd(A, 4, f), A, 1e-12);
  closeM(truncatedSvd(A, 0, f), Array.from({ length: 5 }, () => [0, 0, 0, 0]), 0);
  closeM(truncatedSvd(A, 9, f), A, 1e-12);
  let sum = Array.from({ length: 5 }, () => [0, 0, 0, 0]);
  for (let r = 0; r < 2; r++) sum = matAdd(sum, f.U.map((row, i) => f.V.map((vr) => f.s[r] * row[r] * vr[r])));
  closeM(truncatedSvd(A, 2, f), sum, 1e-12);
});
test("Eckart-Young: squared Frobenius error = sum of remaining squared singular values; spectral error = σ_{k+1}", () => {
  for (let i = 0; i < 40; i++) {
    const A = randomMatrix(6, 5, 1200 + i), f = svd(A);
    for (let k = 0; k <= 5; k++) {
      const E = matSub(A, truncatedSvd(A, k, f));
      close(frobeniusSq(E), bestErrorFrobSq(f.s, k), 1e-9);
      close(svd(E).s[0], bestErrorSpectral(f.s, k), 1e-9);
    }
  }
  assert.equal(bestErrorSpectral([3, 2, 1], 3), 0);
});
test("Eckart-Young as a property: 3000 random rank-k matrices and 600 perturbed optima never beat A_k (Frobenius and spectral)", () => {
  const A = randomMatrix(6, 5, 99), f = svd(A);
  let tried = 0;
  for (let k = 1; k <= 3; k++) {
    const best = bestErrorFrobSq(f.s, k), bestSp = bestErrorSpectral(f.s, k);
    for (let i = 0; i < 1000; i++) {
      const M = matMul(randomMatrix(6, k, 5000 + 1000 * k + i), randomMatrix(k, 5, 9000 + 1000 * k + i));
      const E = matSub(A, M);
      assert.ok(frobeniusSq(E) >= best - 1e-9, `rank ${k}: ${frobeniusSq(E)} < ${best}`);
      assert.ok(svd(E).s[0] >= bestSp - 1e-9);
      tried++;
    }
    // Nudge the factors of the optimum: still rank ≤ k, still never better.
    const Uk = f.U.map((r) => r.slice(0, k)), Vk = f.V.map((r) => r.slice(0, k));
    for (let i = 0; i < 200; i++) {
      const nudge = (X, seed) => matAdd(X, randomMatrix(X.length, X[0].length, seed).map((r) => r.map((v) => v * 0.02)));
      const M = matMul(matMul(nudge(Uk, 300 + i), diag(f.s.slice(0, k))), transpose(nudge(Vk, 700 + i)));
      assert.ok(frobeniusSq(matSub(A, M)) >= best - 1e-9);
      tried++;
    }
  }
  assert.equal(tried, 3600);
});
test("a rank-k matrix is recovered exactly by the rank-k truncation", () => {
  const A = matMul(randomMatrix(7, 3, 1), randomMatrix(3, 6, 2));
  closeM(truncatedSvd(A, 3), A, 1e-11);
});
test("storage: 512×512 at k = 8 is 8,200 numbers against 262,144; LoRA's two factors store 2×512×8 = 8,192 (no singular values)", () => {
  assert.equal(storageTruncated(512, 512, 8), 8200);
  assert.equal(storageFull(512, 512), 262144);
  assert.equal(storageLoRA(512, 512, 8), 8192);
  assert.equal(storageTruncated(512, 512, 8) - storageLoRA(512, 512, 8), 8);
});
test("storage on 16×16: 33 numbers per rank against 256, so rank 8 (264) stores more than the picture; break-even is below rank 8", () => {
  assert.equal(storageTruncated(16, 16, 1), 33);
  assert.equal(storageTruncated(16, 16, 7), 231);
  assert.equal(storageTruncated(16, 16, 8), 264);
  assert.equal(breakEvenRank(16, 16), 7);
  assert.ok(storageTruncated(16, 16, 7) < 256 && storageTruncated(16, 16, 8) > 256);
  assert.equal(breakEvenRank(512, 512), 255);
});
test("pattern16: 16×16, values in [0, 1], the same every call, singular values fall, error matches Eckart-Young", () => {
  const P = pattern16();
  assert.equal(P.length, 16); assert.ok(P.every((r) => r.length === 16 && r.every((v) => v >= 0 && v <= 1)));
  assert.deepEqual(pattern16(), P);
  const f = svd(P);
  assert.ok(f.s.every((v, i) => i === 0 || f.s[i - 1] >= v));
  for (const k of [1, 2, 4, 8, 16]) close(frobeniusSq(matSub(P, truncatedSvd(P, k, f))), bestErrorFrobSq(f.s, k), 1e-9);
  assert.ok(bestErrorFrobSq(f.s, 16) < 1e-20);
});
test("LoRA-shaped update: B (m×r) times A (r×n) has rank at most r, and merging W₀ + BA gives one matrix of the original shape", () => {
  const B = randomMatrix(8, 2, 5), A = randomMatrix(2, 8, 6), W0 = randomMatrix(8, 8, 7);
  const dW = loraUpdate(B, A);
  assert.ok(rankFromSingular(svd(dW).s, 8, 8) <= 2);
  const W = mergeUpdate(W0, B, A);
  assert.equal(W.length, 8); assert.equal(W[0].length, 8);
  const x = randomMatrix(8, 1, 8).map((r) => r[0]);
  const split = matVec(W0, x).map((v, i) => v + matVec(B, matVec(A, x))[i]);
  matVec(W, x).forEach((v, i) => close(v, split[i], 1e-12));
});
