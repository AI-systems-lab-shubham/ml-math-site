// E2E check: a widget readout with fixed rows (setReadoutRows) has a height that does not depend on how its text wraps,
// and nothing clips. For the angle widget: always three rows; at every widget width from a 320 px phone up, for every one of
// its 72 x 13 slider states, each row's text fits inside its fixed box (scrollHeight <= clientHeight) and the readout's
// total height is the same for every state. The long values (direction 355, length 6, and the zero vector) are checked at 375 px by name.
// Run: node tests/e2e/widget-readout.mjs   (Playwright needed; prints SKIPPED and exits 1 otherwise)
import { requirePlaywright, serveStatic } from "../../tools/lib/playwright.mjs";

const pw = await requirePlaywright("widget-readout e2e");
const { base, close } = await serveStatic();
const browser = await pw.chromium.launch();
const URL_ = "modules/02-analytic-geometry/angle-cosine/";
let failures = 0, checks = 0;
const check = (ok, label) => { checks++; if (!ok) { failures++; console.error(`FAIL  ${label}`); } };

const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
await page.goto(base + URL_, { waitUntil: "networkidle" });
await page.evaluate(async () => { (await import("/assets/js/widgets.mjs")).mountAllLazy(); });
await page.waitForFunction(() => document.querySelector('[data-widget="angle"]').dataset.lazy === "mounted");
await page.evaluate(() => document.fonts.ready);

// Every state at the current width. Returns what is wrong, and the set of readout heights seen.
const sweep = () => page.evaluate(() => {
  const h = document.querySelector('[data-widget="angle"]');
  const [d, l] = h.querySelectorAll("input[type=range]");
  const readout = h.querySelector(".readout");
  const bad = []; const heights = new Set(); let rowCounts = new Set();
  const set = (dir, len) => { d.value = dir; d.dispatchEvent(new Event("input", { bubbles: true })); l.value = len; l.dispatchEvent(new Event("input", { bubbles: true })); };
  for (let dir = 0; dir <= 355; dir += 5) for (let len = 0; len <= 6; len += 0.5) {
    set(dir, len);
    const rows = [...readout.querySelectorAll(".readout-row")];
    rowCounts.add(rows.length);
    heights.add(Math.round(readout.getBoundingClientRect().height * 100) / 100);
    rows.forEach((r, i) => { if (r.scrollHeight > r.clientHeight + 0.5) bad.push(`dir ${dir} len ${len} row ${i + 1}: needs ${r.scrollHeight}px, box is ${r.clientHeight}px`); });
  }
  return { bad, heights: [...heights], rowCounts: [...rowCounts], host: Math.floor(h.getBoundingClientRect().width) };
});

// 1. Named long values at 375 px (the width of the failing CI case).
await page.setViewportSize({ width: 375, height: 900 });
const named = await page.evaluate(() => {
  const h = document.querySelector('[data-widget="angle"]'); const [d, l] = h.querySelectorAll("input[type=range]");
  const out = {};
  for (const [name, dir, len] of [["long numbers", 355, 6], ["negative entries", 225, 5.5], ["zero vector", 90, 0], ["start state", 40, 3]]) {
    d.value = dir; d.dispatchEvent(new Event("input", { bubbles: true })); l.value = len; l.dispatchEvent(new Event("input", { bubbles: true }));
    out[name] = [...h.querySelectorAll(".readout-row")].map((r) => ({ text: r.textContent.length, need: r.scrollHeight, box: r.clientHeight }));
  }
  return out;
});
for (const [name, rows] of Object.entries(named)) {
  check(rows.length === 3, `375px ${name}: three rows (got ${rows.length})`);
  rows.forEach((r, i) => check(r.need <= r.box, `375px ${name}: row ${i + 1} clips (${r.need}px of text in a ${r.box}px box)`));
}
check(named["long numbers"].some((r) => r.text > 60), "375px: the long-values case really is long (so the check means something)");

// 2. Every state at many widths: no clipping, one readout height per width, always three rows. Step 6 px plus the exact widths of 320, 375, 768, 1280.
const widths = new Set([320, 375, 768, 1280]);
for (let w = 320; w <= 1100; w += 6) widths.add(w);
let seenHosts = new Set();
for (const w of [...widths].sort((a, b) => a - b)) {
  await page.setViewportSize({ width: w, height: 900 });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const r = await sweep();
  seenHosts.add(r.host);
  check(r.bad.length === 0, `viewport ${w}px (widget ${r.host}px): ${r.bad.length} clipped row(s), first: ${r.bad[0]}`);
  check(r.heights.length === 1, `viewport ${w}px (widget ${r.host}px): the readout height depends on the state (${r.heights.join(", ")}px)`);
  check(r.rowCounts.join() === "3", `viewport ${w}px: row count should always be 3 (got ${r.rowCounts})`);
}
check(Math.min(...seenHosts) <= 255, `the sweep reaches the narrowest widget (${Math.min(...seenHosts)}px)`);

await ctx.close();
await browser.close();
await close();
console.log(`widget-readout e2e: ${checks} checks, ${failures} failed`);
process.exit(failures ? 1 : 0);
