// E2E check: symbols drawn by KaTeX are pointer-only; each equation that has symbols gets a collapsed
// "Symbols in this equation" list whose buttons open the same popovers from the keyboard; scrolling equations are reachable.
// Run: node tests/e2e/symbols.mjs   (Playwright needed; prints SKIPPED and exits 1 otherwise)
import { readFileSync } from "node:fs";
import { requirePlaywright, serveStatic, siteRoot } from "../../tools/lib/playwright.mjs";

const pw = await requirePlaywright("symbols e2e");
const { base, close } = await serveStatic();
let failures = 0, checks = 0;
const check = (ok, label) => { checks++; if (!ok) { failures++; console.error(`FAIL  ${label}`); } };
const browser = await pw.chromium.launch();
const course = JSON.parse(readFileSync(`${siteRoot}/data/course.json`, "utf8"));
const PAGES = course.modules.flatMap((m) => m.concepts.filter((c) => m.status === "built" && c.status === "built").map((c) => [c.id, c.path]));
let pagesWithLists = 0, mergedSeen = 0;

for (const [name, url] of PAGES) {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(base + url, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const info = await page.evaluate(() => {
    const syms = [...document.querySelectorAll(".katex [data-sym]")];
    const lists = [...document.querySelectorAll(".eq-symbols")];
    const displays = [...document.querySelectorAll(".math-display")];
    const regions = displays.filter((d) => d.getAttribute("role") === "region");
    const labels = regions.map((r) => r.getAttribute("aria-label"));
    return {
      focusableSyms: syms.filter((e) => e.hasAttribute("tabindex") || e.hasAttribute("role")).length,
      symCount: syms.length,
      openLists: lists.filter((d) => d.open).length,
      lists: lists.length,
      displaysWithSyms: displays.filter((d) => d.querySelector("[data-sym]")).length,
      displaysWithList: displays.filter((d) => d.nextElementSibling?.matches(".eq-symbols")).length,
      listsOnSymless: lists.filter((d) => { const a = d.previousElementSibling; return !a?.querySelector("[data-sym]"); }).length,
      missing: syms.filter((e) => { const list = e.closest(".math-display")?.nextElementSibling ?? e.closest("p, li, td")?.nextElementSibling; const merged = list?.matches?.(".math-display") && list.nextElementSibling?.matches(".eq-symbols"); return !list?.matches?.(".eq-symbols") && !merged && !e.closest("p, li, td")?.querySelector(".eq-symbols"); }).length,
      // A paragraph's symbols that sit just before an equation with symbols are merged into one "Symbols" list after the equation.
      splitBeforeDisplay: lists.filter((d) => d.nextElementSibling?.matches(".math-display") && d.nextElementSibling.querySelector("[data-sym]")).length,
      mergedLists: lists.filter((d) => d.querySelector(":scope > summary")?.textContent === "Symbols").length,
      mergedHasBoth: lists.filter((d) => d.querySelector(":scope > summary")?.textContent === "Symbols").every((d) => d.previousElementSibling?.matches(".math-display") && d.previousElementSibling.previousElementSibling?.dataset.symbolList === "merged"),
      unscrollable: displays.filter((d) => d.scrollWidth > d.clientWidth + 1 && d.tabIndex !== 0).length,
      scrollOk: regions.every((r) => r.tabIndex === 0),
      uniqueLabels: new Set(labels).size === labels.length,
      fitting: displays.filter((d) => d.scrollWidth <= d.clientWidth + 1 && d.hasAttribute("tabindex")).length,
    };
  });
  if (info.symCount === 0) { check(info.lists === 0, `${name}: no symbols, so no symbol lists`); await ctx.close(); continue; }
  pagesWithLists++; mergedSeen += info.mergedLists;
  check(info.lists > 0, `${name}: expected symbol lists`);
  check(info.focusableSyms === 0, `${name}: ${info.focusableSyms} KaTeX symbols still have tabindex or a role`);
  check(info.openLists === 0, `${name}: symbol lists should start collapsed`);
  check(info.displaysWithSyms === info.displaysWithList, `${name}: ${info.displaysWithSyms} display equations have symbols but ${info.displaysWithList} have a list`);
  check(info.splitBeforeDisplay === 0, `${name}: ${info.splitBeforeDisplay} paragraph symbol lists still sit above an equation that has its own list`);
  check(info.mergedHasBoth, `${name}: merged "Symbols" lists exist (${info.mergedLists}) and each follows its equation`);
  check(info.listsOnSymless === 0, `${name}: a symbol list sits under something with no symbols`);
  check(info.missing === 0, `${name}: ${info.missing} symbols have no list`);
  check(info.unscrollable === 0 && info.scrollOk && info.fitting === 0, `${name}: scrolling equations must be focusable regions, fitting ones must not be`);
  check(info.uniqueLabels, `${name}: scrolling-equation labels must be unique`);

  // Keyboard path: summary opens the list, Tab reaches a symbol button, the popover opens, Esc closes it and returns focus.
  const summary = page.locator(".eq-symbols > summary").first();
  await summary.scrollIntoViewIfNeeded();
  await summary.focus();
  await page.keyboard.press("Enter");
  check(await page.evaluate(() => document.querySelector(".eq-symbols").open), `${name}: Enter on the summary should open the list`);
  await page.keyboard.press("Tab");
  const onButton = await page.evaluate(() => document.activeElement.matches(".sym-term"));
  check(onButton, `${name}: Tab from the summary should reach a symbol button`);
  await page.keyboard.press("Enter");
  check(await page.locator(".glossary-popover:not([hidden])").count() === 1, `${name}: Enter on a symbol button should open its popover`);
  await page.keyboard.press("Escape");
  check(await page.locator(".glossary-popover:not([hidden])").count() === 0, `${name}: Esc should close the popover`);
  check(await page.evaluate(() => document.activeElement.matches(".sym-term")), `${name}: focus should return to the symbol button`);
  await ctx.close();
}

// Touch: every "Symbols in this equation" button is at least 44 x 44 CSS px, at phone and tablet widths.
check(pagesWithLists >= 8 && mergedSeen > 0, `symbol lists exist on ${pagesWithLists} concept pages (at least 8) and merged "Symbols" lists on some (${mergedSeen})`);
for (const [name, url] of PAGES) {
  for (const width of [375, 768]) {
    const ctx = await browser.newContext({ viewport: { width, height: 800 }, hasTouch: true });
    const page = await ctx.newPage();
    await page.goto(base + url, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    const r = await page.evaluate(() => {
      const coarse = matchMedia("(pointer: coarse)").matches;
      document.querySelectorAll(".eq-symbols").forEach((d) => { d.open = true; });
      const small = [...document.querySelectorAll(".eq-symbols .sym-term")].map((b) => b.getBoundingClientRect()).filter((b) => b.width < 43.5 || b.height < 43.5);
      return { coarse, total: document.querySelectorAll(".eq-symbols .sym-term").length, small: small.map((b) => `${Math.round(b.width)}x${Math.round(b.height)}`).slice(0, 4) };
    });
    check(r.coarse, `${name}@${width}: the browser did not report a coarse pointer, so the touch test is not valid`);
    if (r.total === 0) { await ctx.close(); continue; }
    check(r.small.length === 0, `${name}@${width}: symbol buttons under 44px on touch: ${r.small.join(", ")}`);
    await ctx.close();
  }
}

await browser.close();
await close();
console.log(`${checks} checks, ${failures} failed`);
process.exit(failures ? 1 : 0);
