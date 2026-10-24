import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createProgress, STORAGE_KEY } from "../assets/js/progress.mjs";
import { chain, neighbours, totalMinutes } from "../assets/js/course.mjs";

const real = JSON.parse(readFileSync(new URL("../data/course.json", import.meta.url), "utf8"));

const c = (id, status = "built") => ({ id, title: id, anchor: id, size: "full", minutes: 10, status, objectives: ["x"], takeaways: [] });
// Module A: 3 built + 1 planned. Module B: 1 built. Module P: planned, no concepts.
const toy = {
  modules: [
    { id: "A", status: "built", path: "a/", concepts: [c("a1"), c("a2"), c("a3"), c("a4", "planned")] },
    { id: "B", status: "built", path: "b/", concepts: [c("b1")] },
    { id: "P", status: "planned", path: "p/", concepts: [] },
  ],
};

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, removeItem: (k) => { delete data[k]; } };
}
const blocked = { getItem() { throw new Error("SecurityError"); }, setItem() { throw new Error("SecurityError"); } };
let t = 0;
const clock = () => new Date(Date.UTC(2026, 0, 1, 0, 0, ++t)).toISOString();
const make = (storage = fakeStorage(), course = toy) => createProgress({ course, storage, now: clock });

test("empty storage gives an empty, working store", () => {
  const p = make();
  assert.equal(p.status("a1"), "new");
  assert.equal(p.recovered, false);
  assert.deepEqual(p.resume(), { id: "a1", kind: "start" });
});

test("blocked storage: everything works in memory, persistent is false", () => {
  const p = make(blocked);
  assert.equal(p.persistent, false);
  p.markVisited("a1");
  p.setDone("a1");
  assert.equal(p.status("a1"), "done");
  assert.equal(make(null).persistent, false);
});

test("a write that throws later flips persistent to false but keeps state", () => {
  const s = fakeStorage();
  const p = make(s);
  s.setItem = () => { throw new Error("QuotaExceededError"); };
  p.markVisited("a1");
  assert.equal(p.persistent, false);
  assert.equal(p.status("a1"), "visited");
});

test("corrupted JSON resets to empty and says so", () => {
  const p = make(fakeStorage({ [STORAGE_KEY]: "{not json" }));
  assert.equal(p.recovered, true);
  assert.equal(p.status("a1"), "new");
});

test("valid JSON of the wrong shape or version also resets and says so", () => {
  for (const bad of ['[]', '{"v":2,"concepts":{}}', '{"v":1,"concepts":{"a1":{"visited":"nope","done":null}}}', '{"v":1,"concepts":{"a1":{"visited":"2026-01-01T00:00:00Z","done":5}}}']) {
    const p = make(fakeStorage({ [STORAGE_KEY]: bad }));
    assert.equal(p.recovered, true, bad);
    assert.equal(p.status("a1"), "new");
  }
});

test("unknown ids are rejected and never stored or counted", () => {
  const s = fakeStorage();
  const p = make(s);
  assert.equal(p.markVisited("zzz"), false);
  assert.equal(p.setDone("zzz"), false);
  assert.equal(STORAGE_KEY in s.data, false);
  assert.equal(p.moduleProgress("A").visited, 0);
  assert.equal(p.moduleProgress("nope").total, 0);
});

test("visited and complete are different; never auto-complete", () => {
  const p = make();
  p.markVisited("a1");
  assert.equal(p.status("a1"), "visited");
  p.markVisited("a1");
  assert.equal(p.status("a1"), "visited");
});

test("completion toggles and can be undone; the concept stays visited", () => {
  const p = make();
  p.setDone("a1");
  assert.equal(p.status("a1"), "done");
  p.setDone("a1", false);
  assert.equal(p.status("a1"), "visited");
  p.setDone("a1");
  p.markVisited("a1");
  assert.equal(p.status("a1"), "done", "re-visiting a complete concept keeps it complete");
});

test("progress persists across reloads", () => {
  const s = fakeStorage();
  make(s).setDone("a2");
  assert.equal(make(s).status("a2"), "done");
});

test("moduleProgress counts built concepts only. Arithmetic: 3 built in A", () => {
  const p = make();
  assert.deepEqual(p.moduleProgress("A"), { total: 3, done: 0, visited: 0, planned: 1, all: 4, percent: 0 });
  p.setDone("a1");                                   // 1/3 = 0.3333 -> 33
  assert.equal(p.moduleProgress("A").percent, 33);
  p.setDone("a2");                                   // 2/3 = 0.6667 -> 67
  assert.equal(p.moduleProgress("A").percent, 67);
  p.markVisited("a3");                               // visited, not done: still 2/3
  assert.equal(p.moduleProgress("A").percent, 67);
  assert.equal(p.moduleProgress("A").visited, 1);
  p.setDone("a3");                                   // 3/3 = 1 -> 100
  assert.equal(p.moduleProgress("A").percent, 100);
});

test("moduleProgress with zero built concepts: no divide by zero", () => {
  const p = make();
  const r = p.moduleProgress("P");                   // 0 built, 0 listed
  assert.deepEqual(r, { total: 0, done: 0, visited: 0, planned: 0, all: 0, percent: 0 });
  // a built module whose concepts are all planned
  const allPlanned = { modules: [{ id: "Z", status: "built", path: "z/", concepts: [c("z1", "planned"), c("z2", "planned")] }] };
  const q = make(fakeStorage(), allPlanned).moduleProgress("Z");
  assert.equal(q.total, 0);
  assert.equal(q.percent, 0);
  assert.equal(q.planned, 2);
  assert.equal(Number.isNaN(q.percent), false);
});

test("courseProgress: 4 built concepts; 1 done = 25%, 2 done = 50%", () => {
  const p = make();
  assert.deepEqual(p.courseProgress(), { total: 4, done: 0, percent: 0 });
  p.setDone("a1");                                   // 1/4 = 25
  assert.equal(p.courseProgress().percent, 25);
  p.setDone("b1");                                   // 2/4 = 50
  assert.equal(p.courseProgress().percent, 50);
});

test("resume: start, resume the unfinished one, advance past a complete one", () => {
  const p = make();
  assert.deepEqual(p.resume(), { id: "a1", kind: "start" });
  p.markVisited("a2");
  assert.deepEqual(p.resume(), { id: "a2", kind: "resume" });
  p.setDone("a2");
  assert.deepEqual(p.resume(), { id: "a3", kind: "next" }, "last-visited is complete, so go to the next one");
});

test("resume skips already-complete concepts, crosses modules, wraps, and ends", () => {
  const p = make();
  p.setDone("a3"); p.setDone("b1");                   // last = b1, done; a3 done
  assert.deepEqual(p.resume(), { id: "a1", kind: "next" }, "wraps to the first not-done");
  p.setDone("a1"); p.setDone("a2");
  assert.deepEqual(p.resume(), { id: null, kind: "all-done" });
  const q = make();
  q.setDone("a3");
  assert.deepEqual(q.resume(), { id: "b1", kind: "next" }, "crosses into the next module");
});

test("resume ignores a stored last id that is no longer built", () => {
  const s = fakeStorage();
  make(s).markVisited("a4");                          // a4 is planned: known but not in the chain
  assert.deepEqual(make(s).resume(), { id: "a1", kind: "start" });
});

test("resume returns null when nothing is built", () => {
  assert.equal(make(fakeStorage(), { modules: [{ id: "P", status: "planned", path: "p/", concepts: [] }] }).resume(), null);
});

test("open state round-trips", () => {
  const s = fakeStorage();
  const p = make(s);
  p.setOpen("outline:A", true);
  assert.equal(make(s).isOpen("outline:A"), true);
  p.setOpen("outline:A", false);
  assert.equal(make(s).isOpen("outline:A"), false);
});

test("export then import restores progress", () => {
  const a = make();
  a.setDone("a1"); a.markVisited("a2");
  const text = a.exportJSON();
  const b = make();
  assert.deepEqual(b.importJSON(text), { ok: true });
  assert.equal(b.status("a1"), "done");
  assert.equal(b.status("a2"), "visited");
});

test("bad imports are refused and leave progress untouched", () => {
  const p = make();
  p.setDone("a1");
  const bads = [
    "not json at all",
    "[]",
    '{"app":"other","version":1,"progress":{}}',
    '{"app":"mlmath","version":99,"progress":{}}',
    '{"app":"mlmath","version":1,"progress":{"v":1,"concepts":{"a1":{"visited":"garbage","done":null}}}}',
    '{"app":"mlmath","version":1}',
  ];
  for (const text of bads) {
    const r = p.importJSON(text);
    assert.equal(r.ok, false, text);
    assert.equal(typeof r.error, "string");
    assert.equal(p.status("a1"), "done", "existing progress survives a bad import");
  }
});

test("subscribers are told about changes", () => {
  const p = make();
  let n = 0;
  const off = p.subscribe(() => n++);
  p.markVisited("a1"); p.setDone("a1");
  off(); p.setDone("a1", false);
  assert.equal(n, 2);
});

// ---- the real course.json ----
test("real course: Module 1 lists all 8 concepts, 4 built; progress is over built only", () => {
  const m01 = real.modules.find((m) => m.id === "m01");
  assert.equal(m01.concepts.length, 8);
  assert.equal(m01.concepts.filter((x) => x.status === "built").length, 4);
  const p = createProgress({ course: real, storage: fakeStorage(), now: clock });
  p.setDone("m01-vectors");                           // 1 of 4 built = 25%
  const r = p.moduleProgress("m01");
  assert.deepEqual([r.total, r.all, r.done, r.percent], [4, 8, 1, 25]);
  p.setDone("m01-vectors", false);
  p.setDone("m00-variables");                         // 1 of 10 built in m00 = 10%
  assert.equal(p.moduleProgress("m00").percent, 10);
  assert.equal(p.courseProgress().percent, 7);        // 1 of 14 = 0.0714 -> 7
});

test("real course: chain is m00 (10) then m01 built (4); neighbours link across modules", () => {
  const list = chain(real);
  assert.equal(list.length, 14);
  assert.equal(neighbours(real, "m00-variables").prev, null);
  assert.equal(neighbours(real, "m00-notation").next.id, "m01-vectors");
  assert.equal(neighbours(real, "m01-matmul").next, null, "planned concepts are not in the chain");
  assert.equal(totalMinutes(real), 8 + 15 + 12 + 12 + 12 + 14 + 10 + 8 + 8 + 8 + 14 + 14 + 14 + 16);
});
