// E2E check: accessible names and states that must match what is on screen.
//   1. The header's progress link: its accessible name begins with its visible text (WCAG 2.5.3 Label in Name), with and without scripts.
//   2. A term that is a tab stop is a button that opens a dialog: role="button", aria-haspopup="dialog", aria-expanded follows the popover.
//      Terms that are not tab stops carry no role. The appearance of a term does not depend on the role.
// Run: node tests/e2e/a11y-names.mjs   (Playwright needed; prints SKIPPED and exits 1 otherwise)
import { readFileSync } from "node:fs";
import { requirePlaywright, serveStatic, siteRoot } from "../../tools/lib/playwright.mjs";

const pw = await requirePlaywright("a11y-names e2e");
const { base, close } = await serveStatic();
const browser = await pw.chromium.launch();
const course = JSON.parse(readFileSync(`${siteRoot}/data/course.json`, "utf8"));
const built = course.modules.filter((m) => m.status === "built");
const TOTAL = built.flatMap((m) => m.concepts).filter((c) => c.status === "built").length;
const CONCEPT = built[0].concepts[0].path;

let failures = 0, checks = 0;
const check = (ok, label) => { checks++; if (!ok) { failures++; console.error(`FAIL  ${label}`); } };

// 1. Progress link name.
for (const [label, url] of [["home", ""], ["overview", built[0].path], ["concept page", CONCEPT]]) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(base + url, { waitUntil: "networkidle" });
  await page.waitForFunction(() => /\d+ of \d+ complete/.test(document.querySelector(".topbar-progress-text")?.textContent ?? ""));
  const visible = (await page.locator(".topbar-progress-text").innerText()).trim();
  check(visible === `0 of ${TOTAL} complete`, `${label}: visible text is "0 of ${TOTAL} complete" (got "${visible}")`);
  const byRole = await page.getByRole("link", { name: `${visible}, course progress`, exact: true }).count();
  check(byRole === 1, `${label}: the link's accessible name is "${visible}, course progress"`);
  check((await page.locator("[data-course-progress]").getAttribute("aria-label")) === `${visible}, course progress`, `${label}: aria-label is the visible text, then ", course progress"`);
  await ctx.close();
}
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(base + CONCEPT, { waitUntil: "load" });
  const visible = (await page.locator(".topbar-progress-text").textContent()).trim();
  check(await page.getByRole("link", { name: `${visible}, course progress`, exact: true }).count() === 1, `no scripts: the name still begins with the visible text "${visible}"`);
  await ctx.close();
}

// 2. Terms.
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(base + CONCEPT, { waitUntil: "networkidle" });
  await page.waitForSelector(".term.is-marked[data-ready]");
  const state = () => page.evaluate(() => {
    const info = (e) => ({ role: e.getAttribute("role"), popup: e.getAttribute("aria-haspopup"), expanded: e.getAttribute("aria-expanded"), tab: e.getAttribute("tabindex") });
    const marked = [...document.querySelectorAll(".term.is-marked")], plain = [...document.querySelectorAll(".term[data-ready]:not(.is-marked)")];
    return { marked: marked.map(info), plain: plain.map(info), n: marked.length };
  });
  let s = await state();
  check(s.n > 0 && s.marked.every((t) => t.role === "button" && t.popup === "dialog" && t.expanded === "false" && t.tab === "0"), `${s.n} highlighted terms are tab stops with role=button, aria-haspopup=dialog and aria-expanded=false`);
  check(s.plain.length > 0 && s.plain.every((t) => t.role === null && t.tab === null && t.expanded === null), `${s.plain.length} other terms are not tab stops and carry no role or aria-expanded`);

  const term = page.locator(".term.is-marked").first();
  await term.focus();
  await page.keyboard.press("Enter");
  check(await term.getAttribute("aria-expanded") === "true" && await page.locator(".glossary-popover").isVisible(), "opening the popover sets aria-expanded=true");
  await page.keyboard.press("Escape");
  check(await term.getAttribute("aria-expanded") === "false" && await page.locator(".glossary-popover").isHidden(), "Esc closes it and sets aria-expanded=false");
  check(await page.evaluate(() => document.activeElement === document.querySelector(".term.is-marked")), "focus returns to the term");

  // Another term while one is open: only the new one reads as expanded.
  const second = page.locator(".term.is-marked").nth(1);
  await term.click();
  await second.click();
  check(await term.getAttribute("aria-expanded") === "false" && await second.getAttribute("aria-expanded") === "true", "moving to another term collapses the first");
  await page.keyboard.press("Escape");

  // Highlight all terms turns every term into a button, and turning it off removes the role again.
  await page.locator("[data-highlight-toggle]").click();
  s = await state();
  check(s.plain.length === 0 || s.plain.every((t) => t.role === "button" && t.tab === "0"), "Highlight all terms: every term is a button and a tab stop");
  await page.locator("[data-highlight-toggle]").click();
  s = await state();
  check(s.plain.length > 0 && s.plain.every((t) => t.role === null && t.tab === null && t.expanded === null), "Highlight all terms off: the role and tab stop go again");

  // Looks: the role changes nothing visible (cursor, underline, size).
  const look = await page.evaluate(() => { const t = document.querySelector(".term.is-marked"); const cs = getComputedStyle(t); const r = t.getBoundingClientRect(); const before = { cursor: cs.cursor, deco: cs.textDecorationLine, bb: cs.borderBottomStyle, w: Math.round(r.width), h: Math.round(r.height) }; t.removeAttribute("role"); const cs2 = getComputedStyle(t); const r2 = t.getBoundingClientRect(); const after = { cursor: cs2.cursor, deco: cs2.textDecorationLine, bb: cs2.borderBottomStyle, w: Math.round(r2.width), h: Math.round(r2.height) }; return JSON.stringify(before) === JSON.stringify(after); });
  check(look, "role=button changes no visible style (cursor, underline, border, size)");

  // Symbol buttons in the "Symbols in this equation" list.
  const sym = page.locator("button.sym-term").first();
  if (await sym.count()) {
    await sym.evaluate((b) => b.closest("details")?.setAttribute("open", ""));
    check(await sym.getAttribute("aria-expanded") === "false", "symbol button starts with aria-expanded=false");
    await sym.click();
    check(await sym.getAttribute("aria-expanded") === "true", "symbol button: aria-expanded=true while its popover is open");
    await page.keyboard.press("Escape");
    check(await sym.getAttribute("aria-expanded") === "false", "symbol button: false again after Esc");
  }
  await ctx.close();
}

await browser.close();
await close();
console.log(`a11y-names e2e: ${checks} checks, ${failures} failed`);
process.exit(failures ? 1 : 0);
