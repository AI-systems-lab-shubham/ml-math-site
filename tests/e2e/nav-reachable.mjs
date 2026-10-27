// E2E check (not part of `node --test`): one header toggle (icon + "Outline" from 900px, icon only below) that shows or hides the
// outline, with aria-expanded and a Hide / Show name; rail width; outline state (current module open, others collapsed, remembered
// on mlmath:ui:v1 and not in the progress store); legend; numbered modules; current concept scrolled into view; row heights.
// Run: node tests/e2e/nav-reachable.mjs [--shots <dir>]
// Needs Playwright importable. If it is not, this prints SKIPPED and exits 1 (a skipped check is not a pass).
import path from "node:path";
import { requirePlaywright, serveStatic } from "../../tools/lib/playwright.mjs";

const shotsDir = process.argv.includes("--shots") ? process.argv[process.argv.indexOf("--shots") + 1] : null;
const pw = await requirePlaywright("nav-reachable e2e");
const { base, close } = await serveStatic();

const PAGES = [["home", "index.html"], ["module-0", "modules/00-foundations/"], ["module-1", "modules/01-linear-algebra/"], ["concept-m0", "modules/00-foundations/equations/"], ["concept-m1", "modules/01-linear-algebra/vectors/"]];
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
    active: a ? (a.matches("[data-nav-toggle]") ? "toggle" : nav.contains(a) ? "in-nav" : "other") : "none",
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

const T = "#site-header [data-nav-toggle]";
const toggleState = (page) => page.evaluate((sel) => {
  const t = document.querySelector(sel);
  const txt = t.querySelector(".outline-toggle-text");
  return { expanded: t.getAttribute("aria-expanded"), name: t.getAttribute("aria-label"), textShown: !!txt && txt.getClientRects().length > 0, w: t.getBoundingClientRect().width, h: t.getBoundingClientRect().height };
}, T);

for (const [name, url] of PAGES) {
  for (const width of WIDTHS) {
    const wide = width >= 900;
    const { ctx, page } = await open(name, url, width);
    const L = `${name} @${width}`;
    let ts = await toggleState(page);
    check(await vis(page, T), `${L}: header toggle not visible`);
    check(ts.w >= 44 && ts.h >= 44, `${L}: header toggle is ${ts.w}x${ts.h}, under 44px`);
    check(ts.textShown === wide, `${L}: "Outline" text should be ${wide ? "shown" : "hidden"} (icon-only below 900px)`);

    if (wide) {
      check(await vis(page, "#site-nav"), `${L}: rail not visible`);
      check(ts.expanded === "true" && ts.name === "Hide outline", `${L}: toggle should read expanded=true "Hide outline" (got ${ts.expanded} "${ts.name}")`);
      let s = await state(page);
      const wantW = Math.min(340, Math.max(260, width * 0.24));
      check(Math.abs(s.nav.w - wantW) < 1, `${L}: rail width ${s.nav.w}, want ${wantW}`);
      check(s.main.w >= 640 - 0.5, `${L}: content column ${Math.round(s.main.w)}px, under 640px`);
      common(`${L} rail shown`, s, width);
      if (shotsDir) await page.screenshot({ path: path.join(shotsDir, `${name}-${width}-rail.png`) });

      await page.locator(T).focus();
      await page.keyboard.press("Enter");
      s = await state(page);
      ts = await toggleState(page);
      check(!(await vis(page, "#site-nav")), `${L}: rail still visible after Enter`);
      check(ts.expanded === "false" && ts.name === "Show outline", `${L}: toggle should read expanded=false "Show outline" (got ${ts.expanded} "${ts.name}")`);
      check(s.active === "toggle", `${L}: focus should stay on the toggle (got ${s.active})`);
      check(JSON.parse(s.stored)?.railHidden === true, `${L}: state not saved (${s.stored})`);
      check(Math.abs(s.main.w - width) < 1 && Math.abs(s.main.l) < 1, `${L}: content not full width after hide (${s.main.l}, ${s.main.w})`);
      check(Math.abs(s.col.l - (width - s.col.r)) < 2, `${L}: content not centred (${s.col.l} vs ${width - s.col.r})`);
      common(`${L} rail hidden`, s, width);
      let landed = false;
      for (let i = 0; i < 40; i++) { await page.keyboard.press("Tab"); if ((await state(page)).active === "in-nav") landed = true; }
      check(!landed, `${L}: Tab reached the hidden rail`);
      if (shotsDir) { await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ path: path.join(shotsDir, `${name}-${width}-hidden.png`) }); }

      await page.reload({ waitUntil: "networkidle" });
      await page.waitForSelector(T, { state: "attached" });
      check(!(await vis(page, "#site-nav")) && (await toggleState(page)).name === "Show outline", `${L}: hidden state not restored after reload`);

      await page.locator(T).focus();
      await page.keyboard.press("Space");
      s = await state(page);
      check(await vis(page, "#site-nav"), `${L}: rail not back after Space`);
      check(JSON.parse(s.stored)?.railHidden === false, `${L}: shown state not saved`);
      check((await toggleState(page)).expanded === "true", `${L}: toggle aria-expanded should be true again`);
      common(`${L} rail re-shown`, await state(page), width);
    } else {
      check(!(await vis(page, "#site-nav")), `${L}: drawer should start closed`);
      check(ts.expanded === "false" && ts.name === "Show outline", `${L}: toggle should read expanded=false "Show outline"`);
      common(`${L} drawer closed`, await state(page), width);
      await page.locator(T).focus();
      await page.keyboard.press("Enter");
      ts = await toggleState(page);
      check(await vis(page, "#site-nav"), `${L}: drawer did not open on Enter`);
      check(ts.expanded === "true" && ts.name === "Hide outline", `${L}: toggle should read expanded=true "Hide outline" with the drawer open`);
      common(`${L} drawer open`, await state(page), width);
      if (shotsDir) await page.screenshot({ path: path.join(shotsDir, `${name}-${width}-drawer.png`) });
      await page.keyboard.press("Escape");
      check(!(await vis(page, "#site-nav")) && (await state(page)).active === "toggle", `${L}: Esc did not close the drawer and return focus`);
    }
    await ctx.close();
  }
}

// A saved "hidden" preference must not hide the toggle below 900px, and must not stop the drawer working.
{
  const { ctx, page } = await open("home", "index.html", 1280);
  await page.locator(T).focus();
  await page.keyboard.press("Enter");
  await page.setViewportSize({ width: 768, height: 800 });
  check(await vis(page, T), "saved-hidden then narrow: toggle missing");
  await page.setViewportSize({ width: 1280, height: 800 });
  check(await vis(page, T) && !(await vis(page, "#site-nav")), "resize back to wide: still hidden with Show outline");
  await ctx.close();
}

// Outline content: numbered modules, legend, current module open and the rest collapsed, state on the UI key only.
{
  const { ctx, page } = await open("module-0", "modules/00-foundations/logarithms/", 1280);
  await page.waitForSelector("#site-nav a[data-cid]");
  await page.waitForTimeout(500);
  const o = await page.evaluate(() => {
    const nav = document.getElementById("site-nav");
    const mods = [...nav.querySelectorAll(".outline-module:not(.is-planned)")].map((li) => { const t = li.querySelector(".outline-mod-toggle"); return { id: li.querySelector("[data-module-link]").dataset.moduleLink, open: t.getAttribute("aria-expanded") === "true", rowsInTabOrder: !li.querySelector("ul.sub").hidden, num: li.querySelector(".outline-mod-num")?.textContent }; });
    const cur = nav.querySelector('a[aria-current="page"]');
    const nr = nav.getBoundingClientRect(), cr = cur?.getBoundingClientRect();
    return { mods, legend: [...nav.querySelectorAll(".outline-legend li")].map((l) => l.textContent.trim()), cur: cur?.dataset.cid, curVisible: !!cr && cr.top >= nr.top && cr.bottom <= nr.bottom, planned: nav.querySelectorAll(".is-planned .outline-mod-num").length, rowH: Math.round(nav.querySelector("ul.sub a").getBoundingClientRect().height) };
  });
  check(o.mods.find((m) => m.id === "m00")?.open === true, "module 0 page: module 0 should be open");
  check(o.mods.filter((m) => m.id !== "m00").every((m) => !m.open), "module 0 page: other modules should be collapsed");
  check(o.mods.map((m) => m.num).join() === "0,1,2", `module numbers should read 0,1,2 (got ${o.mods.map((m) => m.num)})`);
  check(o.planned >= 1, "planned modules should be numbered too");
  check(o.legend.join("|") === "Not started|In progress|Complete|Revisit", `legend should list the four states (got ${o.legend.join("|")})`);
  check(o.cur === "m00-logarithms" && o.curVisible, `current concept should be marked and scrolled into view in the rail (got ${o.cur}, visible ${o.curVisible})`);
  check(o.rowH >= 40 && o.rowH < 44, `fine pointer at 1280: rail rows should be 40px (got ${o.rowH})`);
  check(o.mods.every((m) => m.open === m.rowsInTabOrder), "closed modules hide their rows (so they are out of the tab order)");
  // Open module 1 by hand: it is NOT remembered, and nothing is written for it.
  await page.locator('#site-nav .outline-mod-toggle[aria-controls="ol-sub-m01"]').click();
  check(await page.locator("#ol-sub-m01").isVisible(), "a module can be opened by hand");
  const st = await page.evaluate(() => ({ ui: localStorage.getItem("mlmath:ui:v1"), progress: localStorage.getItem("mlmath:progress:v1") }));
  check(!(st.ui ?? "").includes("outlineOpen") && !(st.progress ?? "").includes("outline"), `opening a module by hand is not saved (ui ${st.ui})`);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("#site-nav a[data-cid]");
  check(await page.evaluate(() => document.getElementById("ol-sub-m01").hidden), "after a reload only the current module is open again");
  // A module's name is a link to its overview page; its chevron is a separate button.
  const ml = await page.evaluate(() => [...document.querySelectorAll("#site-nav [data-module-link]")].map((a) => ({ href: a.getAttribute("href"), nested: !!a.querySelector("button") })));
  check(ml.length === 3 && ml.every((m) => /\/modules\/[^/]+\/$/.test(m.href) && !m.nested), `module links go to overview pages (${ml.map((m) => m.href)})`);
  await ctx.close();
  // An old saved outlineOpen value is ignored without error, and dropped on the next write.
  {
    const old = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await old.addInitScript(() => { try { if (!localStorage.getItem("mlmath:ui:v1")) localStorage.setItem("mlmath:ui:v1", JSON.stringify({ railHidden: false, outlineOpen: { m01: true, bogus: "x" } })); } catch (e) {} });
    const op = await old.newPage();
    const errs = [];
    op.on("pageerror", (e) => errs.push(String(e)));
    await op.goto(base + "modules/00-foundations/", { waitUntil: "networkidle" });
    await op.waitForSelector("#site-nav a[data-cid]");
    check(errs.length === 0, `an old outlineOpen value causes no error (${errs})`);
    check(await op.evaluate(() => document.getElementById("ol-sub-m01").hidden), "an old outlineOpen value does not open modules");
    await op.locator(T).focus();
    await op.keyboard.press("Enter");
    const after = await op.evaluate(() => JSON.parse(localStorage.getItem("mlmath:ui:v1")));
    check(!("outlineOpen" in after) && "railHidden" in after, `the next write drops outlineOpen and keeps the rail state (${JSON.stringify(after)})`);
    await old.close();
  }
  // Phone-class pointer: 44px rows.
  const t = await browser.newContext({ viewport: { width: 1100, height: 800 }, hasTouch: true });
  const tp = await t.newPage();
  await tp.goto(base + "modules/00-foundations/", { waitUntil: "networkidle" });
  await tp.waitForSelector("#site-nav a[data-cid]");
  const rh = await tp.evaluate(() => Math.round(document.querySelector("#site-nav ul.sub a").getBoundingClientRect().height));
  check(rh >= 44, `coarse pointer at 1100: rail rows should be at least 44px (got ${rh})`);
  await t.close();
}

// Blocked storage: the page still has navigation.
for (const [name, url] of PAGES) {
  for (const width of [768, 1280]) {
    const { ctx, page } = await open(name, url, width, { blockStorage: true });
    check((await vis(page, "#site-nav")) || (await vis(page, T)), `${name} @${width} with storage blocked: neither rail nor toggle visible`);
    if (width === 1280) {
      await page.locator(T).focus();
      await page.keyboard.press("Enter");
      check(await vis(page, T), `${name} blocked storage: toggle missing after hide`);
    }
    await ctx.close();
  }
}

await browser.close();
await close();
console.log(`${checks} checks, ${failures} failed`);
process.exit(failures ? 1 : 0);
