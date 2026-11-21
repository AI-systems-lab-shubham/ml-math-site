import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { validateChecks, resolveAnswer, fillTemplate, formatNumber, itemsFor, SLOTS } from "../assets/js/checks-core.mjs";
import { answers } from "../assets/js/check-answers.mjs";
import { shear, scaling, rotation, projectionX, svd, pattern16 } from "../assets/js/decomposition-math.mjs";

const good = () => ({
  concept: "m99-x",
  items: [
    { id: "p1", slot: "predict", prompt: "q", answer: { fn: "det2", args: [[[3, 1], [2, 4]]] }, hint: "h", explain: "The answer is {answer}." },
    { id: "s1", slot: "spot", prompt: "q", choices: [{ text: "a", correct: true, why: "w" }, { text: "b", why: "w" }] },
    { id: "r1", slot: "reveal", prompt: "q", reasoning: "r" },
    { id: "e1", slot: "explain", prompt: "q", model: "m" },
  ],
});
const errs = (mutate) => { const d = good(); mutate(d); return validateChecks(d, answers, "m99-x"); };

test("a well-formed file has no problems and covers all four slots", () => {
  assert.deepEqual(validateChecks(good(), answers, "m99-x"), []);
  assert.deepEqual(SLOTS, ["predict", "spot", "reveal", "explain"]);
  assert.equal(itemsFor(good(), "spot").length, 1);
});
test("each kind of mistake is reported (the validator bites)", () => {
  assert.ok(errs((d) => { d.concept = "other"; }).some((e) => /concept/.test(e)));
  assert.ok(errs((d) => { d.items = []; }).some((e) => /no items/.test(e)));
  assert.ok(errs((d) => { d.items[1].id = "p1"; }).some((e) => /duplicate/.test(e)));
  assert.ok(errs((d) => { d.items[0].id = "Bad Id"; }).some((e) => /kebab/.test(e)));
  assert.ok(errs((d) => { d.items[0].slot = "quiz"; }).some((e) => /slot/.test(e)));
  assert.ok(errs((d) => { d.items[0].prompt = " "; }).some((e) => /prompt/.test(e)));
  assert.ok(errs((d) => { d.items[0].answer = { fn: "nope", args: [] }; }).some((e) => /unknown answer function/.test(e)));
  assert.ok(errs((d) => { d.items[0].answer = { fn: "det2", args: [[[1, 2], [2, 4]]] }; d.items[0].explain = "{x}"; }).some((e) => /token/.test(e)));
  assert.ok(errs((d) => { delete d.items[0].hint; }).some((e) => /hint/.test(e)));
  assert.ok(errs((d) => { d.items[0].answer = 7; }).length > 0, "a typed-in number is not an answer");
  assert.ok(errs((d) => { d.items[1].choices[1].correct = true; }).some((e) => /exactly one/.test(e)));
  assert.ok(errs((d) => { d.items[1].choices[0].correct = false; }).some((e) => /exactly one/.test(e)));
  assert.ok(errs((d) => { d.items[1].choices.pop(); }).some((e) => /two choices/.test(e)));
  assert.ok(errs((d) => { d.items[1].choices[0].why = ""; }).some((e) => /why/.test(e)));
  assert.ok(errs((d) => { delete d.items[2].reasoning; }).some((e) => /reasoning/.test(e)));
  assert.ok(errs((d) => { delete d.items[3].model; }).some((e) => /model/.test(e)));
  assert.ok(errs((d) => { d.items[1].answer = { fn: "det2", args: [] }; }).some((e) => /only predict/.test(e)));
  assert.deepEqual(validateChecks(null, answers, "x"), ["not an object"]);
});
test("answers come from tested maths: the registry returns the values the tests pin down", () => {
  assert.equal(resolveAnswer(good().items[0], answers), 10);
  const r = (fn, ...args) => resolveAnswer({ id: "t", answer: { fn, args } }, answers);
  assert.equal(r("det2", [[2, 1], [1, 3]]), 5);
  assert.equal(r("trace", [[2, 1], [1, 3]]), 5);
  assert.equal(r("traceOfProduct", [[1, 2], [3, 4]], [[0, 1], [1, 0]]), r("traceOfProduct", [[0, 1], [1, 0]], [[1, 2], [3, 4]]));
  assert.equal(r("areaOfUnitSquareImage", scaling(2, 3)), 6);
  assert.equal(r("discriminant2", rotation(1)) < 0, true);
  assert.equal(r("largerEigenvalue", [[4, 1], [2, 3]]), 5);
  assert.equal(r("smallerEigenvalue", [[4, 1], [2, 3]]), 2);
  assert.equal(r("powerEntry", [[4, 1], [2, 3]], 1, 0, 0), 4);
  assert.ok(Math.abs(r("singularValue", shear(1), 0) - 1.618033988749895) < 1e-12);
  assert.ok(Math.abs(r("singularProduct", shear(1)) - 1) < 1e-12);
  assert.ok(Math.abs(r("sumSquaredEntries", shear(1)) - 3) < 1e-12);
  assert.equal(r("rank", projectionX()), 1);
  assert.equal(r("storageTruncated", 512, 512, 8), 8200);
  assert.equal(r("storageLoRA", 512, 512, 8), 8192);
  assert.equal(r("storageFull", 512, 512), 262144);
  const s = svd(pattern16()).s;
  assert.ok(Math.abs(r("errorFrobSq", pattern16(), 3) - s.slice(3).reduce((t, v) => t + v * v, 0)) < 1e-9);
  assert.ok(Math.abs(r("errorSpectral", pattern16(), 3) - s[3]) < 1e-12);
});
test("resolveAnswer rejects an unknown function and a result that is not a finite number; arguments are not shared between calls", () => {
  assert.throws(() => resolveAnswer({ id: "t", answer: { fn: "nope" } }, answers), /unknown answer function/);
  assert.throws(() => resolveAnswer({ id: "t", answer: { fn: "x" } }, { x: () => NaN }), /finite/);
  assert.throws(() => resolveAnswer({ id: "t", answer: { fn: "x" } }, { x: () => "5" }), /finite/);
  const item = { id: "t", answer: { fn: "x", args: [[1, 2]] } };
  resolveAnswer(item, { x: (a) => { a.push(9); return 1; } });
  assert.deepEqual(item.answer.args, [[1, 2]]);
});
test("templates put the computed number in {answer}; other tokens throw", () => {
  assert.equal(fillTemplate("is {answer}.", 1.6180339), "is 1.618.");
  assert.equal(fillTemplate("{answer} and {answer}", -0), "0 and 0");
  assert.throws(() => fillTemplate("{other}", 1), /unknown token/);
  assert.equal(formatNumber(8200), "8200");
});
test("every data/checks/<concept-id>.json is valid, and matches its page's slots in both directions (nothing lost, nothing orphaned)", () => {
  const dir = new URL("../data/checks/", import.meta.url);
  const course = JSON.parse(readFileSync(new URL("../data/course.json", import.meta.url), "utf8"));
  const byId = new Map(course.modules.flatMap((m) => m.concepts).map((c) => [c.id, c]));
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".json")) : [];
  for (const f of files) {
    const id = f.replace(/\.json$/, "");
    const data = JSON.parse(readFileSync(new URL(f, dir), "utf8"));
    assert.deepEqual(validateChecks(data, answers, id), [], f);
    const c = byId.get(id);
    assert.ok(c, `${f} names no concept in course.json`);
    const page = readFileSync(new URL(`../${c.path}index.html`, import.meta.url), "utf8");
    const used = new Set([...page.matchAll(/data-checks="([a-z]+)"/g)].map((m) => m[1]));
    const have = new Set(data.items.map((i) => i.slot));
    for (const s of have) assert.ok(used.has(s), `${f}: items in slot "${s}" but the page has no data-checks="${s}"`);
    for (const s of used) assert.ok(have.has(s), `${c.path}: slot "${s}" has no items in ${f}`);
    assert.ok(page.includes('type="module"'), `${c.path} loads no module`);
  }
  // pages with slots must have a file
  for (const c of byId.values()) {
    const p = new URL(`../${c.path}index.html`, import.meta.url);
    if (!existsSync(p)) continue;
    if (/data-checks="/.test(readFileSync(p, "utf8"))) assert.ok(files.includes(`${c.id}.json`), `${c.path} has check slots but no data/checks/${c.id}.json`);
  }
});
