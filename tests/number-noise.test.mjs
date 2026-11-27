import test from "node:test";
import assert from "node:assert/strict";
import { hyphenMinuses, noisyNumbers, unroundedInterpolations } from "../tools/lib/number-noise.mjs";
import { denoise, norm2 } from "../assets/js/analytic-math.mjs";

test("noisyNumbers flags float noise", () => {
  for (const bad of ["2.0000000000000004", "12.999999999999998", "0.4999999999999999", "3.14159265358979"]) {
    assert.equal(noisyNumbers(`value ${bad} here`).length, 1, bad);
  }
});

test("noisyNumbers leaves deliberate precision, large integers and identifiers alone", () => {
  for (const ok of ["0.77", "3.61", "1.618", "0.707", "63.6", "1.414", "1,000,000,000,000", "262,144", "arXiv:2106.09685", "12345678"]) {
    assert.deepEqual(noisyNumbers(`value ${ok} here`), [], ok);
  }
});

test("denoise removes float noise only", () => {
  assert.equal(denoise(norm2([1, 1]) ** 2), 2);
  assert.equal(denoise(norm2([2, 3]) ** 2), 13);
  assert.equal(denoise(norm2([-2, 5]) ** 2), 29);
  for (const x of [0.77, 3.61, 1.618, 0.707, 63.6, 1.41421356237, -0.125, 0, 5]) assert.equal(denoise(x), x);
  assert.equal(String(denoise(1.9999999999999996)), "2");
  assert.equal(String(denoise(0.4999999999999999)), "0.5");
});

test("unroundedInterpolations finds raw float expressions in template literals", () => {
  const src = "const a = `L2 = √${norm2(v) ** 2}`;\nconst b = `ok √${denoise(norm2(v) ** 2)}`;\nconst c = `ok ${r3(Math.sqrt(2))}`;\nconst d = `ok ${2 ** 3 /* num-ok: exact */}`;";
  assert.deepEqual(unroundedInterpolations(src).map((h) => h.line), [1]);
});

test("hyphenMinuses flags a hyphen-minus before a digit and leaves the real minus and hyphenated words alone", () => {
  for (const bad of ["is -3 here", "the point (-1, 2)", "gives -0.5", "x = -4", "-1 to 1", "(1, -2)"]) assert.equal(hyphenMinuses(bad).length, 1, bad);
  for (const ok of ["is \u22123 here", "(\u22121, 2)", "GPT-3", "top-5 accuracy", "pages 2-3", "x-1", "(a)-1", "2022-05-01", "arXiv:2106.09685", "a self-2 thing", "plain text"]) assert.deepEqual(hyphenMinuses(ok), [], ok);
});
