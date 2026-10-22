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
