import test from "node:test";
import assert from "node:assert/strict";
import {
  dimension, entryOf, add, subtract, scale, linearCombination, tipToTailPath,
  shape, entryCount, row, column, fromColumns, canMultiply, resultShape,
  matVec, matVecByColumns, matMul, entryStep, multiplyCount,
  multiplyCountFromShapes, sameMatrix, teaserMatVec, transformerBase, illustrativeEmbedding, entrywiseProduct,
  frac, fracToString, fracToNumber, fracMatMul, fracMatrixToNumbers, transpose, identity, isSquare, det2, determinant,
  inverse, rank, areIndependent, inSpan, solveSystem, rotation, rotationDegrees, scaling, shear, projectionOntoX,
  unitSquare, transformedSquare, signedArea,
} from "../assets/js/linalg-math.mjs";

// ---- Vectors ----

test("dimension and entryOf count entries from 1", () => {
  const v = [3, 2, 7];
  assert.equal(dimension(v), 3);
  assert.equal(entryOf(v, 1), 3);
  assert.equal(entryOf(v, 3), 7);
  assert.throws(() => entryOf(v, 0), RangeError);
  assert.throws(() => entryOf(v, 4), RangeError);
  assert.throws(() => entryOf(v, 1.5), RangeError);
});

test("add and subtract work entry by entry", () => {
  assert.deepEqual(add([3, 2], [1, 4]), [4, 6]);
  assert.deepEqual(subtract([3, 2], [1, 4]), [2, -2]);
  assert.deepEqual(add([1, 2, 3], [10, 20, 30]), [11, 22, 33]);
  assert.throws(() => add([1, 2], [1, 2, 3]), RangeError);
  assert.throws(() => subtract([1], [1, 2]), RangeError);
});

test("addition is commutative and has the zero vector as identity", () => {
  const a = [3, 2];
  const b = [-1, 4];
  assert.deepEqual(add(a, b), add(b, a));
  assert.deepEqual(add(a, [0, 0]), a);
});

test("scale multiplies every entry; negatives flip, fractions shrink", () => {
  assert.deepEqual(scale(2, [3, 2]), [6, 4]);
  assert.deepEqual(scale(-1, [3, 2]), [-3, -2]);
  assert.deepEqual(scale(0.5, [4, 2]), [2, 1]);
  assert.deepEqual(scale(0, [3, 2]), [0, 0]);
});

test("scaling distributes over addition", () => {
  const a = [3, 2];
  const b = [1, 4];
  assert.deepEqual(scale(3, add(a, b)), add(scale(3, a), scale(3, b)));
});

test("linearCombination: 2a − b with a = (2, 1), b = (−1, 3)", () => {
  assert.deepEqual(linearCombination([2, -1], [[2, 1], [-1, 3]]), [5, -1]);
  assert.deepEqual(linearCombination([1, 1], [[3, 2], [1, 4]]), [4, 6]);
  assert.throws(() => linearCombination([1], [[1, 2], [3, 4]]), RangeError);
  assert.throws(() => linearCombination([], []), RangeError);
});

test("tipToTailPath ends at the linear combination and starts at the origin", () => {
  const cs = [2, -1];
  const vs = [[2, 1], [-1, 3]];
  const path = tipToTailPath(cs, vs);
  assert.deepEqual(path, [[0, 0], [4, 2], [5, -1]]);
  assert.deepEqual(path[path.length - 1], linearCombination(cs, vs));
});

// ---- Matrices ----

const A = [[1, 2, 3], [4, 5, 6]]; // 2×3

test("shape, row, column, entryCount", () => {
  assert.deepEqual(shape(A), { rows: 2, cols: 3 });
  assert.deepEqual(row(A, 2), [4, 5, 6]);
  assert.deepEqual(column(A, 3), [3, 6]);
  assert.equal(entryCount(shape(A)), 6);
  assert.throws(() => row(A, 3), RangeError);
  assert.throws(() => column(A, 0), RangeError);
  assert.throws(() => shape([[1, 2], [3]]), RangeError);
});

test("row returns a copy, so editing it leaves the matrix alone", () => {
  const r = row(A, 1);
  r[0] = 99;
  assert.equal(A[0][0], 1);
});

test("fromColumns is the inverse of reading columns", () => {
  const cols = [column(A, 1), column(A, 2), column(A, 3)];
  assert.deepEqual(fromColumns(cols), A);
});

// ---- Matrix-vector ----

test("matVec: [[2,1],[0,3]] times (3,2) is (8, 6)", () => {
  assert.deepEqual(matVec([[2, 1], [0, 3]], [3, 2]), [8, 6]);
});

test("matVec changes the number of entries when the matrix is not square", () => {
  // 3×2 takes 2 numbers in and gives 3 out
  assert.deepEqual(matVec([[1, 0], [0, 1], [1, 1]], [3, 2]), [3, 2, 5]);
  // 2×3 takes 3 in and gives 2 out
  assert.deepEqual(matVec(A, [1, 0, -1]), [-2, -2]);
  assert.throws(() => matVec(A, [1, 2]), RangeError);
});

test("row view and column view of Mv agree", () => {
  const M = [[2, -1], [1, 3], [0, 4]];
  for (const v of [[3, 2], [0, 0], [-1, 5], [0.5, 2]]) {
    assert.deepEqual(matVecByColumns(M, v), matVec(M, v));
  }
  assert.throws(() => matVecByColumns(M, [1, 2, 3]), RangeError);
});

test("the columns of M are where the unit vectors go", () => {
  const M = [[2, -1], [1, 3]];
  assert.deepEqual(matVec(M, [1, 0]), column(M, 1));
  assert.deepEqual(matVec(M, [0, 1]), column(M, 2));
});

test("the 1×2 matrix [1 1] times (x, y) is x + y (the equation x + y = 4)", () => {
  assert.deepEqual(matVec([[1, 1]], [1, 3]), [4]);
  assert.deepEqual(matVec([[1, 1]], [4, 0]), [4]);
  assert.deepEqual(matVec([[1, 1]], [2, 3]), [5]);
});

// ---- Matrix-matrix ----

test("canMultiply and resultShape follow (m×n)(n×p) = m×p", () => {
  const B = [[1, 0, 2, 1], [0, 1, 1, 1], [1, 1, 0, 2]]; // 3×4
  assert.equal(canMultiply(A, B), true);
  assert.deepEqual(resultShape(A, B), { rows: 2, cols: 4 });
  assert.equal(canMultiply(A, A), false);
  assert.equal(resultShape(A, A), null);
  assert.equal(canMultiply(B, A), false);
});

test("matMul on a 2×3 times 3×2", () => {
  const B = [[7, 8], [9, 10], [11, 12]];
  assert.deepEqual(matMul(A, B), [[58, 64], [139, 154]]);
  assert.throws(() => matMul(A, A), RangeError);
});

test("entryStep: row 1 of A and column 2 of B pair up and sum to 64", () => {
  const B = [[7, 8], [9, 10], [11, 12]];
  assert.deepEqual(entryStep(A, B, 1, 2), {
    row: [1, 2, 3],
    column: [8, 10, 12],
    terms: [8, 20, 36],
    sum: 64,
  });
  // Every step agrees with matMul.
  const P = matMul(A, B);
  for (let i = 1; i <= 2; i++) {
    for (let j = 1; j <= 2; j++) assert.equal(entryStep(A, B, i, j).sum, P[i - 1][j - 1]);
  }
});

test("AB is not BA: a swap matrix swaps columns on the right, rows on the left", () => {
  const P = [[1, 2], [3, 4]];
  const S = [[0, 1], [1, 0]];
  assert.deepEqual(matMul(P, S), [[2, 1], [4, 3]]); // columns swapped
  assert.deepEqual(matMul(S, P), [[3, 4], [1, 2]]); // rows swapped
  assert.equal(sameMatrix(matMul(P, S), matMul(S, P)), false);
});

test("applying B then A equals applying AB (why the row-by-column rule is forced)", () => {
  const P = [[1, 2], [3, 4]];
  const Q = [[0, 1], [1, 1]];
  for (const v of [[1, 0], [0, 1], [3, 2], [-2, 5]]) {
    assert.deepEqual(matVec(P, matVec(Q, v)), matVec(matMul(P, Q), v));
  }
});

test("matrix multiplication is associative on an example", () => {
  const P = [[1, 2], [3, 4]];
  const Q = [[0, 1], [1, 1]];
  const R = [[2, 0], [1, 3]];
  assert.deepEqual(matMul(matMul(P, Q), R), matMul(P, matMul(Q, R)));
});

test("a column of AB is A times that column of B", () => {
  const B = [[7, 8], [9, 10], [11, 12]];
  const P = matMul(A, B);
  for (let j = 1; j <= 2; j++) assert.deepEqual(column(P, j), matVec(A, column(B, j)));
});

// ---- Sizes ----

test("multiplyCount is m·n·p", () => {
  const B = [[7, 8], [9, 10], [11, 12]];
  assert.equal(multiplyCount(A, B), 12); // 2·3·2
  assert.equal(multiplyCount(A, [[1], [2], [3]]), 6);
  assert.throws(() => multiplyCount(A, A), RangeError);
});

test("sizes from the original Transformer base model, as pure shape arithmetic", () => {
  // d_model = 512, d_k = 64, d_ff = 2048 (Vaswani et al., 2017, Table 3).
  assert.equal(entryCount({ rows: 512, cols: 64 }), 32768);
  assert.equal(entryCount({ rows: 512, cols: 2048 }), 1048576);
  // One 512-entry vector through a 512×2048 matrix.
  assert.equal(multiplyCountFromShapes({ rows: 2048, cols: 512 }, { rows: 512, cols: 1 }), 1048576);
  assert.throws(
    () => multiplyCountFromShapes({ rows: 2, cols: 3 }, { rows: 2, cols: 3 }),
    RangeError,
  );
});

test("sameMatrix compares shape and entries", () => {
  assert.equal(sameMatrix([[1, 2]], [[1, 2]]), true);
  assert.equal(sameMatrix([[1, 2]], [[1], [2]]), false);
  assert.equal(sameMatrix([[1, 2]], [[1, 3]]), false);
});

test("the widget's vectors: a = (2, 1), b = (−1, 2), and 2a − b is (5, 0)", () => {
  const a = [2, 1];
  const b = [-1, 2];
  assert.deepEqual(linearCombination([2, -1], [a, b]), [5, 0]);
  assert.deepEqual(linearCombination([1, 1], [a, b]), [1, 3]);
  assert.deepEqual(tipToTailPath([2, -1], [a, b]), [[0, 0], [4, 2], [5, 0]]);
  // the largest result reachable with both coefficients in [−2, 2] stays inside the drawing
  for (const c1 of [-2, 2]) {
    for (const c2 of [-2, 2]) {
      const [x, y] = linearCombination([c1, c2], [a, b]);
      assert.ok(Math.abs(x) <= 10 && Math.abs(y) <= 6);
    }
  }
});

test("the matrix widget's default: M = [[2, −1], [1, 1]] times (1, 2) is (0, 3)", () => {
  const M = [[2, -1], [1, 1]];
  assert.deepEqual(matVec(M, [1, 2]), [0, 3]);
  assert.deepEqual(matVecByColumns(M, [1, 2]), [0, 3]);
  assert.deepEqual(column(M, 1), [2, 1]);
  assert.deepEqual(column(M, 2), [-1, 1]);
});

test("worked example matrices: [[2,1],[0,3]] times (3,2), column view (6,0)+(2,6)", () => {
  const M = [[2, 1], [0, 3]];
  assert.deepEqual(matVec(M, [3, 2]), [8, 6]);
  assert.deepEqual(scale(3, column(M, 1)), [6, 0]);
  assert.deepEqual(scale(2, column(M, 2)), [2, 6]);
  assert.deepEqual(add([6, 0], [2, 6]), [8, 6]);
});

test("entry (2, 1) of the 2×3 times 3×2 example is 139", () => {
  const B = [[7, 8], [9, 10], [11, 12]];
  assert.deepEqual(entryStep(A, B, 2, 1), {
    row: [4, 5, 6], column: [7, 9, 11], terms: [28, 45, 66], sum: 139,
  });
});

test("A·v with v = (1, 0, −1) written as a 3×1 matrix agrees with matVec", () => {
  const v = [1, 0, -1];
  assert.deepEqual(matMul(A, v.map((x) => [x])), matVec(A, v).map((x) => [x]));
});

test("constants: base-model sizes and the illustrative embedding", () => {
  assert.deepEqual(transformerBase, { dModel: 512, dK: 64, dFf: 2048 });
  assert.equal(dimension(illustrativeEmbedding), 4);
  assert.equal(entryOf(illustrativeEmbedding, 2), -1.1);
});

test("a matrix machine is linear: M(cv) = c·Mv and M(a + b) = Ma + Mb", () => {
  const M = [[2, -1], [1, 1], [0, 3]];
  const a = [3, 2];
  const b = [-1, 4];
  assert.deepEqual(matVec(M, scale(3, a)), scale(3, matVec(M, a)));
  assert.deepEqual(matVec(M, add(a, b)), add(matVec(M, a), matVec(M, b)));
});

test("entrywise product is a different operation and does not compose machines", () => {
  const P = [[1, 2], [3, 4]];
  const Q = [[0, 1], [1, 1]];
  const v = [1, 0];
  assert.deepEqual(entrywiseProduct(P, Q), [[0, 2], [3, 4]]);
  // applying Q then P gives (1·0 + 2·1, 3·0 + 4·1) = (2, 4); the entrywise matrix gives (0, 3)
  assert.deepEqual(matVec(P, matVec(Q, v)), [2, 4]);
  assert.deepEqual(matVec(entrywiseProduct(P, Q), v), [0, 3]);
  assert.throws(() => entrywiseProduct(P, [[1, 2, 3]]), RangeError);
});

test("the widget's three-way pricing example: B·A has the right shape, A·B has a different one", () => {
  // A: kg per dish (3 ingredients × 2 dishes). B: cost per kg in 2 shops (2 shops × 3 ingredients).
  const Akg = [[1, 2], [0, 1], [3, 0]];
  const Bcost = [[2, 3, 1], [3, 1, 2]];
  assert.deepEqual(resultShape(Bcost, Akg), { rows: 2, cols: 2 });
  assert.deepEqual(resultShape(Akg, Bcost), { rows: 3, cols: 3 });
  assert.deepEqual(matMul(Bcost, Akg), [[5, 7], [9, 7]]);
});

// ---- Home-page teaser ----

test("teaserMatVec gives the output, the column route and the row text", () => {
  const t = teaserMatVec([[2, 0], [1, 3]], [1, 2]);
  assert.deepEqual(t.out, [2, 7]);
  assert.deepEqual(t.byColumns, [2, 7]);
  assert.deepEqual(t.rowText, ["2\u00d71 + 0\u00d72 = 2", "1\u00d71 + 3\u00d72 = 7"]);
  assert.equal(t.agree, true);
});

test("teaserMatVec agrees across the slider range and rejects a wrong-length vector", () => {
  for (let x = -3; x <= 3; x++) assert.equal(teaserMatVec([[2, 0], [1, 3]], [x, 1]).agree, true);
  assert.throws(() => teaserMatVec([[2, 0], [1, 3]], [1]), RangeError);
});

// ---- Part 2 ----

const near = (a, b, eps = 1e-12) => assert.ok(Math.abs(a - b) <= eps, `${a} is not within ${eps} of ${b}`);
const nearM = (A, B) => A.forEach((r, i) => r.forEach((x, j) => near(x, B[i][j])));

// AB != BA, det(A) = det(B) = 1, so every inverse below stays in whole numbers.
const TA = [[1, 2], [0, 1]];
const TB = [[1, 0], [3, 1]];

test("transpose swaps rows and columns and works on non-square shapes", () => {
  assert.deepEqual(transpose([[1, 2, 3], [4, 5, 6]]), [[1, 4], [2, 5], [3, 6]]);
  assert.deepEqual(shape(transpose([[1, 2, 3], [4, 5, 6]])), { rows: 3, cols: 2 });
  assert.deepEqual(transpose(transpose(TA)), TA);
});

test("identity leaves every vector and matrix unchanged", () => {
  assert.deepEqual(identity(3), [[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
  assert.deepEqual(matVec(identity(2), [5, -7]), [5, -7]);
  assert.deepEqual(matMul(identity(2), TA), TA);
  assert.deepEqual(matMul(TA, identity(2)), TA);
  assert.throws(() => identity(0), RangeError);
});

test("(AB)ᵀ = BᵀAᵀ: the order reverses, and AᵀBᵀ is the wrong rule", () => {
  const AB = matMul(TA, TB);
  assert.deepEqual(AB, [[7, 2], [3, 1]]); // 1·1+2·3, 1·0+2·1 / 0·1+1·3, 0·0+1·1
  assert.deepEqual(matMul(TB, TA), [[1, 2], [3, 7]]); // BA differs from AB
  assert.deepEqual(transpose(AB), [[7, 3], [2, 1]]);
  assert.deepEqual(matMul(transpose(TB), transpose(TA)), [[7, 3], [2, 1]]); // BᵀAᵀ matches
  assert.deepEqual(matMul(transpose(TA), transpose(TB)), [[1, 3], [2, 7]]); // AᵀBᵀ does not
  assert.ok(!sameMatrix(transpose(AB), matMul(transpose(TA), transpose(TB))));
});

test("(AB)ᵀ = BᵀAᵀ also holds for non-square shapes (where AᵀBᵀ has the wrong shape)", () => {
  const A = [[1, 2, 3], [4, 5, 6]]; // 2×3
  const B = [[1, 0], [0, 1], [2, 2]]; // 3×2
  assert.deepEqual(transpose(matMul(A, B)), matMul(transpose(B), transpose(A)));
  // Aᵀ is 3×2 and Bᵀ is 2×3, so AᵀBᵀ is 3×3, while (AB)ᵀ is 2×2
  assert.deepEqual(resultShape(transpose(A), transpose(B)), { rows: 3, cols: 3 });
  assert.deepEqual(shape(transpose(matMul(A, B))), { rows: 2, cols: 2 });
});

test("inverse is exact, and A·A⁻¹ = A⁻¹·A = I", () => {
  const Ainv = inverse(TA);
  assert.deepEqual(fracMatrixToNumbers(Ainv), [[1, -2], [0, 1]]);
  assert.deepEqual(fracMatrixToNumbers(fracMatMul(Ainv, TA.map((r) => r.map((x) => frac(x))))), identity(2));
  assert.deepEqual(fracMatrixToNumbers(fracMatMul(TA.map((r) => r.map((x) => frac(x))), Ainv)), identity(2));
  // a non-integer inverse stays exact: [[2,1],[1,1]] has det 1; [[2,0],[0,4]] has inverse [[1/2,0],[0,1/4]]
  assert.deepEqual(inverse([[2, 0], [0, 4]]).map((r) => r.map(fracToString)), [["1/2", "0"], ["0", "1/4"]]);
});

test("(AB)⁻¹ = B⁻¹A⁻¹: the order reverses, and A⁻¹B⁻¹ is the wrong rule", () => {
  const AB = matMul(TA, TB);
  const num = fracMatrixToNumbers;
  assert.equal(det2(AB), 1); // 7·1 − 2·3
  assert.deepEqual(num(inverse(AB)), [[1, -2], [-3, 7]]);
  assert.deepEqual(num(inverse(TB)), [[1, 0], [-3, 1]]);
  assert.deepEqual(matMul(num(inverse(TB)), num(inverse(TA))), [[1, -2], [-3, 7]]); // B⁻¹A⁻¹ matches
  assert.deepEqual(matMul(num(inverse(TA)), num(inverse(TB))), [[7, -2], [-3, 1]]); // A⁻¹B⁻¹ does not
  assert.ok(!sameMatrix(num(inverse(AB)), matMul(num(inverse(TA)), num(inverse(TB)))));
});

test("an inverse exists only for a square matrix with nonzero determinant", () => {
  assert.equal(inverse([[1, 2, 3], [4, 5, 6]]), null); // not square
  assert.equal(inverse([[1, 2], [2, 4]]), null); // det = 1·4 − 2·2 = 0
  assert.equal(inverse(projectionOntoX), null); // det = 0
  assert.equal(inverse([[1, 2], [3, 4]]) === null, false); // det = −2
  assert.equal(det2([[1, 2], [3, 4]]), -2);
  assert.equal(fracToString(determinant([[1, 2], [3, 4]])), "-2");
  assert.equal(fracToString(determinant([[2, 0, 0], [0, 3, 0], [0, 0, 4]])), "24");
  assert.equal(fracToString(determinant([[0, 1], [1, 0]])), "-1"); // a row swap flips the sign
  assert.throws(() => determinant([[1, 2, 3], [4, 5, 6]]), RangeError);
});

test("exact arithmetic refuses non-integers instead of guessing with a tolerance", () => {
  assert.throws(() => rank([[0.5, 1], [1, 2]]), RangeError);
  assert.throws(() => solveSystem([[1, 1]], [0.1]), RangeError);
});

test("systems: none, exactly one, or infinitely many, never two", () => {
  // one: x + y = 4 and x − y = 2 → (3, 1)
  const one = solveSystem([[1, 1], [1, -1]], [4, 2]);
  assert.equal(one.kind, "one");
  assert.deepEqual(one.solution.map(fracToString), ["3", "1"]);
  // none: x + y = 4 and x + y = 6 (parallel lines)
  assert.equal(solveSystem([[1, 1], [1, 1]], [4, 6]).kind, "none");
  // infinite: x + y = 4 and 2x + 2y = 8 (same line)
  const inf = solveSystem([[1, 1], [2, 2]], [4, 8]);
  assert.equal(inf.kind, "infinite");
  assert.equal(inf.freeVariables, 1);
  // one equation, two unknowns (the Module 0 case)
  assert.equal(solveSystem([[1, 1]], [4]).kind, "infinite");
  // a fractional answer stays exact: 2x + y = 1, x + 3y = 1 → x = 2/5, y = 1/5
  assert.deepEqual(solveSystem([[2, 1], [1, 3]], [1, 1]).solution.map(fracToString), ["2/5", "1/5"]);
});

test("systems: the number of solutions is never exactly two, over a whole grid of lines", () => {
  const seen = new Set();
  for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) for (let c = -2; c <= 2; c++) for (let d = -2; d <= 2; d++) {
    for (const [p, q] of [[1, 1], [0, 0], [1, 2], [4, 6]]) {
      const r = solveSystem([[a, b], [c, d]], [p, q]);
      seen.add(r.kind);
      if (r.kind === "one") {
        // a "one" answer really solves both equations
        const x = r.solution.map(fracToNumber);
        near(a * x[0] + b * x[1], p);
        near(c * x[0] + d * x[1], q);
      }
    }
  }
  assert.deepEqual([...seen].sort(), ["infinite", "none", "one"]);
});

test("the Module 0 row: [1 1](x, y) = x + y, and a one-row system has a line of solutions", () => {
  assert.deepEqual(matVec([[1, 1]], [1, 3]), [4]);
  assert.deepEqual(matVec([[1, 1]], [3, 1]), [4]);
});

test("a system A·x = b with an invertible A is solved by x = A⁻¹b", () => {
  const A = [[1, 1], [1, -1]];
  const x = matVec(fracMatrixToNumbers(inverse(A)), [4, 2]);
  assert.deepEqual(x, [3, 1]);
});

test("rank counts independent columns", () => {
  assert.equal(rank([[1, 0], [0, 1]]), 2);
  assert.equal(rank([[1, 2], [2, 4]]), 1); // column 2 = 2 × column 1
  assert.equal(rank([[0, 0], [0, 0]]), 0);
  assert.equal(rank(projectionOntoX), 1);
  assert.equal(rank([[1, 2, 3], [4, 5, 6], [7, 8, 9]]), 2); // column 3 = 2·col 2 − col 1
  assert.equal(rank([[1, 2, 3], [4, 5, 6]]), 2);
  assert.equal(rank(transpose([[1, 2, 3], [4, 5, 6]])), 2); // rank(Mᵀ) = rank(M)
});

test("independence, span and basis", () => {
  assert.equal(areIndependent([[1, 0], [0, 1]]), true);
  assert.equal(areIndependent([[1, 2], [2, 4]]), false);
  assert.equal(areIndependent([[1, 0], [0, 1], [1, 1]]), false); // three vectors in the plane
  assert.equal(inSpan([[1, 0], [0, 1]], [5, -3]), true); // two independent vectors reach the whole plane
  assert.equal(inSpan([[1, 2]], [2, 4]), true);
  assert.equal(inSpan([[1, 2]], [1, 0]), false);
  assert.equal(inSpan([[1, 0, 0], [0, 1, 0]], [0, 0, 1]), false); // the flat floor does not reach upward
});

test("rotation is counter-clockwise with vectors as columns", () => {
  assert.deepEqual(rotationDegrees(90), [[0, -1], [1, 0]]); // exact, no 6e-17 noise
  assert.deepEqual(matVec(rotationDegrees(90), [1, 0]), [0, 1]); // east turns to north
  assert.deepEqual(matVec(rotationDegrees(90), [0, 1]), [-1, 0]); // north turns to west
  assert.deepEqual(matVec(rotationDegrees(180), [2, 3]), [-2, -3]);
  assert.deepEqual(matVec(rotationDegrees(-90), [1, 0]), [0, -1]);
  nearM(rotationDegrees(45), [[Math.SQRT1_2, -Math.SQRT1_2], [Math.SQRT1_2, Math.SQRT1_2]]);
  nearM(rotation(Math.PI / 6), [[Math.sqrt(3) / 2, -0.5], [0.5, Math.sqrt(3) / 2]]);
});

test("rotation keeps length and area, and its inverse is its transpose", () => {
  const R = rotationDegrees(30);
  const v = matVec(R, [3, 4]);
  near(Math.hypot(...v), 5);
  near(det2(R), 1);
  nearM(matMul(transpose(R), R), identity(2));
  nearM(matMul(rotationDegrees(30), rotationDegrees(60)), rotationDegrees(90));
});

test("scale and shear", () => {
  assert.deepEqual(matVec(scaling(2, 3), [1, 1]), [2, 3]);
  assert.deepEqual(scaling(2, 3), [[2, 0], [0, 3]]);
  assert.deepEqual(shear(1), [[1, 1], [0, 1]]);
  assert.deepEqual(matVec(shear(2), [0, 1]), [2, 1]); // (0,1) leans over to (k, 1)
  assert.deepEqual(matVec(shear(2), [1, 0]), [1, 0]); // the x-axis stays put
  assert.deepEqual(matVec(shear(2), [3, 2]), [7, 2]); // 3 + 2·2 = 7
  assert.equal(det2(shear(5)), 1); // area unchanged
  assert.equal(det2(scaling(2, 3)), 6);
  assert.equal(det2(scaling(-1, 1)), -1); // a mirror flips orientation
});

test("projection onto the x-axis has rank 1 and no inverse; two inputs share one output", () => {
  assert.deepEqual(projectionOntoX, [[1, 0], [0, 0]]);
  assert.deepEqual(matVec(projectionOntoX, [3, 2]), [3, 0]);
  assert.deepEqual(matVec(projectionOntoX, [3, -5]), [3, 0]); // different inputs, same output
  assert.equal(rank(projectionOntoX), 1);
  assert.equal(inverse(projectionOntoX), null);
  assert.equal(det2(projectionOntoX), 0);
  assert.deepEqual(matMul(projectionOntoX, projectionOntoX), projectionOntoX); // projecting twice changes nothing more
});

test("the determinant is the signed area of the transformed unit square", () => {
  assert.equal(signedArea(unitSquare), 1);
  for (const M of [scaling(2, 3), shear(2), projectionOntoX, rotationDegrees(90), scaling(-1, 1), [[1, 2], [3, 4]]]) {
    near(signedArea(transformedSquare(M)), det2(M));
  }
  assert.deepEqual(transformedSquare(shear(1)), [[0, 0], [1, 0], [2, 1], [1, 1]]);
  assert.deepEqual(transformedSquare(rotationDegrees(90)), [[0, 0], [0, 1], [-1, 1], [-1, 0]]);
  assert.equal(signedArea(transformedSquare(scaling(-1, 1))), -1); // clockwise
});

test("a matrix's columns are where the unit arrows land (links back to Matrices)", () => {
  const M = [[2, -1], [1, 1]];
  assert.deepEqual(matVec(M, [1, 0]), [2, 1]);
  assert.deepEqual(matVec(M, [0, 1]), [-1, 1]);
  assert.deepEqual(matVec(M, [1, 2]), [0, 3]); // 1·(2,1) + 2·(−1,1)
});

test("transformations compose by matrix multiplication, and in the order written", () => {
  const S = shear(1);
  const R = rotationDegrees(90);
  // shear after rotate: S·R; rotate after shear: R·S; they differ
  const SR = matMul(S, R);
  const RS = matMul(R, S);
  assert.deepEqual(SR, [[1, -1], [1, 0]]);
  assert.deepEqual(RS, [[0, -1], [1, 1]]);
  assert.deepEqual(matVec(SR, [1, 0]), matVec(S, matVec(R, [1, 0])));
});
