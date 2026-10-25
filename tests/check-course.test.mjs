import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { checkCourse } from "../tools/check-course.mjs";

const root = new URL("../", import.meta.url);
const real = JSON.parse(readFileSync(new URL("data/course.json", root), "utf8"));
const termIds = new Set(JSON.parse(readFileSync(new URL("data/glossary.json", root), "utf8")).entries.map((e) => e.id));
const realFs = { read: (p) => (existsSync(new URL(p, root)) ? readFileSync(new URL(p, root), "utf8") : null), termIds };

const concept = (id, extra = {}) => ({ id, title: id, anchor: `concept-${id}`, path: `m/${id}/`, size: "full", minutes: 5, status: "built", objectives: ["x"], takeaways: [], ...extra });
const good = () => ({ modules: [{ id: "m1", status: "built", path: "m/", minutes: 10, prerequisites: [], concepts: [concept("c1"), concept("c2"), concept("c3", { status: "planned" })] }, { id: "m2", status: "planned", path: "n/", prerequisites: ["m1"], concepts: [] }] });
const overview = '<a href="c1/">c1</a><a href="c2/">c2</a>';
const cpage = (id) => `<meta name="concept-id" content="${id}"><article class="concept-card" id="concept-${id}"></article>`;
const pages = (over = {}) => ({ "m/index.html": overview, "m/c1/index.html": cpage("c1"), "m/c2/index.html": cpage("c2"), ...over });
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

test("a Continue target page that does not exist fails (module boundary)", () => {
  const c = good(); c.modules[1].status = "built"; c.modules[1].minutes = 5; c.modules[1].concepts = [concept("d1", { path: "n/d1/" })];
  const errs = checkCourse(c, fsOf(pages({ "n/d1/index.html": cpage("d1") })));
  assert.ok(errs.some((e) => e.includes("c2") && e.includes("n/")), errs.join("\n"));
});
