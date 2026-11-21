// E2E check: the first-visit hint (assets/js/first-hint.js) and the outline's "How to use this site" link.
// The hint shows automatically on the first two different concept pages a learner visits, then never again; Dismiss hides it for good.
// The link shows it again on request without changing what is saved. Blocked storage must not throw.
// Run: node tests/e2e/first-hint.mjs   (Playwright needed; prints SKIPPED and exits 1 otherwise)
import { readFileSync } from "node:fs";
import { requirePlaywright, serveStatic, siteRoot } from "../../tools/lib/playwright.mjs";

const pw = await requirePlaywright("first-hint e2e");
const { base, close } = await serveStatic();
const browser = await pw.chromium.launch();
const course = JSON.parse(readFileSync(`${siteRoot}/data/course.json`, "utf8"));
const concepts = course.modules.flatMap((m) => m.concepts.filter((c) => c.status === "built" && m.status === "built"));
const [A, B, C] = ["m00-variables", "m00-equations", "m00-functions"].map((id) => concepts.find((c) => c.id === id).path);
const OVERVIEW = course.modules.find((m) => m.status === "built").path;
const KEY = "mlmath:ui:v1";

let failures = 0, checks = 0;
const check = (ok, label) => { checks++; if (!ok) { failures++; console.error(`FAIL  ${label}`); } };
const hints = (page) => page.locator(".first-hint").count();
const go = (page, url) => page.goto(base + url, { waitUntil: "networkidle" });

const ui = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
const link = (page) => page.locator("#site-nav a[data-show-hint]");

{ // automatic: first two different concept pages, then hidden
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(`try { if (!localStorage.getItem("${KEY}")) localStorage.setItem("${KEY}", JSON.stringify({ other: 7 })); } catch (e) {}`);
  const page = await ctx.newPage();
  await go(page, A);
  check(await hints(page) === 1, "first concept page: exactly one hint");
  await page.reload({ waitUntil: "networkidle" });
  check(await hints(page) === 1, "reloading the first page does not use up the second slot");
  await go(page, B);
  check(await hints(page) === 1, "second concept page: the hint is shown");
  await go(page, C);
  check(await hints(page) === 0, "third concept page: hidden automatically");
  check((await ui(page)).hintPages.length === 2 && (await ui(page)).hintDismissed !== true, "the two pages are remembered; nothing is marked dismissed");
  await go(page, A);
  check(await hints(page) === 1, "one of the first two pages again: still shown");

  // the link brings it back on a page where it is hidden, and saves nothing
  await go(page, C);
  const before = JSON.stringify(await ui(page));
  check(await link(page).count() === 1 && (await link(page).getAttribute("href")).endsWith("/index.html#how"), "outline footer link to How to use this site, with the home page as its fallback target");
  await link(page).click();
  check(await hints(page) === 1, "the link shows the hint on a concept page");
  check(await page.evaluate(() => document.activeElement?.classList.contains("first-hint")), "focus moves to the hint");
  check(JSON.stringify(await ui(page)) === before, "showing it again changes nothing saved");

  // dismissal is permanent, and the link still works afterwards
  await page.locator(".first-hint button").click();
  check(await hints(page) === 0 && (await ui(page)).hintDismissed === true && (await ui(page)).other === 7, "Dismiss removes it, saves hintDismissed and keeps other saved settings");
  await go(page, A);
  check(await hints(page) === 0, "after Dismiss it stays hidden, even on a page that showed it before");
  const tab = await ctx.newPage();
  await go(tab, B);
  check(await hints(tab) === 0, "after Dismiss it stays hidden in a new tab");
  await link(tab).click();
  check(await hints(tab) === 1, "after Dismiss the link still shows it");
  await ctx.close();
}
{ // a phone: the drawer closes so the hint is in view
  const ctx = await browser.newContext({ viewport: { width: 375, height: 800 } });
  await ctx.addInitScript(`try { localStorage.setItem("${KEY}", JSON.stringify({ hintDismissed: true })); } catch (e) {}`);
  const page = await ctx.newPage();
  await go(page, A);
  await page.locator("[data-nav-toggle]").click();
  check(await page.locator("#site-nav.is-open").count() === 1, "phone: the outline drawer opens");
  await link(page).click();
  check(await page.locator("#site-nav.is-open").count() === 0, "phone: the link closes the drawer");
  check(await hints(page) === 1 && await page.locator(".first-hint").isVisible(), "phone: the hint is shown");
  await ctx.close();
}
{ // not a concept page: the link goes to the home page's How this course works
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await go(page, OVERVIEW);
  check(await hints(page) === 0, "a module overview has no hint");
  await link(page).click();
  await page.waitForURL(/index\.html#how$|\/#how$/);
  check(await page.locator("#how").count() === 1, "on a module overview the link opens the home page at How this course works");
  await ctx.close();
}
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await go(page, A);
  check(await hints(page) === 1, "a fresh browser profile sees the hint again");
  await ctx.close();
}
{
  const ctx = await browser.newContext({ viewport: { width: 375, height: 800 } });
  await ctx.addInitScript(`Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } });`);
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e)));
  await go(page, A);
  check(await hints(page) === 1, "blocked storage: the hint shows");
  await page.locator(".first-hint button").click();
  check(await hints(page) === 0 && errs.length === 0, `blocked storage: dismissing still works without errors (${errs})`);
  await ctx.close();
}

await browser.close();
await close();
console.log(`first-hint e2e: ${checks} checks, ${failures} failed`);
process.exit(failures ? 1 : 0);
