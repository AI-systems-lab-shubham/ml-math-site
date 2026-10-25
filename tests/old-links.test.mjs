import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveOldHash } from "../assets/js/old-links.mjs";

const course = JSON.parse(readFileSync(new URL("../data/course.json", import.meta.url), "utf8"));
const mapOf = (m) => JSON.parse(readFileSync(new URL(`../${m.path}index.html`, import.meta.url), "utf8").match(/id="old-links">([^<]*)</)[1]);
const STAGES = ["meaning", "picture", "real-life", "worked-example", "why-when", "how-to-arrive", "in-an-llm", "teach-it"];

for (const m of course.modules.filter((x) => x.status === "built")) {
  test(`${m.id}: every old concept anchor goes to its concept page`, () => {
    const map = mapOf(m);
    for (const c of m.concepts.filter((x) => x.status === "built")) {
      assert.equal(resolveOldHash(`#${c.anchor}`, map), c.path.slice(m.path.length), c.anchor);
    }
  });
  test(`${m.id}: every old stage anchor goes to the concept page and keeps its hash`, () => {
    const map = mapOf(m);
    for (const c of m.concepts.filter((x) => x.status === "built")) for (const st of STAGES) {
      assert.equal(resolveOldHash(`#${c.anchor}-${st}`, map), `${c.path.slice(m.path.length)}#${c.anchor}-${st}`, `${c.anchor}-${st}`);
    }
  });
}

test("hashes that are not old concept links are left alone", () => {
  const map = { "concept-variables": "variables/", "concept-var": "var/" };
  for (const h of ["", "#", "#syllabus", "#concept", "#concept-vari", "#concept-variable", "#concept-equations", "#Concept-Variables", "#%E0%A4%A", undefined, null, 5]) assert.equal(resolveOldHash(h, map), null, String(h));
  assert.equal(resolveOldHash("#concept-variables", null), null);
  assert.equal(resolveOldHash("#concept-variables", "x"), null);
});

test("the longest matching concept wins, and inherited object keys are not concepts", () => {
  const map = { "concept-var": "var/", "concept-var-x": "varx/" };
  assert.equal(resolveOldHash("#concept-var-x-picture", map), "varx/#concept-var-x-picture");
  assert.equal(resolveOldHash("#concept-var-picture", map), "var/#concept-var-picture");
  assert.equal(resolveOldHash("#toString", {}), null);
  assert.equal(resolveOldHash("#constructor", {}), null);
});

test("an encoded hash is decoded before matching", () => {
  assert.equal(resolveOldHash("#concept-%76ariables", { "concept-variables": "variables/" }), "variables/");
});
