// E2E for lazy widgets (assets/js/widgets.mjs, mountWhenNeeded) on every module page:
//   1. placeholders hold their title and description as text and contain nothing focusable;
//   2. Tab from the top of the page, with no scrolling by the test, reaches every control of every widget;
//   3. find-in-page style: scroll to a widget's heading text and click it; it mounts with no layout shift,
//      at 375, 768 and 1280px, and its title and description match the placeholder;
//   4. a hash link to a concept, on load and by click, mounts that concept's widgets before the browser scrolls;
//   5. print media mounts everything.
// Run: node tests/e2e/widgets-lazy.mjs   (Playwright needed; prints SKIPPED and exits 1 otherwise)
import { requirePlaywright, serveStatic } from "../../tools/lib/playwright.mjs";

const pw = await requirePlaywright("lazy widgets e2e");
const { base, close } = await serveStatic();
let failures = 0, checks = 0;
const check = (ok, label) => { checks++; if (!ok) { failures++; console.error(`FAIL  ${label}`); } };
const browser = await pw.chromium.launch();
const PAGES = [["m00", "modules/00-foundations/"], ["m01", "modules/01-linear-algebra/"]];
// Holds back the scroll-triggered mount, so the page stays in its placeholder state until the test acts.
const NO_SCROLL_MOUNT = () => { window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} }; };
const FOCUSABLE = 'a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])';

for (const [name, url] of PAGES) {
  // 1 + 5: placeholders, then print
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.addInitScript(NO_SCROLL_MOUNT);
    await page.goto(base + url, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-widget]");
    const ph = await page.evaluate((sel) => [...document.querySelectorAll("[data-widget]")].map((h) => ({
      key: h.dataset.widget, state: h.dataset.lazy ?? "none",
      title: h.querySelector(".widget-title")?.textContent ?? "", desc: h.querySelector(".widget-desc")?.textContent ?? "",
      focusable: h.dataset.lazy === "pending" ? h.querySelectorAll(sel).length : 0,
    })), FOCUSABLE);
    check(ph.length > 0, `${name}: no widget hosts found`);
    for (const p of ph) {
      check(p.title.length > 0 && p.desc.length > 0, `${name}/${p.key}: placeholder lacks title or description text`);
      check(p.focusable === 0, `${name}/${p.key}: unmounted placeholder has ${p.focusable} focusable children`);
    }
    await page.emulateMedia({ media: "print" });
    await page.waitForFunction(() => [...document.querySelectorAll("[data-widget]")].every((h) => h.dataset.lazy === "mounted"), null, { timeout: 5000 })
      .catch(() => {});
    const unmounted = await page.evaluate(() => [...document.querySelectorAll("[data-widget]")].filter((h) => h.dataset.lazy !== "mounted").length);
    check(unmounted === 0, `${name}: ${unmounted} widgets not mounted in print media`);
    await ctx.close();
  }

  // 2: Tab from the top, no scrolling by the test. Run twice: as it is, and with the scroll-triggered mount held back
  // so that only the focus rule can mount the next widget.
  for (const focusOnly of [false, true]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    if (focusOnly) await page.addInitScript(NO_SCROLL_MOUNT);
    await page.goto(base + url, { waitUntil: "networkidle" });
    await page.evaluate(() => { window.__focused = new Set(); document.addEventListener("focusin", (e) => window.__focused.add(e.target)); });
    await page.evaluate(() => {
      // Tab visits one radio per group; the arrow keys move within it, so a group counts as reached when any member was.
      window.reached = (e) => [...document.querySelectorAll(`input[type=radio][name="${e.name}"]`)].some((r) => window.__focused.has(r));
    });
    const total = await page.evaluate((sel) => document.querySelectorAll(sel).length, FOCUSABLE);
    let presses = 0, done = false;
    while (!done && presses < total * 3 + 400) {
      await page.keyboard.press("Tab");
      presses++;
      if (presses % 5 === 0) done = await page.evaluate(() => [...document.querySelectorAll("[data-widget]")].every((h) => h.dataset.lazy === "mounted")
        && [...document.querySelectorAll("[data-widget] :is(button, input, select, textarea, a[href], summary)")].filter((e) => !e.disabled && e.offsetParent !== null).every((e) => window.__focused.has(e) || (e.type === "radio" && window.reached(e))));
    }
    const missed = await page.evaluate(() => [...document.querySelectorAll("[data-widget] :is(button, input, select, textarea, a[href], summary)")]
      .filter((e) => !e.disabled && e.offsetParent !== null && !window.__focused.has(e) && !(e.type === "radio" && window.reached(e))).map((e) => `${e.closest("[data-widget]").dataset.widget}:${e.tagName.toLowerCase()}${e.id ? "#" + e.id : ""}`));
    const unmounted = await page.evaluate(() => [...document.querySelectorAll("[data-widget]")].filter((h) => h.dataset.lazy !== "mounted").map((h) => h.dataset.widget));
    check(unmounted.length === 0, `${name}${focusOnly ? " (focus rule only)" : ""}: Tab never mounted ${unmounted.join(", ")}`);
    check(missed.length === 0, `${name}${focusOnly ? " (focus rule only)" : ""}: Tab never reached ${missed.length} widget controls (${missed.slice(0, 5).join(", ")})`);
    await ctx.close();
  }

  // 3: find-in-page style, at three widths
  for (const width of [375, 768, 1280]) {
    const ctx = await browser.newContext({ viewport: { width, height: 800 } });
    const page = await ctx.newPage();
    await page.addInitScript(NO_SCROLL_MOUNT);
    await page.addInitScript(() => {
      window.__cls = 0;
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true });
    });
    await page.goto(base + url, { waitUntil: "networkidle" });
    const before = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll("[data-widget]")].map((h) => [h.dataset.widget,
      { h: h.getBoundingClientRect().height, title: h.querySelector(".widget-title")?.textContent, desc: h.querySelector(".widget-desc")?.textContent }])));
    await page.evaluate(() => { window.__cls = 0; });
    for (const [key, b] of Object.entries(before)) {
      const heading = page.locator(`[data-widget="${key}"] .widget-title`);
      await heading.scrollIntoViewIfNeeded();
      await heading.click();
      await page.waitForFunction((k) => document.querySelector(`[data-widget="${k}"]`).dataset.lazy === "mounted", key, { timeout: 5000 });
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const after = await page.evaluate((k) => {
        const h = document.querySelector(`[data-widget="${k}"]`);
        return { h: h.getBoundingClientRect().height, title: h.querySelector(".widget-title")?.textContent, desc: h.querySelector(".widget-draw")?.getAttribute("aria-label") };
      }, key);
      check(Math.abs(after.h - b.h) <= 1.5, `${name}@${width}/${key}: height ${b.h.toFixed(1)} before, ${after.h.toFixed(1)} after mount`);
      check(after.title === b.title, `${name}@${width}/${key}: title differs from placeholder (run tools/measure-widgets.mjs --write)`);
      check(after.desc === b.desc, `${name}@${width}/${key}: description differs from placeholder (run tools/measure-widgets.mjs --write)`);
    }
    const cls = await page.evaluate(() => window.__cls);
    check(cls < 0.001, `${name}@${width}: layout shift ${cls.toFixed(4)} while mounting every widget by click`);
    await ctx.close();
  }

  // 4: hash link on load and by click
  {
    const anchors = [...(await (await fetch(`${base}${url}`)).text()).matchAll(/<article class="concept-card" id="([^"]+)"/g)].map((m) => m[1]);
    const withWidget = [];
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await ctx.newPage();
      await page.goto(base + url, { waitUntil: "domcontentloaded" });
      for (const id of anchors) if (await page.evaluate((i) => !!document.querySelector(`#${i} [data-widget]`), id)) withWidget.push(id);
      await ctx.close();
    }
    check(withWidget.length > 0, `${name}: no concept with a widget found`);
    const target = withWidget[withWidget.length - 1];
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await ctx.newPage();
      await page.goto(`${base}${url}#${target}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(300);
      const r = await page.evaluate((i) => ({ unmounted: [...document.querySelectorAll(`#${i} [data-widget]`)].filter((h) => h.dataset.lazy !== "mounted").length,
        top: document.getElementById(i).getBoundingClientRect().top }), target);
      check(r.unmounted === 0, `${name}: #${target} on load left ${r.unmounted} widgets unmounted`);
      check(Math.abs(r.top) < 120, `${name}: #${target} on load is ${Math.round(r.top)}px from the top, not scrolled into place`);
      await ctx.close();
    }
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await ctx.newPage();
      await page.goto(base + url, { waitUntil: "networkidle" });
      // Click an in-page link; the handler must mount before the browser's own scroll, so check in the same task.
      const r = await page.evaluate((i) => {
        const a = document.createElement("a");
        a.href = `#${i}`; a.textContent = "jump"; document.body.append(a);
        const hosts = [...document.querySelectorAll(`#${i} [data-widget]`)];
        const pendingBefore = hosts.filter((h) => h.dataset.lazy === "pending").length;
        let mountedAtScroll = null;
        window.addEventListener("scroll", () => { mountedAtScroll ??= hosts.every((h) => h.dataset.lazy === "mounted"); }, { once: true });
        a.click();
        return { pendingBefore, mountedSync: hosts.every((h) => h.dataset.lazy === "mounted") };
      }, target);
      await page.waitForTimeout(300);
      check(r.mountedSync, `${name}: clicking a link to #${target} did not mount its widgets before scrolling`);
      await ctx.close();
    }
  }
}

await browser.close();
await close();
console.log(failures ? `${failures} of ${checks} checks failed` : `lazy widgets e2e: ${checks} checks passed`);
process.exit(failures ? 1 : 0);
