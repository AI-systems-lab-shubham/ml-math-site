import test from "node:test";
import assert from "node:assert/strict";
import { continueMode, continueLabel, makePending, readPending, ToastTimer, PENDING_TTL_MS, TOAST_MS, TOAST_MIN_MS } from "../assets/js/continue-math.mjs";

test("continueMode and label: four cases", () => {
  const next = { title: "Functions and graphs" };
  assert.equal(continueMode("not-started", next), "mark-continue");
  assert.equal(continueMode("in-progress", next), "mark-continue");
  assert.equal(continueMode("revisit", next), "mark-continue", "revisit can be completed too");
  assert.equal(continueMode("complete", next), "continue");
  assert.equal(continueMode("in-progress", null), "mark", "last concept: just mark");
  assert.equal(continueMode("complete", null), "none", "last and complete: nothing to do");
  assert.equal(continueLabel("mark-continue"), "Mark complete and continue");
  assert.equal(continueLabel("continue", "Functions and graphs"), "Continue to Functions and graphs");
  assert.equal(continueLabel("mark"), "Mark complete");
  assert.equal(continueLabel("none"), "");
});

const NOW = 1_000_000;
const stored = (over = {}) => JSON.stringify({ ...makePending({ id: "m00-equations", title: "Equations", previous: { status: "in-progress" }, expectedAt: "2026-01-01T00:00:05.000Z" }, NOW), ...over });

test("pending undo: fresh is read back; expires after 60 s (boundary at 60,000 ms)", () => {
  const raw = stored();
  assert.deepEqual(readPending(raw, NOW), { id: "m00-equations", title: "Equations", previous: { status: "in-progress" }, expectedAt: "2026-01-01T00:00:05.000Z" });
  assert.notEqual(readPending(raw, NOW + PENDING_TTL_MS), null, "exactly 60 s is still valid");   // 1,000,000 + 60,000
  assert.equal(readPending(raw, NOW + PENDING_TTL_MS + 1), null, "60.001 s is expired");
  assert.equal(PENDING_TTL_MS, 60000);
  assert.equal(readPending(raw, NOW - 6000), null, "a timestamp from the future (clock skew over 5 s) is refused");
});

test("pending undo: malformed, wrong-shape, unknown or foreign data is refused", () => {
  for (const raw of [null, undefined, "", "not json", "[]", "5", "null", stored({ id: 5 }), stored({ title: null }), stored({ expectedAt: "yesterday" }), stored({ previous: { status: "done" } }), stored({ previous: null }), stored({ at: "now" }), stored({ at: Infinity })]) {
    assert.equal(readPending(raw, NOW), null, String(raw));
  }
  assert.equal(readPending(stored(), NOW, (id) => id === "other"), null, "unknown concept id");
});

test("ToastTimer: runs 12 s (never under 10 s) and stops while paused", () => {
  assert.ok(TOAST_MS >= TOAST_MIN_MS && TOAST_MIN_MS === 10000);
  const t = new ToastTimer().start(0);
  assert.equal(t.expired(9_999), false);
  assert.equal(t.expired(TOAST_MS - 1), false);
  assert.equal(t.expired(TOAST_MS), true);
  // hover from 4 s to 30 s: the clock stands still
  const p = new ToastTimer().start(0);
  p.pause(4000);                                             // 8,000 ms left
  assert.equal(p.remaining(30_000), 8000);
  assert.equal(p.expired(1_000_000), false, "paused toasts never expire");
  p.resume(30_000);
  assert.equal(p.expired(37_999), false);                    // 8,000 ms after 30,000 is 38,000
  assert.equal(p.expired(38_000), true);
  p.pause(31_000); p.pause(32_000);                          // a second pause changes nothing
  assert.equal(p.remaining(99_999), 7000);
  p.resume(40_000); p.resume(41_000);                        // a second resume changes nothing
  assert.equal(p.remaining(41_000), 6000);
});
