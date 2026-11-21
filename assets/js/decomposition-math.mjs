// Module 3 (matrix decompositions): determinant, trace, eigenvalues and eigenvectors, eigendecomposition,
// the SVD and low-rank approximation. Every number on a Module 3 page or widget comes from here
// (tests/decomposition-math.test.mjs). Matrices are arrays of rows; vectors are plain arrays.
import { seededRandom } from "./analytic-math.mjs";

export const EPS = 2.220446049250313e-16;   // double-precision machine epsilon

/* ---------- small matrix helpers ---------- */
export const shapeOf = (A) => [A.length, A[0].length];
export const transpose = (A) => A[0].map((_, j) => A.map((row) => row[j]));
export const identity = (n) => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
export const matMul = (A, B) => {
  if (A[0].length !== B.length) throw new RangeError(`cannot multiply ${A.length}x${A[0].length} by ${B.length}x${B[0].length}`);
  return A.map((row) => B[0].map((_, j) => row.reduce((s, v, k) => s + v * B[k][j], 0)));
};
export const matVec = (A, v) => A.map((row) => row.reduce((s, a, j) => s + a * v[j], 0));
export const matAdd = (A, B) => A.map((row, i) => row.map((v, j) => v + B[i][j]));
export const matSub = (A, B) => A.map((row, i) => row.map((v, j) => v - B[i][j]));
export const matScale = (A, c) => A.map((row) => row.map((v) => v * c));
export const diag = (d) => d.map((v, i) => d.map((_, j) => (i === j ? v : 0)));

/** Sum of the squares of every entry: ‖A‖_F². */
export const frobeniusSq = (A) => A.reduce((s, row) => s + row.reduce((t, v) => t + v * v, 0), 0);
export const frobenius = (A) => Math.sqrt(frobeniusSq(A));
export const maxAbsDiff = (A, B) => Math.max(...A.map((row, i) => Math.max(...row.map((v, j) => Math.abs(v - B[i][j])))));

/** Inverse by Gauss-Jordan with partial pivoting. Throws when a pivot is (numerically) zero. */
export function inverse(A) {
  const n = A.length;
  const M = A.map((row, i) => [...row, ...identity(n)[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12) throw new RangeError("the matrix has no inverse (its determinant is 0)");
    [M[c], M[p]] = [M[p], M[c]];
    const d = M[c][c];
    M[c] = M[c].map((v) => v / d);
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c]; M[r] = M[r].map((v, j) => v - f * M[c][j]); }
  }
  return M.map((row) => row.slice(n));
}

export function matPower(A, n) {
  if (!Number.isInteger(n) || n < 0) throw new RangeError("n must be a whole number, 0 or more");
  let out = identity(A.length);
  for (let i = 0; i < n; i++) out = matMul(out, A);
  return out;
}

/* ---------- named 2x2 matrices (the Module 1 transformations) ---------- */
export const rotation = (theta) => [[Math.cos(theta), -Math.sin(theta)], [Math.sin(theta), Math.cos(theta)]];
export const shear = (k) => [[1, k], [0, 1]];
export const scaling = (sx, sy) => [[sx, 0], [0, sy]];
export const projectionX = () => [[1, 0], [0, 0]];

/* ---------- 1. determinant ---------- */
/** ad − bc for [[a, b], [c, d]]. */
export function det2(A) {
  if (A.length !== 2 || A[0].length !== 2) throw new RangeError("det2 needs a 2x2 matrix");
  return A[0][0] * A[1][1] - A[0][1] * A[1][0];
}

/** Where the corners of the unit square go: (0,0), (1,0), (1,1), (0,1), in that order. */
export const unitSquareImage = (A) => [[0, 0], [1, 0], [1, 1], [0, 1]].map((p) => matVec(A, p));

/** Shoelace formula: positive when the corners run counter-clockwise, negative when clockwise. */
export function signedArea(points) {
  let s = 0;
  points.forEach((p, i) => { const q = points[(i + 1) % points.length]; s += p[0] * q[1] - q[0] * p[1]; });
  return s / 2;
}

/** "keeps" (det > 0), "flips" (det < 0) or "collapses" (det = 0: a line or a point). Exact test on the number it is given. */
export const orientation = (d) => (d > 0 ? "keeps" : d < 0 ? "flips" : "collapses");

/** What the unit square becomes: "a parallelogram", "a line segment" or "a point". */
export function imageShape(A) {
  if (det2(A) !== 0) return "a parallelogram";
  return A.every((row) => row.every((v) => v === 0)) ? "a point" : "a line segment";
}

/* ---------- 2. trace ---------- */
export function trace(A) {
  if (A.length !== A[0].length) throw new RangeError("trace needs a square matrix");
  return A.reduce((s, row, i) => s + row[i], 0);
}

/* ---------- 3. eigenvalues and eigenvectors ---------- */
const cross2 = (u, v) => u[0] * v[1] - u[1] * v[0];
const unit2 = (v) => { const n = Math.hypot(v[0], v[1]); return v.map((x) => x / n); };
/** Eigenvectors are defined only up to scale, so fix one: unit length, first non-zero entry positive. */
const canonical = (v) => {
  const u = unit2(v);
  const first = Math.abs(u[0]) > 1e-12 ? u[0] : u[1];
  return first < 0 ? u.map((x) => (x === 0 ? 0 : -x)) : u;
};

/** The quantity tr² − 4 det. Its sign decides between two real eigenvalues, one repeated one, or none. */
export const discriminant2 = (A) => trace(A) ** 2 - 4 * det2(A);

/** (tr ± √(tr² − 4 det)) / 2, larger first. Returns null when the discriminant is negative: no real eigenvalues. */
export function eigenvalues2(A) {
  const tr = trace(A), d = discriminant2(A);
  const tol = 1e-12 * Math.max(1, tr * tr);
  if (d < -tol) return null;
  const r = Math.sqrt(Math.max(d, 0));
  return [(tr + r) / 2, (tr - r) / 2];
}

/** Av = λv with v non-zero, up to a tolerance relative to the sizes involved. */
export function isEigenpair(A, lambda, v, tol = 1e-9) {
  if (v.every((x) => x === 0)) return false;
  const Av = matVec(A, v);
  const gap = Math.hypot(...Av.map((x, i) => x - lambda * v[i]));
  return gap <= tol * Math.max(1, Math.hypot(...v)) * Math.max(1, Math.abs(lambda));
}

/** One unit eigenvector of a 2x2 matrix for a given eigenvalue (any one: the others are multiples of it, or a second direction). */
function eigenvector2(A, lambda) {
  const [[a, b], [c, d]] = A;
  if (b !== 0) return canonical([b, lambda - a]);
  if (c !== 0) return canonical([lambda - d, c]);
  return Math.abs(lambda - a) <= Math.abs(lambda - d) ? [1, 0] : [0, 1];   // diagonal matrix
}

/**
 * Every case, explicitly:
 *  - kind "distinct": two different real eigenvalues, two independent eigen-directions;
 *  - kind "repeated": one eigenvalue counted twice; `defective` is true (only one direction, e.g. a shear with k ≠ 0)
 *    unless the matrix is a multiple of the identity (every direction is an eigen-direction);
 *  - kind "none": tr² − 4 det < 0, so there are no real eigenvalues and no real eigenvector (a rotation by
 *    an angle that is not a multiple of π).
 * `values` is larger first; `vectors[i]` goes with `values[i]`; for a scalar multiple of the identity, vectors are (1,0), (0,1).
 */
export function eigen2(A) {
  const discriminant = discriminant2(A);
  const values = eigenvalues2(A);
  if (values === null) return { kind: "none", discriminant, values: [], vectors: [], directions: 0, defective: false, diagonalisable: false };
  const tol = 1e-12 * Math.max(1, trace(A) ** 2);
  if (Math.abs(discriminant) <= tol) {
    const lam = values[0];
    const small = 1e-12 * Math.max(1, Math.abs(lam));   // rotation(π) is −I up to rounding
    const scalarMultipleOfI = Math.abs(A[0][1]) <= small && Math.abs(A[1][0]) <= small && Math.abs(A[0][0] - A[1][1]) <= small;
    if (scalarMultipleOfI) return { kind: "repeated", discriminant, values: [lam, lam], vectors: [[1, 0], [0, 1]], directions: 2, defective: false, diagonalisable: true };
    return { kind: "repeated", discriminant, values: [lam, lam], vectors: [eigenvector2(A, lam)], directions: 1, defective: true, diagonalisable: false };
  }
  return { kind: "distinct", discriminant, values, vectors: values.map((l) => eigenvector2(A, l)), directions: 2, defective: false, diagonalisable: true };
}

/** For a unit vector at angle θ: the 2D cross product of v and Av. It is 0 exactly when Av is parallel to v. */
export function parallelGap(A, theta) {
  const v = [Math.cos(theta), Math.sin(theta)];
  return cross2(v, matVec(A, v));
}

/** The factor by which A stretches the unit vector at angle θ (the length of Av). */
export const stretchAt = (A, theta) => Math.hypot(...matVec(A, [Math.cos(theta), Math.sin(theta)]));

/** Angles in [0, π) where Av is parallel to v, found from the exact eigenvectors (not by scanning). */
export const eigenAngles = (A) => eigen2(A).vectors.map((v) => { const t = Math.atan2(v[1], v[0]); return t < 0 ? t + Math.PI : t >= Math.PI ? t - Math.PI : t; });

/* ---------- 4. eigendecomposition ---------- */
/** A = P D P⁻¹ when A has two independent eigen-directions; otherwise null with the reason. */
export function eigendecompose2(A) {
  const e = eigen2(A);
  if (e.kind === "none") return { ok: false, reason: "no real eigenvalues" };
  if (!e.diagonalisable) return { ok: false, reason: "not enough independent eigenvectors (defective)" };
  const P = transpose(e.vectors);
  return { ok: true, P, D: diag(e.values), Pinv: inverse(P), values: e.values };
}

/** A^n computed as P D^n P⁻¹ (needs a full set of independent eigenvectors). */
export function powerViaEigen(A, n) {
  const f = eigendecompose2(A);
  if (!f.ok) throw new RangeError(`A^n = P D^n P⁻¹ needs a full set of independent eigenvectors: ${f.reason}`);
  return matMul(matMul(f.P, diag(f.values.map((l) => l ** n))), f.Pinv);
}

export const isSymmetric = (A, tol = 0) => A.every((row, i) => row.every((v, j) => Math.abs(v - A[j][i]) <= tol));

/**
 * Cyclic Jacobi method for a symmetric n×n matrix. Returns eigenvalues, largest first, and Q whose columns are
 * orthonormal eigenvectors: A = Q Λ Qᵀ. Real eigenvalues and orthogonal eigenvectors are guaranteed for symmetric matrices.
 */
export function symmetricEigen(S) {
  if (!isSymmetric(S, 1e-12 * Math.max(1, frobenius(S)))) throw new RangeError("symmetricEigen needs a symmetric matrix");
  const n = S.length;
  const A = S.map((r) => [...r]);
  const Q = identity(n);
  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += A[p][q] ** 2;
    if (off < 1e-30 * Math.max(1, frobeniusSq(A))) break;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
      if (Math.abs(A[p][q]) < 1e-300) continue;
      const theta = (A[q][q] - A[p][p]) / (2 * A[p][q]);
      const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(1 + theta * theta));
      const c = 1 / Math.sqrt(1 + t * t), s = t * c;
      for (let k = 0; k < n; k++) { const akp = A[k][p], akq = A[k][q]; A[k][p] = c * akp - s * akq; A[k][q] = s * akp + c * akq; }
      for (let k = 0; k < n; k++) { const apk = A[p][k], aqk = A[q][k]; A[p][k] = c * apk - s * aqk; A[q][k] = s * apk + c * aqk; }
      for (let k = 0; k < n; k++) { const qkp = Q[k][p], qkq = Q[k][q]; Q[k][p] = c * qkp - s * qkq; Q[k][q] = s * qkp + c * qkq; }
    }
  }
  const order = A.map((_, i) => i).sort((i, j) => A[j][j] - A[i][i]);
  const values = order.map((i) => A[i][i]);
  const vectors = Q.map((row) => order.map((i) => row[i]));
  return { values, Q: vectors };
}

/* ---------- 5. singular value decomposition ---------- */
/** Tolerance below which a singular value counts as zero: max(m, n) · ε · σ₁ (the usual numerical-rank rule). */
export const rankTolerance = (m, n, sigma1) => Math.max(m, n) * EPS * sigma1;

/** Number of singular values above the tolerance. */
export function rankFromSingular(s, m, n, tol = rankTolerance(m, n, s[0] ?? 0)) {
  return s.filter((v) => v > tol).length;
}

/** Add unit vectors orthogonal to the given orthonormal columns, until there are `count` of them. */
function completeColumns(cols, dim, count) {
  const out = cols.map((c) => [...c]);
  for (let e = 0; out.length < count && e < dim; e++) {
    const v = Array.from({ length: dim }, (_, i) => (i === e ? 1 : 0));
    for (let pass = 0; pass < 2; pass++) for (const u of out) { const d = u.reduce((s, x, i) => s + x * v[i], 0); u.forEach((x, i) => { v[i] -= d * x; }); }
    const nv = Math.hypot(...v);
    if (nv > 1e-8) out.push(v.map((x) => x / nv));
  }
  return out;
}

/**
 * Thin SVD by one-sided Jacobi rotations: A = U Σ Vᵀ with p = min(m, n). U is m×p and V is n×p with orthonormal
 * columns (for a square matrix they are orthogonal matrices), `s` holds the singular values, non-negative and
 * descending. U and V are not unique: a column and its partner can both change sign, and equal singular values allow
 * any rotation inside their shared plane. We fix signs so the first non-zero entry of each column of V is positive.
 * U and V may be reflections (determinant −1), not only rotations. Full m×m, n×n versions would pad the columns.
 */
export function svd(A) {
  const [m, n] = shapeOf(A);
  if (m < n) { const r = svd(transpose(A)); return { U: r.V, s: r.s, V: r.U }; }
  const W = A.map((r) => [...r]);           // columns get rotated until they are orthogonal
  const V = identity(n);
  for (let sweep = 0; sweep < 80; sweep++) {
    let rotated = false;
    for (let p = 0; p < n - 1; p++) for (let q = p + 1; q < n; q++) {
      let alpha = 0, beta = 0, gamma = 0;
      for (let i = 0; i < m; i++) { alpha += W[i][p] ** 2; beta += W[i][q] ** 2; gamma += W[i][p] * W[i][q]; }
      if (gamma === 0 || Math.abs(gamma) <= 1e-15 * Math.sqrt(alpha * beta)) continue;
      rotated = true;
      const zeta = (beta - alpha) / (2 * gamma);
      const t = Math.sign(zeta || 1) / (Math.abs(zeta) + Math.sqrt(1 + zeta * zeta));
      const c = 1 / Math.sqrt(1 + t * t), s = c * t;
      for (const M of [W, V]) for (let i = 0; i < M.length; i++) { const x = M[i][p], y = M[i][q]; M[i][p] = c * x - s * y; M[i][q] = s * x + c * y; }
    }
    if (!rotated) break;
  }
  const norms = Array.from({ length: n }, (_, j) => Math.hypot(...W.map((r) => r[j])));
  const order = norms.map((_, j) => j).sort((i, j) => norms[j] - norms[i]);
  const s = order.map((j) => norms[j]);
  const tol = rankTolerance(m, n, s[0]);
  const Vc = order.map((j) => V.map((r) => r[j]));                    // columns as arrays
  let Uc = order.map((j) => (norms[j] > tol ? W.map((r) => r[j] / norms[j]) : null));
  const good = Uc.filter(Boolean);
  const filled = completeColumns(good, m, n);
  let next = good.length;
  Uc = Uc.map((c) => c ?? filled[next++]);
  // Sign convention: first non-zero entry of each V column positive (flip the partner U column with it).
  Vc.forEach((col, j) => {
    const first = col.find((x) => Math.abs(x) > 1e-12) ?? 0;
    if (first < 0) { col.forEach((_, i) => { col[i] = -col[i]; }); Uc[j] = Uc[j].map((x) => -x); }
  });
  const clean = (x) => (Math.abs(x) < 1e-15 ? 0 : x);
  return {
    U: Array.from({ length: m }, (_, i) => Uc.map((c) => clean(c[i]))),
    s,
    V: Array.from({ length: n }, (_, i) => Vc.map((c) => clean(c[i]))),
  };
}

/** U Σ Vᵀ, to check the factorisation. */
export const svdReconstruct = ({ U, s, V }) => matMul(matMul(U, diag(s)), transpose(V));

/** Singular values as √ of the eigenvalues of AᵀA (clamped at 0: they are never negative, rounding can dip a hair below). */
export function singularFromGram(A) {
  const { values } = symmetricEigen(matMul(transpose(A), A));
  return values.map((l) => Math.sqrt(Math.max(l, 0)));
}

/** The unit circle sent through A: points on an ellipse (when A is invertible). */
export const circleImage = (A, count = 72) =>
  Array.from({ length: count }, (_, i) => { const t = (2 * Math.PI * i) / count; return matVec(A, [Math.cos(t), Math.sin(t)]); });

/** The unit circle after each stage of Vᵀ, then Σ, then U, for a 2×2 matrix. Stage 0 is the circle itself. */
export function svdStages(A, count = 72) {
  const { U, s, V } = svd(A);
  const circle = Array.from({ length: count }, (_, i) => { const t = (2 * Math.PI * i) / count; return [Math.cos(t), Math.sin(t)]; });
  const afterVt = circle.map((p) => matVec(transpose(V), p));
  const afterSigma = afterVt.map((p) => matVec(diag(s), p));
  const afterU = afterSigma.map((p) => matVec(U, p));
  return { U, s, V, stages: [circle, afterVt, afterSigma, afterU] };
}

/* ---------- 6. low-rank approximation ---------- */
/** A_k = Σ_{i<k} σᵢ uᵢ vᵢᵀ. */
export function truncatedSvd(A, k, f = svd(A)) {
  const [m, n] = shapeOf(A);
  const kk = Math.max(0, Math.min(k, f.s.length));
  return Array.from({ length: m }, (_, i) => Array.from({ length: n }, (_, j) => {
    let v = 0;
    for (let r = 0; r < kk; r++) v += f.s[r] * f.U[i][r] * f.V[j][r];
    return v;
  }));
}

/** Eckart-Young: the squared Frobenius error of the best rank-k approximation is the sum of the remaining squared singular values. */
export const bestErrorFrobSq = (s, k) => s.slice(k).reduce((t, v) => t + v * v, 0);
/** … and its spectral-norm error is σ_{k+1} (0 when k reaches the number of singular values). */
export const bestErrorSpectral = (s, k) => (k < s.length ? s[k] : 0);

/** Numbers stored by a rank-k truncated SVD of an m×n matrix: k columns of U, k of V and k singular values. */
export const storageTruncated = (m, n, k) => k * (m + n + 1);
export const storageFull = (m, n) => m * n;
/** Numbers a LoRA update stores: B is m×r and A is r×n, with no separate singular values. */
export const storageLoRA = (m, n, r) => r * (m + n);
/** Largest k for which the truncated SVD stores fewer numbers than the matrix itself. */
export const breakEvenRank = (m, n) => Math.ceil((m * n) / (m + n + 1)) - 1;

/** A rank-≤r update ΔW = B A, with B m×r and A r×n; W₀ + BA can be merged into one matrix. */
export const loraUpdate = (B, A) => matMul(B, A);
export const mergeUpdate = (W0, B, A) => matAdd(W0, matMul(B, A));

/** A 16×16 "picture" made in code (no image file): a smooth ramp, a bright disc and a diagonal stripe. Values in [0, 1]. */
export function pattern16() {
  const N = 16;
  return Array.from({ length: N }, (_, i) => Array.from({ length: N }, (_, j) => {
    const ramp = 0.25 * (j / (N - 1));
    const disc = Math.hypot(i - 5.5, j - 9.5) < 3.2 ? 0.55 : 0;
    const stripe = Math.abs(i - j) < 1.2 ? 0.35 : 0;
    return Math.min(1, ramp + disc + stripe);
  }));
}

/** A seeded matrix of normal-ish entries, for tests (entries rounded to quarters so failures read well). */
export function randomMatrix(m, n, seed) {
  const rand = seededRandom(seed);
  return Array.from({ length: m }, () => Array.from({ length: n }, () => Math.round((rand() * 2 - 1) * 8) / 4));
}
