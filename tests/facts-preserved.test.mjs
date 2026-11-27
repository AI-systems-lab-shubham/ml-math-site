// A voice rewrite must not change facts (docs/VOICE.md section 5). For every card on the `rewritten` list in
// tests/fixtures/old-pages/manifest.json, compare the card (page HTML + its course.json and checks entries) with the
// version at the recorded baseline commit. Anything missing or added must be listed in tests/fixtures/facts-exceptions.json with a reason.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { extractFacts, diffFacts, applyExceptions } from "../tools/lib/facts.mjs";
import { rewrittenList } from "../tools/lib/rewritten.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const now = (p) => readFileSync(join(root, p), "utf8");
const at = (rev, p) => { try { return execFileSync("git", ["show", `${rev}:${p}`], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); } catch { return null; } };
const exceptions = JSON.parse(now("tests/fixtures/facts-exceptions.json"));
const course = JSON.parse(now("data/course.json"));
const find = (c, id) => c.modules.flatMap((m) => m.concepts).find((x) => x.id === id);

export function compareCard(r) {
  const c = find(course, r.concept);
  const oldCourse = JSON.parse(at(r.baseline, "data/course.json"));
  const oldHtml = at(r.baseline, `${c.path}index.html`);
  assert.ok(oldHtml, `baseline ${r.baseline} not available (CI needs fetch-depth 0)`);
  const oldChecks = at(r.baseline, `data/checks/${r.concept}.json`);
  let newChecks = null; try { newChecks = JSON.parse(now(`data/checks/${r.concept}.json`)); } catch { /* no checks file */ }
  const o = extractFacts({ html: oldHtml, courseEntry: find(oldCourse, r.concept), checks: oldChecks ? JSON.parse(oldChecks) : null });
  const n = extractFacts({ html: now(`${c.path}index.html`), courseEntry: find(course, r.concept), checks: newChecks });
  return diffFacts(o, n);
}

for (const r of rewrittenList()) {
  test(`facts preserved: ${r.concept}`, () => {
    const { diffs, notes } = compareCard(r);
    const { unexplained, stale } = applyExceptions(diffs, exceptions[r.concept] ?? []);
    assert.deepEqual(unexplained, [], `facts changed without an exception:\n${unexplained.map((d) => `  ${d.kind} ${d.category}: ${d.token}`).join("\n")}`);
    assert.deepEqual(stale, [], `exceptions that no longer match anything (remove them):\n${stale.join("\n")}`);
    if (notes.length) console.log(`  [${r.concept}] number mention counts changed (informational): ${notes.join("; ")}`);
  });
}

// Mutation tests on the extractor itself, using the first rewritten card's current page.
const sample = rewrittenList()[0];
const mutate = (name, fn) => test(`mutation caught: ${name}`, () => {
  const c = find(course, sample.concept);
  const html = now(`${c.path}index.html`);
  const base = extractFacts({ html });
  const changed = extractFacts({ html: fn(html) });
  assert.notEqual(diffFacts(base, changed).diffs.length, 0);
});
if (sample) {
  mutate("a number changed", (h) => h.replace(/175 billion/, "176 billion"));
  mutate("a citation year changed", (h) => h.replace("Brown et al., 2020", "Brown et al., 2021"));
  mutate("a TeX string changed", (h) => h.replace('data-tex="3x+2"', 'data-tex="3x+3"'));
  mutate("a provenance tag changed", (h) => h.replace("badge-convention", "badge-derived"));
  mutate("a lead-in label dropped", (h) => h.replace("<strong>Recognition rule.</strong>", ""));
  mutate("a Simplified caveat dropped", (h) => h.replace('class="callout simplified"', 'class="callout"'));
  mutate("the analogy caveat dropped", (h) => h.replace("<em>Where it breaks down:</em>", ""));
}
test("an exception without a reason is refused", () => {
  assert.throws(() => applyExceptions([], [{ kind: "added", category: "number", token: "1", reason: "" }]));
});
test("an unlisted difference is unexplained, and a listed one is explained", () => {
  const d = [{ kind: "added", category: "number", token: "9" }];
  assert.equal(applyExceptions(d, []).unexplained.length, 1);
  assert.equal(applyExceptions(d, [{ kind: "added", category: "number", token: "9", reason: "a stated reason" }]).unexplained.length, 0);
});
test("a stale exception is reported", () => {
  assert.equal(applyExceptions([], [{ kind: "added", category: "number", token: "9", reason: "a stated reason" }]).stale.length, 1);
});
