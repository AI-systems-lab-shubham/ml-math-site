// E2E check: the one-thing-at-a-time page structure.
//  - an overview lists only its own module's BUILT concepts (no planned ones), with Start / Continue;
//  - choosing a module (left outline, right-panel switcher, home card) goes to its overview;
//  - choosing a concept (outline, switcher, overview list, home syllabus) goes straight to its concept page;
//  - Continue on an overview goes to the first concept that is not complete.
// Run: node tests/e2e/structure.mjs   (Playwright needed; prints SKIPPED and exits 1 otherwise)
import { readFileSync } from "node:fs";
import { requirePlaywright, serveStatic, siteRoot } from "../../tools/lib/playwright.mjs";

const pw = await requirePlaywright("structure e2e");
const { base, close } = await serveStatic();
const browser = await pw.chromium.launch();
const course = JSON.parse(readFileSync(`${siteRoot}/data/course.json`, "utf8"));
const built = course.modules.filter((m) => m.status === "built");
const planned = course.modules.flatMap((m) => m.concepts.filter((c) => c.status !== "built"));
const KEY = "mlmath:progress:v1";

let failures = 0, checks = 0;
const check = (ok, label) => { checks++; if (!ok) { failures++; console.error(`FAIL  ${label}`); } };
const seed = (concepts) => `try { if (!localStorage.getItem("${KEY}")) localStorage.setItem("${KEY}", JSON.stringify({ v: 2, concepts: ${JSON.stringify(Object.fromEntries(Object.entries(concepts).map(([id, status]) => [id, { status, statusAt: "2026-01-01T00:00:00.000Z" }])))}, last: null, open: {}, quiz: {} })); } catch (e) {}`;

async function open(width, url, { init } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 800 } });
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage();
  await page.goto(base + url, { waitUntil: "networkidle" });
  await page.waitForSelector("#site-nav [data-status-of]", { state: "attached" });
  return { ctx, page };
}
const path = (page) => new URL(page.url()).pathname.slice(1);
const showOutline = async (page, width) => { if (width < 900) await page.click("[data-nav-toggle]"); };
const openPanel = async (page, width) => { if (width < 1200 && (await page.locator(".page-toc-toggle").getAttribute("aria-expanded")) !== "true") await page.locator(".page-toc-toggle").click(); };

// 1. An overview holds only its own module: title, lede, time, outcomes, button, built concepts. No planned concept anywhere.
for (const m of built) {
  const { ctx, page } = await open(1280, m.path);
  const o = await page.evaluate(() => ({
    h1: [...document.querySelectorAll("main h1")].map((h) => h.textContent.trim()),
    list: [...document.querySelectorAll(".overview-list a")].map((a) => ({ title: a.querySelector(".ov-title").textContent, href: a.getAttribute("href") })),
    outcomes: [...document.querySelectorAll(".overview-outcomes li")].map((l) => l.textContent),
    meta: document.querySelector(".overview-meta")?.textContent ?? "",
    cards: document.querySelectorAll("article.concept-card").length, widgets: document.querySelectorAll("[data-widget]").length,
    main: document.querySelector("main").textContent,
    primary: [...document.querySelectorAll("main .button:not(.button-secondary)")].map((b) => b.textContent.trim()),
    tools: document.querySelectorAll("[data-page-tools], [data-page-toc]").length,
    title: document.title,
  }));
  const own = m.concepts.filter((c) => c.status === "built");
  check(o.h1.length === 1 && o.h1[0] === m.title, `${m.id} overview: one h1 with the module title (got ${o.h1})`);
  check(o.list.map((x) => x.title).join("|") === own.map((c) => c.title).join("|"), `${m.id} overview: lists exactly its built concepts in order (got ${o.list.map((x) => x.title)})`);
  check(o.list.every((x, i) => x.href === own[i].path.slice(m.path.length)), `${m.id} overview: each item links to its concept page`);
  check(o.outcomes.join("|") === m.outcomes.join("|"), `${m.id} overview: shows the module outcomes`);
  check(o.meta.includes(`${m.minutes} min`), `${m.id} overview: shows the estimated time (${o.meta})`);
  check(o.cards === 0 && o.widgets === 0 && o.tools === 0, `${m.id} overview: no concept content, widgets or page tools`);
  const foreign = course.modules.filter((x) => x.id !== m.id).flatMap((x) => x.concepts).filter((c) => o.main.includes(c.title) || (o.list.some((l) => l.title === c.title))).map((c) => c.title);
  check(foreign.length === 0, `${m.id} overview: no concept of another module or any planned concept is mentioned (got ${foreign})`);
  check(planned.every((c) => !o.main.includes(c.title)), `${m.id} overview: no planned concept title`);
  check(o.primary.length === 1 && /^(Start|Continue|Review from the start)$/.test(o.primary[0]), `${m.id} overview: exactly one filled button, Start (got ${o.primary})`);
  check(o.title === `Module ${course.modules.indexOf(m)}: ${m.title} - ML Math`, `${m.id} overview: unique title (got ${o.title})`);
  check(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${m.id} overview: no sideways scroll`);
  await ctx.close();
}
// Narrow screens too.
for (const m of built) for (const w of [375, 768]) {
  const { ctx, page } = await open(w, m.path);
  check(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${m.id} overview @${w}: no sideways scroll`);
  await ctx.close();
}

// 2. Start / Continue: Start with nothing begun; Continue goes to the first concept that is not complete; Review when all complete.
{
  const m = built[1];
  const own = m.concepts.filter((c) => c.status === "built");
  const a = await open(1280, m.path);
  check(await a.page.locator("[data-overview-action]").innerText() === "Start" && (await a.page.locator("[data-overview-action]").getAttribute("href")).endsWith(own[0].path), "nothing begun: the button says Start and goes to the first concept");
  await a.ctx.close();
  const b = await open(1280, m.path, { init: seed({ [own[0].id]: "complete", [own[1].id]: "complete", [own[2].id]: "in-progress" }) });
  const lab = await b.page.locator("[data-overview-action]").innerText();
  check(lab === "Continue", `some complete: the button says Continue (got ${lab})`);
  await b.page.locator("[data-overview-action]").click();
  await b.page.waitForURL((u) => u.pathname.endsWith(own[2].path));
  check(path(b.page) === own[2].path, "Continue goes to the first concept that is not complete");
  await b.ctx.close();
  const c = await open(1280, m.path, { init: seed({ [own[0].id]: "revisit", [own[1].id]: "complete" }) });
  await c.page.locator("[data-overview-action]").click();
  await c.page.waitForURL((u) => u.pathname.endsWith(own[0].path));
  check(path(c.page) === own[0].path, "a Revisit concept counts as not complete, so Continue goes to it");
  await c.ctx.close();
  const d = await open(1280, m.path, { init: seed(Object.fromEntries(own.map((x) => [x.id, "complete"]))) });
  check(await d.page.locator("[data-overview-action]").innerText() === "Review from the start", "all complete: the button says Review from the start");
  check(new RegExp(`${own.length} of ${own.length} concepts complete`).test(await d.page.locator("[data-module-progress]").innerText()), "the overview shows module progress");
  await d.ctx.close();
  // Status icons on the overview follow the saved progress, with a text alternative.
  const e = await open(1280, m.path, { init: seed({ [own[0].id]: "complete" }) });
  const icon = await e.page.locator(`[data-ov-state="${own[0].id}"]`).innerText();
  check(/Complete/.test(icon), `the overview list shows a status per concept with text (got "${icon}")`);
  await e.ctx.close();
}

// 3. Choosing a module goes to its overview: left outline, right-panel switcher, home card (and the syllabus on home).
for (const w of [375, 1280]) for (const m of built) {
  const from = built.find((x) => x !== m) ?? m;
  const target = m.path;
  {  // left outline (from a concept page of the other module)
    const { ctx, page } = await open(w, from.concepts.find((c) => c.status === "built").path);
    await showOutline(page, w);
    await page.locator(`#site-nav [data-module-link="${m.id}"]`).click();
    await page.waitForURL((u) => u.pathname === `/${target}`);
    check(await page.locator("article.concept-card").count() === 0 && await page.locator("h1").innerText() === m.title, `@${w}: outline module link goes to the ${m.id} overview`);
    await ctx.close();
  }
  {  // right panel switcher
    const { ctx, page } = await open(w, from.concepts.find((c) => c.status === "built").path);
    await openPanel(page, w);
    await page.locator(".module-switch-btn").click();
    await page.locator(".msw-link", { hasText: m.title }).click();
    await page.waitForURL((u) => u.pathname === `/${target}`);
    check(await page.locator("h1").innerText() === m.title && await page.locator("article.concept-card").count() === 0, `@${w}: switcher module link goes to the ${m.id} overview`);
    await ctx.close();
  }
  {  // home card
    const { ctx, page } = await open(w, "index.html");
    await page.locator(`a.module-card[href="${target}"]`).click();
    await page.waitForURL((u) => u.pathname === `/${target}`);
    check(await page.locator("h1").innerText() === m.title && await page.locator("article.concept-card").count() === 0, `@${w}: home module card goes to the ${m.id} overview`);
    await ctx.close();
  }
}
// The home page still shows every module, planned ones as Coming soon and not links.
{
  const { ctx, page } = await open(1280, "index.html");
  const o = await page.evaluate(() => ({ cards: document.querySelectorAll(".module-card").length, links: document.querySelectorAll("a.module-card").length, soon: [...document.querySelectorAll(".module-card.soon")].every((c) => /Coming soon/.test(c.textContent)) }));
  check(o.cards === course.modules.length && o.links === built.length && o.soon, `home: ${course.modules.length} module cards, ${built.length} links, the rest Coming soon (got ${o.cards}/${o.links})`);
  await ctx.close();
}

// 4. Choosing a concept goes straight to its page (not the overview, no hash).
for (const w of [375, 1280]) {
  const from = built[1], to = built[0].concepts.find((c) => c.status === "built" && c.id === "m00-logarithms");
  const own = from.concepts.find((c) => c.status === "built");
  {  // left outline, concept of another module
    const { ctx, page } = await open(w, own.path);
    await showOutline(page, w);
    await page.locator('#site-nav .outline-mod-toggle[aria-controls="ol-sub-m00"]').click();
    await page.locator(`#site-nav a[data-cid="${to.id}"]`).click();
    await page.waitForURL((u) => u.pathname === `/${to.path}`);
    check(await page.locator("h1").innerText() === to.title && new URL(page.url()).hash === "", `@${w}: outline concept link goes straight to the concept page`);
    await ctx.close();
  }
  {  // switcher
    const { ctx, page } = await open(w, own.path);
    await openPanel(page, w);
    await page.locator(".module-switch-btn").click();
    await page.locator('.msw-toggle[aria-controls="msw-m00"]').click();
    await page.locator(`a[data-switch-cid="${to.id}"]`).click();
    await page.waitForURL((u) => u.pathname === `/${to.path}`);
    check(await page.locator("h1").innerText() === to.title && new URL(page.url()).hash === "", `@${w}: switcher concept link goes straight to the concept page`);
    await ctx.close();
  }
  {  // overview list
    const { ctx, page } = await open(w, built[0].path);
    await page.locator(`.overview-list a[data-cid="${to.id}"]`).click();
    await page.waitForURL((u) => u.pathname === `/${to.path}`);
    check(await page.locator("h1").innerText() === to.title, `@${w}: overview list goes straight to the concept page`);
    await ctx.close();
  }
}
{  // home syllabus and Resume link
  const { ctx, page } = await open(1280, "index.html");
  const hrefs = await page.evaluate(() => [...document.querySelectorAll("#syllabus a[href*='modules/']")].map((a) => new URL(a.href).pathname.slice(1)));
  const conceptPaths = built.flatMap((m) => m.concepts.filter((c) => c.status === "built").map((c) => c.path));
  check(conceptPaths.every((p) => hrefs.includes(p)) && hrefs.every((h) => !h.includes("#")), `home syllabus links go to concept pages with no hash (${hrefs.length} links)`);
  await ctx.close();
  const r = await open(1280, "index.html", { init: seed({ "m00-variables": "complete", "m00-equations": "in-progress" }) });
  const a = r.page.locator("[data-hero-action] a");
  check(/Equations/.test(await a.innerText()) && (await a.getAttribute("href")).endsWith("modules/00-foundations/equations/"), "home Resume goes to the concept page");
  await r.ctx.close();
}

await browser.close();
await close();
console.log(`structure e2e: ${checks} checks, ${failures} failed`);
process.exit(failures ? 1 : 0);
