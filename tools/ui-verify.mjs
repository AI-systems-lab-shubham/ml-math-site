// UI verification for every built page: layout, keyboard, console, structure, glossary and motion checks.
// Usage: node tools/ui-verify.mjs [--pages home,m00,m01,404] [--widths 375,900] [--checks hscroll,overlap,...] [--no-shots]
// Env:   BASE_URL   run against a live site (default: serve this repo locally)
//        SITE_DIR   serve another copy of the site (used by the mutation test)
//        REPORT_DIR where report.md, results.json and screenshots go (default: reports/)
//        AXE_PATH   path to axe.min.js; if unset or missing a loud notice is printed and the axe check is NOT RUN
// Exit 0 only if no check failed. Playwright missing exits 1 with a SKIPPED message.
import fs from "node:fs";
import path from "node:path";
import { requirePlaywright, serveStatic, siteRoot } from "./lib/playwright.mjs";

const arg = (name) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : null);
const WIDTHS = (arg("--widths") ?? "375,768,900,1100,1280").split(",").map(Number);
const ONLY_PAGES = arg("--pages")?.split(",") ?? null;
const ONLY_CHECKS = arg("--checks")?.split(",") ?? null;
const SHOTS = !process.argv.includes("--no-shots");
const REPORT_DIR = path.resolve(process.env.REPORT_DIR ?? path.join(siteRoot, "reports"));
const AXE_PATH = process.env.AXE_PATH ?? "";
const AXE_WIDTHS = [375, 768, 900, 1280]; // axe runs at these widths (those that are also in --widths)
const CLS_BUDGET = 0.1;
const MIN_TARGET = 44;
const MIN_TEXT = 14;
const STAGES = ["meaning", "picture", "real-life", "worked-example", "why-when", "how-to-arrive", "in-an-llm"];
const want = (c) => !ONLY_CHECKS || ONLY_CHECKS.includes(c);

const pw = await requirePlaywright("ui-verify");
const server = process.env.BASE_URL ? null : await serveStatic(process.env.SITE_DIR ? path.resolve(process.env.SITE_DIR) : siteRoot);
const base = (process.env.BASE_URL || server.base).replace(/\/?$/, "/");
fs.mkdirSync(path.join(REPORT_DIR, "shots"), { recursive: true });

const getJson = async (p) => { const r = await fetch(new URL(p, base)); if (!r.ok) throw new Error(`${p}: HTTP ${r.status}`); return r.json(); };
const course = await getJson("data/course.json");
const glossary = await getJson("data/glossary.json");
const termIds = new Set(glossary.entries.map((e) => e.id));
const symIds = new Set(Object.keys(glossary.symbols ?? {}));

// Pages with lazy widgets (assets/js/widgets.mjs) keep placeholders until needed; mount them all before checking.
async function mountWidgets(page) {
  const lazy = await page.evaluate(() => document.querySelectorAll("[data-widget]").length);
  if (!lazy) return;
  await page.evaluate(async () => { (await import(new URL("assets/js/widgets.mjs", document.querySelector('meta[name="site-root"]')?.content ? new URL(document.querySelector('meta[name="site-root"]').content, document.baseURI) : location.href))).mountAllLazy(); });
  await page.waitForFunction(() => [...document.querySelectorAll("[data-widget]")].every((h) => h.dataset.lazy === "mounted"), null, { timeout: 5000 });
  await page.waitForTimeout(200);
}

const pages = [{ key: "home", label: "Home", url: "", expectModule: null }];
for (const m of course.modules.filter((x) => x.status === "built")) pages.push({ key: m.id, label: `${m.id} ${m.title}`, url: m.path, expectModule: m });
const has404 = process.env.BASE_URL ? true : fs.existsSync(path.join(process.env.SITE_DIR ?? siteRoot, "404.html"));
if (has404) pages.push({ key: "404", label: "404", url: "404.html", expectModule: null, expect404: true });
const selected = pages.filter((p) => !ONLY_PAGES || ONLY_PAGES.includes(p.key));

// ---------- findings ----------
const findings = []; // { check, page, width, evidence }
const ran = new Set();
const add = (check, page, width, evidence, selector = null) =>
  findings.push({ check, page: page.key, width, evidence, selector: selector ?? (check === "layout-shift" ? "page load" : evidence.match(/^(?:[a-z][\w#-]*\s)?[a-z][\w.#-]*/i)?.[0]) ?? "-" });

// ---------- in-page probes (serialised into the browser) ----------
const probes = {
  interactiveSel: 'a[href], button, input:not([type="hidden"]), select, textarea, summary, [tabindex]:not([tabindex="-1"]), [role="button"]',

  hscroll() {
    const de = document.documentElement;
    const out = [];
    if (de.scrollWidth > de.clientWidth + 1) out.push(`document is ${de.scrollWidth}px wide in a ${de.clientWidth}px viewport`);
    const vw = de.clientWidth;
    const wide = [...document.querySelectorAll("body *")].filter((el) => {
      if (!el.checkVisibility?.()) return false;
      if (el.closest(".math-display, .table-scroll, .pop-math, .katex-display, pre, svg *, [data-scroll]")) return false;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return false;
      for (let p = el.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === "auto" || o === "scroll") return false; }
      return r.right > vw + 1 || r.left < -1;
    });
    const tops = wide.filter((el) => !wide.includes(el.parentElement)).slice(0, 4);
    for (const el of tops) { const r = el.getBoundingClientRect(); out.push(`${probes.describe(el)} spans ${Math.round(r.left)}..${Math.round(r.right)} (viewport ${vw})`); }
    return out;
  },

  describe(el) {
    const id = el.id ? `#${el.id}` : "";
    const raw = el.getAttribute?.("class") ?? "";
    const cls = raw.trim() ? "." + raw.trim().split(/\s+/).slice(0, 2).join(".") : "";
    // Classless elements get their nearest landmark as a prefix, so "a" becomes "nav#site-nav a".
    const home = !id && !cls ? el.parentElement?.closest("nav, header, footer, aside, main, [id]") : null;
    const prefix = home ? `${home.tagName.toLowerCase()}${home.id ? `#${home.id}` : ""} ` : "";
    const txt = (el.getAttribute?.("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 28);
    return `${prefix}${el.tagName.toLowerCase()}${id}${cls}${txt ? ` “${txt}”` : ""}`;
  },

  overlap(sel) {
    const sx = scrollX, sy = scrollY;
    const fixedish = (el) => { for (let p = el; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p).position; if (s === "fixed" || s === "sticky") return true; if (p.matches(".glossary-popover")) return true; } return false; };
    const items = [...document.querySelectorAll(sel)].filter((el) => {
      if (!el.checkVisibility?.({ checkVisibilityCSS: true })) return false;
      if (fixedish(el) || el.closest(".sr-only, .skip-link") || el.matches(".skip-link, .sr-only")) return false;
      const r = el.getBoundingClientRect();
      return r.width >= 4 && r.height >= 4 && r.bottom + sy > 0 && r.right + sx > 0;
    }).map((el) => ({ el, boxes: [...el.getClientRects()].map((r) => ({ l: r.left + sx, r: r.right + sx, t: r.top + sy, b: r.bottom + sy })) }));
    const out = [];
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
      const a = items[i], b = items[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      // Line boxes, not the bounding box: a link that wraps onto two lines must not "overlap" its neighbour.
      for (const x of a.boxes) for (const y of b.boxes) {
        const w = Math.min(x.r, y.r) - Math.max(x.l, y.l), h = Math.min(x.b, y.b) - Math.max(x.t, y.t);
        if (w > 2 && h > 2) { out.push(`${probes.describe(a.el)} overlaps ${probes.describe(b.el)} by ${Math.round(w)}x${Math.round(h)}px`); break; }
      }
    }
    return out.slice(0, 8);
  },

  clipped() {
    const out = [];
    for (const el of document.querySelectorAll("body *")) {
      if (!el.checkVisibility?.() || el.closest("svg, .sr-only, .katex") || el.matches(".sr-only")) continue;
      const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!hasText) continue;
      const cs = getComputedStyle(el);
      const clips = (v) => v === "hidden" || v === "clip";
      const xClip = clips(cs.overflowX), yClip = clips(cs.overflowY);
      if (xClip && el.scrollWidth > el.clientWidth + 1) out.push(`${probes.describe(el)} cuts text horizontally (${el.scrollWidth} > ${el.clientWidth})`);
      else if (yClip && el.scrollHeight > el.clientHeight + 1) out.push(`${probes.describe(el)} cuts text vertically (${el.scrollHeight} > ${el.clientHeight})`);
    }
    return out.slice(0, 8);
  },

  targets(sel, min) {
    const out = [];
    // Documented exception (DESIGN.md section 8): outline rows may be 40px for a fine pointer on a screen 900px or wider.
    const finePointer = matchMedia("(min-width: 900px) and (hover: hover) and (pointer: fine)").matches;
    for (const el of document.querySelectorAll(sel)) {
      if (!el.checkVisibility?.({ checkVisibilityCSS: true }) || el.matches(".sr-only, .skip-link") || el.closest(".sr-only, .katex")) continue;
      let box = el;
      if (el.matches('input[type="checkbox"], input[type="radio"]')) box = el.closest("label") ?? el;
      const cs = getComputedStyle(el);
      // Inline links and terms inside running text are exempt, as in WCAG 2.5.8.
      if ((cs.display === "inline" || cs.display === "inline-block") && el.parentElement && [...el.parentElement.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
      const r = box.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const need = finePointer && el.closest("#site-nav ul.sub") ? 40 : min;
      if (r.width < need - 0.5 || r.height < need - 0.5) out.push(`${probes.describe(el)} is ${Math.round(r.width)}x${Math.round(r.height)}px`);
    }
    return out.slice(0, 12);
  },

  smallText(min) {
    const groups = new Map();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent.trim()) continue;
      const el = n.parentElement;
      if (!el || !el.checkVisibility?.() || el.closest(".sr-only, .katex, script, style, noscript")) continue;
      let size = parseFloat(getComputedStyle(el).fontSize);
      const svg = el.closest("svg");
      if (svg && el.getScreenCTM) size *= Math.abs(el.getScreenCTM().a);
      if (size < min - 0.05) {
        const key = `${probes.describe(el).replace(/ “.*”$/, "")} at ${size.toFixed(1)}px`;
        groups.set(key, (groups.get(key) ?? 0) + 1);
      }
    }
    return [...groups].slice(0, 10).map(([k, c]) => `${k} (${c} text run${c > 1 ? "s" : ""})`);
  },

  meta() {
    const out = [];
    const d = document.querySelector('meta[name="description"]')?.content?.trim() ?? "";
    if (!document.title.trim()) out.push("page has no <title>");
    if (d.length < 40 || d.length > 200) out.push(`meta description is ${d.length} characters (want 40 to 200)`);
    if (document.documentElement.lang !== "en") out.push(`<html lang> is "${document.documentElement.lang}", expected "en"`);
    const icon = document.querySelector('link[rel="icon"]')?.getAttribute("href") ?? "";
    if (!icon || icon.startsWith("data:,")) out.push("no favicon link");
    const mains = document.querySelectorAll("main").length;
    if (mains !== 1) out.push(`${mains} <main> landmarks (want exactly 1)`);
    const bare = [...document.querySelectorAll("a[href]")].filter((a) => !(a.textContent.trim() || a.getAttribute("aria-label") || a.querySelector("[aria-label]"))).length;
    if (bare) out.push(`${bare} link(s) without visible text or a label`);
    return out;
  },

  structure(expectedIds, stages) {
    const out = [];
    const cards = [...document.querySelectorAll("article.concept-card")];
    for (const id of expectedIds) if (!cards.some((c) => c.id === id)) out.push(`missing concept card #${id}`);
    for (const c of cards) {
      const got = [...c.querySelectorAll(":scope > section[data-stage]")].map((s) => s.dataset.stage);
      if (got.join() !== stages.join()) out.push(`#${c.id}: stages are [${got.join(", ")}], expected the seven in order`);
      for (const s of c.querySelectorAll(":scope > section[data-stage]")) if (s.textContent.trim().length < 40) out.push(`#${c.id}: stage ${s.dataset.stage} is empty or almost empty`);
      if (!c.querySelector('[data-stage="real-life"] .spot-it')) out.push(`#${c.id}: no Spot it exercise in Real life`);
      if (!c.querySelector('[data-stage="how-to-arrive"] .badge')) out.push(`#${c.id}: How to arrive has no Derived/Motivated/Convention/Design tag`);
      if (c.dataset.size === "full" && !c.querySelector("details.teach-it")) out.push(`#${c.id}: full card without a Teach it panel`);
      if (!c.querySelector("footer")) out.push(`#${c.id}: no further-reading footer`);
    }
    return out.slice(0, 12);
  },

  // Every landmark on the page (all cards, not just the first) must have a name no other landmark of its kind shares.
  landmarks() {
    const roleOf = (el) => {
      const r = el.getAttribute("role");
      if (r) return r === "region" && !(el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) ? null : r;
      const t = el.tagName.toLowerCase();
      if (t === "nav") return "navigation";
      if (t === "aside") return "complementary";
      if (t === "main") return "main";
      if (t === "section") return el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") ? "region" : null;
      if ((t === "header" || t === "footer") && el.parentElement === document.body) return t === "header" ? "banner" : "contentinfo";
      return null;
    };
    const nameOf = (el) => {
      const ids = el.getAttribute("aria-labelledby");
      if (ids) return ids.split(/\s+/).map((i) => document.getElementById(i)?.textContent.trim() ?? "").join(" ");
      return el.getAttribute("aria-label") ?? "";
    };
    const seen = new Map();
    for (const el of document.querySelectorAll("nav, aside, main, section, header, footer, [role]")) {
      if (!el.checkVisibility?.({ checkVisibilityCSS: true }) && !el.matches("main")) continue;
      const role = roleOf(el);
      if (!role || ["button", "dialog", "status", "img", "region"].includes(role) && el.matches("[role=button], [role=dialog], [role=status], [role=img], .math-display")) continue;
      const key = `${role}|${nameOf(el)}`;
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    return [...seen].filter(([, n]) => n > 1).map(([k, n]) => `${n} ${k.split("|")[0]} landmarks share the name "${k.split("|")[1]}"`);
  },

  glossaryRefs() {
    return {
      terms: [...document.querySelectorAll("[data-term]")].map((e) => e.dataset.term),
      syms: [...document.querySelectorAll("[data-sym]")].map((e) => e.dataset.sym),
    };
  },

  motion() {
    const running = document.getAnimations().filter((a) => a.playState === "running" && (a.effect?.getComputedTiming().duration ?? 0) > 1);
    const infinite = running.filter((a) => a.effect.getComputedTiming().iterations === Infinity);
    const transitions = [...document.querySelectorAll("body *")].filter((el) => el.checkVisibility?.() && [...getComputedStyle(el).transitionDuration.split(",")].some((d) => parseFloat(d) * (d.includes("ms") ? 0.001 : 1) > 0.02));
    return { running: running.map((a) => a.animationName ?? a.transitionProperty ?? "animation"), infinite: infinite.length, transitions: transitions.slice(0, 4).map(probes.describe) };
  },
};
const call = (page, name, ...args) => page.evaluate(`(${probes[name].toString()}).apply(null, ${JSON.stringify(args)})`);
// Probes that call other probes need them in scope: inject the table once per page.
const injectProbes = (page) => page.evaluate(`window.__probes = {${Object.entries(probes).map(([k, f]) => (typeof f === "function" ? `${k}: ${f.toString().replace(/^(\w+)\(/, "function(").replace(/probes\./g, "window.__probes.")}` : `${k}: ${JSON.stringify(f)}`)).join(",")}};`);
const run = (page, name, ...args) => page.evaluate(({ name: n, args: a }) => window.__probes[n](...a), { name, args });

// ---------- keyboard ----------
async function tabWalk(page, pg, width) {
  const expected = await page.evaluate((sel) => {
    const seenRadio = new Set();
    return [...document.querySelectorAll(sel)].filter((el) => {
      if (!el.checkVisibility?.({ checkVisibilityCSS: true }) || el.disabled || el.tabIndex < 0 || el.closest("[inert]")) return false;
      if (el.matches(".skip-link")) return true;
      if (el.type === "radio") { const k = el.name || el.id; if (seenRadio.has(k)) return false; seenRadio.add(k); }
      return true;
    }).length;
  }, probes.interactiveSel);
  await page.evaluate(() => { document.activeElement?.blur?.(); scrollTo(0, 0); });
  const seen = new Set();
  const issues = [];
  let first = null, cycled = false;
  const cap = Math.min(expected + 25, 700);
  for (let i = 0; i < cap; i++) {
    await page.keyboard.press("Tab");
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body || el === document.documentElement) return { body: true };
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const cx = Math.min(Math.max(r.left + r.width / 2, 0), innerWidth - 1), cy = Math.min(Math.max(r.top + r.height / 2, 0), innerHeight - 1);
      const top = document.elementFromPoint(cx, cy);
      const ring = (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) || (cs.boxShadow && cs.boxShadow !== "none");
      return {
        key: `${el.tagName}|${el.id}|${el.className}|${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 20)}|${Math.round(r.left)},${Math.round(r.top + scrollY)}`,
        name: (el.id ? `#${el.id}` : el.tagName.toLowerCase() + (typeof el.className === "string" && el.className ? "." + el.className.split(/\s+/)[0] : "")) + ` “${(el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 24)}”`,
        ring, onScreen: r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth,
        covered: !!top && top !== el && !el.contains(top) && !top.contains(el) && !(el.closest(".katex") && top.closest(".katex")),
        coveredBy: top ? top.tagName.toLowerCase() + (top.id ? `#${top.id}` : "") : "",
        size: r.width * r.height,
      };
    });
    if (info.body) { if (seen.size) { cycled = true; break; } continue; }
    if (first === null) first = info.key;
    else if (info.key === first) { cycled = true; break; }
    if (seen.has(info.key)) continue;
    seen.add(info.key);
    if (!info.ring) issues.push(["focus-ring", `${info.name} shows no focus indicator`]);
    if (!info.onScreen) issues.push(["focus-ring", `${info.name} took focus but is off screen`]);
    else if (info.covered) issues.push(["focus-ring", `${info.name} is covered by ${info.coveredBy} when focused`]);
  }
  if (!cycled) issues.push(["keyboard-trap", `Tab did not leave or wrap within ${cap} presses (${seen.size} stops seen): possible trap`]);
  if (seen.size < expected * 0.9) issues.push(["tab-reach", `Tab visited ${seen.size} of about ${expected} interactive elements`]);
  for (const [check, msg] of [...new Map(issues.map((i) => [i.join("|"), i])).values()].slice(0, 12)) if (want(check)) add(check, pg, width, msg);
  if (want("focus-ring")) ran.add("focus-ring");
  if (want("keyboard-trap")) ran.add("keyboard-trap");
  if (want("tab-reach")) ran.add("tab-reach");
}

async function escapeChecks(page, pg, width) {
  // Popover: open a term from the keyboard, then Esc must close it and return focus.
  const trigger = page.locator("[data-term][data-ready], .sym-term[data-ready]").first();
  if (await trigger.count()) {
    await trigger.scrollIntoViewIfNeeded().catch(() => {});
    await trigger.focus();
    let open = await page.locator(".glossary-popover:not([hidden])").count();
    if (!open) { await page.keyboard.press("Enter"); open = await page.locator(".glossary-popover:not([hidden])").count(); }
    if (!open) add("esc-popover", pg, width, "a glossary term could not be opened from the keyboard (Enter)");
    else {
      await page.keyboard.press("Escape");
      const stillOpen = await page.locator(".glossary-popover:not([hidden])").count();
      const back = await trigger.evaluate((el) => document.activeElement === el);
      if (stillOpen) add("esc-popover", pg, width, "Esc did not close the glossary popover");
      else if (!back) add("esc-popover", pg, width, "focus did not return to the term after Esc");
    }
    ran.add("esc-popover");
  }
  // Drawer: below 900px the Menu button opens it and Esc closes it.
  if (width < 900) {
    const menu = page.locator("#site-header [data-nav-toggle]");
    if (await menu.count()) {
      await menu.focus();
      await page.keyboard.press("Enter");
      if (!(await page.locator("#site-nav").isVisible())) add("esc-popover", pg, width, "Menu did not open the drawer from the keyboard");
      else {
        await page.keyboard.press("Escape");
        if (await page.locator("#site-nav").isVisible()) add("esc-popover", pg, width, "Esc did not close the drawer");
        else if (!(await menu.evaluate((el) => document.activeElement === el))) add("esc-popover", pg, width, "focus did not return to Menu after Esc");
      }
      ran.add("esc-popover");
    }
  }
}

// ---------- main loop ----------
const browser = await pw.chromium.launch();
const axeSource = AXE_PATH && fs.existsSync(AXE_PATH) ? fs.readFileSync(AXE_PATH, "utf8") : null;
if (want("axe") && !axeSource) {
  console.error("\n########################################################");
  console.error("# NOTICE: axe-core NOT RUN.");
  console.error(AXE_PATH ? `# AXE_PATH is set to ${AXE_PATH} but the file does not exist.` : "# AXE_PATH is not set.");
  console.error("# Accessibility rules beyond the built-in checks were not applied.");
  console.error("########################################################\n");
}

for (const pg of selected) {
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: 800 } });
    await ctx.addInitScript(() => {
      window.__cls = 0;
      try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true }); } catch { /* unsupported */ }
    });
    const page = await ctx.newPage();
    const consoleErrors = [];
    page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(`console error: ${m.text().slice(0, 140)}`); });
    page.on("pageerror", (e) => consoleErrors.push(`uncaught: ${String(e.message).slice(0, 140)}`));
    page.on("requestfailed", (r) => consoleErrors.push(`request failed: ${r.url().replace(base, "")} (${r.failure()?.errorText})`));
    page.on("response", (r) => { if (r.status() >= 400 && !(pg.expect404 && r.url() === new URL(pg.url, base).href)) consoleErrors.push(`HTTP ${r.status()}: ${r.url().replace(base, "")}`); });

    await page.goto(new URL(pg.url, base).href, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    // Layout shift is read for the page as loaded; then every lazy widget is mounted so the checks below see the real widgets.
    const loadCls = await page.evaluate(() => window.__cls);
    await mountWidgets(page);
    await injectProbes(page);

    if (want("console")) { for (const e of [...new Set(consoleErrors)].slice(0, 6)) add("console", pg, width, e); ran.add("console"); }
    if (want("hscroll")) { for (const e of await run(page, "hscroll")) add("hscroll", pg, width, e); ran.add("hscroll"); }
    if (want("overlap")) { for (const e of await run(page, "overlap", probes.interactiveSel)) add("overlap", pg, width, e); ran.add("overlap"); }
    if (want("clipped")) { for (const e of await run(page, "clipped")) add("clipped", pg, width, e); ran.add("clipped"); }
    if (want("tap-target")) { for (const e of await run(page, "targets", probes.interactiveSel, MIN_TARGET)) add("tap-target", pg, width, e); ran.add("tap-target"); }
    if (want("small-text")) { for (const e of await run(page, "smallText", MIN_TEXT)) add("small-text", pg, width, e); ran.add("small-text"); }
    if (want("landmark-unique") && width === WIDTHS[WIDTHS.length - 1]) { for (const e of await run(page, "landmarks")) add("landmark-unique", pg, "all", e, e.replace(/\d+ /, "")); ran.add("landmark-unique"); }
    if (want("rail-content") && width >= 900 && (await page.locator("#site-nav").isVisible())) {
      const w = await page.evaluate(() => document.querySelector("main").getBoundingClientRect().width);
      if (w < 640 - 0.5) add("rail-content", pg, width, `content column is ${Math.round(w)}px with the rail shown (minimum 640px)`, "main");
      ran.add("rail-content");
    }
    if (want("layout-shift")) {
      const cls = loadCls;
      if (cls > CLS_BUDGET) add("layout-shift", pg, width, `cumulative layout shift ${cls.toFixed(3)} (budget ${CLS_BUDGET})`);
      ran.add("layout-shift");
    }
    if (want("meta") && width === WIDTHS[WIDTHS.length - 1]) { for (const e of await run(page, "meta")) add("meta", pg, "all", e); ran.add("meta"); }
    if (want("structure") && pg.expectModule && width === WIDTHS[WIDTHS.length - 1]) {
      const ids = pg.expectModule.concepts.filter((c) => c.status === "built").map((c) => c.anchor);
      for (const e of await run(page, "structure", ids, STAGES)) add("structure", pg, "all", e);
      ran.add("structure");
    }
    if (want("glossary-ids") && width === WIDTHS[WIDTHS.length - 1]) {
      const refs = await run(page, "glossaryRefs");
      for (const t of new Set(refs.terms)) if (!termIds.has(t)) add("glossary-ids", pg, "all", `data-term="${t}" is not in data/glossary.json`);
      for (const t of new Set(refs.syms)) if (!symIds.has(t)) add("glossary-ids", pg, "all", `data-sym="${t}" is not in data/glossary.json symbols`);
      ran.add("glossary-ids");
    }
    if (want("motion") && width === WIDTHS[WIDTHS.length - 1]) {
      const m = await run(page, "motion");
      if (m.running.length) add("motion", pg, "all", `autoplay: ${m.running.length} animation(s) running on load (${[...new Set(m.running)].join(", ")})`);
      ran.add("motion");
    }
    if (axeSource && want("axe") && AXE_WIDTHS.includes(width)) {
      await page.evaluate(axeSource);
      const res = await page.evaluate(() => axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"] }));
      for (const v of res.violations) for (const n of v.nodes) add("axe", pg, width, `${v.id} (${v.impact}): ${v.help}`, n.target.join(" "));
      ran.add("axe");
    }
    if (want("focus-ring") || want("keyboard-trap") || want("tab-reach")) await tabWalk(page, pg, width);
    if (want("esc-popover")) { await page.goto(new URL(pg.url, base).href, { waitUntil: "networkidle" }); await page.waitForTimeout(400); await escapeChecks(page, pg, width); }
    if (SHOTS) await page.screenshot({ path: path.join(REPORT_DIR, "shots", `${pg.key}-${width}.png`), fullPage: true });
    await ctx.close();
  }

  // Touch pass at the widths where the rail shows: with a coarse pointer every outline row must be 44px.
  if (want("tap-target")) {
    for (const width of WIDTHS.filter((w) => w >= 900)) {
      const ctx = await browser.newContext({ viewport: { width, height: 800 }, hasTouch: true });
      const page = await ctx.newPage();
      await page.goto(new URL(pg.url, base).href, { waitUntil: "networkidle" });
      await page.waitForTimeout(400);
      await mountWidgets(page);
      await injectProbes(page);
      const coarse = await page.evaluate(() => matchMedia("(pointer: coarse)").matches);
      if (!coarse) add("tap-target", pg, width, "touch pass: the browser did not report a coarse pointer, so the 44px rail rule was not tested", "touch pass");
      for (const e of await run(page, "targets", probes.interactiveSel, MIN_TARGET)) add("tap-target", pg, width, `touch: ${e}`);
      await ctx.close();
    }
  }

  // Reduced motion: no running animation and no transition longer than a blink.
  if (want("reduced-motion")) {
    const width = WIDTHS[WIDTHS.length - 1];
    const ctx = await browser.newContext({ viewport: { width, height: 800 }, reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto(new URL(pg.url, base).href, { waitUntil: "networkidle" });
    await mountWidgets(page);
    await injectProbes(page);
    const m = await run(page, "motion");
    if (m.running.length) add("reduced-motion", pg, width, `${m.running.length} animation(s) still running with reduced motion`);
    if (m.transitions.length) add("reduced-motion", pg, width, `transitions longer than 20ms remain, e.g. ${m.transitions.join("; ")}`);
    ran.add("reduced-motion");
    await ctx.close();
  }
}
await browser.close();
if (server) await server.close();

// ---------- report ----------
const checks = [...ran].sort();
if (want("axe") && !axeSource) checks.push("axe");
const lines = [`# UI verification report`, ``, `Base: ${process.env.BASE_URL ? process.env.BASE_URL : "local copy of the repo"}`, `Pages: ${selected.map((p) => p.key).join(", ")}; widths: ${WIDTHS.join(", ")}px`, `Budgets: tap target ${MIN_TARGET}px, text ${MIN_TEXT}px, layout shift ${CLS_BUDGET}`, ``, `## Summary`, ``, `| Check | Result | Findings |`, `|---|---|---|`];
for (const c of checks) {
  const n = findings.filter((f) => f.check === c).length;
  lines.push(`| ${c} | ${c === "axe" && !axeSource ? "NOT RUN (see notice)" : n ? "FAIL" : "pass"} | ${n} |`);
}
lines.push("");
for (const c of checks) {
  const fs_ = findings.filter((f) => f.check === c);
  if (!fs_.length) continue;
  lines.push(`## ${c}`, "");
  const byEvidence = new Map();
  for (const f of fs_) { const k = `${f.page}|${f.evidence.replace(/\d+(\.\d+)?/g, "#")}`; (byEvidence.get(k) ?? byEvidence.set(k, []).get(k)).push(f); }
  for (const group of [...byEvidence.values()].slice(0, 25)) {
    const w = [...new Set(group.map((g) => g.width))].join(", ");
    lines.push(`- **${group[0].page}** @ ${w}px: ${group[0].evidence}${group.length > 1 ? ` (and ${group.length - 1} similar)` : ""}`);
  }
  lines.push("");
}
lines.push(`## Grouped by selector (count = findings across pages and widths)`, ``);
for (const c of checks) {
  const fs_ = findings.filter((f) => f.check === c);
  if (!fs_.length) continue;
  const g = new Map();
  for (const f of fs_) { const k = c === "axe" ? `${f.selector} [${f.evidence.split(":")[0]}]` : f.selector; const e = g.get(k) ?? { n: 0, pages: new Set(), widths: new Set() }; e.n++; e.pages.add(f.page); e.widths.add(f.width); g.set(k, e); }
  if (c === "axe") {
    const rules = new Map();
    for (const f of fs_) { const k = f.evidence; const e = rules.get(k) ?? { n: 0, sel: new Set() }; e.n++; e.sel.add(f.selector); rules.set(k, e); }
    lines.push(`### axe rules`, ``, `| Rule | Nodes | Distinct selectors |`, `|---|---|---|`);
    for (const [k, e] of [...rules].sort((a, b) => b[1].n - a[1].n)) lines.push(`| ${k.replace(/\|/g, "\\|")} | ${e.n} | ${e.sel.size} |`);
    lines.push("");
  }
  lines.push(`### ${c}`, ``, `| Selector | Count | Pages | Widths |`, `|---|---|---|---|`);
  for (const [k, e] of [...g].sort((a, b) => b[1].n - a[1].n)) lines.push(`| \`${k.replace(/\|/g, "\\|")}\` | ${e.n} | ${[...e.pages].join(", ")} | ${[...e.widths].join(", ")} |`);
  lines.push("");
}
lines.push(`## Allow-lists (not counted as findings)`, ``, `- overlap: fixed or sticky elements (header, open drawer), the glossary popover, the skip link, screen-reader-only text; ancestors and descendants; line boxes are compared so wrapped inline text is not "overlap".`, `- tap-target: inline links and terms inside a sentence (WCAG 2.5.8), symbols inside KaTeX, screen-reader-only text.`, `- small-text: KaTeX output (its sub- and superscripts are sized by KaTeX); SVG text is measured at its rendered size.`, `- focus-ring: focus covered by another element inside the same KaTeX formula.`, ``);
lines.push(`Screenshots: ${SHOTS ? "reports/shots/<page>-<width>.png (full page)" : "not taken (--no-shots)"}`);
fs.writeFileSync(path.join(REPORT_DIR, "report.md"), lines.join("\n") + "\n");
fs.writeFileSync(path.join(REPORT_DIR, "results.json"), JSON.stringify({ checks, findings }, null, 1));
const counts = Object.fromEntries(checks.map((c) => [c, findings.filter((f) => f.check === c).length]));
console.log(`ui-verify: ${findings.length} finding(s) ${JSON.stringify(counts)}; report in ${path.relative(process.cwd(), REPORT_DIR) || "."}/report.md`);
if (want("axe") && !axeSource) console.error("SKIPPED: axe-core did NOT run (AXE_PATH missing). This is not a pass.");
process.exit(findings.length || (want("axe") && !axeSource) ? 1 : 0);
