// E2E check: old links from the long-page days go to the new concept pages.
// modules/NN-slug/#concept-x (and a stage, #concept-x-picture, or #concept-x-teach-it) -> modules/NN-slug/<slug>/ with the hash kept.
// Run: node tests/e2e/redirects.mjs   (Playwright needed; prints SKIPPED and exits 1 otherwise)
import { readFileSync } from "node:fs";
import { requirePlaywright, serveStatic, siteRoot } from "../../tools/lib/playwright.mjs";

const pw = await requirePlaywright("redirects e2e");
const { base, close } = await serveStatic();
const browser = await pw.chromium.launch();
const course = JSON.parse(readFileSync(`${siteRoot}/data/course.json`, "utf8"));
let failures = 0, checks = 0;
const check = (ok, label) => { checks++; if (!ok) { failures++; console.error(`FAIL  ${label}`); } };

async function go(url, width = 1280) {
  const ctx = await browser.newContext({ viewport: { width, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(base + url);
  return { ctx, page };
}
const settled = async (page, pathname) => { await page.waitForURL((u) => u.pathname === `/${pathname}`, { timeout: 5000 }).catch(() => {}); await page.waitForLoadState("networkidle"); };

for (const m of course.modules.filter((x) => x.status === "built")) {
  for (const c of m.concepts.filter((x) => x.status === "built")) {
    // Concept anchor.
    {
      const { ctx, page } = await go(`${m.path}#${c.anchor}`);
      await settled(page, c.path);
      const u = new URL(page.url());
      check(u.pathname === `/${c.path}`, `${m.path}#${c.anchor} goes to ${c.path} (got ${u.pathname})`);
      check(await page.locator("h1").innerText().catch(() => "") === c.title, `${c.anchor}: the concept page shows "${c.title}"`);
      await ctx.close();
    }
    // Stage anchor: the page opens at that stage.
    for (const stage of ["picture", "in-an-llm"]) {
      const { ctx, page } = await go(`${m.path}#${c.anchor}-${stage}`);
      await settled(page, c.path);
      await page.waitForTimeout(500);
      const u = new URL(page.url());
      check(u.pathname === `/${c.path}` && u.hash === `#${c.anchor}-${stage}`, `#${c.anchor}-${stage} goes to ${c.path} and keeps the stage hash (got ${u.pathname}${u.hash})`);
      const top = await page.evaluate((id) => document.getElementById(id)?.getBoundingClientRect().top ?? null, `${c.anchor}-${stage}`);
      check(top !== null && top >= 0 && top < 400, `${c.anchor}-${stage}: the stage is scrolled to the top of the page (top ${top === null ? "missing" : Math.round(top)})`);
      await ctx.close();
    }
  }
}
// Teach it is a closed section: an old link to it opens it.
{
  const { ctx, page } = await go("modules/00-foundations/#concept-equations-teach-it");
  await settled(page, "modules/00-foundations/equations/");
  await page.waitForTimeout(600);
  check(await page.evaluate(() => document.getElementById("concept-equations-teach-it")?.open === true), "an old link to a Teach it section opens it on the new page");
  await ctx.close();
}
// Things that are not old links stay where they are; the Back button is not trapped.
{
  const { ctx, page } = await go("modules/01-linear-algebra/#nothing-here");
  await page.waitForTimeout(500);
  check(new URL(page.url()).pathname === "/modules/01-linear-algebra/", "an unknown hash stays on the overview");
  await ctx.close();
  const b = await go("modules/01-linear-algebra/");
  await b.page.goto(base + "modules/01-linear-algebra/#concept-matrices");
  await settled(b.page, "modules/01-linear-algebra/matrices/");
  check(new URL(b.page.url()).pathname === "/modules/01-linear-algebra/matrices/", "redirect from a second navigation");
  await b.page.goBack();
  await b.page.waitForTimeout(500);
  check(new URL(b.page.url()).pathname === "/modules/01-linear-algebra/" && new URL(b.page.url()).hash === "", "Back goes to the previous page, not into a redirect loop (the redirect replaces the old-link entry)");
  await b.ctx.close();
  // Another module's concept anchor on this overview is not redirected (it would be a wrong guess).
  const x = await go("modules/01-linear-algebra/#concept-equations");
  await x.page.waitForTimeout(500);
  check(new URL(x.page.url()).pathname === "/modules/01-linear-algebra/", "a concept anchor from another module is not redirected");
  await x.ctx.close();
}
// Old links also work on a narrow screen and with blocked storage.
{
  const { ctx, page } = await go("modules/01-linear-algebra/#concept-vectors-real-life", 375);
  await settled(page, "modules/01-linear-algebra/vectors/");
  check(new URL(page.url()).pathname === "/modules/01-linear-algebra/vectors/", "redirect works at 375px");
  await ctx.close();
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx2.addInitScript(() => { Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } }); });
  const p2 = await ctx2.newPage();
  await p2.goto(base + "modules/00-foundations/#concept-slope");
  await settled(p2, "modules/00-foundations/slope/");
  check(new URL(p2.url()).pathname === "/modules/00-foundations/slope/", "redirect works with storage blocked");
  await ctx2.close();
}

await browser.close();
await close();
console.log(`redirects e2e: ${checks} checks, ${failures} failed`);
process.exit(failures ? 1 : 0);
