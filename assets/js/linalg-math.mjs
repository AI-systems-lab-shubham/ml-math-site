// Maths for Module 1 (first half): vectors, matrices and their products.
// Every number the pages show comes from here. A vector is an array of numbers;
// a matrix is an array of rows. Positions are 1-based in the helpers that mirror
// notation (v₁ is the first entry), 0-based everywhere else.
import { dotProduct } from "./foundations-math.mjs";

function assertSameDimension(a, b) {
  if (a.length !== b.length) {
    throw new RangeError(`dimensions differ: ${a.length} and ${b.length}`);
  }
}

/** Number of entries in a vector. */
export function dimension(v) {
  return v.length;
}

/** The i-th entry of a vector, counting from 1 as in v₁, v₂, … */
export function entryOf(v, i) {
  if (!Number.isInteger(i) || i < 1 || i > v.length) {
    throw new RangeError(`entry ${i} does not exist in a ${v.length}-entry vector`);
  }
  return v[i - 1];
}

/** a + b, entry by entry. */
export function add(a, b) {
  assertSameDimension(a, b);
  return a.map((x, i) => x + b[i]);
}

/** a − b, entry by entry. */
export function subtract(a, b) {
  assertSameDimension(a, b);
  return a.map((x, i) => x - b[i]);
}

/** c·v: every entry multiplied by the scalar c. */
export function scale(c, v) {
  return v.map((x) => c * x);
}

/** c₁v₁ + c₂v₂ + …  for coefficients cs and vectors vs of equal dimension. */
export function linearCombination(cs, vs) {
  if (cs.length !== vs.length) throw new RangeError("one coefficient per vector");
  if (vs.length === 0) throw new RangeError("need at least one vector");
  return vs
    .map((v, k) => scale(cs[k], v))
    .reduce((acc, term) => add(acc, term));
}

/**
 * Points of the tip-to-tail path for c₁v₁ + c₂v₂ + …: start at the origin and
 * add each scaled vector in turn. Returns one point per step, origin first.
 */
export function tipToTailPath(cs, vs) {
  const dim = vs[0].length;
  const path = [new Array(dim).fill(0)];
  vs.forEach((v, k) => path.push(add(path[k], scale(cs[k], v))));
  return path;
}

/** {rows, cols} of a matrix (array of equal-length rows). */
export function shape(M) {
  const cols = M[0].length;
  if (!M.every((r) => r.length === cols)) throw new RangeError("rows differ in length");
  return { rows: M.length, cols };
}

/** Number of entries in a matrix with the given shape. */
export function entryCount({ rows, cols }) {
  return rows * cols;
}

/** Row i of M (counting from 1), as a vector. */
export function row(M, i) {
  const { rows } = shape(M);
  if (!Number.isInteger(i) || i < 1 || i > rows) throw new RangeError(`no row ${i}`);
  return [...M[i - 1]];
}

/** Column j of M (counting from 1), as a vector. */
export function column(M, j) {
  const { cols } = shape(M);
  if (!Number.isInteger(j) || j < 1 || j > cols) throw new RangeError(`no column ${j}`);
  return M.map((r) => r[j - 1]);
}

/** Matrix whose columns are the given vectors. */
export function fromColumns(vs) {
  return vs[0].map((_, i) => vs.map((v) => v[i]));
}

/** True when A·B is defined: A's column count equals B's row count. */
export function canMultiply(A, B) {
  return shape(A).cols === shape(B).rows;
}

/** Shape of A·B, or null when the product is not defined. */
export function resultShape(A, B) {
  if (!canMultiply(A, B)) return null;
  return { rows: shape(A).rows, cols: shape(B).cols };
}

/** Mv computed as a row-by-row list of dot products (the "table" view). */
export function matVec(A, v) {
  const { cols } = shape(A);
  if (cols !== v.length) {
    throw new RangeError(`a matrix with ${cols} columns needs a ${cols}-entry vector`);
  }
  return A.map((r) => dotProduct(r, v));
}

/**
 * Mv computed as v₁·(column 1) + v₂·(column 2) + … (the "machine" view).
 * Always equals matVec; the page shows both.
 */
export function matVecByColumns(A, v) {
  const { cols } = shape(A);
  if (cols !== v.length) {
    throw new RangeError(`a matrix with ${cols} columns needs a ${cols}-entry vector`);
  }
  const columns = Array.from({ length: cols }, (_, j) => column(A, j + 1));
  return linearCombination(v, columns);
}

/** A·B, one dot product per output entry. */
export function matMul(A, B) {
  if (!canMultiply(A, B)) {
    const a = shape(A);
    const b = shape(B);
    throw new RangeError(
      `${a.rows}×${a.cols} times ${b.rows}×${b.cols} is not defined`,
    );
  }
  const { cols } = shape(B);
  return A.map((r) =>
    Array.from({ length: cols }, (_, j) => dotProduct(r, column(B, j + 1))),
  );
}

/**
 * Everything the stepper needs for output entry (i, j) of A·B, counting from 1:
 * the row, the column, the paired products and their sum.
 */
export function entryStep(A, B, i, j) {
  if (!canMultiply(A, B)) throw new RangeError("shapes do not fit");
  const r = row(A, i);
  const c = column(B, j);
  const terms = r.map((x, k) => x * c[k]);
  return { row: r, column: c, terms, sum: terms.reduce((s, t) => s + t, 0) };
}

/** Number of scalar multiplications in A·B (m·n·p for m×n times n×p). */
export function multiplyCount(A, B) {
  if (!canMultiply(A, B)) throw new RangeError("shapes do not fit");
  const a = shape(A);
  return a.rows * a.cols * shape(B).cols;
}

/** Same count from shapes alone, for sizes too large to build a matrix of. */
export function multiplyCountFromShapes(a, b) {
  if (a.cols !== b.rows) throw new RangeError("shapes do not fit");
  return a.rows * a.cols * b.cols;
}

/** True when two matrices have equal entries. */
export function sameMatrix(A, B) {
  const a = shape(A);
  const b = shape(B);
  return (
    a.rows === b.rows && a.cols === b.cols && A.every((r, i) => r.every((x, j) => x === B[i][j]))
  );
}

/**
 * Sizes from the original Transformer base model (Vaswani et al., 2017, Table 3).
 * dK is the per-head key/value size; dFf is the feed-forward inner size.
 */
export const transformerBase = { dModel: 512, dK: 64, dFf: 2048 };

/**
 * Four made-up numbers standing in for the 512 entries of a real token
 * embedding. They are an illustration only, not weights from any model.
 */
export const illustrativeEmbedding = [0.2, -1.1, 0.7, 0.4];

/** Entry-by-entry product of two same-shape matrices (not matrix multiplication). */
export function entrywiseProduct(A, B) {
  const a = shape(A);
  const b = shape(B);
  if (a.rows !== b.rows || a.cols !== b.cols) throw new RangeError("shapes differ");
  return A.map((r, i) => r.map((x, j) => x * B[i][j]));
}

/**
 * Everything the home-page teaser shows for one matrix and one vector: the
 * output Mv, the same output built as v₁·(column 1) + v₂·(column 2), and the
 * row-by-row dot products as text. The two routes always agree.
 */
export function teaserMatVec(A, v) {
  const out = matVec(A, v);
  const byColumns = matVecByColumns(A, v);
  const rowText = A.map((r, i) => `${r.map((a, j) => `${a}×${v[j]}`).join(" + ")} = ${out[i]}`);
  return { out, byColumns, rowText, agree: sameMatrix(out.map((x) => [x]), byColumns.map((x) => [x])) };
}
