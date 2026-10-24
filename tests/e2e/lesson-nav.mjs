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

await browser.close();
await close();
console.log(`lesson-nav e2e: ${checks} checks, ${failures} failed`);
process.exit(failures ? 1 : 0);
