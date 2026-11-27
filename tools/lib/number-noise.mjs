// Float-noise detection for displayed numbers. Pure functions, no I/O.
// A displayed number is noisy when it has more than MAX_DIGITS significant digits, or a run of 0000000 / 9999999.
export const MAX_DIGITS = 8;
const NUMBER = /\d[\d,]*(?:\.\d+)?/g;

/** Numbers in `text` that look like float noise: [{ token, why }]. */
export function noisyNumbers(text) {
  const out = [];
  for (const m of String(text).matchAll(NUMBER)) {
    const token = m[0];
    if (/arXiv:\s*$/i.test(String(text).slice(Math.max(0, m.index - 8), m.index))) continue;   // an identifier, not a computed number
    const plain = token.replace(/,/g, "");
    const digits = plain.replace(".", "").replace(/^0+/, "").replace(/0+$/, "");
    const fraction = plain.includes(".") ? plain.split(".")[1] : "";   // 1,000,000,000,000 is an exact integer, not noise
    if (/0{7}|9{7}/.test(fraction)) out.push({ token, why: "run of 0000000 or 9999999" });
    else if (digits.length > MAX_DIGITS) out.push({ token, why: `${digits.length} significant digits` });
  }
  return out;
}

const ROUNDERS = /\b(r1|r2|r3|f3|n|fmt|denoise|round|toFixed|toPrecision|toLocaleString|formatNumber|Math\.round|String)\s*\(|\.toFixed|\.toLocaleString/;
const RISKY = /\*\*|Math\.sqrt\(|\bnorm2\(|Math\.(cos|sin|exp|log|acos|atan2?)\(/;

/** Interpolations `${expr}` in JS source that compute a float but are not rounded: [{ line, expr }].
 *  Heuristic: add `/* num-ok *​/` inside the expression when an exact result is intended. */
export function unroundedInterpolations(source) {
  const out = [];
  source.split("\n").forEach((lineText, i) => {
    for (const m of lineText.matchAll(/\$\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g)) {
      const expr = m[1];
      if (RISKY.test(expr) && !ROUNDERS.test(expr) && !expr.includes("num-ok")) out.push({ line: i + 1, expr });
    }
  });
  return out;
}
