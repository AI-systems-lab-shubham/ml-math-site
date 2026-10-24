// E2E check (not part of `node --test`): every page must show the outline rail or a visible Menu / Show outline button.
// Run: node tests/e2e/nav-reachable.mjs [--shots <dir>]
// Needs Playwright importable. If it is not, this prints SKIPPED and exits 1 (a skipped check is not a pass).
import path from "node:path";
import { requirePlaywright, serveStatic } from "../../tools/lib/playwright.mjs";

const shotsDir = process.argv.includes("--shots") ? process.argv[process.argv.indexOf("--shots") + 1] : null;
const pw = await requirePlaywright("nav-reachable e2e");
const { base, close } = await serveStatic();

const PAGES = [["home", "index.html"], ["module-0", "modules/00-foundations/"], ["module-1", "modules/01-linear-algebra/"]];
const WIDTHS = [375, 768, 899, 900, 1000, 1100, 1280];
const KEY = "mlmath:ui:v1";

let failures = 0;
let checks = 0;
const check = (ok, label) => { checks++; if (!ok) { failures++; console.error(`FAIL  ${label}`); } };

const browser = await pw.chromium.launch();

async function open(name, url, width, { blockStorage = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 800 } });
  if (blockStorage) await ctx.addInitScript(() => { Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } }); });
  const page = await ctx.newPage();
  await page.goto(base + url, { waitUntil: "networkidle" });
  await page.waitForSelector("#site-header [data-nav-toggle]", { state: "attached" });
  return { ctx, page };
}

const vis = (page, sel) => page.locator(sel).first().isVisible();
const state = (page) => page.evaluate(() => {
  const r = (el) => { const b = el?.getBoundingClientRect(); return b ? { l: b.left, r: b.right, t: b.top, b: b.bottom, w: b.width } : null; };
  const nav = document.getElementById("site-nav");
  const col = document.querySelector("main .column, main .concept-card, main");
  const header = [...document.querySelectorAll("#site-header > *")].map((el) => ({ t: el.tagName, ...r(el), shown: el.getClientRects().length > 0 }));
  const a = document.activeElement;
  return {
    scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth,
    nav: r(nav), main: r(document.querySelector("main")), col: r(col), header,
    active: a ? (a.matches("[data-nav-toggle]") ? "toggle" : a.matches("[data-rail-hide]") ? "hide" : nav.contains(a) ? "in-nav" : "other") : "none",
    stored: (() => { try { return localStorage.getItem("mlmath:ui:v1"); } catch { return "blocked"; } })(),
  };
});

function common(label, s, width) {
  check(s.scrollW <= s.clientW, `${label}: sideways scroll (${s.scrollW} > ${s.clientW})`);
  const shown = s.header.filter((h) => h.shown);
  for (let i = 0; i < shown.length; i++) for (let j = i + 1; j < shown.length; j++) {
    const a = shown[i], b = shown[j];
    check(a.r <= b.l + 0.5 || b.r <= a.l + 0.5 || a.b <= b.t + 0.5 || b.b <= a.t + 0.5, `${label}: header items ${a.t} and ${b.t} overlap`);
  }
  if (width >= 900 && s.nav && s.main && s.nav.w > 0) check(s.nav.r <= s.main.l + 0.5, `${label}: rail overlaps main`);
}

for (const [name, url] of PAGES) {
  for (const width of WIDTHS) {
    const wide = width >= 900;
    const { ctx, page } = await open(name, url, width);
    const L = `${name} @${width}`;

    if (wide) {
      // Rail shown.
      check(await vis(page, "#site-nav"), `${L}: rail not visible`);
      check(await vis(page, "[data-rail-hide]"), `${L}: Hide outline button not visible`);
      check(!(await vis(page, "#site-header [data-nav-toggle]")), `${L}: header toggle should be hidden while the rail shows`);
      let s = await state(page);
      const wantW = Math.min(520, Math.max(320, width * 0.4));
      check(Math.abs(s.nav.w - wantW) < 1, `${L}: rail width ${s.nav.w}, want ${wantW}`);
      common(`${L} rail shown`, s, width);
      if (shotsDir) await page.screenshot({ path: path.join(shotsDir, `${name}-${width}-rail.png`) });

      // Hide with a real key press.
      await page.locator("[data-rail-hide]").focus();
      await page.keyboard.press("Enter");
      s = await state(page);
      check(!(await vis(page, "#site-nav")), `${L}: rail still visible after Enter`);
      check(await vis(page, "#site-header [data-nav-toggle]"), `${L}: no Show outline button after hiding`);
      check(s.active === "toggle", `${L}: focus did not move to Show outline (got ${s.active})`);
      check(JSON.parse(s.stored)?.railHidden === true, `${L}: state not saved (${s.stored})`);
      check(Math.abs(s.main.w - width) < 1 && Math.abs(s.main.l) < 1, `${L}: content not full width after hide (${s.main.l}, ${s.main.w})`);
      check(Math.abs(s.col.l - (width - s.col.r)) < 2, `${L}: content not centred (${s.col.l} vs ${width - s.col.r})`);
      common(`${L} rail hidden`, s, width);
      const label = await page.locator("#site-header [data-nav-toggle]").textContent();
      check(label.trim() === "Show outline" && (await page.locator("#site-header [data-nav-toggle]").getAttribute("aria-expanded")) === "false", `${L}: Show outline label/aria wrong`);
      // Tab through the whole page: focus must never land inside the hidden rail.
      let landed = false;
      for (let i = 0; i < 40; i++) { await page.keyboard.press("Tab"); if ((await state(page)).active === "in-nav") landed = true; }
      check(!landed, `${L}: Tab reached the hidden rail`);
      if (shotsDir) { await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ path: path.join(shotsDir, `${name}-${width}-hidden.png`) }); }

      // Reload keeps it hidden.
      await page.reload({ waitUntil: "networkidle" });
      await page.waitForSelector("#site-header [data-nav-toggle]", { state: "attached" });
      check(!(await vis(page, "#site-nav")) && (await vis(page, "#site-header [data-nav-toggle]")), `${L}: hidden state not restored after reload`);

      // Show again with Space.
      await page.locator("#site-header [data-nav-toggle]").focus();
      await page.keyboard.press("Space");
      s = await state(page);
      check(await vis(page, "#site-nav"), `${L}: rail not back after Space`);
      check(s.active === "hide", `${L}: focus did not move to Hide outline (got ${s.active})`);
      check(JSON.parse(s.stored)?.railHidden === false, `${L}: shown state not saved`);
      check((await page.locator("[data-rail-hide]").getAttribute("aria-expanded")) === "true", `${L}: Hide outline aria-expanded should be true`);
      common(`${L} rail re-shown`, await state(page), width);
    } else {
      check(await vis(page, "#site-header [data-nav-toggle]"), `${L}: Menu button not visible`);
      check(!(await vis(page, "#site-nav")), `${L}: drawer should start closed`);
      common(`${L} drawer closed`, await state(page), width);
      await page.locator("#site-header [data-nav-toggle]").focus();
      await page.keyboard.press("Enter");
      check(await vis(page, "#site-nav"), `${L}: drawer did not open on Enter`);
      check((await page.locator("#site-header [data-nav-toggle]").getAttribute("aria-expanded")) === "true", `${L}: Menu aria-expanded should be true`);
      check(!(await vis(page, "[data-rail-hide]")), `${L}: Hide outline should not show in the drawer`);
      common(`${L} drawer open`, await state(page), width);
      if (shotsDir) await page.screenshot({ path: path.join(shotsDir, `${name}-${width}-drawer.png`) });
      await page.keyboard.press("Escape");
      check(!(await vis(page, "#site-nav")) && (await state(page)).active === "toggle", `${L}: Esc did not close the drawer and return focus`);
    }
    await ctx.close();
  }
}

// A saved "hidden" preference must not hide the Menu button below 900px.
{
  const { ctx, page } = await open("home", "index.html", 1280);
  await page.locator("[data-rail-hide]").focus();
  await page.keyboard.press("Enter");
  await page.setViewportSize({ width: 768, height: 800 });
  check(await vis(page, "#site-header [data-nav-toggle]"), "saved-hidden then narrow: Menu button missing");
  await page.setViewportSize({ width: 1280, height: 800 });
  check(await vis(page, "#site-header [data-nav-toggle]") && !(await vis(page, "#site-nav")), "resize back to wide: still hidden with Show outline");
  await ctx.close();
}

// Blocked storage: the page still has navigation.
for (const [name, url] of PAGES) {
  for (const width of [768, 1280]) {
    const { ctx, page } = await open(name, url, width, { blockStorage: true });
    const nav = await vis(page, "#site-nav");
    const btn = await vis(page, "#site-header [data-nav-toggle]");
    check(nav || btn, `${name} @${width} with storage blocked: neither rail nor Menu visible`);
    if (width === 1280) {
      await page.locator("[data-rail-hide]").focus();
      await page.keyboard.press("Enter");
      check(await vis(page, "#site-header [data-nav-toggle]"), `${name} blocked storage: Show outline missing after hide`);
    }
    await ctx.close();
  }
}

await browser.close();
await close();
console.log(`${checks} checks, ${failures} failed`);
process.exit(failures ? 1 : 0);
