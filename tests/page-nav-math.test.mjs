import test from "node:test";
import assert from "node:assert/strict";
import { pickCurrent, sectionKey, withOpen, cleanOpen, plural, barAway } from "../assets/js/page-nav-math.mjs";

test("pickCurrent: the last entry whose top has reached the line; null before the first", () => {
  const e = [{ key: "a", top: -400 }, { key: "b", top: -20 }, { key: "c", top: 90 }, { key: "d", top: 600 }];
  assert.equal(pickCurrent(e, 100), "c");          // c.top 90 <= 100
  assert.equal(pickCurrent(e, 89), "b");           // 90 > 89, so b
  assert.equal(pickCurrent(e, -500), null);        // nothing has reached the line
  assert.equal(pickCurrent([], 100), null);
  assert.equal(pickCurrent(e, 600), "d");          // equal counts as reached
});

test("sectionKey is stable and distinguishes repeats", () => {
  assert.equal(sectionKey("concept-slope", "teach"), "concept-slope:teach");
  assert.equal(sectionKey("concept-slope", "sym", 0), "concept-slope:sym");
  assert.equal(sectionKey("concept-slope", "sym", 2), "concept-slope:sym:2");
});

test("withOpen stores only open keys and does not mutate its input", () => {
  const saved = { a: true };
  const open = withOpen(saved, ["b", "c"], true);
  assert.deepEqual(open, { a: true, b: true, c: true });
  assert.deepEqual(saved, { a: true });
  assert.deepEqual(withOpen(open, ["a", "c"], false), { b: true });
  assert.deepEqual(withOpen(undefined, ["x"], true), { x: true });
});

test("cleanOpen drops anything that is not exactly true", () => {
  assert.deepEqual(cleanOpen({ a: true, b: false, c: "yes", d: 1, e: null }), { a: true });
  for (const bad of [null, undefined, [], "x", 5]) assert.deepEqual(cleanOpen(bad), {});
});

test("plural", () => {
  assert.equal(plural(1, "section"), "1 section");
  assert.equal(plural(12, "section"), "12 sections");
  assert.equal(plural(0, "section"), "0 sections");
});

test("barAway: hides after scrolling down, shows on any scroll up, never near the top", () => {
  assert.equal(barAway({ y: 150, lastY: 100, away: false }), false, "still within the first 200px");
  assert.equal(barAway({ y: 500, lastY: 400, away: false }), true, "down by 100");
  assert.equal(barAway({ y: 505, lastY: 500, away: true }), true, "a 5px wobble keeps the state");
  assert.equal(barAway({ y: 495, lastY: 500, away: true }), true, "up by only 5 is within the slack of 8");
  assert.equal(barAway({ y: 490, lastY: 500, away: true }), false, "up by 10 is more than the slack");
  assert.equal(barAway({ y: 480, lastY: 500, away: true }), false, "up by 20 shows it");
  assert.equal(barAway({ y: 300, lastY: 305, away: false }), false, "small wobble keeps shown");
  assert.equal(barAway({ y: 100, lastY: 600, away: true }), false, "back near the top");
  assert.equal(barAway({ y: 5000, lastY: 300, away: false }), false, "a 4,700px move is a jump, so the bar stays");
  assert.equal(barAway({ y: 5000, lastY: 300, away: true }), false, "and a jump brings it back");
  assert.equal(barAway({ y: 1300, lastY: 600, away: false }), true, "a 700px move (page down) is reading");
});
