import test from "node:test";
import assert from "node:assert/strict";
import {
  dimension, entryOf, add, subtract, scale, linearCombination, tipToTailPath,
  shape, entryCount, row, column, fromColumns, canMultiply, resultShape,
  matVec, matVecByColumns, matMul, entryStep, multiplyCount,
  multiplyCountFromShapes, sameMatrix, teaserMatVec, transformerBase, illustrativeEmbedding, entrywiseProduct,
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
