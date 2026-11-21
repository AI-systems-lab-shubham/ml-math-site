// E2E check: the first-visit hint (assets/js/first-hint.js). Shown on a concept page until it is dismissed, then never again
// in that browser (reload, another concept page, a new tab); a different browser profile sees it once more.
// Dismissal keeps other saved UI settings. Blocked storage must not throw.
// Run: node tests/e2e/first-hint.mjs   (Playwright needed; prints SKIPPED and exits 1 otherwise)
import { readFileSync } from "node:fs";
import { requirePlaywright, serveStatic, siteRoot } from "../../tools/lib/playwright.mjs";

const pw = await requirePlaywright("first-hint e2e");
const { base, close } = await serveStatic();
const browser = await pw.chromium.launch();
const course = JSON.parse(readFileSync(`${siteRoot}/data/course.json`, "utf8"));
const concepts = course.modules.flatMap((m) => m.concepts.filter((c) => c.status === "built" && m.status === "built"));
const [A, B] = ["m00-variables", "m00-equations"].map((id) => concepts.find((c) => c.id === id).path);
const KEY = "mlmath:ui:v1";

let failures = 0, checks = 0;
const check = (ok, label) => { checks++; if (!ok) { failures++; console.error(`FAIL  ${label}`); } };
const hints = (page) => page.locator(".first-hint").count();
const go = (page, url) => page.goto(base + url, { waitUntil: "networkidle" });

{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(`try { if (!localStorage.getItem("${KEY}")) localStorage.setItem("${KEY}", JSON.stringify({ other: 7 })); } catch (e) {}`);
  const page = await ctx.newPage();
  await go(page, A);
  check(await hints(page) === 1, "first visit: exactly one hint on the first concept page");
  await go(page, B);
  check(await hints(page) === 1, "not dismissed: the hint is still there on the next concept page (it goes only when dismissed)");
  await page.locator(".first-hint button").click();
  check(await hints(page) === 0, "dismissing removes the hint at once");
  const saved = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
  check(saved.hintDismissed === true && saved.other === 7, "dismissal is saved and keeps other saved settings");
  await page.reload({ waitUntil: "networkidle" });
  check(await hints(page) === 0, "stays hidden after a reload");
  await go(page, A);
  check(await hints(page) === 0, "stays hidden when going back to the first concept page");
  const tab = await ctx.newPage();
  await go(tab, B);
  check(await hints(tab) === 0, "stays hidden in a new tab of the same browser");
  await ctx.close();
}
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await go(page, A);
  check(await hints(page) === 1, "a fresh browser profile sees the hint once more");
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
