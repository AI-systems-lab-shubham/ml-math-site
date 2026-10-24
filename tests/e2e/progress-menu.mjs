// E2E check: four-state progress in the outline. Opening promotes only "not started"; the status button is its own
// control (not inside the link) with a name that does not repeat the concept title; the menu works from the keyboard
// (open, arrows, Home/End, Esc with focus return, Tab closes and focus carries on); it closes when its row goes or its
// module collapses; no menu animation under reduced motion; status survives a reload and reaches other tabs; data from a
// later version is kept and flagged; row and button sizes follow DESIGN.md section 8.
// Run: node tests/e2e/progress-menu.mjs   (Playwright needed; prints SKIPPED and exits 1 otherwise)
import { requirePlaywright, serveStatic } from "../../tools/lib/playwright.mjs";

const pw = await requirePlaywright("progress-menu e2e");
const { base, close } = await serveStatic();
const browser = await pw.chromium.launch();
const KEY = "mlmath:progress:v1";
const M0 = "modules/00-foundations/";

let failures = 0, checks = 0;
const check = (ok, label) => { checks++; if (!ok) { failures++; console.error(`FAIL  ${label}`); } };

const btn = (page, id) => page.locator(`#site-nav [data-status-of="${id}"]`);
const label = (page, id) => btn(page, id).getAttribute("aria-label");
const menuVisible = (page) => page.locator(".status-menu").isVisible();
const active = (page) => page.evaluate(() => {
  const a = document.activeElement;
  return a ? { tag: a.tagName, role: a.getAttribute("role"), status: a.dataset?.status ?? null, statusOf: a.dataset?.statusOf ?? null, cid: a.dataset?.cid ?? null } : null;
});
const statuses = (page) => page.evaluate(() => Object.fromEntries([...document.querySelectorAll("#site-nav [data-status-of]")].map((b) => [b.dataset.statusOf, b.dataset.status])));
async function open(width, { url = M0, ctxOpts = {}, init } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 800 }, ...ctxOpts });
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage();
  await page.goto(base + url, { waitUntil: "networkidle" });
  await page.waitForSelector("#site-nav [data-status-of]", { state: "attached" });
  return { ctx, page };
}

// 1. Clean state: opening the first card (Variables) makes it in progress; nothing else changes.
{
  const { ctx, page } = await open(1280);
  await page.waitForTimeout(2600);               // past the 2 s dwell
  const st = await statuses(page);
  check(st["m00-variables"] === "in-progress", `clean state: Variables should be in-progress (got ${st["m00-variables"]})`);
  const others = Object.entries(st).filter(([id]) => id !== "m00-variables" && st[id] !== "not-started");
  check(others.length === 0, `clean state: only Variables should change (also changed: ${others.map(([i, s]) => `${i}=${s}`)})`);
  const stored = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
  check(stored.v === 2 && stored.concepts["m00-variables"]?.status === "in-progress" && !!stored.concepts["m00-variables"]?.statusAt, "clean state: stored as v2 { status, statusAt }");
  check(Object.keys(stored.concepts).length === 1, `clean state: exactly one stored concept (got ${Object.keys(stored.concepts)})`);

  // 2. Structure and names: the button is a sibling of the link, never inside it.
  const row = await page.evaluate(() => {
    const b = document.querySelector('#site-nav [data-status-of="m00-equations"]');
    const a = b.parentElement.querySelector("a");
    return { inLink: !!b.closest("a"), sibling: b.parentElement === a.parentElement, name: b.getAttribute("aria-label"), title: a.textContent.trim(), haspopup: b.getAttribute("aria-haspopup"), expanded: b.getAttribute("aria-expanded"), describedby: b.getAttribute("aria-describedby") === a.id };
  });
  check(!row.inLink && row.sibling, "status button must be a sibling of the link, not inside it");
  check(row.name === "Status: Not started. Change status.", `button name (got "${row.name}")`);
  check(!row.name.includes(row.title), "button name must not repeat the concept title");
  check(row.haspopup === "menu" && row.expanded === "false" && row.describedby, "button: aria-haspopup=menu, aria-expanded=false, described by the row's link");
  const snap = await page.locator('#site-nav li.outline-row:has([data-status-of="m00-equations"])').ariaSnapshot();
  check(/button "Status: Not started\. Change status\."/.test(snap) && /link "[^"]+"/.test(snap), `accessibility tree should show a button and a link (got ${snap.replace(/\n/g, " ")})`);
  check((await page.getByRole("button", { name: "Status: In progress. Change status." }).count()) === 1, "exactly one In progress button by role and name");
  check((await page.locator('#site-nav').getByRole("link", { name: row.title }).count()) === 1, "the link is found by role link and the concept title");

  // 3. Keyboard: open, arrows, Home/End, Esc with focus return.
  await btn(page, "m00-equations").focus();
  await page.keyboard.press("Enter");
  check(await menuVisible(page), "Enter on the status button opens the menu");
  let a = await active(page);
  check(a.role === "menuitemradio" && a.status === "not-started", `focus lands on the current option (got ${JSON.stringify(a)})`);
  check((await page.locator(".status-menu [role=menuitemradio]").count()) === 4, "menu has four options");
  check(await btn(page, "m00-equations").getAttribute("aria-expanded") === "true", "aria-expanded is true while open");
  const order = [];
  for (let i = 0; i < 4; i++) { await page.keyboard.press("ArrowDown"); order.push((await active(page)).status); }
  check(order.join() === "in-progress,complete,revisit,not-started", `ArrowDown order wraps (got ${order})`);
  await page.keyboard.press("ArrowUp");
  check((await active(page)).status === "revisit", "ArrowUp wraps to the last option");
  await page.keyboard.press("Home");
  check((await active(page)).status === "not-started", "Home goes to the first option");
  await page.keyboard.press("End");
  check((await active(page)).status === "revisit", "End goes to the last option");
  await page.keyboard.press("Escape");
  check(!(await menuVisible(page)), "Esc closes the menu");
  a = await active(page);
  check(a.statusOf === "m00-equations", `focus returns to the status button after Esc (got ${JSON.stringify(a)})`);
  check(await label(page, "m00-equations") === "Status: Not started. Change status.", "Esc changes nothing");
  // ArrowDown on the button opens it too; choose Revisit with Enter.
  await page.keyboard.press("ArrowDown");
  check(await menuVisible(page), "ArrowDown on the button opens the menu");
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  check(!(await menuVisible(page)), "choosing closes the menu");
  check((await active(page)).statusOf === "m00-equations", "focus returns to the status button after choosing");
  check(await label(page, "m00-equations") === "Status: Revisit. Change status.", `name follows the new status (got ${await label(page, "m00-equations")})`);
  // Space also chooses.
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Space");
  check(await label(page, "m00-equations") === "Status: Complete. Change status.", `Space opens and chooses (got ${await label(page, "m00-equations")})`);
  await page.keyboard.press("Enter"); await page.keyboard.press("Home"); await page.keyboard.press("ArrowDown"); await page.keyboard.press("ArrowDown"); await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  check(await label(page, "m00-equations") === "Status: Revisit. Change status.", "set back to Revisit for the reload test");

  // Reload persistence.
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("#site-nav [data-status-of]");
  check(await label(page, "m00-equations") === "Status: Revisit. Change status.", "Revisit survives a reload");
  const stored2 = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).concepts["m00-equations"].status, KEY);
  check(stored2 === "revisit", "stored status is revisit");

  // Opening a revisit/complete concept does not change it: scroll to Equations for > 2 s.
  await page.evaluate(() => document.getElementById("concept-equations").scrollIntoView());
  await page.waitForTimeout(2600);
  check(await label(page, "m00-equations") === "Status: Revisit. Change status.", "opening a Revisit concept leaves it on Revisit");

  // 4. Tab closes the menu and focus carries on; Shift+Tab lands on the button.
  await btn(page, "m00-functions").focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  check(!(await menuVisible(page)), "Tab closes the menu");
  a = await active(page);
  check(a.cid === "m00-functions", `Tab carries focus on to the row's link (got ${JSON.stringify(a)})`);
  await btn(page, "m00-functions").focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Shift+Tab");
  a = await active(page);
  check(!(await menuVisible(page)) && a.statusOf === "m00-functions", `Shift+Tab closes the menu and lands on the button (got ${JSON.stringify(a)})`);

  // 5. Only the open module's rows are in the tab order.
  const tabbed = await page.evaluate(async () => {
    const out = [];
    const first = document.querySelector('#site-nav [data-status-of]');
    first.focus();
    return { collapsedHidden: [...document.querySelectorAll('#site-nav details:not([open]) [data-status-of]')].every((b) => !b.checkVisibility()), collapsed: document.querySelectorAll('#site-nav details:not([open]) [data-status-of]').length };
  });
  check(tabbed.collapsed > 0 && tabbed.collapsedHidden, `collapsed module's buttons should not be rendered (${tabbed.collapsed} found)`);
  await btn(page, "m00-variables").focus();
  const seen = new Set();
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press("Tab");
    const x = await page.evaluate(() => { const e = document.activeElement; return { inNav: !!e.closest("#site-nav"), id: e.dataset?.statusOf ?? e.dataset?.cid ?? e.closest("details")?.dataset.module ?? null }; });
    if (!x.inNav) break;
    seen.add(x.id);
  }
  check([...seen].every((id) => id === null || id.startsWith("m00") || id === "m01"), `Tab in the outline should reach only module 0 rows and module summaries (got ${[...seen]})`);
  check([...seen].some((id) => id === "m00-notation"), "Tab reaches the last built row of the open module");

  // 6. Closes when the module collapses or the row is removed.
  await btn(page, "m00-slope").focus();
  await page.keyboard.press("Enter");
  check(await menuVisible(page), "menu open for the collapse test");
  await page.evaluate(() => { document.querySelector('#site-nav details[data-module="m00"]').open = false; });
  await page.waitForTimeout(100);
  check(!(await menuVisible(page)), "menu closes when its module collapses");
  a = await active(page);
  check(a.tag === "SUMMARY", `focus moves to the module summary after the collapse (got ${JSON.stringify(a)})`);
  await page.evaluate(() => { document.querySelector('#site-nav details[data-module="m00"]').open = true; });
  await btn(page, "m00-slope").click();
  check(await menuVisible(page), "menu opens on click");
  await page.evaluate(() => document.querySelector('#site-nav [data-status-of="m00-slope"]').closest("li").remove());
  await page.waitForTimeout(100);
  check(!(await menuVisible(page)), "menu closes when its row is removed");
  check((await page.locator(".status-menu").count()) === 1, "the menu element survives the row's removal");
  await ctx.close();
}

// 7. Reduced motion: no menu animation.
{
  const { ctx, page } = await open(1280, { ctxOpts: { reducedMotion: "reduce" } });
  await btn(page, "m00-slope").click();
  const m = await page.locator(".status-menu").evaluate((el) => { const cs = getComputedStyle(el); return { name: cs.animationName, dur: cs.animationDuration, tr: cs.transitionDuration }; });
  check(m.name === "none", `reduced motion: menu animation should be none (got ${JSON.stringify(m)})`);
  await ctx.close();
  const n = await open(1280);
  await btn(n.page, "m00-slope").click();
  const m2 = await n.page.locator(".status-menu").evaluate((el) => getComputedStyle(el).animationName);
  check(m2 === "status-menu-in", `normal motion: the short fade is present (got ${m2})`);
  await n.ctx.close();
}

// 8. Another tab: the storage event updates this tab's outline without a reload.
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const p1 = await ctx.newPage();
  const p2 = await ctx.newPage();
  for (const p of [p1, p2]) { await p.goto(base + M0, { waitUntil: "networkidle" }); await p.waitForSelector("#site-nav [data-status-of]"); }
  await btn(p1, "m00-slope").click();
  await p1.keyboard.press("End"); await p1.keyboard.press("ArrowUp"); await p1.keyboard.press("Enter");   // Complete
  await p2.waitForFunction(() => document.querySelector('#site-nav [data-status-of="m00-slope"]').dataset.status === "complete", null, { timeout: 3000 }).catch(() => {});
  check(await label(p2, "m00-slope") === "Status: Complete. Change status.", `other tab shows the change via the storage event (got ${await label(p2, "m00-slope")})`);
  await ctx.close();
}

// 9. Data from a later version is kept and flagged; changes are not written over it.
{
  const future = JSON.stringify({ v: 3, concepts: { "m00-variables": { state: "mastered" } } });
  const { ctx, page } = await open(1280, { init: `if (!localStorage.getItem(${JSON.stringify(KEY)})) localStorage.setItem(${JSON.stringify(KEY)}, ${JSON.stringify(future)});` });
  const notice = await page.locator(".notice").innerText();
  check(/newer version/i.test(notice) && /reload/i.test(notice), `later-version notice should ask for a reload (got "${notice}")`);
  check(await page.locator(".notice button", { hasText: "Reload" }).isVisible(), "notice has a Reload button");
  await btn(page, "m00-slope").click(); await page.keyboard.press("End"); await page.keyboard.press("Enter");
  await page.waitForTimeout(2600);
  check(await page.evaluate((k) => localStorage.getItem(k), KEY) === future, "stored later-version data is untouched after changes and opening");
  await ctx.close();
}

// 10. Sizes: 44px on touch, 40px for a fine pointer at 900px and up; the open menu stays inside the viewport.
{
  const touch = await open(1100, { ctxOpts: { hasTouch: true, isMobile: false } });
  const t = await touch.page.evaluate(() => { const b = document.querySelector("#site-nav [data-status-of]").getBoundingClientRect(); const a = document.querySelector("#site-nav ul.sub a").getBoundingClientRect(); return [Math.round(b.width), Math.round(b.height), Math.round(a.height)]; });
  check(t[0] === 44 && t[1] >= 44 && t[2] >= 44 && t[1] === t[2], `touch at 1100: button 44px wide, button and row at least 44px high and equal (got ${t})`);
  await touch.ctx.close();
  const fine = await open(1280);
  const f = await fine.page.evaluate(() => { const b = document.querySelector("#site-nav [data-status-of]").getBoundingClientRect(); const a = document.querySelector("#site-nav ul.sub a").getBoundingClientRect(); return [Math.round(b.width), Math.round(b.height), Math.round(a.height)]; });
  check(f[0] === 40 && f[1] >= 40 && f[1] < 44 && f[1] === f[2], `fine pointer at 1280: button 40px wide, button and row 40px high (got ${f})`);
  await fine.ctx.close();
  for (const w of [375, 768]) {
    const { ctx, page } = await open(w);
    await page.click("[data-nav-toggle]");
    await btn(page, "m00-notation").scrollIntoViewIfNeeded();
    await btn(page, "m00-notation").click();
    const r = await page.locator(".status-menu").evaluate((el) => { const b = el.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom, h: b.height, w: b.width, items: [...el.querySelectorAll("[role=menuitemradio]")].map((i) => Math.round(i.getBoundingClientRect().height)) }; });
    check(r.l >= 0 && r.r <= w && r.t >= 0 && r.b <= 800, `${w}px: open menu inside the viewport (${JSON.stringify(r)})`);
    check(r.items.every((h) => h >= 44), `${w}px: menu items at least 44px (got ${r.items})`);
    await page.keyboard.press("Escape");
    check(await page.evaluate(() => document.getElementById("site-nav").classList.contains("is-open")), `${w}px: Esc in the menu closes the menu only, not the drawer`);
    await ctx.close();
  }
}

await browser.close();
await close();
console.log(`progress-menu e2e: ${checks} checks, ${failures} failed`);
process.exit(failures ? 1 : 0);
