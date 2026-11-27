// Fails on any displayed number with more than 8 significant digits, or a run of 0000000 / 9999999 (float noise).
// Usage: node tools/check-numbers.mjs [--static] [--browser] [--pages m02-*,m03] [--dump <dir>]
//   --static   (the default when no flag is given) scans assets/js for unrounded float interpolations. No browser; part of --fast.
//   --browser  renders every built page, clicks through every stepper step, scans the text and the TeX. Part of --changed and --full.
//   --dump     with --browser, also writes the rendered text per page (for before/after diffs).
import fs from "node:fs";
import path from "node:path";
import { noisyNumbers, unroundedInterpolations } from "./lib/number-noise.mjs";
import { requirePlaywright, serveStatic, siteRoot } from "./lib/playwright.mjs";

const flag = (n) => process.argv.includes(n);
const arg = (n) => (flag(n) ? process.argv[process.argv.indexOf(n) + 1] : null);
const doStatic = flag("--static") || !flag("--browser");
const doBrowser = flag("--browser");
let failures = 0;

if (doStatic) {
  const dir = path.join(siteRoot, "assets/js");
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".mjs") && !x.endsWith("-math.mjs"))) {
    for (const h of unroundedInterpolations(fs.readFileSync(path.join(dir, f), "utf8"))) {
      failures++;
      console.error(`${f}:${h.line}: unrounded float in \${${h.expr}}; wrap it in denoise()/r2()/r3(), or add /* num-ok: why */`);
    }
  }
  console.log(`static scan: ${failures ? failures + " problem(s)" : "ok"}`);
}

if (doBrowser) {
  const only = arg("--pages")?.split(",") ?? null;
  const dump = arg("--dump");
  const root = arg("--root") ? path.resolve(arg("--root")) : siteRoot;
  const pw = await requirePlaywright("check-numbers --browser");
  const server = await serveStatic(root);
  const base = server.base.replace(/\/?$/, "/");
  const course = await (await fetch(new URL("data/course.json", base))).json();
  const pages = [{ key: "home", url: "" }];
  for (const m of course.modules.filter((x) => x.status === "built")) {
    pages.push({ key: m.id, url: m.path });
    for (const c of m.concepts.filter((x) => x.status === "built")) pages.push({ key: c.id, url: c.path });
  }
  const picks = (k) => !only || only.some((p) => (p.endsWith("*") ? k.startsWith(p.slice(0, -1)) : p === k));
  const browser = await pw.chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
  if (dump) fs.mkdirSync(dump, { recursive: true });
  let seen = 0;
  for (const pg of pages.filter((p) => picks(p.key))) {
    const page = await ctx.newPage();
    await page.goto(new URL(pg.url, base).href, { waitUntil: "networkidle" });
    await page.evaluate(async () => {
      document.querySelectorAll("details").forEach((d) => (d.open = true));
      if (document.querySelector("[data-widget]")) {
        const meta = document.querySelector('meta[name="site-root"]')?.content;
        const href = meta ? new URL(meta, document.baseURI) : location.href;
        (await import(new URL("assets/js/widgets.mjs", href))).mountAllLazy();
      }
    });
    await page.waitForTimeout(300);
    // The page text and TeX, then every step of every stepper (steps are shown one at a time).
    const texts = await page.evaluate(() => {
      const tex = (root) => [...root.querySelectorAll('annotation[encoding="application/x-tex"]')].map((a) => `$${a.textContent}$`).join("\n");
      const out = [(document.querySelector("main")?.innerText ?? "") + "\n" + tex(document)];
      document.querySelectorAll("[data-stepper]").forEach((host) => {
        const next = [...host.querySelectorAll("button")].find((b) => b.textContent.trim() === "Next step");
        let guard = 0;
        while (next && !next.disabled && guard++ < 30) {
          next.click();
          out.push(`[stepper ${host.dataset.stepper}] ` + host.querySelector(".stepper-body").innerText + "\n" + tex(host));
        }
      });
      return out;
    });
    const all = texts.join("\n\n");
    if (dump) fs.writeFileSync(path.join(dump, `${pg.key}.txt`), all);
    for (const h of noisyNumbers(all)) { failures++; console.error(`${pg.key}: "${h.token}" (${h.why})`); }
    seen++;
    await page.close();
  }
  await browser.close();
  server.close?.();
  console.log(`browser scan: ${seen} page(s), ${failures ? failures + " problem(s)" : "ok"}`);
}
process.exit(failures ? 1 : 0);
