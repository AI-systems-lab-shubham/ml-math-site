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

// ---- Part 2: transpose, inverse, systems, rank, transformations ----
//
// Exact arithmetic: rank, solveSystem, inverse and determinant work on small
// INTEGER matrices with exact fractions {n, d} (d > 0, lowest terms). They
// throw on a non-integer entry, so no tolerance is ever used. The only
// floating-point code is the rotation (cos, sin), documented where it is used.

const gcd = (a, b) => (b === 0 ? Math.abs(a) : gcd(b, a % b));

/** Exact fraction n/d in lowest terms with d > 0. */
export function frac(n, d = 1) {
  if (!Number.isInteger(n) || !Number.isInteger(d)) throw new RangeError("fractions need integers");
  if (d === 0) throw new RangeError("division by zero");
  const g = gcd(n, d) || 1;
  const s = d < 0 ? -1 : 1;
  return { n: (s * n) / g, d: (s * d) / g };
}
export const fracAdd = (a, b) => frac(a.n * b.d + b.n * a.d, a.d * b.d);
export const fracSub = (a, b) => frac(a.n * b.d - b.n * a.d, a.d * b.d);
export const fracMul = (a, b) => frac(a.n * b.n, a.d * b.d);
export const fracDiv = (a, b) => frac(a.n * b.d, a.d * b.n);
export const fracIsZero = (a) => a.n === 0;
export const fracToNumber = (a) => a.n / a.d;
export const fracToString = (a) => (a.d === 1 ? String(a.n) : `${a.n}/${a.d}`);

function fracMatrix(M) {
  shape(M);
  return M.map((r) => r.map((x) => frac(x)));
}

/** Transpose: rows become columns, so entry (i, j) moves to (j, i). */
export function transpose(M) {
  const { rows, cols } = shape(M);
  return Array.from({ length: cols }, (_, j) => Array.from({ length: rows }, (_, i) => M[i][j]));
}

/** n×n identity: 1 on the diagonal, 0 elsewhere. */
export function identity(n) {
  if (!Number.isInteger(n) || n < 1) throw new RangeError("identity needs a positive size");
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
}

/** True when the matrix has as many rows as columns. */
export function isSquare(M) {
  const { rows, cols } = shape(M);
  return rows === cols;
}

/** Determinant of a 2×2 matrix, ad − bc. Works for any numbers (used for the unit-square area scale). */
export function det2(M) {
  const { rows, cols } = shape(M);
  if (rows !== 2 || cols !== 2) throw new RangeError("det2 needs a 2×2 matrix");
  return M[0][0] * M[1][1] - M[0][1] * M[1][0];
}

/**
 * Gauss–Jordan elimination in exact fractions. Reduces the integer matrix M
 * (optionally with extra columns appended) and reports the pivot columns.
 */
function reduce(M, pivotCols = shape(M).cols) {
  const A = fracMatrix(M);
  const { rows, cols } = shape(M);
  const pivots = [];
  let r = 0;
  for (let c = 0; c < pivotCols && r < rows; c++) {
    let p = r;
    while (p < rows && fracIsZero(A[p][c])) p++;
    if (p === rows) continue;
    [A[r], A[p]] = [A[p], A[r]];
    const lead = A[r][c];
    A[r] = A[r].map((x) => fracDiv(x, lead));
    for (let i = 0; i < rows; i++) {
      if (i !== r && !fracIsZero(A[i][c])) {
        const f = A[i][c];
        A[i] = A[i].map((x, j) => fracSub(x, fracMul(f, A[r][j])));
      }
    }
    pivots.push(c);
    r++;
  }
  return { A, pivots, cols };
}

/** Rank = number of independent columns = number of pivots after elimination. Exact for integer matrices. */
export function rank(M) {
  return reduce(M).pivots.length;
}

/** True when the columns (given as vectors) are linearly independent. */
export function areIndependent(vs) {
  return rank(fromColumns(vs)) === vs.length;
}

/** True when w lies in the span of the vectors vs (adding w as a column does not raise the rank). */
export function inSpan(vs, w) {
  return rank(fromColumns([...vs, w])) === rank(fromColumns(vs));
}

/** Determinant of a square integer matrix, exact (fraction). */
export function determinant(M) {
  if (!isSquare(M)) throw new RangeError("only a square matrix has a determinant");
  const A = fracMatrix(M);
  const n = A.length;
  let det = frac(1);
  for (let c = 0; c < n; c++) {
    let p = c;
    while (p < n && fracIsZero(A[p][c])) p++;
    if (p === n) return frac(0);
    if (p !== c) {
      [A[c], A[p]] = [A[p], A[c]];
      det = fracSub(frac(0), det);
    }
    det = fracMul(det, A[c][c]);
    for (let i = c + 1; i < n; i++) {
      const f = fracDiv(A[i][c], A[c][c]);
      A[i] = A[i].map((x, j) => fracSub(x, fracMul(f, A[c][j])));
    }
  }
  return det;
}

/**
 * Inverse of a square integer matrix as a matrix of exact fractions, or null
 * when none exists (not square, or determinant zero).
 */
export function inverse(M) {
  if (!isSquare(M)) return null;
  const n = M.length;
  const augmented = M.map((r, i) => [...r, ...identity(n)[i]]);
  const { A, pivots } = reduce(augmented, n);
  if (pivots.length < n) return null;
  return A.map((r) => r.slice(n));
}

/** Product of two fraction matrices (for checking A·A⁻¹ = I exactly). */
export function fracMatMul(A, B) {
  const cols = B[0].length;
  return A.map((r) =>
    Array.from({ length: cols }, (_, j) =>
      r.reduce((s, x, k) => fracAdd(s, fracMul(x, B[k][j])), frac(0)),
    ),
  );
}

/** Fraction matrix → numbers, for display and comparison. */
export function fracMatrixToNumbers(F) {
  return F.map((r) => r.map(fracToNumber));
}

/**
 * Solve A·x = b exactly (integer A and b). A system has no solution, exactly
 * one, or infinitely many, never two. Returns
 *   { kind: "none" | "one" | "infinite", rank, solution?, freeVariables? }.
 * For "infinite", solution is one particular solution (free variables set to 0).
 */
export function solveSystem(A, b) {
  const { rows, cols } = shape(A);
  if (b.length !== rows) throw new RangeError("one right-hand side per equation");
  const aug = A.map((r, i) => [...r, b[i]]);
  const { A: R, pivots } = reduce(aug, cols);
  const rk = pivots.length;
  const inconsistent = R.some((r) => r.slice(0, cols).every(fracIsZero) && !fracIsZero(r[cols]));
  if (inconsistent) return { kind: "none", rank: rk };
  const solution = Array.from({ length: cols }, () => frac(0));
  pivots.forEach((c, i) => { solution[c] = R[i][cols]; });
  if (rk === cols) return { kind: "one", rank: rk, solution };
  return { kind: "infinite", rank: rk, solution, freeVariables: cols - rk };
}

/** Rotation by θ radians, counter-clockwise, vectors as columns: [[cos θ, −sin θ], [sin θ, cos θ]]. */
export function rotation(theta) {
  return [[Math.cos(theta), -Math.sin(theta)], [Math.sin(theta), Math.cos(theta)]];
}

/**
 * Rotation by a whole number of degrees. Multiples of 90° use exact entries
 * (0, ±1) so no rounding noise like 6e-17 appears; other angles use cos and
 * sin in floating point (tests compare them with a tolerance of 1e-12).
 */
export function rotationDegrees(deg) {
  const d = ((deg % 360) + 360) % 360;
  const exact = { 0: [1, 0], 90: [0, 1], 180: [-1, 0], 270: [0, -1] }[d];
  if (exact) { const [c, s] = exact; return [[c, -s], [s, c]]; }
  return rotation((deg * Math.PI) / 180);
}

/** Stretch the x-direction by sx and the y-direction by sy: [[sx, 0], [0, sy]]. */
export function scaling(sx, sy) {
  return [[sx, 0], [0, sy]];
}

/** Horizontal shear [[1, k], [0, 1]]: (x, y) goes to (x + k·y, y). */
export function shear(k) {
  return [[1, k], [0, 1]];
}

/** Projection onto the x-axis: [[1, 0], [0, 0]]. */
export const projectionOntoX = [[1, 0], [0, 0]];

/** Corners of the unit square, in order, counter-clockwise: (0,0), (1,0), (1,1), (0,1). */
export const unitSquare = [[0, 0], [1, 0], [1, 1], [0, 1]];

/** Where each unit-square corner lands under the 2×2 matrix M. */
export function transformedSquare(M) {
  return unitSquare.map((p) => matVec(M, p));
}

/** Signed area of a polygon from its corners (shoelace formula); positive when counter-clockwise. */
export function signedArea(points) {
  let s = 0;
  points.forEach((p, i) => {
    const q = points[(i + 1) % points.length];
    s += p[0] * q[1] - q[0] * p[1];
  });
  return s / 2;
}

/**
 * 2×2 inverse by the formula (1/(ad − bc))·[[d, −b], [−c, a]], in exact fractions.
 * Null when ad − bc = 0. Integer entries only. Agrees with `inverse` (tested).
 */
export function inverse2ByFormula(M) {
  const { rows, cols } = shape(M);
  if (rows !== 2 || cols !== 2) throw new RangeError("inverse2ByFormula needs a 2×2 matrix");
  const [[a, b], [c, d]] = M;
  const det = a * d - b * c;
  if (det === 0) return null;
  return [[frac(d, det), frac(-b, det)], [frac(-c, det), frac(a, det)]];
}

/**
 * Rank of a 2×2 matrix with any real entries: 2 when |ad − bc| > 1e-12, else 0 when
 * every entry is within 1e-12 of zero, else 1. The tolerance 1e-12 only matters for
 * rotation entries (cos, sin in floating point); the matrices that really are singular
 * here (zero scales, the projection) have a determinant of exactly 0.
 */
export function rank2(M) {
  const { rows, cols } = shape(M);
  if (rows !== 2 || cols !== 2) throw new RangeError("rank2 needs a 2×2 matrix");
  const TOL = 1e-12;
  if (Math.abs(det2(M)) > TOL) return 2;
  return M.flat().every((x) => Math.abs(x) <= TOL) ? 0 : 1;
}

/** Entries needed to store a rank-r update to a d×k matrix as a d×r matrix times an r×k matrix: r·(d + k). */
export function lowRankEntryCount(d, k, r) {
  return r * (d + k);
}
