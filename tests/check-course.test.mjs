import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { checkCourse } from "../tools/check-course.mjs";

const root = new URL("../", import.meta.url);
const real = JSON.parse(readFileSync(new URL("data/course.json", root), "utf8"));
const realFs = { read: (p) => (existsSync(new URL(p, root)) ? readFileSync(new URL(p, root), "utf8") : null) };

const concept = (id, extra = {}) => ({ id, title: id, anchor: `concept-${id}`, size: "full", minutes: 5, status: "built", objectives: ["x"], takeaways: [], ...extra });
const good = () => ({ modules: [{ id: "m1", status: "built", path: "m/", minutes: 10, prerequisites: [], concepts: [concept("c1"), concept("c2"), concept("c3", { status: "planned" })] }, { id: "m2", status: "planned", path: "n/", prerequisites: ["m1"], concepts: [] }] });
const page = '<h2 id="concept-c1"></h2><h2 id="concept-c2"></h2>';
const fs = { read: (p) => (p === "m/index.html" ? page : null) };

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
  const errs = checkCourse(good(), { read: (p) => (p === "m/index.html" ? '<h2 id="concept-c1"></h2>' : null) });
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
