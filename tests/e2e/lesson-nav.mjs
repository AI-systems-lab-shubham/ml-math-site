// E2E check: Module 1 on the lesson template, the "On this page" nav, Expand/Collapse all, anchors into closed
// sections, sticky-bar clearance, and "Mark complete and continue".
// Run: node tests/e2e/lesson-nav.mjs   (Playwright needed; prints SKIPPED and exits 1 otherwise)
import { requirePlaywright, serveStatic } from "../../tools/lib/playwright.mjs";

const pw = await requirePlaywright("lesson-nav e2e");
const { base, close } = await serveStatic();
const browser = await pw.chromium.launch();
const M0 = "modules/00-foundations/";
const M1 = "modules/01-linear-algebra/";

let failures = 0, checks = 0;
const check = (ok, label) => { checks++; if (!ok) { failures++; console.error(`FAIL  ${label}`); } };

async function open(width, url, { height = 800, ctxOpts = {}, init } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, ...ctxOpts });
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage();
  await page.goto(base + url, { waitUntil: "networkidle" });
  await page.waitForSelector("#site-nav [data-status-of]", { state: "attached" });
  return { ctx, page };
}

// 1. Module 1 is on the lesson template, like Module 0.
{
  const { ctx, page } = await open(1280, M1);
  const o = await page.evaluate(() => ({
    cards: [...document.querySelectorAll("article.concept-card[id]")].map((c) => ({
      id: c.id, meta: !!c.querySelector(".lesson-meta"), outcomes: c.querySelectorAll(".outcomes li").length, takeaways: c.querySelectorAll(".takeaways li").length,
      stages: [...c.querySelectorAll(":scope > section[data-stage]")].map((s) => s.dataset.stage).join(), teach: !!c.querySelector(":scope > details.teach-it"),
      control: !!c.querySelector(".status-control"), pager: !!c.querySelector(".pager"),
    })),
    breadcrumbs: document.querySelectorAll("nav.breadcrumb").length,
    legacyPanel: !!document.querySelector(".progress-panel"), footer: !!document.querySelector("#site-footer .footer-grid"),
    moduleLine: document.querySelector("[data-module-progress]").textContent,
  }));
  check(o.cards.map((c) => c.id).join() === "concept-vectors,concept-combine,concept-matrices,concept-matmul", `Module 1 keeps its four concept ids (got ${o.cards.map((c) => c.id)})`);
  for (const c of o.cards) {
    check(c.meta && c.outcomes >= 2 && c.outcomes <= 3, `${c.id}: meta and 2 to 3 objectives (got ${c.outcomes})`);
    check(c.takeaways >= 3 && c.takeaways <= 4, `${c.id}: 3 to 4 takeaways (got ${c.takeaways})`);
    check(c.stages === "meaning,picture,real-life,worked-example,why-when,how-to-arrive,in-an-llm", `${c.id}: seven stages in order`);
    check(c.teach && c.control && c.pager, `${c.id}: Teach it, status control and pager`);
  }
  check(o.breadcrumbs === 1, "one breadcrumb on the page");
  check(!o.legacyPanel, "the legacy checkbox panel is gone");
  check(o.footer, "the shared footer is built");
  check(/^0 of 4 concepts complete/.test(o.moduleLine), `module progress line (got "${o.moduleLine}")`);
  // Current concept marker follows the card in view and the URL hash.
  await page.evaluate(() => document.getElementById("concept-matrices").scrollIntoView());
  await page.waitForTimeout(400);
  check(await page.evaluate(() => document.querySelector("#site-nav a[aria-current]")?.dataset.cid) === "m01-matrices", "outline marks Matrices as current while it is at the top");
  check(await page.locator("#site-nav a[aria-current]").count() === 1, "exactly one current marker");
  // Opening cards promotes only the opened one.
  await page.waitForTimeout(2300);
  const st = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll("#site-nav [data-status-of]")].map((b) => [b.dataset.statusOf, b.dataset.status])));
  check(st["m01-matrices"] === "in-progress", "the opened Module 1 card becomes in progress");
  check(st["m01-matmul"] === "not-started" || st["m01-matmul"] === "in-progress", "later cards stay not started unless in view");
  await ctx.close();
  const h = await open(1280, `${M1}#concept-matmul`);
  await h.page.waitForTimeout(500);
  check(await h.page.evaluate(() => document.querySelector("#site-nav a[aria-current]")?.dataset.cid) === "m01-matmul", "a URL hash marks its concept as current");
  await h.ctx.close();
}

const barsBottom = (page) => page.evaluate(() => {
  const h = document.getElementById("site-header").getBoundingClientRect().bottom;
  const t = document.querySelector("[data-page-toc]");
  const narrow = !matchMedia("(min-width: 1200px)").matches;
  const r = t.getBoundingClientRect();
  const showing = narrow && !t.classList.contains("is-away") && r.height > 0;
  return Math.max(h, showing ? r.bottom : 0);
});
const UIKEY = "mlmath:ui:v1";

// 2. "On this page": a bar below 1200px, a side nav from 1200px.
for (const [name, url] of [["module-0", M0], ["module-1", M1]]) {
  for (const w of [375, 768, 1100, 1199, 1200, 1280, 1440]) {
    const { ctx, page } = await open(w, url);
    const o = await page.evaluate(() => {
      const nav = document.querySelector("[data-page-toc]");
      const btn = nav.querySelector(".page-toc-toggle");
      const panel = nav.querySelector("[data-toc-panel]");
      const vis = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== "hidden";
      return { label: nav.getAttribute("aria-label"), btn: vis(btn), panel: vis(panel), links: [...nav.querySelectorAll(".page-toc-list:not([hidden]) a")].map((a) => a.textContent), scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth };
    });
    const wide = w >= 1200;
    check(o.label === "On this page", `${name}@${w}: nav is named On this page`);
    check(o.btn === !wide, `${name}@${w}: the bar button is ${wide ? "hidden" : "shown"}`);
    check(o.panel === wide, `${name}@${w}: the list is ${wide ? "shown beside the content" : "closed until opened"}`);
    check(o.scrollW <= o.clientW, `${name}@${w}: no sideways scroll`);
    check(o.links.join("|") === "Meaning|Picture|Real life|Worked example|Why and when|How to arrive at it|In an LLM|Teach it", `${name}@${w}: stage list (got ${o.links.join("|")})`);
    await ctx.close();
  }
}

// 3. Side nav geometry at 1200, 1280, 1440 with the rail shown and hidden: no overlap, no huge gap, content stays wide enough.
for (const url of [M0, M1]) for (const w of [1200, 1280, 1440]) for (const rail of ["shown", "hidden"]) {
  const { ctx, page } = await open(w, url);
  if (rail === "hidden") { await page.click("[data-nav-toggle]"); await page.waitForTimeout(150); }
  const g = await page.evaluate(() => {
    const r = (e) => { const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom, w: b.width }; };
    const toc = r(document.querySelector("[data-page-toc]"));
    const card = r(document.querySelector("article.concept-card"));
    const hero = r(document.querySelector(".page-hero"));
    const navEl = document.getElementById("site-nav");
    const nav = navEl.getClientRects().length ? r(navEl) : null;
    const head = r(document.getElementById("site-header"));
    return { toc, card, hero, nav, head, vw: innerWidth, vh: innerHeight, sw: document.documentElement.scrollWidth };
  });
  const label = `${url.split("/")[1]}@${w} rail ${rail}`;
  check(g.toc.r <= g.vw && g.sw <= g.vw, `${label}: side nav inside the viewport, no sideways scroll`);
  check(g.card.r <= g.toc.l - 8, `${label}: content (card right ${Math.round(g.card.r)}) clear of the side nav (left ${Math.round(g.toc.l)})`);
  check(g.toc.l - g.card.r <= 60, `${label}: gap between content and side nav is ${Math.round(g.toc.l - g.card.r)}px (at most 60)`);
  check(g.toc.t >= g.head.b - 0.5 && g.toc.b <= g.vh + 0.5, `${label}: side nav sits below the header and inside the viewport height`);
  const left = g.nav ? g.card.l - g.nav.r : g.card.l;
  check(left <= 130, `${label}: empty space left of the content is ${Math.round(left)}px (at most 130)`);
  if (rail === "shown") check(g.card.w >= 640 - 0.5, `${label}: content column is ${Math.round(g.card.w)}px (at least 640)`);
  if (g.nav) check(g.nav.r <= g.card.l + 0.5, `${label}: rail does not overlap the content`);
  await ctx.close();
}

// 4. Scrollspy.
{
  const { ctx, page } = await open(1280, M0);
  const cur = () => page.evaluate(() => ({ card: document.querySelector("[data-toc-card]").textContent, stage: document.querySelector('.page-toc-list:not([hidden]) a[aria-current="location"]')?.textContent ?? null }));
  const settle = () => page.waitForTimeout(250);
  for (const [id, stage] of [["concept-equations-meaning", "Meaning"], ["concept-equations-real-life", "Real life"], ["concept-equations-in-an-llm", "In an LLM"], ["concept-equations-teach-it", "Teach it"]]) {
    await page.evaluate((i) => document.getElementById(i).scrollIntoView(), id);
    await settle();
    const c = await cur();
    check(c.card === "Equations" && c.stage === stage, `scrollspy: at ${id} expected Equations / ${stage}, got ${c.card} / ${c.stage}`);
  }
  await page.evaluate(() => document.getElementById("concept-functions").scrollIntoView());
  await settle();
  const c2 = await cur();
  check(c2.card === "Functions and graphs", `scrollspy: moves to the next card (got ${c2.card})`);
  check(await page.locator('.page-toc-list a[aria-current="location"]').count() === 1, "scrollspy: exactly one current item");
  // Clicking an item jumps to that section.
  await page.locator('.page-toc-list:not([hidden]) a', { hasText: "Why and when" }).click();
  await settle();
  check(await page.evaluate(() => location.hash) === "#concept-functions-why-when", "clicking an item changes the hash to that section");
  await ctx.close();
  // Narrow bar: opens, Esc closes and focus returns, shows the current stage, closes on choosing an item.
  const n = await open(375, M1);
  const bar = n.page.locator(".page-toc-toggle");
  await bar.focus();
  await n.page.keyboard.press("Enter");
  check(await bar.getAttribute("aria-expanded") === "true" && await n.page.locator('.page-toc-list:not([hidden])').isVisible(), "bar opens from the keyboard");
  await n.page.keyboard.press("Escape");
  check(await bar.getAttribute("aria-expanded") === "false" && await n.page.evaluate(() => document.activeElement.classList.contains("page-toc-toggle")), "Esc closes the bar list and returns focus to the bar");
  await n.page.evaluate(() => document.getElementById("concept-combine-real-life").scrollIntoView());
  await n.page.waitForTimeout(300);
  check(/Adding, scaling and combining vectors · Real life/.test(await n.page.locator("[data-toc-current]").innerText()), "bar shows the current card and stage");
  await bar.click();
  await n.page.locator('.page-toc-list:not([hidden]) a', { hasText: "Meaning" }).click();
  check(await bar.getAttribute("aria-expanded") === "false", "choosing an item closes the bar list");
  await n.ctx.close();
}

// 5. Expand all / Collapse all: Teach it and symbol lists; reveals stay closed; remembered on the UI key only.
for (const [name, url] of [["module-0", M0], ["module-1", M1]]) {
  const { ctx, page } = await open(1280, url);
  await page.waitForSelector("details.eq-symbols", { state: "attached" });
  const count = (sel) => page.evaluate((s) => [...document.querySelectorAll(s)].filter((d) => d.open).length, sel);
  const total = await page.evaluate(() => document.querySelectorAll("main details.teach-it, main details.eq-symbols").length);
  check(total >= 8 && await count("main details") === 0, `${name}: starts with everything closed (${total} collapsibles)`);
  await page.click("[data-expand-all]");
  check(await count("main details.teach-it, main details.eq-symbols") === total, `${name}: Expand all opens all ${total}`);
  check(await count("main details.reveal") === 0, `${name}: Expand all leaves the answer reveals closed`);
  check((await page.locator("[data-tools-status]").innerText()) === `Expanded ${total} sections.`, `${name}: status line says what happened (got "${await page.locator("[data-tools-status]").innerText()}")`);
  const ui = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), UIKEY);
  check(Object.keys(ui.sectionsOpen ?? {}).length === total, `${name}: open state saved on ${UIKEY} (${Object.keys(ui.sectionsOpen ?? {}).length} keys)`);
  check(!Object.keys(ui.sectionsOpen).some((k) => /reveal/.test(k)), `${name}: no reveal key saved`);
  check(!((await page.evaluate(() => localStorage.getItem("mlmath:progress:v1"))) ?? "").includes("sectionsOpen"), `${name}: not saved in the progress store`);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("details.eq-symbols", { state: "attached" });
  check(await count("main details.teach-it, main details.eq-symbols") === total, `${name}: open state survives a reload`);
  // A reveal opened by hand is not remembered.
  await page.evaluate(() => { document.querySelector("main details.reveal").open = true; });
  await page.waitForTimeout(100);
  await page.click("[data-collapse-all]");
  check(await count("main details.teach-it, main details.eq-symbols") === 0, `${name}: Collapse all closes them`);
  check((await page.locator("[data-tools-status]").innerText()) === `Collapsed ${total} sections.`, `${name}: Collapse status`);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("details.eq-symbols", { state: "attached" });
  check(await count("main details") === 0, `${name}: closed state and an opened reveal are not restored`);
  // One section opened by hand is remembered alone.
  await page.locator("main details.teach-it > summary").first().click();
  await page.waitForTimeout(200);   // the toggle event is queued
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("details.eq-symbols", { state: "attached" });
  check(await count("main details") === 1 && await page.evaluate(() => document.querySelector("main details.teach-it").open), `${name}: a single manual open is remembered`);
  // The pair of buttons is keyboard operable and labelled.
  await page.locator("[data-expand-all]").focus();
  await page.keyboard.press("Enter");
  check(await count("main details.teach-it, main details.eq-symbols") === total, `${name}: Expand all works from the keyboard`);
  await ctx.close();
}

// 6. A link to an anchor inside a closed section opens it (load, click, toc); everything opens in print.
{
  const l = await open(1280, `${M0}#concept-equations-teach-it`);
  await l.page.waitForTimeout(500);
  check(await l.page.evaluate(() => document.getElementById("concept-equations-teach-it").open), "a hash on load opens the closed Teach it");
  const top = await l.page.evaluate(() => document.querySelector("#concept-equations-teach-it > summary").getBoundingClientRect().top);
  check(top >= 60 && top < 400, `the opened section is scrolled into view (summary top ${Math.round(top)})`);
  await l.ctx.close();
  const { ctx, page } = await open(1280, M0);
  await page.evaluate(() => {
    const r = document.querySelector("#concept-slope details.reveal");
    const p = document.createElement("p"); p.id = "probe-inside"; p.textContent = "inside"; r.append(p);
    const a = document.createElement("a"); a.href = "#probe-inside"; a.id = "probe-link"; a.textContent = "go to probe"; document.querySelector("#concept-slope header").append(a);
  });
  check(!(await page.evaluate(() => document.querySelector("#concept-slope details.reveal").open)), "reveal starts closed");
  await page.click("#probe-link");
  await page.waitForTimeout(300);
  check(await page.evaluate(() => document.querySelector("#concept-slope details.reveal").open), "clicking a link to an anchor inside a closed section opens it");
  const inView = await page.evaluate(() => { const b = document.getElementById("probe-inside").getBoundingClientRect(); return b.top >= 61 && b.bottom <= innerHeight; });
  check(inView, "the target inside the opened section is visible below the header");
  const ui = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "{}"), UIKEY);
  check(!JSON.stringify(ui.sectionsOpen ?? {}).includes("reveal"), "opening by a link is not remembered");
  // The toc's Teach it item opens it too.
  await page.locator('.page-toc-list:not([hidden]) a', { hasText: "Teach it" }).click();
  await page.waitForTimeout(300);
  const cardId = await page.evaluate(() => document.querySelector("[data-toc-card]").textContent);
  check(await page.evaluate(() => [...document.querySelectorAll("main details.teach-it")].some((d) => d.open)), `the toc's Teach it item opens the section (card ${cardId})`);
  // Print.
  await page.evaluate(() => document.querySelectorAll("main details").forEach((d) => { d.open = false; }));
  await page.emulateMedia({ media: "print" });
  await page.waitForTimeout(200);
  const all = await page.evaluate(() => { const d = [...document.querySelectorAll("main details")]; return [d.length, d.filter((x) => x.open).length]; });
  check(all[0] > 0 && all[0] === all[1], `print media opens every section (${all[1]} of ${all[0]})`);
  const hidden = await page.evaluate(() => ["[data-page-toc]", "[data-page-tools]", ".site-nav"].map((s) => getComputedStyle(document.querySelector(s)).display));
  check(hidden.every((d) => d === "none"), `print hides the page nav, tools and outline (${hidden})`);
  await page.emulateMedia({ media: "screen" });
  await page.waitForTimeout(200);
  check(await page.evaluate(() => [...document.querySelectorAll("main details")].filter((x) => x.open).length) === 0, "leaving print restores the closed sections");
  await ctx.close();
}

// 7. Opening a closed section mounts a lazy widget inside it (click, Expand all, hash).
for (const how of ["click", "expand-all", "hash"]) {
  const { ctx, page } = await open(1280, M0);
  await page.evaluate(async () => {
    const { mountWhenNeeded } = await import(new URL("../../assets/js/widgets.mjs", location.href).href);
    const host = document.createElement("div");
    host.id = "probe-widget"; host.dataset.widget = "probe";
    host.innerHTML = '<p class="widget-title">Probe</p>';
    document.querySelector("#concept-variables details.teach-it").append(host);
    mountWhenNeeded(host, (el) => { el.innerHTML = '<p class="widget-title">Probe mounted</p>'; });
  });
  await page.waitForTimeout(300);
  check(await page.evaluate(() => document.getElementById("probe-widget").dataset.lazy) === "pending", `${how}: a widget in a closed section stays pending`);
  if (how === "click") await page.locator("#concept-variables details.teach-it > summary").click();
  if (how === "expand-all") await page.click("[data-expand-all]");
  if (how === "hash") await page.evaluate(() => { location.hash = "#probe-widget"; });
  await page.waitForFunction(() => document.getElementById("probe-widget").dataset.lazy === "mounted", null, { timeout: 3000 }).catch(() => {});
  check(await page.evaluate(() => document.getElementById("probe-widget").dataset.lazy) === "mounted", `${how}: opening the section mounts the widget inside it`);
  check(await page.evaluate(() => document.querySelector("#concept-variables details.teach-it").open), `${how}: the section is open`);
  await ctx.close();
}

// 8. Two sticky bars: after a hash jump or an outline click the target heading is fully below them.
for (const [name, url, hashId, cid, cardId] of [["module-0", M0, "concept-slope-picture", "m00-logarithms", "concept-logarithms"], ["module-1", M1, "concept-matrices-real-life", "m01-matmul", "concept-matmul"]]) {
  for (const w of [375, 768]) {
    const h = await open(w, `${url}#${hashId}`);
    await h.page.waitForTimeout(900);
    const bottom = await barsBottom(h.page);
    const headTop = await h.page.evaluate((i) => document.querySelector(`#${i} > .stage-heading`).getBoundingClientRect().top, hashId);
    check(headTop >= bottom, `${name}@${w}: after a hash jump the stage heading (top ${Math.round(headTop)}) is below the bars (bottom ${Math.round(bottom)})`);
    check(headTop < bottom + 120, `${name}@${w}: and not far below them (${Math.round(headTop - bottom)}px gap)`);
    // Outline click.
    await h.page.click("[data-nav-toggle]");
    await h.page.locator(`#site-nav a[data-cid="${cid}"]`).click();
    await h.page.waitForTimeout(900);
    const b2 = await barsBottom(h.page);
    const t2 = await h.page.evaluate((i) => document.querySelector(`#${i} > header h2`).getBoundingClientRect().top, cardId);
    check(t2 >= b2, `${name}@${w}: after an outline click the card heading (top ${Math.round(t2)}) is below the bars (bottom ${Math.round(b2)})`);
    // A toc item (bar open) too.
    await h.page.waitForTimeout(1700);   // past the bar's calm period, so it is not mid-slide
    await h.page.click(".page-toc-toggle");
    if (process.env.DBG) console.log(name, w, await h.page.evaluate(() => ({ cls: document.querySelector("[data-page-toc]").className, exp: document.querySelector(".page-toc-toggle").getAttribute("aria-expanded"), lists: [...document.querySelectorAll(".page-toc-list")].map((l) => l.hidden) })));
    await h.page.locator('.page-toc-list:not([hidden]) a', { hasText: "In an LLM" }).click();
    await h.page.waitForTimeout(900);
    const b3 = await barsBottom(h.page);
    const t3 = await h.page.evaluate(() => { const c = document.querySelector('.page-toc-list:not([hidden]) a[aria-current="location"]'); const id = c?.getAttribute("href")?.slice(1); return document.querySelector(`#${id} > .stage-heading`).getBoundingClientRect().top; });
    check(t3 >= b3, `${name}@${w}: after a toc item the stage heading (top ${Math.round(t3)}) is below the bars (bottom ${Math.round(b3)})`);
    await h.ctx.close();
  }
}

// 9. The bar slides away while reading down and returns on scroll up; it stays through jumps.
{
  const { ctx, page } = await open(375, M0);
  await page.waitForTimeout(1700);   // past the calm period after load
  for (let i = 0; i < 10; i++) { await page.mouse.wheel(0, 250); await page.waitForTimeout(60); }
  await page.waitForTimeout(400);
  check(await page.evaluate(() => document.querySelector("[data-page-toc]").classList.contains("is-away")), "bar slides away after scrolling down");
  for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, -100); await page.waitForTimeout(60); }
  await page.waitForTimeout(400);
  check(!(await page.evaluate(() => document.querySelector("[data-page-toc]").classList.contains("is-away"))), "bar returns on scroll up");
  await ctx.close();
  const j = await open(375, `${M0}#concept-logarithms-picture`);
  await j.page.waitForTimeout(1500);
  check(!(await j.page.evaluate(() => document.querySelector("[data-page-toc]").classList.contains("is-away"))), "bar stays after a jump to an anchor");
  await j.ctx.close();
}

await browser.close();
await close();
console.log(`lesson-nav e2e: ${checks} checks, ${failures} failed`);
process.exit(failures ? 1 : 0);
