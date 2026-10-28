// E2E: no glossary popover on any concept page links to a later card (or to the same card).
// For every concept page: open the popover of every term on the page, follow the chained terms inside it (up to three
// levels), and read each "Learn more" link. The link must point at a concept page that comes strictly before this one.
// Also checks that a term whose target is not earlier shows no link at all.
// Run: node tests/e2e/glossary-links.mjs   (Playwright needed; prints SKIPPED and exits 1 otherwise)
import fs from "node:fs";
import path from "node:path";
import { requirePlaywright, serveStatic, siteRoot } from "../../tools/lib/playwright.mjs";
import { chain } from "../../assets/js/course.mjs";

const pw = await requirePlaywright("glossary-links e2e");
const course = JSON.parse(fs.readFileSync(path.join(siteRoot, "data/course.json"), "utf8"));
const glossary = JSON.parse(fs.readFileSync(path.join(siteRoot, "data/glossary.json"), "utf8"));
const byId = new Map(glossary.entries.map((e) => [e.id, e]));
const order = chain(course);
const indexOfPath = new Map(order.map((c, i) => [c.path, i]));
let failures = 0, checks = 0, popovers = 0, links = 0;
const check = (ok, label) => { checks++; if (!ok) { failures++; console.error(`FAIL  ${label}`); } };

const server = await serveStatic();
const browser = await pw.chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const only = process.argv.find((a) => a.startsWith("--pages="))?.slice(8).split(",");

for (const [i, c] of order.entries()) {
  if (only && !only.includes(c.id)) continue;
  const page = await ctx.newPage();
  await page.goto(new URL(c.path, server.base).href);
  await page.waitForSelector(".term[data-term]", { state: "attached" });
  const terms = [...new Set(await page.$$eval(".term[data-term]", (els) => els.map((e) => e.dataset.term)))];
  const seen = new Set();   // entries whose popover was already read on this page
  const read = () => page.evaluate(() => {
    const p = document.querySelector('[role="dialog"]');
    if (!p || p.offsetParent === null) return null;
    return { label: p.getAttribute("aria-label"), learn: [...p.querySelectorAll("a")].filter((a) => /learn more/i.test(a.textContent)).map((a) => new URL(a.href).pathname), chained: [...new Set([...p.querySelectorAll("[data-chain]")].map((b) => b.dataset.chain))] };
  });
  // Read the open popover, then open each chained term in turn (and come back), up to four levels deep.
  const visit = async (depth) => {
    const info = await read();
    if (!info) return;
    popovers++;
    for (const href of info.learn) {
      links++;
      const hit = [...indexOfPath].find(([p]) => href.endsWith(`/${p}`));
      const mod = course.modules.find((m) => href.endsWith(`/${m.path}`));
      const rank = hit ? hit[1] : mod ? order.findIndex((x) => x.moduleId === mod.id) - 0.5 : null;
      check(rank !== null && rank < i, `${c.id}: popover "${info.label}" links to ${href}, which is not before this card`);
    }
    if (depth >= 4) return;
    for (const id of info.chained) {
      if (seen.has(id)) continue;
      seen.add(id);
      await page.locator(`[role="dialog"] [data-chain="${id}"]`).first().click();
      await visit(depth + 1);
      await page.locator('[role="dialog"] .pop-back').click();
    }
  };
  for (const id of terms) {
    const el = page.locator(`.term[data-term="${id}"]`).first();
    await el.scrollIntoViewIfNeeded();
    await el.focus();
    await page.keyboard.press("Enter");
    await page.locator('[role="dialog"]').waitFor({ state: "visible", timeout: 3000 });
    seen.add(id);
    await visit(0);
    await page.keyboard.press("Escape");
  }
  await page.close();
}
// A forward term must show no link: on the first card, a term whose target is later has no "Learn more".
{
  const page = await ctx.newPage();
  await page.goto(new URL(order[0].path, server.base).href);
  await page.waitForSelector(".term[data-term]", { state: "attached" });
  const fwd = await page.$$eval(".term[data-term]", (els) => els.map((e) => e.dataset.term));
  const target = fwd.find((id) => { const l = byId.get(id)?.learnMore; return l && indexOfPath.get(l) !== undefined && indexOfPath.get(l) > 0; });
  if (target) {
    const el = page.locator(`.term[data-term="${target}"]`).first();
    await el.focus(); await page.keyboard.press("Enter");
    await page.waitForTimeout(500);
    const n = await page.locator('[role="dialog"] a', { hasText: /learn more/i }).count();
    check(n === 0, `first card: "${target}" targets a later card, so its popover must show no Learn more (found ${n})`);
  }
  await page.close();
}
await browser.close();
await server.close();
if (!only) check(popovers > 100, `the run should open many popovers (opened ${popovers})`);
console.log(`glossary-links e2e: ${checks} checks, ${failures} failed (${popovers} popovers opened, ${links} Learn more links read)`);
process.exit(failures ? 1 : 0);
