// E2E check: concept pages on the lesson template (one concept per page), the "On this page" nav, Expand/Collapse all,
// anchors into closed sections, sticky-bar clearance, the one primary button and its Continue flows, the toast.
// Run: node tests/e2e/lesson-nav.mjs   (Playwright needed; prints SKIPPED and exits 1 otherwise)
import { readFileSync } from "node:fs";
import { requirePlaywright, serveStatic, siteRoot } from "../../tools/lib/playwright.mjs";

const pw = await requirePlaywright("lesson-nav e2e");
const { base, close } = await serveStatic();
const browser = await pw.chromium.launch();
const course = JSON.parse(readFileSync(`${siteRoot}/data/course.json`, "utf8"));
const concepts = course.modules.flatMap((m) => m.concepts.filter((c) => c.status === "built" && m.status === "built"));
const P = (id) => concepts.find((c) => c.id === id).path;
const EQ = P("m00-equations"), VAR = P("m00-variables"), SLOPE = P("m00-slope"), VEC = P("m01-vectors"), COMB = P("m01-combine"), MATMUL = P("m01-matmul");
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

// 1. Every concept page is on the lesson template and holds only its own concept.
for (const c of concepts) {
  const { ctx, page } = await open(1280, c.path);
  const o = await page.evaluate(() => {
    const card = document.querySelector("article.concept-card[id]");
    return {
      cards: document.querySelectorAll("article.concept-card").length, id: card.id,
      h1: [...document.querySelectorAll("h1")].map((h) => h.textContent.trim()),
      meta: !!card.querySelector(".lesson-meta"), outcomes: card.querySelectorAll(".outcomes li").length, takeaways: card.querySelectorAll(".takeaways li").length,
      stages: [...card.querySelectorAll(":scope > section[data-stage]")].map((s) => s.dataset.stage).join(), teach: !!card.querySelector(":scope > details.teach-it"),
      control: !!card.querySelector(".status-control"), pagers: [...document.querySelectorAll(".pager a")].map((a) => a.getAttribute("rel")),
      pagerText: document.querySelector(".pager")?.textContent ?? "", mainText: document.querySelector("main").textContent,
      breadcrumb: [...document.querySelectorAll("nav.breadcrumb li")].map((l) => l.textContent.trim()), breadcrumbs: document.querySelectorAll("nav.breadcrumb").length,
      legacyPanel: !!document.querySelector(".progress-panel"), footer: !!document.querySelector("#site-footer .footer-grid"),
      title: document.title, desc: document.querySelector('meta[name="description"]')?.content ?? "",
      modLine: !!document.querySelector("[data-module-progress]"), primaries: document.querySelectorAll("[data-continue]").length,
    };
  });
  const mod = course.modules.find((m) => c.id.startsWith(m.id));
  check(o.cards === 1 && o.id === c.anchor, `${c.id}: one card, id ${c.anchor} (got ${o.cards}, ${o.id})`);
  check(o.h1.length === 1 && o.h1[0] === c.title, `${c.id}: one h1 that is the concept title (got ${o.h1})`);
  check(o.meta && o.outcomes >= 2 && o.outcomes <= 3, `${c.id}: meta and 2 to 3 objectives (got ${o.outcomes})`);
  check(o.takeaways >= 3 && o.takeaways <= 4, `${c.id}: 3 to 4 takeaways (got ${o.takeaways})`);
  check(o.stages === "meaning,picture,real-life,worked-example,why-when,how-to-arrive,in-an-llm", `${c.id}: seven stages in order`);
  check(o.teach && o.control, `${c.id}: Teach it and status control`);
  check(o.primaries === 1, `${c.id}: exactly one primary button (got ${o.primaries})`);
  check(o.pagers.every((r) => r === "prev"), `${c.id}: the pager holds only a Previous link (got ${o.pagers})`);
  check(!/Up next/i.test(o.mainText) && !/Up next/i.test(o.pagerText), `${c.id}: no "Up next" anywhere on the page`);
  // Nothing from another concept: no other concept's title appears as a heading, and no other card's id exists.
  const others = concepts.filter((x) => x.id !== c.id).map((x) => x.title);
  const heads = await page.evaluate(() => [...document.querySelectorAll("main h1, main h2, main h3, main h4")].map((h) => h.textContent.trim()));
  const leaks = heads.filter((h) => others.includes(h));
  check(leaks.length === 0, `${c.id}: no other concept's heading on the page (got ${leaks})`);
  check(o.breadcrumbs === 1 && o.breadcrumb.join(" > ") === `Course > Module ${course.modules.indexOf(mod)}: ${mod.title} > ${c.title}`, `${c.id}: breadcrumb Course > Module > Concept (got ${o.breadcrumb.join(" > ")})`);
  check(!o.legacyPanel && o.footer && !o.modLine, `${c.id}: no legacy panel, shared footer, no module-wide progress line`);
  check(o.title === `${c.title} - ${mod.title} - ML Math` && o.desc.length > 20, `${c.id}: unique title and a description (got "${o.title}")`);
  await ctx.close();
}
{
  const titles = new Set();
  for (const c of concepts) { const { ctx, page } = await open(375, c.path); titles.add(await page.title()); await ctx.close(); }
  check(titles.size === concepts.length, `all ${concepts.length} concept page titles are different (${titles.size})`);
}
// A concept page does not preview what comes next: the Previous link may name the previous concept, nothing names the next.
for (const c of concepts) {
  const { ctx, page } = await open(1280, c.path);
  const i = concepts.indexOf(c);
  const next = concepts[i + 1];
  const o = await page.evaluate(() => ({ main: document.querySelector("article.concept-card").textContent + " " + (document.querySelector(".pager")?.textContent ?? ""), links: [...document.querySelectorAll("article.concept-card a, .pager a")].map((a) => new URL(a.href).pathname) }));
  // The right panel (module switcher) is navigation and lists every built concept; only the content is checked here.
  if (next) check(!o.main.includes(next.title), `${c.id}: the next concept's title (${next.title}) is not on the page`);
  check(!next || !o.links.some((h) => h.endsWith(`/${next.path}`)), `${c.id}: no link in the content points to the next concept`);
  await ctx.close();
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

// 2. "On this page": a bar below 1200px, a side nav from 1200px, listing the stages of this one concept.
for (const [name, url] of [["equations", EQ], ["vectors", VEC]]) {
  for (const w of [375, 768, 1100, 1199, 1200, 1280, 1440]) {
    const { ctx, page } = await open(w, url);
    const o = await page.evaluate(() => {
      const nav = document.querySelector("[data-page-toc]");
      const btn = nav.querySelector(".page-toc-toggle");
      const panel = nav.querySelector("[data-toc-panel]");
      const vis = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== "hidden";
      return { label: nav.getAttribute("aria-label"), btn: vis(btn), panel: vis(panel), links: [...nav.querySelectorAll(".page-toc-list:not([hidden]) a")].map((a) => a.textContent), lists: nav.querySelectorAll(".page-toc-list").length, scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth };
    });
    const wide = w >= 1200;
    check(o.label === "On this page", `${name}@${w}: nav is named On this page`);
    check(o.btn === !wide, `${name}@${w}: the bar button is ${wide ? "hidden" : "shown"}`);
    check(o.panel === wide, `${name}@${w}: the list is ${wide ? "shown beside the content" : "closed until opened"}`);
    check(o.scrollW <= o.clientW, `${name}@${w}: no sideways scroll`);
    check(o.lists === 1, `${name}@${w}: one stage list (this concept's), got ${o.lists}`);
    check(o.links.join("|") === "Meaning|Picture|Real life|Worked example|Why and when|How to arrive at it|In an LLM|Teach it", `${name}@${w}: stage list (got ${o.links.join("|")})`);
    await ctx.close();
  }
}

// 3. Side nav geometry at 1200, 1280, 1440 with the rail shown and hidden.
for (const url of [EQ, VEC]) for (const w of [1200, 1280, 1440]) for (const rail of ["shown", "hidden"]) {
  const { ctx, page } = await open(w, url);
  if (rail === "hidden") { await page.click("[data-nav-toggle]"); await page.waitForTimeout(150); }
  const g = await page.evaluate(() => {
    const r = (e) => { const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom, w: b.width }; };
    const toc = r(document.querySelector("[data-page-toc]"));
    const card = r(document.querySelector("article.concept-card"));
    const navEl = document.getElementById("site-nav");
    const nav = navEl.getClientRects().length ? r(navEl) : null;
    const head = r(document.getElementById("site-header"));
    return { toc, card, nav, head, vw: innerWidth, vh: innerHeight, sw: document.documentElement.scrollWidth };
  });
  const label = `${url.split("/")[2]}@${w} rail ${rail}`;
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

// 4. Scrollspy over the stages of this concept.
{
  const { ctx, page } = await open(1280, EQ);
  const cur = () => page.evaluate(() => ({ card: document.querySelector(".module-switch-label").textContent.split(" › ").slice(1).join(" › "), stage: document.querySelector('.page-toc-list:not([hidden]) a[aria-current="location"]')?.textContent }));
  const settle = () => page.waitForTimeout(250);
  for (const [id, stage] of [["concept-equations-meaning", "Meaning"], ["concept-equations-real-life", "Real life"], ["concept-equations-in-an-llm", "In an LLM"], ["concept-equations-teach-it", "Teach it"]]) {
    await page.evaluate((i) => document.getElementById(i).scrollIntoView(), id);
    await settle();
    const c = await cur();
    check(c.card === "Equations" && c.stage === stage, `scrollspy: at ${id} expected Equations / ${stage}, got ${c.card} / ${c.stage}`);
  }
  check(await page.locator('.page-toc-list a[aria-current="location"]').count() === 1, "scrollspy: exactly one current item");
  await page.locator('.page-toc-list:not([hidden]) a', { hasText: "Why and when" }).click();
  await settle();
  check(await page.evaluate(() => location.hash) === "#concept-equations-why-when", "clicking an item changes the hash to that section");
  await ctx.close();
  // Narrow bar: opens, Esc closes and focus returns, shows the current stage, closes on choosing an item.
  const n = await open(375, COMB);
  const bar = n.page.locator(".page-toc-toggle");
  await bar.focus();
  await n.page.keyboard.press("Enter");
  check(await bar.getAttribute("aria-expanded") === "true" && await n.page.locator('.page-toc-list:not([hidden])').isVisible(), "bar opens from the keyboard");
  await n.page.keyboard.press("Escape");
  check(await bar.getAttribute("aria-expanded") === "false" && await n.page.evaluate(() => document.activeElement.classList.contains("page-toc-toggle")), "Esc closes the bar list and returns focus to the bar");
  await n.page.evaluate(() => document.getElementById("concept-combine-real-life").scrollIntoView());
  await n.page.waitForTimeout(300);
  check((await n.page.locator("[data-toc-current]").innerText()) === "Real life", `bar shows the current stage (got "${await n.page.locator("[data-toc-current]").innerText()}")`);
  await bar.click();
  await n.page.locator('.page-toc-list:not([hidden]) a', { hasText: "Meaning" }).click();
  check(await bar.getAttribute("aria-expanded") === "false", "choosing an item closes the bar list");
  await n.ctx.close();
}

// 5. Expand all / Collapse all: Teach it and symbol lists; reveals stay closed; remembered on the UI key only; per page.
for (const [name, url] of [["equations", EQ], ["vectors", VEC], ["matmul", MATMUL]]) {
  const { ctx, page } = await open(1280, url);
  await page.waitForTimeout(300);
  const count = (sel) => page.evaluate((s) => [...document.querySelectorAll(s)].filter((d) => d.open).length, sel);
  const total = await page.evaluate(() => document.querySelectorAll("main details.teach-it, main details.eq-symbols").length);
  check(total >= 1 && await count("main details") === 0, `${name}: starts with everything closed (${total} collapsibles)`);
  await page.click("[data-expand-all]");
  check(await count("main details.teach-it, main details.eq-symbols") === total, `${name}: Expand all opens all ${total}`);
  check(await count("main details.reveal") === 0, `${name}: Expand all leaves the answer reveals closed`);
  check((await page.locator("[data-tools-status]").innerText()) === `Expanded ${total} section${total === 1 ? "" : "s"}.`, `${name}: status line says what happened (got "${await page.locator("[data-tools-status]").innerText()}")`);
  const ui = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), UIKEY);
  check(Object.keys(ui.sectionsOpen ?? {}).length >= total, `${name}: open state saved on ${UIKEY}`);
  check(!Object.keys(ui.sectionsOpen).some((k) => /reveal/.test(k)), `${name}: no reveal key saved`);
  check(!((await page.evaluate(() => localStorage.getItem("mlmath:progress:v1"))) ?? "").includes("sectionsOpen"), `${name}: not saved in the progress store`);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  check(await count("main details.teach-it, main details.eq-symbols") === total, `${name}: open state survives a reload`);
  await page.evaluate(() => { const r = document.querySelector("main details.reveal"); if (r) r.open = true; });
  await page.waitForTimeout(100);
  await page.click("[data-collapse-all]");
  check(await count("main details.teach-it, main details.eq-symbols") === 0, `${name}: Collapse all closes them`);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  check(await count("main details") === 0, `${name}: closed state and an opened reveal are not restored`);
  await page.locator("main details.teach-it > summary").first().click();
  await page.waitForTimeout(200);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  check(await count("main details") === 1 && await page.evaluate(() => document.querySelector("main details.teach-it").open), `${name}: a single manual open is remembered`);
  await page.locator("[data-expand-all]").focus();
  await page.keyboard.press("Enter");
  check(await count("main details.teach-it, main details.eq-symbols") === total, `${name}: Expand all works from the keyboard`);
  await ctx.close();
}

// 6. A link to an anchor inside a closed section opens it (load, click, toc); everything opens in print.
{
  const l = await open(1280, `${EQ}#concept-equations-teach-it`);
  await l.page.waitForTimeout(500);
  check(await l.page.evaluate(() => document.getElementById("concept-equations-teach-it").open), "a hash on load opens the closed Teach it");
  const top = await l.page.evaluate(() => document.querySelector("#concept-equations-teach-it > summary").getBoundingClientRect().top);
  check(top >= 60 && top < 400, `the opened section is scrolled into view (summary top ${Math.round(top)})`);
  await l.ctx.close();
  const { ctx, page } = await open(1280, SLOPE);
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
  await page.locator('.page-toc-list:not([hidden]) a', { hasText: "Teach it" }).click();
  await page.waitForTimeout(300);
  check(await page.evaluate(() => [...document.querySelectorAll("main details.teach-it")].some((d) => d.open)), "the toc's Teach it item opens the section");
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
  const { ctx, page } = await open(1280, VAR);
  await page.evaluate(async () => {
    const { mountWhenNeeded } = await import(new URL("../../../assets/js/widgets.mjs", location.href).href);
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

// 8. Two sticky bars: after a hash jump or a toc item the target heading is fully below them.
for (const [name, url, hashId] of [["slope", SLOPE, "concept-slope-picture"], ["matrices", P("m01-matrices"), "concept-matrices-real-life"]]) {
  for (const w of [375, 768]) {
    const h = await open(w, `${url}#${hashId}`);
    await h.page.waitForTimeout(900);
    const bottom = await barsBottom(h.page);
    const headTop = await h.page.evaluate((i) => document.querySelector(`#${i} > .stage-heading`).getBoundingClientRect().top, hashId);
    check(headTop >= bottom, `${name}@${w}: after a hash jump the stage heading (top ${Math.round(headTop)}) is below the bars (bottom ${Math.round(bottom)})`);
    check(headTop < bottom + 120, `${name}@${w}: and not far below them (${Math.round(headTop - bottom)}px gap)`);
    await h.page.waitForTimeout(1700);
    await h.page.click(".page-toc-toggle");
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
  const { ctx, page } = await open(375, EQ);
  await page.waitForTimeout(1700);
  for (let i = 0; i < 10; i++) { await page.mouse.wheel(0, 250); await page.waitForTimeout(60); }
  await page.waitForTimeout(400);
  check(await page.evaluate(() => document.querySelector("[data-page-toc]").classList.contains("is-away")), "bar slides away after scrolling down");
  for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, -100); await page.waitForTimeout(60); }
  await page.waitForTimeout(400);
  check(!(await page.evaluate(() => document.querySelector("[data-page-toc]").classList.contains("is-away"))), "bar returns on scroll up");
  await ctx.close();
  const j = await open(375, `${P("m00-logarithms")}#concept-logarithms-picture`);
  await j.page.waitForTimeout(1500);
  check(!(await j.page.evaluate(() => document.querySelector("[data-page-toc]").classList.contains("is-away"))), "bar stays after a jump to an anchor");
  await j.ctx.close();
}

// 10. Secondary buttons are still clearly buttons; the one primary button is the only filled one.
{
  const { ctx, page } = await open(1280, EQ);
  const o = await page.evaluate(() => {
    const pick = (sel) => [...document.querySelectorAll(sel)].map((b) => { const cs = getComputedStyle(b), r = b.getBoundingClientRect(); return { cls: b.className, border: cs.borderTopWidth, bc: cs.borderTopColor, bg: cs.backgroundColor, h: Math.round(r.height), txt: b.textContent.trim().slice(0, 30) }; });
    return { checks: pick("[data-check]"), steppers: pick("[data-stepper] button"), primaries: pick("main .button:not(.button-secondary)") };
  });
  check(o.checks.length >= 1 && o.checks.every((b) => /button-secondary/.test(b.cls) && !/(^| )button( |$)/.test(b.cls)), `all ${o.checks.length} Check buttons are secondary`);
  check(o.steppers.length >= 1 && o.steppers.every((b) => /button-secondary/.test(b.cls)), "Back and Next step are secondary");
  for (const b of [...o.checks, ...o.steppers]) if (b.border !== "1px" || b.bc !== "rgb(122, 31, 61)" || b.h < 44) { check(false, `secondary button "${b.txt}" needs a visible border and 44px (got ${b.border} ${b.bc} ${b.h}px)`); break; }
  check(o.primaries.length === 1 && /lesson-primary/.test(o.primaries[0].cls), `the only filled button is the primary one (got ${o.primaries.map((b) => b.txt)})`);
  const hov = await page.evaluate(() => { const b = document.querySelector("[data-check]"); b.scrollIntoView({ block: "center" }); return getComputedStyle(b).backgroundColor; });
  await page.locator("[data-check]").first().hover();
  await page.waitForTimeout(300);
  const hov2 = await page.evaluate(() => getComputedStyle(document.querySelector("[data-check]")).backgroundColor);
  check(hov !== hov2, `a secondary button shows a hover state (${hov} -> ${hov2})`);
  const t = await open(1100, EQ, { ctxOpts: { hasTouch: true } });
  const small = await t.page.evaluate(() => [...document.querySelectorAll("[data-check], [data-stepper] button, [data-continue]")].filter((b) => b.checkVisibility()).map((b) => b.getBoundingClientRect().height).filter((h) => h < 44).length);
  check(small === 0, `touch: Check, stepper and continue buttons are all at least 44px high (${small} smaller)`);
  await t.ctx.close();
  await ctx.close();
}

// 11. The primary button and where it goes: labels, same module, module boundary, course end, undo across pages.
const statusOf = (page, id) => page.evaluate((i) => document.querySelector(`#site-nav [data-status-of="${i}"]`).dataset.status, id);
const toastText = (page) => page.evaluate(() => { const t = document.querySelector(".toast"); return t.hidden ? null : t.querySelector(".toast-text").textContent; });
const focused = (page) => page.evaluate(() => { const a = document.activeElement; return { tag: a.tagName, inToast: !!a.closest(".toast") }; });
const labelOf = (page) => page.locator("[data-continue]").innerText();

// 11a. Same module: the next concept's page, with the undo toast, and no scripted focus.
for (const w of [375, 768, 1280]) {
  const { ctx, page } = await open(w, VAR);
  const before = await statusOf(page, "m00-variables");
  check(await labelOf(page) === "Mark complete and continue", `@${w}: label is "Mark complete and continue" (got ${await labelOf(page)})`);
  await page.locator("[data-continue]").scrollIntoViewIfNeeded();
  await page.locator("[data-continue]").click();
  await page.waitForURL(new RegExp(`${EQ}$`));
  await page.waitForSelector("#site-nav [data-status-of]", { state: "attached" });
  await page.waitForTimeout(500);
  check(await statusOf(page, "m00-variables") === "complete", `@${w}: continue sets Complete`);
  check(await page.locator("h1").innerText() === "Equations", `@${w}: continue opens the next concept page`);
  const f = await focused(page);
  check(f.tag === "BODY" && !f.inToast, `@${w}: focus is not scripted on arrival (got ${JSON.stringify(f)})`);
  check(/Variables and expressions.*marked complete/.test(await toastText(page) ?? ""), `@${w}: the toast on the next page says what happened (got ${await toastText(page)})`);
  check(await page.evaluate(() => [...document.querySelectorAll('[role="status"][aria-live="polite"]')].some((e) => e.classList.contains("sr-only") && e.textContent.includes("marked complete"))), `@${w}: the toast text is announced through a polite live region`);
  await page.locator(".toast-action").click();
  check(await statusOf(page, "m00-variables") === before, `@${w}: Undo from the toast restores ${before} (got ${await statusOf(page, "m00-variables")})`);
  check(/Undone/.test(await toastText(page) ?? ""), `@${w}: the toast confirms the undo`);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  check(await toastText(page) === null, `@${w}: the pending undo is used once (a reload shows no toast)`);
  await ctx.close();
}
// 11b. Already Complete: the label is plain "Continue" (no title) and it just goes on, with no toast.
{
  const init = `try { if (!localStorage.getItem("mlmath:progress:v1")) localStorage.setItem("mlmath:progress:v1", JSON.stringify({ v: 2, concepts: { "m00-variables": { status: "complete", statusAt: "2026-01-01T00:00:00.000Z" } }, last: null, open: {}, quiz: {} })); } catch (e) {}`;
  const { ctx, page } = await open(1280, VAR, { init });
  check(await labelOf(page) === "Continue", `Complete: the label is exactly "Continue" (got ${await labelOf(page)})`);
  await page.locator("[data-continue]").click();
  await page.waitForURL(new RegExp(`${EQ}$`));
  await page.waitForTimeout(400);
  check(await toastText(page) === null, "Continue on a Complete concept shows no undo toast");
  await ctx.close();
}
// 11c. Module boundary: the last concept of Module 0 goes to Module 1's overview, and the undo goes with it.
{
  const { ctx, page } = await open(1280, P("m00-notation"));
  const before = await statusOf(page, "m00-notation");
  await page.locator("[data-continue]").scrollIntoViewIfNeeded();
  await page.locator("[data-continue]").click();
  await page.waitForURL(new RegExp(`${M1}$`));
  await page.waitForSelector("#site-nav [data-status-of]", { state: "attached" });
  await page.waitForTimeout(700);
  check(await page.locator("h1").innerText() === "Linear algebra" && await page.locator("article.concept-card").count() === 0, "module boundary: lands on the next module's overview page");
  check(await statusOf(page, "m00-notation") === "complete", "module boundary: the concept is Complete");
  check(/Reading mathematical notation.*marked complete/.test(await toastText(page) ?? ""), `module boundary: the toast is shown on the overview (got ${await toastText(page)})`);
  await page.locator(".toast-action").click();
  check(await statusOf(page, "m00-notation") === before, `module boundary: Undo restores ${before}`);
  await ctx.close();
}
// 11d. Course end: Module 1's last concept says "Mark complete" and offers "Back to course home"; nothing says continue.
{
  const { ctx, page } = await open(1280, MATMUL);
  check(await labelOf(page) === "Mark complete", `course end: label is "Mark complete" (got ${await labelOf(page)})`);
  const home = page.locator(".lesson-home-link");
  check(await home.count() === 1 && /Back to course home/.test(await home.innerText()) && (await home.getAttribute("href")).endsWith("index.html"), "course end: a Back to course home link to the home page");
  await page.locator("[data-continue]").click();
  await page.waitForTimeout(400);
  check(await statusOf(page, "m01-matmul") === "complete" && page.url().endsWith(MATMUL), "course end: Mark complete marks it and stays on the page");
  check(await page.locator("[data-continue]").isHidden() && await home.isVisible(), "course end: once complete the button goes and the home link stays");
  check(!/continue/i.test(await page.locator(".lesson-actions").innerText()), "course end: nothing says continue");
  await ctx.close();
}
// 11e. Earlier concepts never say "Back to course home".
{
  const { ctx, page } = await open(1280, P("m01-matrices"));
  check(await page.locator(".lesson-home-link").count() === 0, "a concept with a next step has no Back to course home link");
  await ctx.close();
}
// 11f. The cross-page undo expires after about 60 s; a changed concept refuses it.
{
  const mk = (ageMs) => `if (!sessionStorage.getItem("seeded")) { sessionStorage.setItem("seeded", "1"); sessionStorage.setItem("mlmath:continue:v1", JSON.stringify({ id: "m00-notation", title: "Reading mathematical notation", previous: { status: "in-progress" }, expectedAt: "2026-01-01T00:00:00.000Z", at: Date.now() - ${ageMs} })); }`;
  const stale = await open(1280, VEC, { init: mk(61000) });
  await stale.page.waitForTimeout(500);
  check(await toastText(stale.page) === null, "an undo older than 60 s is ignored");
  await stale.ctx.close();
  const fresh = await open(1280, VEC, { init: mk(59000) });
  await fresh.page.waitForTimeout(500);
  check(/Reading mathematical notation/.test(await toastText(fresh.page) ?? ""), "an undo 59 s old is still offered");
  await fresh.page.locator(".toast-action").click();
  check(/Could not undo/.test(await toastText(fresh.page) ?? ""), `an undo whose concept has changed is refused (got ${await toastText(fresh.page)})`);
  await fresh.ctx.close();
}

// 12. The toast: at least 10 s, paused by hover and by focus, never takes focus (fake clock). Started by Mark complete on
// the last concept of the course, where the card's own Undo is the only undo; the toast itself comes from a seeded pending undo.
{
  const seed = `if (!sessionStorage.getItem("seeded")) { sessionStorage.setItem("seeded", "1"); sessionStorage.setItem("mlmath:continue:v1", JSON.stringify({ id: "m00-notation", title: "Reading mathematical notation", previous: { status: "in-progress" }, expectedAt: "2026-01-01T00:00:00.000Z", at: Date.now() })); }`;
  const run = async (fn) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await ctx.addInitScript(seed);
    const page = await ctx.newPage();
    await page.clock.install();
    await page.goto(base + VEC, { waitUntil: "networkidle" });
    await page.waitForSelector("#site-nav [data-status-of]", { state: "attached" });
    await page.clock.runFor(300);
    await fn(page);
    await ctx.close();
  };
  await run(async (page) => {
    check(await toastText(page) !== null, "toast: shown on arrival");
    await page.clock.runFor(9000);
    check(await toastText(page) !== null, "toast: still there after 9.3 s (never under 10 s)");
    await page.clock.runFor(4500);
    check(await toastText(page) === null, "toast: gone by 14 s (it stays about 12 s)");

  });
  await run(async (page) => {
    await page.locator(".toast").hover();
    await page.clock.runFor(30000);
    check(await toastText(page) !== null, "toast: hovering pauses the countdown (visible after 30 s)");
    await page.mouse.move(5, 400);
    await page.clock.runFor(5000);
    check(await toastText(page) !== null, "toast: leaving the toast resumes, with time left");
    await page.clock.runFor(8000);
    check(await toastText(page) === null, "toast: gone once the remaining time has run");
  });
  await run(async (page) => {
    await page.locator(".toast-dismiss").focus();
    await page.clock.runFor(30000);
    check(await toastText(page) !== null, "toast: keyboard focus on it pauses the countdown");
    await page.keyboard.press("Escape");
    check(await toastText(page) === null, "toast: Esc dismisses it when focused");
  });
  await run(async (page) => {
    check(!(await focused(page)).inToast, "toast: showing it does not move focus into it");
    await page.locator(".toast-dismiss").click();
    check(await toastText(page) === null, "toast: Dismiss closes it");
  });
}

// 13. In progress after about 2 s visible (never changes Complete or Revisit); the first-visit hint.
{
  const { ctx, page } = await open(1280, P("m00-functions"));
  check(await statusOf(page, "m00-functions") === "not-started", "a fresh page starts Not started");
  await page.waitForTimeout(2600);
  check(await statusOf(page, "m00-functions") === "in-progress", "after about 2 s visible, Not started becomes In progress");
  await ctx.close();
  for (const st of ["complete", "revisit"]) {
    const init = `try { if (!localStorage.getItem("mlmath:progress:v1")) localStorage.setItem("mlmath:progress:v1", JSON.stringify({ v: 2, concepts: { "m00-functions": { status: "${st}", statusAt: "2026-01-01T00:00:00.000Z" } }, last: null, open: {}, quiz: {} })); } catch (e) {}`;
    const k = await open(1280, P("m00-functions"), { init });
    await k.page.waitForTimeout(2600);
    check(await statusOf(k.page, "m00-functions") === st, `after 2 s, ${st} is left alone`);
    await k.ctx.close();
  }
  const quick = await open(1280, P("m00-slope"));
  await quick.page.waitForTimeout(800);
  check(await statusOf(quick.page, "m00-slope") === "not-started", "under 2 s: still Not started");
  await quick.ctx.close();
}
{
  const { ctx, page } = await open(1280, VAR);
  const hint = page.locator(".first-hint");
  check(await hint.count() === 1 && /dotted underline/.test(await hint.innerText()), "first visit: a one-line hint is shown");
  await hint.locator("button").click();
  check(await hint.count() === 0, "the hint can be dismissed");
  check(await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).hintDismissed, UIKEY) === true, "dismissal is remembered on mlmath:ui:v1");
  await page.goto(base + EQ, { waitUntil: "networkidle" });
  check(await page.locator(".first-hint").count() === 0, "the hint does not come back on another concept page");
  await ctx.close();
  const noStore = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await noStore.addInitScript(`Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } });`);
  const p2 = await noStore.newPage();
  const errs = [];
  p2.on("pageerror", (e) => errs.push(String(e)));
  await p2.goto(base + VAR, { waitUntil: "networkidle" });
  check(errs.length === 0 && await p2.locator("h1").count() === 1, `blocked storage: the page still works (${errs})`);
  await noStore.close();
}

await browser.close();
await close();
console.log(`lesson-nav e2e: ${checks} checks, ${failures} failed`);
process.exit(failures ? 1 : 0);
