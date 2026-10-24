import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createProgress, STORAGE_KEY, STATUSES, mergeStates, readState } from "../assets/js/progress.mjs";
import { chain, neighbours, totalMinutes, renderInline, termIdsIn, plainText } from "../assets/js/course.mjs";

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

// Injectable clock: a function that returns the current ISO time, with .at(n) to set it to n seconds
// past 2026-01-01T00:00:00Z. Each call advances by one second unless frozen, so every change gets its own time.
function makeClock(start = 1) {
  let t = start;
  let frozen = false;
  const f = () => new Date(Date.UTC(2026, 0, 1, 0, 0, frozen ? t : t++)).toISOString();
  f.at = (n) => { t = n; frozen = true; return f; };
  f.iso = (n) => new Date(Date.UTC(2026, 0, 1, 0, 0, n)).toISOString();
  return f;
}
const clock = makeClock(1);
const make = (storage = fakeStorage(), course = toy, extra = {}) => createProgress({ course, storage, now: clock, target: null, ...extra });
// A fake window for the storage event.
const fakeWindow = () => {
  const fns = [];
  return { addEventListener: (type, fn) => type === "storage" && fns.push(fn), fire: (ev) => fns.forEach((fn) => fn(ev)) };
};
const stored = (s) => JSON.parse(s.data[STORAGE_KEY]);

test("empty storage gives an empty, working store", () => {
  const p = make();
  assert.equal(p.status("a1"), "not-started");
  assert.equal(p.recovered, false);
  assert.equal(p.needsReload, false);
  assert.deepEqual(p.resume(), { id: "a1", kind: "start" });
});

test("blocked storage: everything works in memory, persistent is false", () => {
  const p = make(blocked);
  assert.equal(p.persistent, false);
  p.markOpened("a1");
  p.setStatus("a1", "complete");
  assert.equal(p.status("a1"), "complete");
  assert.equal(make(null).persistent, false);
});

test("a write that throws later flips persistent to false but keeps state", () => {
  const s = fakeStorage();
  const p = make(s);
  s.setItem = () => { throw new Error("QuotaExceededError"); };
  p.markOpened("a1");
  assert.equal(p.persistent, false);
  assert.equal(p.status("a1"), "in-progress");
});

test("corrupted JSON resets to empty and says so", () => {
  const p = make(fakeStorage({ [STORAGE_KEY]: "{not json" }));
  assert.equal(p.recovered, true);
  assert.equal(p.status("a1"), "not-started");
});

test("valid JSON of the wrong shape also resets and says so", () => {
  const bads = [
    "[]", "{}", '{"v":0,"concepts":{}}', '{"v":"2","concepts":{}}',
    '{"v":1,"concepts":{"a1":{"visited":"nope","done":null}}}',
    '{"v":1,"concepts":{"a1":{"visited":"2026-01-01T00:00:00Z","done":5}}}',
    '{"v":2,"concepts":{"a1":{"status":"done","statusAt":"2026-01-01T00:00:00Z"}}}',
    '{"v":2,"concepts":{"a1":{"status":"complete","statusAt":"yesterday"}}}',
  ];
  for (const bad of bads) {
    const p = make(fakeStorage({ [STORAGE_KEY]: bad }));
    assert.equal(p.recovered, true, bad);
    assert.equal(p.status("a1"), "not-started");
  }
});

test("unknown ids are rejected and never stored or counted", () => {
  const s = fakeStorage();
  const p = make(s);
  assert.equal(p.markOpened("zzz"), false);
  assert.equal(p.setStatus("zzz", "complete"), null);
  assert.equal(p.setStatus("a1", "done"), null, "unknown status is refused");
  assert.equal(STORAGE_KEY in s.data, false);
  assert.equal(p.moduleProgress("A").inProgress, 0);
  assert.equal(p.moduleProgress("nope").total, 0);
});

// ---- transitions ----
test("opening promotes only not-started to in-progress", () => {
  for (const st of STATUSES) {
    const p = make();
    if (st !== "not-started") p.setStatus("a1", st);
    p.markOpened("a1");
    assert.equal(p.status("a1"), st === "not-started" ? "in-progress" : st, `opening from ${st}`);
  }
});

test("opening a complete or revisit concept does not change its statusAt", () => {
  const p = make();
  p.setStatus("a1", "revisit");
  const at = JSON.parse(p.exportJSON()).progress.concepts.a1.statusAt;
  p.markOpened("a1");
  assert.equal(JSON.parse(p.exportJSON()).progress.concepts.a1.statusAt, at);
});

test("every status can be set from every status (4 x 4 = 16 transitions), by the learner only", () => {
  let n = 0;
  for (const from of STATUSES) for (const to of STATUSES) {
    const s = fakeStorage();
    const p = make(s);
    p.setStatus("a1", from);
    const r = p.setStatus("a1", to);
    assert.equal(p.status("a1"), to, `${from} -> ${to}`);
    assert.equal(r.previous.status, from);
    assert.equal(make(s).status("a1"), to, "persisted");
    n++;
  }
  assert.equal(n, 16);
});

test("undo restores the previous status, including not-started, with a fresh statusAt", () => {
  const p = make();
  const first = p.setStatus("a1", "complete");
  assert.deepEqual(first.previous.status, "not-started");
  assert.equal(first.previous.statusAt, null);
  const t1 = JSON.parse(p.exportJSON()).progress.concepts.a1.statusAt;
  p.undo("a1", first.previous);
  assert.equal(p.status("a1"), "not-started");
  assert.ok(Date.parse(JSON.parse(p.exportJSON()).progress.concepts.a1.statusAt) > Date.parse(t1), "undo is a new change");
  const r = p.setStatus("a1", "in-progress");
  p.setStatus("a1", "revisit");
  p.undo("a1", r.previous.status === "not-started" ? { status: "in-progress" } : r.previous);
  assert.equal(p.status("a1"), "in-progress");
  assert.equal(p.undo("a1", null), null);
});

test("revisit does not count toward complete; arithmetic: 3 built in A", () => {
  const p = make();
  assert.deepEqual(p.moduleProgress("A"), { total: 3, done: 0, inProgress: 0, revisit: 0, planned: 1, all: 4, percent: 0 });
  p.setStatus("a1", "complete");                     // 1/3 = 0.3333 -> 33
  assert.equal(p.moduleProgress("A").percent, 33);
  p.setStatus("a2", "revisit");                      // still 1/3
  assert.equal(p.moduleProgress("A").percent, 33);
  assert.equal(p.moduleProgress("A").done, 1);
  assert.equal(p.moduleProgress("A").revisit, 1);
  p.setStatus("a2", "complete");                     // 2/3 = 0.6667 -> 67
  assert.equal(p.moduleProgress("A").percent, 67);
  p.markOpened("a3");                                // in progress, not complete: still 2/3
  assert.equal(p.moduleProgress("A").percent, 67);
  assert.equal(p.moduleProgress("A").inProgress, 1);
  p.setStatus("a3", "complete");                     // 3/3 = 1 -> 100
  assert.equal(p.moduleProgress("A").percent, 100);
});

test("moduleProgress with zero built concepts: no divide by zero", () => {
  const p = make();
  assert.deepEqual(p.moduleProgress("P"), { total: 0, done: 0, inProgress: 0, revisit: 0, planned: 0, all: 0, percent: 0 });
  const allPlanned = { modules: [{ id: "Z", status: "built", path: "z/", concepts: [c("z1", "planned"), c("z2", "planned")] }] };
  const q = make(fakeStorage(), allPlanned).moduleProgress("Z");
  assert.equal(q.total, 0);
  assert.equal(q.percent, 0);
  assert.equal(q.planned, 2);
});

test("courseProgress: 4 built concepts; 1 complete = 25%, 2 = 50%; revisit is counted apart", () => {
  const p = make();
  assert.deepEqual(p.courseProgress(), { total: 4, done: 0, revisit: 0, percent: 0 });
  p.setStatus("a1", "complete");                     // 1/4 = 25
  assert.equal(p.courseProgress().percent, 25);
  p.setStatus("b1", "complete");                     // 2/4 = 50
  assert.equal(p.courseProgress().percent, 50);
  p.setStatus("a2", "revisit");
  assert.deepEqual(p.courseProgress(), { total: 4, done: 2, revisit: 1, percent: 50 });
  assert.deepEqual(p.revisitList().map((x) => x.id), ["a2"]);
});

test("progress persists across reloads", () => {
  const s = fakeStorage();
  make(s).setStatus("a2", "revisit");
  assert.equal(make(s).status("a2"), "revisit");
  assert.equal(stored(s).v, 2);
});

// ---- resume ----
test("resume: start, the in-progress one, the last-touched one first, then the next not-started", () => {
  const p = make();
  assert.deepEqual(p.resume(), { id: "a1", kind: "start" });
  p.markOpened("a2");
  assert.deepEqual(p.resume(), { id: "a2", kind: "resume" });
  p.markOpened("a3");
  assert.deepEqual(p.resume(), { id: "a3", kind: "resume" }, "the most recently opened in-progress one");
  p.setStatus("a3", "complete");
  assert.deepEqual(p.resume(), { id: "a2", kind: "resume" }, "still in progress, even though last is complete");
  p.setStatus("a2", "complete");
  assert.deepEqual(p.resume(), { id: "b1", kind: "next" }, "no one in progress: next not-started after the last-touched a2");
});

test("resume skips complete and revisit, crosses modules, wraps, and ends", () => {
  const p = make();
  p.setStatus("a3", "complete"); p.setStatus("b1", "complete");       // last = b1
  assert.deepEqual(p.resume(), { id: "a1", kind: "next" }, "wraps to the first not-started");
  p.setStatus("a1", "revisit"); p.setStatus("a2", "complete");
  assert.deepEqual(p.resume(), { id: null, kind: "all-done" }, "revisit is not a next step");
  const q = make();
  q.setStatus("a3", "complete");
  assert.deepEqual(q.resume(), { id: "b1", kind: "next" });
});

test("resume ignores a stored last id that is no longer built", () => {
  const s = fakeStorage();
  make(s).markOpened("a4");                          // a4 is planned: known but not in the chain
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

test("subscribers are told about changes", () => {
  const p = make();
  let n = 0;
  const off = p.subscribe(() => n++);
  p.markOpened("a1"); p.setStatus("a1", "complete");
  off(); p.setStatus("a1", "revisit");
  assert.equal(n, 2);
});

// ---- old format ----
const OLD_AT = "2026-01-01T00:00:10Z";
const oldState = (concepts) => ({ v: 1, concepts, last: { id: "a1", at: OLD_AT }, open: { "syllabus:A": true }, quiz: {} });

test("old v1 data in localStorage migrates: done -> complete, visited-only -> in progress, times kept", () => {
  const s = fakeStorage({ [STORAGE_KEY]: JSON.stringify(oldState({
    a1: { visited: "2026-01-01T00:00:01Z", done: "2026-01-01T00:00:05Z" },
    a2: { visited: "2026-01-01T00:00:02Z", done: null },
  })) });
  const p = make(s);
  assert.equal(p.recovered, false);
  assert.equal(p.status("a1"), "complete");
  assert.equal(p.status("a2"), "in-progress");
  assert.equal(p.status("a3"), "not-started");
  assert.equal(p.isOpen("syllabus:A"), true);
  const out = JSON.parse(p.exportJSON()).progress.concepts;
  assert.deepEqual(out.a1, { status: "complete", statusAt: "2026-01-01T00:00:05Z" });
  assert.deepEqual(out.a2, { status: "in-progress", statusAt: "2026-01-01T00:00:02Z" });
  p.markOpened("a3");                                   // the next write stores the new shape
  assert.equal(stored(s).v, 2);
  assert.deepEqual(stored(s).concepts.a1, out.a1);
});

// ---- two stores, one storage, injected clocks ----
test("two stores merge by latest statusAt per concept (injected clocks, not wall time)", () => {
  const s = fakeStorage();
  const ca = makeClock().at(100);
  const cb = makeClock().at(200);
  const a = createProgress({ course: toy, storage: s, now: ca, target: null });
  const b = createProgress({ course: toy, storage: s, now: cb, target: null });
  a.setStatus("a1", "complete");                         // a1 @100
  b.setStatus("a1", "revisit");                          // b re-reads first, then a1 @200 wins
  assert.equal(stored(s).concepts.a1.status, "revisit");
  ca.at(300);
  a.setStatus("a1", "in-progress");                      // @300 beats @200, even though b wrote last in real time
  cb.at(250);
  b.setStatus("a2", "complete");                         // b re-reads: sees a1 @300 and keeps it
  assert.equal(stored(s).concepts.a1.status, "in-progress");
  assert.equal(stored(s).concepts.a2.status, "complete");
  assert.equal(b.status("a1"), "in-progress");
});

test("mergeStates: the later statusAt wins, in either argument order; other concepts are kept", () => {
  const clk = makeClock();
  const st = (concepts) => ({ v: 2, concepts, last: null, open: {}, quiz: {} });
  const older = st({ a1: { status: "complete", statusAt: clk.iso(100) }, a2: { status: "revisit", statusAt: clk.iso(5) } });
  const newer = st({ a1: { status: "revisit", statusAt: clk.iso(200) }, a3: { status: "in-progress", statusAt: clk.iso(7) } });
  for (const [x, y] of [[older, newer], [newer, older]]) {
    const m = mergeStates(x, y).concepts;
    assert.equal(m.a1.status, "revisit");
    assert.equal(m.a2.status, "revisit");
    assert.equal(m.a3.status, "in-progress");
  }
});

test("a learner's later action wins even if this browser's clock was set back", () => {
  const s = fakeStorage();
  const a = createProgress({ course: toy, storage: s, now: makeClock().at(200), target: null });
  const b = createProgress({ course: toy, storage: s, now: makeClock().at(100), target: null });
  a.setStatus("a1", "complete");                         // @200
  b.setStatus("a1", "revisit");                          // clock says 100; stamped 200 s + 1 ms
  assert.equal(stored(s).concepts.a1.status, "revisit");
  assert.equal(stored(s).concepts.a1.statusAt, "2026-01-01T00:03:20.001Z");   // 200 s = 3 min 20 s
});

test("equal statusAt: the stored copy wins", () => {
  const at = makeClock.call ? makeClock().iso(50) : null;
  const local = { v: 2, concepts: { a1: { status: "complete", statusAt: at } }, last: null, open: {}, quiz: {} };
  const other = { v: 2, concepts: { a1: { status: "revisit", statusAt: at } }, last: null, open: {}, quiz: {} };
  assert.equal(mergeStates(local, other).concepts.a1.status, "revisit");
  assert.equal(mergeStates(other, local).concepts.a1.status, "complete");
});

test("a not-started change is kept as a record, so an older complete cannot come back", () => {
  const s = fakeStorage();
  const a = createProgress({ course: toy, storage: s, now: makeClock().at(100), target: null });
  const b = createProgress({ course: toy, storage: s, now: makeClock().at(200), target: null });
  a.setStatus("a1", "complete");                         // @100
  b.setStatus("a1", "not-started");                      // @200
  a.markOpened("a2");                                    // a re-reads before writing
  assert.equal(a.status("a1"), "not-started");
  assert.equal(stored(s).concepts.a1.status, "not-started");
});

test("storage event: another tab's change is merged and subscribers are told", () => {
  const s = fakeStorage();
  const win = fakeWindow();
  const a = createProgress({ course: toy, storage: s, now: makeClock().at(100), target: win });
  const b = createProgress({ course: toy, storage: s, now: makeClock().at(200), target: null });
  let n = 0;
  a.subscribe(() => n++);
  b.setStatus("a2", "complete");
  assert.equal(a.status("a2"), "not-started", "not seen until the event");
  win.fire({ key: STORAGE_KEY });
  assert.equal(a.status("a2"), "complete");
  assert.equal(n, 1);
  win.fire({ key: "something-else" });
  assert.equal(n, 1, "other keys are ignored");
  win.fire({ key: null });                                // storage.clear() in another tab
  assert.equal(n, 2);
});

// ---- data from a later version ----
test("data from a later version is kept byte for byte and never written over; reload notice flag is set", () => {
  const future = JSON.stringify({ v: 3, concepts: { a1: { state: "mastered" } }, extra: [1, 2, 3] });
  const s = fakeStorage({ [STORAGE_KEY]: future });
  const p = make(s);
  assert.equal(p.needsReload, true);
  assert.equal(p.recovered, false, "not treated as corrupt");
  p.markOpened("a1");
  p.setStatus("a2", "complete");
  p.setOpen("outline:A", true);
  p.reset();
  assert.equal(p.status("a2"), "not-started");            // reset changed memory only
  assert.deepEqual(p.importJSON(JSON.stringify({ app: "mlmath", version: 2, progress: JSON.parse(p.exportJSON()).progress })).ok, false);
  assert.equal(s.data[STORAGE_KEY], future, "stored value is untouched");
});

test("the app still works in memory while locked", () => {
  const p = make(fakeStorage({ [STORAGE_KEY]: '{"v":9}' }));
  p.setStatus("a1", "complete");
  assert.equal(p.status("a1"), "complete");
  assert.equal(p.courseProgress().done, 1);
});

test("a later version that saves while this tab is open also locks this tab", () => {
  const s = fakeStorage();
  const p = make(s);
  p.markOpened("a1");
  const future = '{"v":3,"anything":true}';
  s.data[STORAGE_KEY] = future;                           // another tab ran newer code
  p.setStatus("a2", "complete");                          // the re-read before the write sees v3
  assert.equal(p.needsReload, true);
  assert.equal(s.data[STORAGE_KEY], future);
});

test("readState: v1 and v2 are read, v3 is 'newer', garbage is null", () => {
  assert.equal(readState({ v: 3 }).newer, true);
  assert.equal(readState({ v: 1, concepts: {} }).state.v, 2);
  assert.equal(readState({ v: 2, concepts: {} }).state.v, 2);
  assert.equal(readState(null), null);
});

// ---- export and import ----
test("export writes the new format (file version 2, status and statusAt per concept)", () => {
  const a = make();
  a.setStatus("a1", "complete"); a.markOpened("a2");
  const file = JSON.parse(a.exportJSON());
  assert.equal(file.app, "mlmath");
  assert.equal(file.version, 2);
  assert.equal(file.progress.v, 2);
  assert.deepEqual(Object.keys(file.progress.concepts.a1).sort(), ["status", "statusAt"]);
  assert.equal(file.progress.concepts.a1.status, "complete");
  assert.equal(file.progress.concepts.a2.status, "in-progress");
});

test("import accepts a file in the new format", () => {
  const a = make();
  a.setStatus("a1", "complete"); a.setStatus("a2", "revisit");
  const b = make();
  assert.deepEqual(b.importJSON(a.exportJSON()), { ok: true });
  assert.equal(b.status("a1"), "complete");
  assert.equal(b.status("a2"), "revisit");
});

test("import accepts a file exported by the old version", () => {
  const oldFile = JSON.stringify({ app: "mlmath", version: 1, progress: oldState({
    a1: { visited: "2026-01-01T00:00:01Z", done: "2026-01-01T00:00:05Z" },
    a2: { visited: "2026-01-01T00:00:02Z", done: null },
  }) });
  const s = fakeStorage();
  const b = make(s);
  assert.deepEqual(b.importJSON(oldFile), { ok: true });
  assert.equal(b.status("a1"), "complete");
  assert.equal(b.status("a2"), "in-progress");
  assert.equal(stored(s).v, 2, "saved in the new format");
  assert.equal(JSON.parse(b.exportJSON()).version, 2);
});

test("bad imports are refused and leave progress untouched", () => {
  const p = make();
  p.setStatus("a1", "complete");
  const before = p.exportJSON();
  const bads = [
    "not json at all",
    "[]",
    '{"app":"other","version":2,"progress":{}}',
    '{"app":"mlmath","version":99,"progress":{}}',
    '{"app":"mlmath","version":1,"progress":{"v":1,"concepts":{"a1":{"visited":"garbage","done":null}}}}',
    '{"app":"mlmath","version":2,"progress":{"v":2,"concepts":{"a1":{"status":"done","statusAt":"2026-01-01T00:00:00Z"}}}}',
    '{"app":"mlmath","version":2,"progress":{"v":1,"concepts":{}}}',
    '{"app":"mlmath","version":1}',
    '{"app":"mlmath","version":2}',
  ];
  for (const text of bads) {
    const r = p.importJSON(text);
    assert.equal(r.ok, false, text);
    assert.equal(typeof r.error, "string");
    assert.equal(p.status("a1"), "complete", "existing progress survives a bad import");
    assert.equal(p.exportJSON(), before);
  }
});

// ---- the real course.json ----
test("real course: Module 1 lists all 8 concepts, 4 built; progress is over built only", () => {
  const m01 = real.modules.find((m) => m.id === "m01");
  assert.equal(m01.concepts.length, 8);
  assert.equal(m01.concepts.filter((x) => x.status === "built").length, 4);
  const p = createProgress({ course: real, storage: fakeStorage(), now: clock, target: null });
  p.setStatus("m01-vectors", "complete");                           // 1 of 4 built = 25%
  const r = p.moduleProgress("m01");
  assert.deepEqual([r.total, r.all, r.done, r.percent], [4, 8, 1, 25]);
  p.setStatus("m01-vectors", "not-started");
  p.setStatus("m00-variables", "complete");                         // 1 of 10 built in m00 = 10%
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

test("renderInline escapes HTML and turns [[text|id]] into glossary spans", () => {
  assert.equal(renderInline("a <b> [[slope|slope]]"), 'a &lt;b&gt; <span class="term" data-term="slope">slope</span>');
  assert.deepEqual(termIdsIn("[[x|a]] and [[y|b-c]]"), ["a", "b-c"]);
  assert.equal(plainText("a [[slope|slope]]"), "a slope");
});
