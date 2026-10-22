// Maths for Module 0 (first half). Every number the pages show comes from here.

/** Value of the expression a·x + b. */
export function affine(a, x, b) {
  return a * x + b;
}

/** Points (x, total - x) on the line x + y = total. */
export function splitTotal(total, xs) {
  return xs.map((x) => ({ x, y: total - x }));
}

/**
 * Solve a1·x + b1·y = c1 and a2·x + b2·y = c2.
 * Returns {kind:"unique", x, y}, {kind:"none"} (parallel, different) or
 * {kind:"infinite"} (the same line twice).
 */
export function solveTwoEquations(e1, e2) {
  const det = e1.a * e2.b - e2.a * e1.b;
  if (det !== 0) {
    return {
      kind: "unique",
      x: (e1.c * e2.b - e2.c * e1.b) / det,
      y: (e1.a * e2.c - e2.a * e1.c) / det,
    };
  }
  const sameLine =
    e1.a * e2.c === e2.a * e1.c && e1.b * e2.c === e2.b * e1.c;
  return { kind: sameLine ? "infinite" : "none" };
}

/** Table of f(x) for each x. */
export function tabulate(fn, xs) {
  return xs.map((x) => ({ x, y: fn(x) }));
}

/** Slope (rise over run) between two points; null for a vertical step. */
export function slopeBetween(p, q) {
  const run = q.x - p.x;
  return run === 0 ? null : (q.y - p.y) / run;
}

/** y = m·x + b. */
export function linearValue(m, x, b) {
  return m * x + b;
}

/** x where y = m·x + b crosses y = 0; null when m is 0. */
export function xIntercept(m, b) {
  return m === 0 ? null : -b / m;
}

/** start · factor^steps. */
export function exponentialValue(start, factor, steps) {
  return start * Math.pow(factor, steps);
}

/** Values after 0..steps repeated multiplications by factor. */
export function growthSequence(start, factor, steps) {
  return Array.from({ length: steps + 1 }, (_, n) =>
    exponentialValue(start, factor, n),
  );
}

/** Values after 0..steps repeated additions of amount. */
export function additionSequence(start, amount, steps) {
  return Array.from({ length: steps + 1 }, (_, n) => start + amount * n);
}

/** Smallest step count n with start·factor^n >= target (factor > 1, start > 0). */
export function stepsToReach(start, factor, target) {
  let n = 0;
  let value = start;
  while (value < target) {
    value *= factor;
    n += 1;
    if (n > 10000) return null;
  }
  return n;
}

/** Functions offered in the "functions and graphs" widget. */
export const namedFunctions = {
  doublePlusOne: { label: "double it, then add 1", tex: "2x+1", fn: (x) => 2 * x + 1 },
  square: { label: "multiply it by itself", tex: "x^{2}", fn: (x) => x * x },
  absolute: { label: "drop the minus sign", tex: "|x|", fn: (x) => Math.abs(x) },
};

/**
 * End points of the line a·x + b·y = c across the window, for drawing.
 * A vertical line (b = 0) runs from ymin to ymax.
 */
export function lineEndpoints({ a, b, c }, xmin, xmax, ymin, ymax) {
  if (b === 0) {
    const x = c / a;
    return [{ x, y: ymin }, { x, y: ymax }];
  }
  return [xmin, xmax].map((x) => ({ x, y: (c - a * x) / b }));
}

/** Sum of a list of numbers. */
export function total(values) {
  return values.reduce((acc, v) => acc + v, 0);
}

/** Tokens still free in a context window after a prompt of the given length. */
export function remainingTokens(windowSize, promptLength) {
  return windowSize - promptLength;
}

/* ---------- Module 0, second half ---------- */

const tidy = (v) => Math.round(v * 1e12) / 1e12;

/** How many times base must be multiplied together to reach x (rounded to 12 places to hide float noise). */
export function logSteps(base, x) {
  return tidy(Math.log(x) / Math.log(base));
}

/** Amplitude ratio for a rise of `steps` earthquake-magnitude units (10 per unit). */
export function magnitudeAmplitudeRatio(steps) {
  return Math.pow(10, steps);
}

/** Energy ratio for a rise of `steps` magnitude units, from log10 E = 1.5·M + const. */
export function magnitudeEnergyRatio(steps) {
  return Math.pow(10, 1.5 * steps);
}

/** Decibel change for a power ratio: 10·log10(ratio). */
export function decibelsFromPowerRatio(ratio) {
  return tidy(10 * Math.log10(ratio));
}

/** Decibel change for an amplitude ratio (pressure, voltage): 20·log10(ratio). */
export function decibelsFromAmplitudeRatio(ratio) {
  return tidy(20 * Math.log10(ratio));
}

/** Power ratio that corresponds to a decibel change. */
export function powerRatioFromDecibels(db) {
  return Math.pow(10, db / 10);
}

/** Amplitude ratio that corresponds to a decibel change. */
export function amplitudeRatioFromDecibels(db) {
  return Math.pow(10, db / 20);
}

/** pH of a solution with hydrogen-ion concentration in mol/L. */
export function pH(concentration) {
  return tidy(-Math.log10(concentration));
}

/** Octaves between two frequencies (each octave doubles the frequency). */
export function octavesBetween(f1, f2) {
  return logSteps(2, f2 / f1);
}

/** Yes/no questions (bits) needed to single out one of n equally likely options. */
export function bitsToChoose(n) {
  return logSteps(2, n);
}

/** Product of a list of numbers. */
export function product(values) {
  return values.reduce((acc, v) => acc * v, 1);
}

/** Sum of natural logarithms of a list of positive numbers. */
export function sumOfLogs(values) {
  return values.reduce((acc, v) => acc + Math.log(v), 0);
}

/** Perplexity from an average negative log-probability measured in nats. */
export function perplexityFromNats(nats) {
  return Math.exp(nats);
}

/** Convert nats to bits. */
export function natsToBits(nats) {
  return nats / Math.LN2;
}

/** Sum of f(i) for i = lo..hi (0 when hi < lo). */
export function sigma(lo, hi, f) {
  let acc = 0;
  for (let i = lo; i <= hi; i += 1) acc += f(i);
  return acc;
}

/** The individual terms f(lo)..f(hi). */
export function sigmaTerms(lo, hi, f) {
  const out = [];
  for (let i = lo; i <= hi; i += 1) out.push({ i, value: f(i) });
  return out;
}

/** Rules offered in the Σ widget. */
export const sigmaRules = {
  same: { label: "i", tex: "i", fn: (i) => i },
  square: { label: "i²", tex: "i^{2}", fn: (i) => i * i },
  odd: { label: "2i − 1", tex: "2i-1", fn: (i) => 2 * i - 1 },
};

/** Σ wᵢ·xᵢ over two equal-length lists. */
export function dotProduct(w, x) {
  if (w.length !== x.length) throw new Error("lists must have the same length");
  return sigma(0, w.length - 1, (i) => w[i] * x[i]);
}

/** Total surprise −Σ log2 p over a list of probabilities, in bits. */
export function totalSurpriseBits(probs) {
  return sigma(0, probs.length - 1, (i) => -Math.log2(probs[i]));
}

/** Mean of a list. */
export function mean(values) {
  return total(values) / values.length;
}

/** Median of a list (average of the middle pair when the length is even). */
export function median(values) {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** part as a percentage of whole. */
export function percentOf(part, whole) {
  return (part / whole) * 100;
}

/** Percentage change from old to new. */
export function percentChange(oldValue, newValue) {
  return ((newValue - oldValue) / oldValue) * 100;
}

/** Cosine and sine of an angle given in degrees (exact at multiples of 90°). */
export function cosSinDegrees(deg) {
  const d = ((deg % 360) + 360) % 360;
  if (d === 0) return { cos: 1, sin: 0 };
  if (d === 90) return { cos: 0, sin: 1 };
  if (d === 180) return { cos: -1, sin: 0 };
  if (d === 270) return { cos: 0, sin: -1 };
  const rad = (d * Math.PI) / 180;
  return { cos: Math.cos(rad), sin: Math.sin(rad) };
}

/** Horizontal and vertical parts of a force F pulling at an angle above the ground. */
export function forceComponents(force, deg) {
  const { cos, sin } = cosSinDegrees(deg);
  return { along: force * cos, up: force * sin };
}

/** Sinusoidal position encoding pair (sin, cos) at one frequency (Vaswani et al., 2017). */
export function positionEncodingPair(pos, i, dModel) {
  const angle = pos / Math.pow(10000, (2 * i) / dModel);
  return { sin: Math.sin(angle), cos: Math.cos(angle) };
}

/** 1-based entry of a list: the x₃ of (x₁, x₂, …). */
export function entryAt(list, i) {
  if (!Number.isInteger(i) || i < 1 || i > list.length) return undefined;
  return list[i - 1];
}

/** Wavelength (in positions) of the sin/cos pair with index i; i = 0 is the highest frequency. */
export function positionWavelength(i, dModel) {
  return 2 * Math.PI * Math.pow(10000, (2 * i) / dModel);
}
