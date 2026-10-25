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
test("Continue: the last concept of the course so far has no target (planned modules are not targets)", () => {
  assert.equal(continueTarget(course, "m01-matmul"), null);
  assert.equal(chain(course).at(-1).id, "m01-matmul");
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
