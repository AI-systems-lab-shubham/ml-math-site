import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { learnMoreVisible, chain } from "../assets/js/course.mjs";

const course = JSON.parse(readFileSync(new URL("../data/course.json", import.meta.url), "utf8"));
const list = chain(course);
const path = (id) => list.find((c) => c.id === id).path;

test("Learn more shows only when the target is strictly before the current card", () => {
  assert.equal(learnMoreVisible(course, "m02-dot-product", path("m00-trig")), true, "an earlier module");
  assert.equal(learnMoreVisible(course, "m02-dot-product", path("m01-matmul")), true, "an earlier card");
  assert.equal(learnMoreVisible(course, "m02-dot-product", path("m02-norms")), true);
  assert.equal(learnMoreVisible(course, "m02-dot-product", path("m02-dot-product")), false, "the same card");
  assert.equal(learnMoreVisible(course, "m02-dot-product", path("m02-projections")), false, "a later card");
  assert.equal(learnMoreVisible(course, "m00-variables", path("m02-norms")), false, "a later module");
});

test("a link to a module overview counts as just before its first concept", () => {
  assert.equal(learnMoreVisible(course, "m02-norms", "modules/01-linear-algebra/"), true);
  assert.equal(learnMoreVisible(course, "m01-vectors", "modules/01-linear-algebra/"), true, "the overview sits before the module's own cards");
  assert.equal(learnMoreVisible(course, "m00-notation", "modules/01-linear-algebra/"), false);
});

test("a fragment is ignored; unknown pages, missing targets and unknown current cards show nothing", () => {
  assert.equal(learnMoreVisible(course, "m02-norms", `${path("m00-trig")}#x`), true);
  assert.equal(learnMoreVisible(course, "m02-norms", "modules/99/nowhere/"), false);
  assert.equal(learnMoreVisible(course, "m02-norms", null), false);
  assert.equal(learnMoreVisible(course, "nope", path("m00-trig")), false);
  assert.equal(learnMoreVisible(course, null, path("m00-trig")), false);
});

test("every glossary Learn more target in the real glossary is a real page", () => {
  const g = JSON.parse(readFileSync(new URL("../data/glossary.json", import.meta.url), "utf8"));
  const known = new Set([...list.map((c) => c.path), ...course.modules.map((m) => m.path)]);
  for (const e of g.entries) if (e.learnMore) assert.ok(known.has(e.learnMore.split("#")[0]), `${e.id}: ${e.learnMore}`);
});
