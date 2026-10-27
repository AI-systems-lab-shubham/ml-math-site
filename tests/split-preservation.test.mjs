import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { readOld, SOURCE_REV } from "../tools/split-modules.mjs";
import { comparePreservation } from "../tools/lib/preservation.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const course = JSON.parse(read("data/course.json"));
const homeHtml = read("index.html");
const hintJs = read("assets/js/first-hint.js");

function inputs(m) {
  const oldHtml = readOld(SOURCE_REV, `${m.path}index.html`);
  return {
    oldHtml,
    // Only the concepts that were split out of the old page; later concepts were written by hand.
    conceptHtmls: m.concepts.filter((c) => c.status === "built" && oldHtml.includes(`id="${c.anchor}"`)).map((c) => read(`${c.path}index.html`)),
    overviewHtml: read(`${m.path}index.html`),
    homeHtml, hintJs,
  };
}
// Only modules that were split out of the old long pages have a source revision to compare with;
// later modules (Module 2 on) are written one page at a time and have nothing to preserve.
const existedInSource = (m) => { try { readOld(SOURCE_REV, `${m.path}index.html`); return true; } catch { return false; } };
const built = course.modules.filter((m) => m.status === "built" && existedInSource(m));

for (const m of built) {
  test(`${m.id}: concept pages preserve the old module page's text`, () => {
    const problems = comparePreservation(inputs(m));
    assert.deepEqual(problems, [], problems.join("\n"));
  });
}

// Mutation tests: each change below must be caught.
const mutants = {
  "a word deleted from a card": (i) => { i.conceptHtmls[1] = i.conceptHtmls[1].replace(/(<section data-stage="meaning">[\s\S]*?<p>)(\S+) /, "$1"); },
  "two concept pages swapped": (i) => { i.conceptHtmls.reverse(); },
  "a concept page missing": (i) => { i.conceptHtmls.pop(); },
  "a number changed": (i) => { i.conceptHtmls[0] = i.conceptHtmls[0].replace(/<\/article>/, "<p>extra 7</p></article>"); },
  "overview loses the lede": (i) => { i.overviewHtml = i.overviewHtml.replace(/<p class="lede">[\s\S]*?<\/p>/, ""); },
  "overview keeps the how-to text": (i) => { i.overviewHtml = i.overviewHtml.replace("</main>", "<p>Terms with a dotted underline are a tap or hover away from a plain-language and a mathematical definition.</p></main>"); },
  "home page loses the note": (i) => { i.homeHtml = i.homeHtml.replace(/Expand all and Collapse all open or close[^<]*/, ""); },
  "hint loses the sentence": (i) => { i.hintJs = i.hintJs.replace("Terms with a dotted underline are a tap or hover away from a plain-language and a mathematical definition.", ""); },
};
const withCallout = built.find((m) => readOld(SOURCE_REV, `${m.path}index.html`).includes('<div class="callout">'));
for (const [name, mutate] of Object.entries(mutants)) {
  test(`mutation caught: ${name}`, () => {
    const i = inputs(built[0]);
    mutate(i);
    assert.notDeepEqual(comparePreservation(i), [], "the mutation went unnoticed");
  });
}
test("mutation caught: callout dropped from the vectors page", () => {
  const i = inputs(withCallout);
  i.conceptHtmls[0] = i.conceptHtmls[0].replace(/<div class="callout">[\s\S]*?<\/div>/, "");
  assert.notDeepEqual(comparePreservation(i), []);
});
test("mutation caught: callout copied onto a second page", () => {
  const i = inputs(withCallout);
  i.conceptHtmls[1] = i.conceptHtmls[1].replace(/(<article[\s\S]*?<\/header>)/, '$1<div class="callout"><p>x</p></div>');
  assert.notDeepEqual(comparePreservation(i), []);
});

test("the pages on disk are exactly what tools/split-modules.mjs writes", async () => {
  const { buildPages } = await import("../tools/split-modules.mjs");
  const { files } = buildPages(course);
  for (const [path, content] of files) assert.equal(read(path), content, `${path} differs from the split output`);
});
