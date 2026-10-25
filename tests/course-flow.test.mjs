import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { continueTarget, overviewAction, chain } from "../assets/js/course.mjs";
import { cleanUi } from "../assets/js/ui-state.mjs";

const course = JSON.parse(readFileSync(new URL("../data/course.json", import.meta.url), "utf8"));

test("Continue: same module goes to the next concept page", () => {
  assert.deepEqual(continueTarget(course, "m00-variables"), { kind: "concept", path: "modules/00-foundations/equations/", title: "Equations", id: "m00-equations" });
});
test("Continue: the last concept of a module goes to the next built module's overview", () => {
  const t = continueTarget(course, "m00-notation");
  assert.equal(t.kind, "module");
  assert.equal(t.path, "modules/01-linear-algebra/");
});
test("Continue: Matrix multiplication now continues to the next concept, not to the end of the course", () => {
  assert.deepEqual(continueTarget(course, "m01-matmul"), { kind: "concept", path: "modules/01-linear-algebra/transpose-inverse/", title: "Transpose, identity and inverse", id: "m01-transpose" });
});
test("Continue: each new Module 1 concept continues to the next one", () => {
  assert.equal(continueTarget(course, "m01-transpose").id, "m01-systems");
  assert.equal(continueTarget(course, "m01-systems").id, "m01-span");
  assert.equal(continueTarget(course, "m01-span").id, "m01-transformations");
});
test("Continue: the last concept of the course so far has no target (planned modules are not targets)", () => {
  assert.equal(continueTarget(course, "m01-transformations"), null);
  assert.equal(chain(course).at(-1).id, "m01-transformations");
});
test("Continue: with the last four Module 1 concepts planned again, Matrix multiplication is the end of the course", () => {
  const partial = structuredClone(course);
  for (const c of partial.modules[1].concepts.slice(4)) c.status = "planned";
  assert.equal(continueTarget(partial, "m01-matmul"), null);
});
test("Continue: unknown id has no target", () => assert.equal(continueTarget(course, "nope"), null));

test("overview button: Start, Continue (first not complete, Revisit counts) and Review", () => {
  const m = course.modules[1];
  const st = (map) => (id) => map[id] ?? "not-started";
  assert.deepEqual(overviewAction(m, st({})), { label: "Start", concept: m.concepts[0] });
  assert.equal(overviewAction(m, st({ "m01-vectors": "complete", "m01-combine": "in-progress" })).concept.id, "m01-combine");
  assert.equal(overviewAction(m, st({ "m01-vectors": "revisit" })).label, "Continue");
  assert.equal(overviewAction(m, st({ "m01-vectors": "complete", "m01-combine": "complete", "m01-matrices": "revisit" })).concept.id, "m01-matrices");
  const all = Object.fromEntries(m.concepts.filter((c) => c.status === "built").map((c) => [c.id, "complete"]));
  assert.deepEqual(overviewAction(m, st(all)), { label: "Review from the start", concept: m.concepts[0] });
  assert.equal(overviewAction({ ...m, concepts: [] }, st({})), null);
});

test("saved interface preferences: the old outlineOpen value is dropped, other keys kept, bad values tolerated", () => {
  assert.deepEqual(cleanUi({ railHidden: true, outlineOpen: { m00: true }, sectionsOpen: {} }), { railHidden: true, sectionsOpen: {} });
  for (const bad of [null, undefined, 5, "x", [1], true]) assert.deepEqual(cleanUi(bad), {});
  assert.deepEqual(cleanUi({ outlineOpen: "garbage" }), {});
});
