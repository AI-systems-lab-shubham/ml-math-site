// E2E check: the module switcher inside "On this page" (button labelled "Module › Card", inline list of every module from
// course.json, a link plus a separate chevron toggle per module, "Coming soon" rows that are not links, keyboard, targets,
// scrolling inside itself) and cross-module jumps that land fully below the sticky bars.
// Run: node tests/e2e/module-switcher.mjs   (Playwright needed; prints SKIPPED and exits 1 otherwise)
// Env: SITE_DIR serves another copy of the site (used by tests/e2e/module-switcher-mutation.mjs).
import path from "node:path";
import { requirePlaywright, serveStatic } from "../../tools/lib/playwright.mjs";

const pw = await requirePlaywright("module-switcher e2e");
const { base, close } = await serveStatic(process.env.SITE_DIR ? path.resolve(process.env.SITE_DIR) : undefined);
const browser = await pw.chromium.launch();
const M0 = "modules/00-foundations/";
const M1 = "modules/01-linear-algebra/";

let failures = 0, checks = 0;
const check = (ok, label) => { checks++; if (!ok) { failures++; console.error(`FAIL  ${label}`); } };

const course = await (await fetch(`${base}data/course.json`)).json();
const built = (m) => m.status === "built" ? m.concepts.filter((c) => c.status === "built") : [];
const noBuilt = course.modules.filter((m) => built(m).length === 0);
const withBuilt = course.modules.filter((m) => built(m).length > 0);

async function open(width, url, { ctxOpts = {} } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 800 }, ...ctxOpts });
  const page = await ctx.newPage();
  await page.goto(base + url, { waitUntil: "networkidle" });
  await page.waitForSelector(".module-switch-btn", { state: "attached" });
  await page.waitForTimeout(600);
  return { ctx, page };
}
const openPanel = async (page, width) => {
  if (width < 1200 && (await page.locator(".page-toc-toggle").getAttribute("aria-expanded")) !== "true") await page.locator(".page-toc-toggle").click();
};
const barsBottom = (page) => page.evaluate(() => {
  const h = document.getElementById("site-header").getBoundingClientRect().bottom;
  const t = document.querySelector("[data-page-toc]");
  const narrow = !matchMedia("(min-width: 1200px)").matches;
  const r = t.getBoundingClientRect();
  return Math.max(h, narrow && !t.classList.contains("is-away") && r.height > 0 ? r.bottom : 0);
});
const label = (page) => page.locator(".module-switch-label").innerText();
const settle = (page) => page.waitForTimeout(1500);

for (const w of [375, 1280]) {
  const { ctx, page } = await open(w, `${M0}#concept-equations`);
  await openPanel(page, w);
  const btn = page.locator(".module-switch-btn");
  check((await label(page)) === "Foundations › Equations", `@${w}: the switcher is labelled "Foundations › Equations" (got "${await label(page)}")`);
  check(await btn.getAttribute("aria-expanded") === "false", `@${w}: starts closed`);
  const ctl = await btn.getAttribute("aria-controls");
  check(!!ctl && await page.locator(`#${ctl}`).count() === 1 && await page.locator(`#${ctl}`).isHidden(), `@${w}: aria-controls names the (hidden) list`);
  check(await page.evaluate(() => document.querySelector(".module-switch-btn").classList.contains("button-secondary")), `@${w}: styled as a secondary control`);
  await btn.click();
  check(await btn.getAttribute("aria-expanded") === "true" && await page.locator(`#${ctl}`).isVisible(), `@${w}: opens inline`);
  check(await page.evaluate(() => getComputedStyle(document.querySelector(".module-switch-list")).position) !== "fixed" && await page.evaluate(() => getComputedStyle(document.querySelector(".module-switch-list")).position) !== "absolute", `@${w}: inline, not a floating popup`);

  const dom = await page.evaluate(() => [...document.querySelectorAll(".msw-module")].map((li) => ({
    title: li.querySelector(".msw-link, .msw-soon-title")?.textContent.replace(/^\d+\s*Module \d+:\s*|^Module \d+:\s*\d+|^\d+/, "").trim() ?? "",
    raw: li.querySelector(".msw-link, .msw-soon-title")?.textContent ?? "",
    planned: li.classList.contains("is-planned"),
    links: li.querySelectorAll(":scope > .msw-head a, :scope > .msw-head > a").length,
    allLinks: li.querySelectorAll("a").length,
    toggle: (() => { const t = li.querySelector(".msw-toggle"); return t ? { nested: !!t.closest("a"), siblingOfLink: t.parentElement === li.querySelector(".msw-link")?.parentElement, expanded: t.getAttribute("aria-expanded"), controls: t.getAttribute("aria-controls"), controlsExists: !!document.getElementById(t.getAttribute("aria-controls")), name: t.getAttribute("aria-label"), listHidden: document.getElementById(t.getAttribute("aria-controls"))?.hidden } : null; })(),
    soon: /Coming soon/.test(li.textContent),
    firstHref: li.querySelector(".msw-link")?.getAttribute("href") ?? null,
    current: li.querySelector("a[aria-current]")?.dataset.switchCid ?? null,
  })));
  check(dom.length === course.modules.length, `@${w}: one row per module in course.json (${dom.length} of ${course.modules.length})`);
  const plannedRows = dom.filter((d) => d.planned);
  check(plannedRows.length === noBuilt.length, `@${w}: ${noBuilt.length} modules without built concepts are shown as planned rows (got ${plannedRows.length})`);
  for (const r of plannedRows) check(r.allLinks === 0 && r.soon && r.toggle === null, `@${w}: "${r.raw.trim()}" is Coming soon and is not a link (links ${r.allLinks})`);
  const live = dom.filter((d) => !d.planned);
  check(live.length === withBuilt.length, `@${w}: ${withBuilt.length} modules with built concepts have link rows`);
  for (const r of live) {
    check(r.toggle && !r.toggle.nested && r.toggle.siblingOfLink, `@${w}: ${r.raw.trim()}: the toggle is not nested in a link and sits beside it`);
    check(r.toggle?.controlsExists && /^Concepts in /.test(r.toggle?.name ?? ""), `@${w}: ${r.raw.trim()}: toggle has aria-controls and a name`);
  }
  const cur = live.find((r) => /Foundations/.test(r.raw)), other = live.find((r) => /Linear algebra/.test(r.raw));
  check(cur.toggle.expanded === "true" && cur.current === "m00-equations", `@${w}: current module open with Equations marked aria-current (got ${cur.toggle.expanded}, ${cur.current})`);
  check(other.toggle.expanded === "false" && other.toggle.listHidden === true, `@${w}: other modules start collapsed`);
  check(cur.firstHref === "#concept-variables" && /01-linear-algebra\/#concept-vectors$/.test(other.firstHref), `@${w}: module links go to the first built concept (${cur.firstHref}, ${other.firstHref})`);
  const icons = await page.evaluate(() => [...document.querySelectorAll(".msw-state")].map((i) => ({ aria: i.getAttribute("aria-hidden"), interactive: !!i.closest("button") || i.hasAttribute("tabindex") || !!i.querySelector("button, a") })));
  check(icons.length > 0 && icons.every((i) => i.aria === "true" && !i.interactive), `@${w}: status icons are display-only (${icons.length})`);

  // Expand Linear algebra from the keyboard with Space, check, collapse with Enter.
  const tog = page.locator('.msw-toggle[aria-controls="msw-m01"]');
  await tog.focus();
  await page.keyboard.press("Space");
  check(await tog.getAttribute("aria-expanded") === "true" && await page.locator("#msw-m01").isVisible(), `@${w}: Space on a toggle shows its concepts`);
  check(await page.locator("#msw-m01 a").count() === 4, `@${w}: Linear algebra lists its 4 built concepts`);
  await page.keyboard.press("Enter");
  check(await tog.getAttribute("aria-expanded") === "false" && await page.locator("#msw-m01").isHidden(), `@${w}: Enter on a toggle hides them again`);
  await page.keyboard.press("Space");

  // Esc: closes the switcher, focus back on its button; Tab is not trapped.
  await page.locator('#msw-m01 a').first().focus();
  await page.keyboard.press("Escape");
  check(await btn.getAttribute("aria-expanded") === "false" && await page.locator(`#${ctl}`).isHidden(), `@${w}: Esc closes the switcher`);
  check(await page.evaluate(() => document.activeElement.classList.contains("module-switch-btn")), `@${w}: focus returns to the switcher button`);
  if (w < 1200) check(await page.locator(".page-toc-toggle").getAttribute("aria-expanded") === "true", `@${w}: the first Esc leaves the bar list open`);
  await btn.press("Enter");
  let out = false;
  for (let i = 0; i < 60 && !out; i++) { await page.keyboard.press("Tab"); out = await page.evaluate(() => !document.activeElement.closest(".module-switch")); }
  check(out, `@${w}: Tab leaves the switcher (not trapped)`);
  check(await page.evaluate(() => !!document.activeElement.closest(".page-toc-list, .page-toc, main, body")), `@${w}: focus carries on after the switcher`);
  await ctx.close();
}

// Sizes and scrolling inside the list.
{
  const { ctx, page } = await open(375, `${M0}#concept-equations`);
  await openPanel(page, 375);
  await page.locator(".module-switch-btn").click();
  await page.locator('.msw-toggle[aria-controls="msw-m01"]').click();
  const o = await page.evaluate(() => {
    const h = (s) => [...document.querySelectorAll(s)].filter((e) => e.checkVisibility()).map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; });
    const list = document.querySelector(".module-switch-list");
    return { btn: h(".module-switch-btn"), toggles: h(".msw-toggle"), links: h(".msw-link"), rows: h(".msw-concepts a"), overflowY: getComputedStyle(list).overflowY, scrolls: list.scrollHeight > list.clientHeight + 1, maxH: getComputedStyle(list).maxHeight, vh: innerHeight };
  });
  check(o.btn.every(([w, hh]) => hh >= 44) && o.toggles.every(([w, hh]) => w >= 44 && hh >= 44) && o.links.every(([w, hh]) => hh >= 44) && o.rows.every(([w, hh]) => hh >= 44), `touch: every switcher target is at least 44px (${JSON.stringify([o.btn[0], o.toggles[0], o.links[0], o.rows[0]])})`);
  check(o.overflowY === "auto" && o.scrolls, `a long list scrolls inside itself (overflow ${o.overflowY}, scrolls ${o.scrolls}, max-height ${o.maxH})`);
  await ctx.close();
  const f = await open(1280, `${M0}#concept-equations`);
  await f.page.locator(".module-switch-btn").click();
  const g = await f.page.evaluate(() => [...document.querySelectorAll(".msw-toggle, .msw-link, .msw-concepts a")].filter((e) => e.checkVisibility()).map((e) => Math.round(e.getBoundingClientRect().height)));
  check(g.length > 5 && g.every((hh) => hh >= 40) && g.some((hh) => hh === 40), `fine pointer: rows are 40px (got ${[...new Set(g)]})`);
  await f.ctx.close();
}

// Cross-module jumps: the panel updates for the new card, and the target heading is fully below the sticky bars.
for (const w of [375, 768, 1280]) {
  for (const via of ["concept", "module"]) {
    const { ctx, page } = await open(w, `${M0}#concept-equations`);
    await openPanel(page, w);
    await page.locator(".module-switch-btn").click();
    if (via === "concept") {
      await page.locator('.msw-toggle[aria-controls="msw-m01"]').click();
      await page.locator('a[data-switch-cid="m01-matrices"]').click();
    } else {
      await page.locator(".msw-link", { hasText: "Linear algebra" }).click();
    }
    await page.waitForURL(/01-linear-algebra\/#concept-(matrices|vectors)/);
    await page.waitForSelector(".module-switch-btn", { state: "attached" });
    await settle(page);
    const wantCard = via === "concept" ? "concept-matrices" : "concept-vectors";
    const wantTitle = via === "concept" ? "Matrices: tables and machines" : "Vectors: arrows and lists";
    await openPanel(page, w);
    check((await label(page)) === `Linear algebra › ${wantTitle}`, `@${w} via ${via}: the switcher shows the new card (got "${await label(page)}")`);
    const st = await page.evaluate(() => ({ list: document.querySelector(".page-toc-list:not([hidden])")?.dataset.for, items: [...document.querySelectorAll(".page-toc-list:not([hidden]) a")].map((a) => a.textContent).join("|"), cur: document.querySelector(".msw-concepts a[aria-current]")?.dataset.switchCid, open: [...document.querySelectorAll(".msw-toggle")].map((t) => `${t.getAttribute("aria-controls")}=${t.getAttribute("aria-expanded")}`).join() }));
    check(st.list === wantCard && st.items === "Meaning|Picture|Real life|Worked example|Why and when|How to arrive at it|In an LLM|Teach it", `@${w} via ${via}: the panel shows that card's stages (list for ${st.list})`);
    check(st.cur === (via === "concept" ? "m01-matrices" : "m01-vectors"), `@${w} via ${via}: the concept is marked current (${st.cur})`);
    check(/msw-m00=false/.test(st.open) && /msw-m01=true/.test(st.open), `@${w} via ${via}: the new module is open and the old one collapsed (${st.open})`);
    const bb = await barsBottom(page);
    const ht = await page.evaluate((id) => document.querySelector(`#${id} > header h2`).getBoundingClientRect().top, wantCard);
    check(ht >= bb && ht < bb + 140, `@${w} via ${via}: the target heading (top ${Math.round(ht)}) is fully below the sticky bars (bottom ${Math.round(bb)})`);
    await ctx.close();
  }
}

await browser.close();
await close();
console.log(`module-switcher e2e: ${checks} checks, ${failures} failed`);
process.exit(failures ? 1 : 0);
