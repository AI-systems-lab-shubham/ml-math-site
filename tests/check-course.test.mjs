import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { checkCourse, parseBriefs } from "../tools/check-course.mjs";

const root = new URL("../", import.meta.url);
const real = JSON.parse(readFileSync(new URL("data/course.json", root), "utf8"));
const termIds = new Set(JSON.parse(readFileSync(new URL("data/glossary.json", root), "utf8")).entries.map((e) => e.id));
const realFs = { read: (p) => (existsSync(new URL(p, root)) ? readFileSync(new URL(p, root), "utf8") : null), termIds };

const concept = (id, extra = {}) => ({ id, title: id, anchor: `concept-${id}`, path: `m/${id}/`, size: "full", minutes: 5, status: "built", voice: "A", objectives: ["x", "y"], takeaways: ["a", "b", "c"], ...extra });
const good = () => ({ modules: [{ id: "m1", status: "built", path: "m/", minutes: 10, prerequisites: [], concepts: [concept("c1"), concept("c2"), concept("c3", { status: "planned" })] }, { id: "m2", status: "planned", path: "n/", prerequisites: ["m1"], concepts: [] }] });
const overview = '<a href="c1/">c1</a><a href="c2/">c2</a><script type="application/json" id="old-links">{"concept-c1":"c1/","concept-c2":"c2/"}</script><script src="assets/js/old-links.mjs"></script>';
const cpage = (id) => `<meta name="concept-id" content="${id}"><article class="concept-card" id="concept-${id}"></article>`;
const briefsDoc = (rows = [["c1", "A"], ["c2", "A"]]) => `# CARD-BRIEFS\n\nHow to read an entry.\n- **Mode:** A, AB or B.\n\n## Module 1\n\n${rows.map(([id, m], i) => `**Card ${i + 1}** (${id}). Mode ${m}. Basis: judgement.`).join("\n\n")}\n\n## Count\nx\n`;
const pages = (over = {}) => ({ "docs/CARD-BRIEFS.md": briefsDoc(), "m/index.html": overview, "m/c1/index.html": cpage("c1"), "m/c2/index.html": cpage("c2"), ...over });
const fsOf = (map) => ({ read: (p) => map[p] ?? null });
const fs = fsOf(pages());

test("the real course.json passes against the real pages", () => {
  assert.deepEqual(checkCourse(real, realFs), []);
});

test("a clean toy course passes", () => assert.deepEqual(checkCourse(good(), fs), []));

test("repeated concept id fails", () => {
  const c = good(); c.modules[0].concepts[1].id = "c1";
  assert.ok(checkCourse(c, fs).some((e) => e.includes("duplicate id: c1")));
});

test("module id repeated as a concept id fails", () => {
  const c = good(); c.modules[1].id = "c1";
  assert.ok(checkCourse(c, fs).some((e) => e.includes("duplicate id")));
});

test("missing page for a built module fails", () => {
  assert.ok(checkCourse(good(), { read: () => null }).some((e) => e.includes("page missing")));
});

test("missing anchor for a built concept fails; planned concepts need none", () => {
  const errs = checkCourse(good(), fsOf(pages({ "m/c2/index.html": "<p>no card</p>" })));
  assert.ok(errs.some((e) => e.includes("c2") && e.includes("anchor")));
  assert.ok(!errs.some((e) => e.includes("c3")));
});

test("built concept inside a planned module fails", () => {
  const c = good(); c.modules[1].concepts = [concept("x1")];
  assert.ok(checkCourse(c, fs).some((e) => e.includes("planned module")));
});

test("unknown prerequisite, bad status, zero minutes, no objectives all fail", () => {
  const c = good(); c.modules[1].prerequisites = ["nope"];
  assert.ok(checkCourse(c, fs).some((e) => e.includes("unknown prerequisite")));
  const d = good(); d.modules[0].concepts[0].status = "maybe";
  assert.ok(checkCourse(d, fs).some((e) => e.includes("bad status")));
  const e = good(); e.modules[0].concepts[0].minutes = 0;
  assert.ok(checkCourse(e, fs).some((x) => x.includes("minutes")));
  const f = good(); f.modules[0].concepts[0].objectives = [];
  assert.ok(checkCourse(f, fs).some((x) => x.includes("objective")));
});

test("built module with no built concept fails (the chain would have a hole)", () => {
  const c = good(); c.modules[0].concepts = [concept("c3", { status: "planned" })];
  assert.ok(checkCourse(c, fs).some((e) => e.includes("no built concept")));
});

test("module minutes must equal the sum of its built concepts (5 + 5 = 10)", () => {
  const c = good(); c.modules[0].minutes = 11;
  assert.ok(checkCourse(c, fs).some((e) => e.includes("sum to 10")));
});

test("unknown glossary term in objectives and unknown requires both fail", () => {
  const c = good(); c.modules[0].concepts[0].objectives = ["Explain a [[thing|no-such-term]]"];
  assert.ok(checkCourse(c, { ...fs, termIds: new Set(["variable"]) }).some((e) => e.includes("no-such-term")));
  const d = good(); d.modules[0].concepts[0].requires = ["ghost"];
  assert.ok(checkCourse(d, fs).some((e) => e.includes("requires unknown")));
});

test("a built concept whose page is missing fails", () => {
  const map = pages(); delete map["m/c2/index.html"];
  assert.ok(checkCourse(good(), fsOf(map)).some((e) => e.includes("c2") && e.includes("page missing")));
});

test("a concept page that holds a second card fails", () => {
  const errs = checkCourse(good(), fsOf(pages({ "m/c1/index.html": cpage("c1") + cpage("c2") })));
  assert.ok(errs.some((e) => e.includes("c1") && e.includes("2 concept cards")));
});

test("a path outside the module folder fails", () => {
  const c = good(); c.modules[0].concepts[0].path = "elsewhere/c1/";
  assert.ok(checkCourse(c, fs).some((e) => e.includes("path must be a folder")));
});

test("an overview that lists a planned concept, or omits a built one, fails", () => {
  assert.ok(checkCourse(good(), fsOf(pages({ "m/index.html": overview + '<a href="c3/">c3</a>' }))).some((e) => e.includes("planned concept c3")));
  assert.ok(checkCourse(good(), fsOf(pages({ "m/index.html": '<a href="c1/">c1</a>' }))).some((e) => e.includes("does not link to c2")));
});

test("an old-link map that disagrees with course.json fails", () => {
  const bad = overview.replace('"concept-c2":"c2/"', '"concept-c2":"nope/"');
  assert.ok(checkCourse(good(), fsOf(pages({ "m/index.html": bad }))).some((e) => e.includes("old-link map does not match")));
  assert.ok(checkCourse(good(), fsOf(pages({ "m/index.html": '<a href="c1/">c1</a><a href="c2/">c2</a>' }))).some((e) => e.includes("no old-link map")));
});

test("a Continue target page that does not exist fails (module boundary)", () => {
  const c = good(); c.modules[1].status = "built"; c.modules[1].minutes = 5; c.modules[1].concepts = [concept("d1", { path: "n/d1/" })];
  const errs = checkCourse(c, fsOf(pages({ "n/d1/index.html": cpage("d1") })));
  assert.ok(errs.some((e) => e.includes("c2") && e.includes("n/")), errs.join("\n"));
});

test("a card that links to a later card fails; a link back is fine, and the outline fallback outside the article is ignored", () => {
  const forward = pages({ "m/c1/index.html": '<nav class="site-nav"><a href="../c2/">c2</a></nav><meta name="concept-id" content="c1"><article class="concept-card" id="concept-c1"><a href="../c2/">next</a></article>' });
  const errs = checkCourse(good(), fsOf(forward));
  assert.ok(errs.some((e) => e.includes("c1: links forward") && e.includes("m/c2/")), errs.join("\n"));
  const backward = pages({ "m/c2/index.html": '<meta name="concept-id" content="c2"><article class="concept-card" id="concept-c2"><a href="../c1/#x">before</a> <a href="../c1/index.html">again</a></article>' });
  assert.deepEqual(checkCourse(good(), fsOf(backward)), []);
  const outlineOnly = pages({ "m/c1/index.html": '<nav class="site-nav"><a href="../c2/">c2</a></nav><meta name="concept-id" content="c1"><article class="concept-card" id="concept-c1"></article>' });
  assert.deepEqual(checkCourse(good(), fsOf(outlineOnly)), []);
});

test("objectives: 1 and 4 fail with the card and the count named; 2 and 3 pass", () => {
  const withN = (n) => { const c = good(); c.modules[0].concepts[0].objectives = Array.from({ length: n }, (_, i) => `o${i}`); return c; };
  for (const n of [0, 1, 4, 5]) {
    const errs = checkCourse(withN(n), fs);
    assert.ok(errs.some((e) => e.startsWith("c1:") && e.includes(`has ${n} objective`) && e.includes("2 to 3")), `${n} objectives: ${errs}`);
  }
  for (const n of [2, 3]) assert.deepEqual(checkCourse(withN(n), fs), [], `${n} objectives`);
});
test("objectives: a missing list fails", () => {
  const c = good(); delete c.modules[0].concepts[0].objectives;
  assert.ok(checkCourse(c, fs).some((e) => e.startsWith("c1:") && e.includes("2 to 3")));
});

// Takeaways: 3 to 4 (the same range as tests/e2e/lesson-nav.mjs, now also in --fast).
test("takeaways: 0, 2 and 5 fail with the card and the count named; 3 and 4 pass", () => {
  const withN = (n) => { const c = good(); c.modules[0].concepts[0].takeaways = Array.from({ length: n }, (_, i) => `t${i}`); return c; };
  for (const n of [0, 2, 5]) {
    const errs = checkCourse(withN(n), fs);
    assert.ok(errs.some((e) => e.startsWith("c1:") && e.includes(`has ${n} takeaway`) && e.includes("3 to 4")), `${n}: ${errs}`);
  }
  for (const n of [3, 4]) assert.deepEqual(checkCourse(withN(n), fs), [], `${n} takeaways`);
});

// Voice modes and the briefs file.
const withVoice = (v) => { const c = good(); if (v === undefined) delete c.modules[0].concepts[0].voice; else c.modules[0].concepts[0].voice = v; return c; };
test("voice: a missing or invalid value fails; A, AB and B pass", () => {
  for (const v of [undefined, "C", "a", "ab", "", null]) {
    assert.ok(checkCourse(withVoice(v), fs).some((e) => e.startsWith("c1:") && e.includes("voice must be")), String(v));
  }
  for (const v of ["A", "AB", "B"]) assert.deepEqual(checkCourse(withVoice(v), fsOf(pages({ "docs/CARD-BRIEFS.md": briefsDoc([["c1", v], ["c2", "A"]]) }))), [], v);
});
test("voice: a planned card needs no voice", () => assert.deepEqual(checkCourse(good(), fs), []));
test("briefs: a mode that differs from course.json fails and names both", () => {
  const errs = checkCourse(good(), fsOf(pages({ "docs/CARD-BRIEFS.md": briefsDoc([["c1", "AB"], ["c2", "A"]]) })));
  assert.ok(errs.some((e) => e.startsWith("c1:") && e.includes("voice is A") && e.includes("Mode AB") && /line \d+/.test(e)), String(errs));
});
test("briefs: a built card with no entry fails", () => {
  const errs = checkCourse(good(), fsOf(pages({ "docs/CARD-BRIEFS.md": briefsDoc([["c1", "A"]]) })));
  assert.ok(errs.some((e) => e.startsWith("c2:") && e.includes("no entry in docs/CARD-BRIEFS.md")), String(errs));
});
test("briefs: an entry whose id matches no card fails", () => {
  const errs = checkCourse(good(), fsOf(pages({ "docs/CARD-BRIEFS.md": briefsDoc([["c1", "A"], ["c2", "A"], ["ghost", "B"]]) })));
  assert.ok(errs.some((e) => e.includes("ghost") && e.includes("matches no card")), String(errs));
});
test("briefs: an entry for a planned card in course.json is allowed", () => {
  assert.deepEqual(checkCourse(good(), fsOf(pages({ "docs/CARD-BRIEFS.md": briefsDoc([["c1", "A"], ["c2", "A"], ["c3", "B"]]) }))), []);
});
test("briefs: the file missing fails", () => {
  assert.ok(checkCourse(good(), fsOf(pages({ "docs/CARD-BRIEFS.md": undefined }))).some((e) => e.includes("CARD-BRIEFS.md is missing")));
});
test("briefs: a heading that does not match the pattern fails with its line number", () => {
  const bad = ["**Card 1.** Mode A.", "**Card 1** c1. Mode A.", "**Card 1** (c1) Mode A.", "**Card 1** (c1). Mode C.", "**Card 1** (C1). Mode A.", "**Card 1** (c1).  Mode A."];
  for (const h of bad) {
    const text = `# T\n\n## Module 1\n\n${h}\n`;
    const { errors } = parseBriefs(text);
    assert.equal(errors.length, 1, h);
    assert.ok(errors[0].includes("line 5"), errors[0]);
  }
  assert.deepEqual(parseBriefs("## Module 1\n\n**Card** (c1). Mode AB.\n").errors, []);
});
test("briefs: a duplicate id fails", () => {
  assert.ok(parseBriefs("## Module 1\n**A** (c1). Mode A.\n**B** (c1). Mode B.\n").errors.some((e) => e.includes("duplicate")));
});
test("briefs: text before the first Module heading and after Count is not parsed as entries", () => {
  assert.deepEqual(parseBriefs("**Not an entry**\n## Module 0\n**Card** (c1). Mode A.\n## Count\n**Also not**\n").errors, []);
});

test("the real course: 9 A, 15 AB, 7 B, and the pilot cards are Variables = A and Eigenvalues = AB", () => {
  const built = real.modules.flatMap((m) => m.concepts).filter((c) => c.status === "built");
  const n = (v) => built.filter((c) => c.voice === v).length;
  assert.deepEqual([n("A"), n("AB"), n("B"), built.length], [9, 15, 7, 31]);
  assert.equal(built.find((c) => c.id === "m00-variables").voice, "A");
  assert.equal(built.find((c) => c.id === "m03-eigenvectors").voice, "AB");
});
test("the real briefs file parses with no heading errors and one entry per built card", () => {
  const { entries, errors } = parseBriefs(readFileSync(new URL("docs/CARD-BRIEFS.md", root), "utf8"));
  assert.deepEqual(errors, []);
  assert.equal(entries.size, 31);
});
