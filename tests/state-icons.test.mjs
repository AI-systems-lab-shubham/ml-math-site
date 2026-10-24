import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { STATUSES } from "../assets/js/progress.mjs";
import { stateIcon, stateLabel, statusButtonName } from "../assets/js/state-icons.mjs";

const css = readFileSync(new URL("../assets/css/site.css", import.meta.url), "utf8");
const token = (name) => css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))[1];

// WCAG 2 relative luminance and contrast ratio.
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (hex) => { const n = parseInt(hex.slice(1), 16); return 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255); };
const contrast = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };

// Icon colour per state, as the CSS uses it (.outline-state.state-*).
const COLOUR = { "not-started": "muted", "in-progress": "c-blue", complete: "ok", revisit: "try" };

test("every state icon is at least 3:1 against --paper (non-text contrast)", () => {
  const paper = token("paper");
  for (const st of STATUSES) {
    const ratio = contrast(token(COLOUR[st]), paper);
    assert.ok(ratio >= 3, `${st}: ${COLOUR[st]} on paper is ${ratio.toFixed(2)}:1`);
  }
});

test("revisit icon: --try #8A5A12 on --paper #FBF8F1 is 5.57:1 (at least 3:1)", () => {
  assert.equal(token("try").toUpperCase(), "#8A5A12");
  assert.equal(token("paper").toUpperCase(), "#FBF8F1");
  assert.equal(contrast(token("try"), token("paper")).toFixed(2), "5.57");
});

test("the CSS gives each state the colour this test assumes", () => {
  const rules = { "in-progress": "c-blue", complete: "ok", revisit: "try" };
  for (const [st, v] of Object.entries(rules)) {
    assert.match(css, new RegExp(`\\.outline-state\\.state-${st} \\{ color: var\\(--${v}\\); \\}`), st);
  }
});

test("each state has its own shape, not only its own colour", () => {
  const shapes = STATUSES.map((st) => stateIcon(st).replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, ""));
  assert.equal(new Set(shapes).size, 4);
  const kinds = shapes.map((s) => [...s.matchAll(/<(circle|path)\b/g)].map((m) => m[1]).join("+"));
  assert.deepEqual(kinds, ["circle", "circle+path", "circle+path", "path"]);
  assert.ok(!shapes[3].includes("<circle"), "revisit is an open arc with an arrowhead, not a circle");
  assert.match(shapes[1], /fill="currentColor"\/>$/, "in progress has a filled half");
  assert.match(shapes[2], /<circle[^>]*fill="currentColor"/, "complete is a filled disc");
  assert.match(shapes[0], /^<circle[^>]*fill="none"[^>]*\/>$/, "not started is an empty ring");
});

test("icons are hidden from assistive tech; the button name carries the status and not a concept title", () => {
  for (const st of STATUSES) {
    assert.match(stateIcon(st), /aria-hidden="true"/);
    assert.match(statusButtonName(st), /^Status: .+\. Change status\.$/);
  }
  assert.equal(statusButtonName("in-progress"), "Status: In progress. Change status.");
  assert.equal(stateLabel("revisit"), "Revisit");
});
