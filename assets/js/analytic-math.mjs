// Module 2 (analytic geometry): norms, distance, the dot product, angles, orthogonality, projections
// and the variance of a dot product. Every number on a Module 2 page or widget comes from here
// (tests/analytic-math.test.mjs). Vectors are plain arrays of numbers.

const same = (a, b) => {
  if (a.length !== b.length) throw new RangeError(`vectors have different lengths (${a.length} and ${b.length})`);
};

/** Euclidean norm, ‖x‖₂ = √(Σ xᵢ²). Pythagoras in as many dimensions as there are entries. */
export const norm2 = (x) => Math.sqrt(x.reduce((s, v) => s + v * v, 0));

/** Sum of absolute values, ‖x‖₁ = Σ |xᵢ|: the length of a walk along the grid lines. */
export const norm1 = (x) => x.reduce((s, v) => s + Math.abs(v), 0);

/** Distance is the norm of the difference. `p` is 1 or 2. */
export function distance(a, b, p = 2) {
  same(a, b);
  const d = a.map((v, i) => v - b[i]);
  if (p === 1) return norm1(d);
  if (p === 2) return norm2(d);
  throw new RangeError("p must be 1 or 2");
}

/** Dot product, Σ aᵢbᵢ. */
export function dot(a, b) {
  same(a, b);
  return a.reduce((s, v, i) => s + v * b[i], 0);
}

export const isZero = (x) => x.every((v) => v === 0);

/** The arrow of length 1 in the direction of x. The zero vector has no direction, so it throws. */
export function unit(x) {
  if (isZero(x)) throw new RangeError("the zero vector has no direction");
  const n = norm2(x);
  return x.map((v) => v / n);
}

/**
 * Cosine similarity, (a·b) / (‖a‖‖b‖). It lies in [−1, 1] and ignores length.
 * The zero vector has no direction, so the angle and the cosine are undefined: this returns null for it
 * (never NaN, never 0). Rounding can push the quotient a hair outside [−1, 1]; it is clamped back.
 */
export function cosineSimilarity(a, b) {
  same(a, b);
  if (isZero(a) || isZero(b)) return null;
  const c = dot(a, b) / (norm2(a) * norm2(b));
  return Math.max(-1, Math.min(1, c));
}

/** The angle between two vectors in radians, from 0 to π, or null when either is the zero vector. */
export function angleBetween(a, b) {
  const c = cosineSimilarity(a, b);
  return c === null ? null : Math.acos(Math.max(-1, Math.min(1, c)));
}

export const toDegrees = (rad) => (rad * 180) / Math.PI;
export const toRadians = (deg) => (deg * Math.PI) / 180;

/** The geometric form of the dot product, ‖a‖‖b‖ cos θ. Equals `dot` for every pair (tested). */
export function dotFromAngle(a, b) {
  same(a, b);
  const theta = angleBetween(a, b);
  return theta === null ? 0 : norm2(a) * norm2(b) * Math.cos(theta);
}

/** "same" when the dot product is positive, "opposite" when negative, "perpendicular" when zero (within tol). */
export function dotSign(a, b, tol = 1e-9) {
  const d = dot(a, b);
  const scale = Math.max(1, norm2(a) * norm2(b));
  if (Math.abs(d) <= tol * scale) return "perpendicular";
  return d > 0 ? "same" : "opposite";
}

/** Orthogonal means a·b = 0 (within tol, relative to the lengths). The zero vector is orthogonal to everything. */
export const isOrthogonal = (a, b, tol = 1e-9) => dotSign(a, b, tol) === "perpendicular";

/** Work done by a constant force along a straight displacement: force · displacement. */
export const work = (force, displacement) => dot(force, displacement);

/** The vector with the given length at the given angle (degrees, counter-clockwise from the x-axis). */
export const polar = (length, degrees) => [length * Math.cos(toRadians(degrees)), length * Math.sin(toRadians(degrees))];

/**
 * Projection of a onto b: ((a·b)/(b·b)) b. Returns null when b is the zero vector (there is no line to project onto).
 */
export function project(a, b) {
  same(a, b);
  if (isZero(b)) return null;
  const k = dot(a, b) / dot(b, b);
  return b.map((v) => k * v);
}

/** The scalar k in proj = k·b, or null for b = 0. */
export function projectionCoefficient(a, b) {
  same(a, b);
  return isZero(b) ? null : dot(a, b) / dot(b, b);
}

/** What is left of a once its part along b is taken away: a − proj. It is orthogonal to b (tested). */
export function leftover(a, b) {
  const p = project(a, b);
  return p === null ? null : a.map((v, i) => v - p[i]);
}

/** The signed length of a's shadow on b's line, (a·b)/‖b‖. Negative when a points against b. */
export function shadowLength(a, b) {
  same(a, b);
  return isZero(b) ? null : dot(a, b) / norm2(b);
}

/** Points on the unit "circle" of the L1 or L2 norm (every point has norm 1), `count` of them. */
export function unitBall(p, count = 64) {
  const pts = [];
  for (let i = 0; i < count; i++) {
    const t = (2 * Math.PI * i) / count;
    const v = [Math.cos(t), Math.sin(t)];
    const n = p === 1 ? norm1(v) : norm2(v);
    pts.push(v.map((x) => x / n));
  }
  return pts;
}

/* ---------- the variance of a dot product (why divide by √d_k) ---------- */

/** A small seeded generator (mulberry32). The same seed always gives the same stream of numbers in [0, 1). */
export function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One draw with mean 0 and variance 1 from `dist`: "normal" (Box-Muller) or "coin" (±1 with equal chance). */
export function drawUnit(rand, dist) {
  if (dist === "coin") return rand() < 0.5 ? -1 : 1;
  if (dist === "normal") {
    const u = 1 - rand(); // in (0, 1], so the log is finite
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
  }
  throw new RangeError('dist must be "normal" or "coin"');
}

/**
 * Draw `samples` pairs (q, k) of d-entry vectors whose entries are independent with mean 0 and variance 1,
 * and measure the mean and variance of q·k, then of q·k/√d. `scaleVariance` is the variance of each entry
 * (1 by default); a value other than 1 shows what happens when the assumption is broken.
 */
export function simulateDotVariance({ d, samples, seed, dist = "normal", scaleVariance = 1 }) {
  const rand = seededRandom(seed);
  const sd = Math.sqrt(scaleVariance);
  const raw = [];
  for (let s = 0; s < samples; s++) {
    let total = 0;
    for (let i = 0; i < d; i++) total += sd * drawUnit(rand, dist) * sd * drawUnit(rand, dist);
    raw.push(total);
  }
  const stats = (xs) => {
    const m = xs.reduce((a, b) => a + b, 0) / xs.length;
    const v = xs.reduce((a, b) => a + (b - m) * (b - m), 0) / (xs.length - 1);
    return { mean: m, variance: v };
  };
  const scaled = raw.map((x) => x / Math.sqrt(d));
  return { raw, scaled, rawStats: stats(raw), scaledStats: stats(scaled) };
}

/**
 * The exact mean and variance of q·k when every entry of q and k is ±1 with equal chance, found by listing
 * all 2^(2d) pairs. Only for small d (at most 6). No sampling error at all.
 */
export function exactCoinDotStats(d) {
  if (!(d >= 1 && d <= 6)) throw new RangeError("d must be from 1 to 6");
  const count = 2 ** d;
  const vec = (bits) => Array.from({ length: d }, (_, i) => ((bits >> i) & 1 ? 1 : -1));
  let sum = 0, sumSq = 0;
  for (let a = 0; a < count; a++) {
    for (let b = 0; b < count; b++) {
      const v = dot(vec(a), vec(b));
      sum += v;
      sumSq += v * v;
    }
  }
  const n = count * count;
  const mean = sum / n;
  return { mean, variance: sumSq / n - mean * mean };
}

/** Variance of q·k as a formula: d · var(q) · var(k) for independent, mean-0 entries. */
export const dotVarianceFormula = (d, varQ = 1, varK = 1) => d * varQ * varK;

/** The scaling used in scaled dot-product attention: divide by √d_k. */
export const attentionScale = (dK) => 1 / Math.sqrt(dK);

/** The number of entries in a query or key of the original Transformer base model (Vaswani et al., 2017, Table 3). */
export const baseDK = 64;

/* ---------- identities used on the cards ---------- */

/** (‖a+b‖² − ‖a‖² − ‖b‖²) / 2: the dot product recovered from lengths alone. */
export function dotFromLengths(a, b) {
  same(a, b);
  const s = a.map((v, i) => v + b[i]);
  return (norm2(s) ** 2 - norm2(a) ** 2 - norm2(b) ** 2) / 2;
}

/**
 * One plain-SGD step on loss + (λ/2)‖w‖²: the gradient of the penalty is λw, so w ← w − η(g + λw).
 * `g` is the gradient of the loss alone.
 */
export const sgdStepWithPenalty = (w, g, eta, lambda) => w.map((v, i) => v - eta * (g[i] + lambda * v));

/** One plain-SGD step with weight decay applied directly: w ← (1 − ηλ)w − ηg. */
export const sgdStepWithDecay = (w, g, eta, lambda) => w.map((v, i) => (1 - eta * lambda) * v - eta * g[i]);
