export function linearValue(slope, intercept, x) {
  return slope * x + intercept;
}

export function calculateSlope(x1, y1, x2, y2) {
  if (x1 === x2) {
    throw new RangeError("A vertical line has no finite slope.");
  }
  return (y2 - y1) / (x2 - x1);
}

export function exponentialValue(initial, base, exponent) {
  return initial * base ** exponent;
}

export function logarithm(base, value) {
  if (base <= 0 || base === 1 || value <= 0) {
    throw new RangeError("A logarithm needs a positive base other than 1 and a positive value.");
  }
  return Math.log(value) / Math.log(base);
}

export function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

export function average(values) {
  if (values.length === 0) {
    throw new RangeError("An average needs at least one value.");
  }
  return sum(values) / values.length;
}

export function percentOf(percent, quantity) {
  return (percent / 100) * quantity;
}

export function solveLinearSystem(a1, b1, c1, a2, b2, c2) {
  const determinant = a1 * b2 - a2 * b1;
  if (determinant === 0) {
    throw new RangeError("The equations do not have a unique intersection.");
  }
  return {
    x: (c1 * b2 - c2 * b1) / determinant,
    y: (a1 * c2 - a2 * c1) / determinant,
  };
}

export function unitCircle(angleRadians) {
  return {
    cosine: Math.cos(angleRadians),
    sine: Math.sin(angleRadians),
  };
}
