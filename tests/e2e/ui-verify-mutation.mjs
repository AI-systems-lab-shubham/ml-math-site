// Mutation test for tools/ui-verify.mjs: plant one known defect at a time in a COPY of the site and
// require the matching check to report more findings than the untouched copy does.
// Run: node tests/e2e/ui-verify-mutation.mjs [--only <name>]
// The real site is never changed. Exits 1 if any defect goes undetected (or Playwright is missing).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { siteRoot, loadPlaywright } from "../../tools/lib/playwright.mjs";

if (!(await loadPlaywright())?.chromium) {
  console.error("\n# SKIPPED: ui-verify mutation test did NOT run (Playwright not importable). Exiting 1.\n");
  process.exit(1);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ui-mut-"));
const pristine = path.join(tmp, "pristine");
for (const f of ["index.html", "modules", "assets", "data", "vendor"]) fs.cpSync(path.join(siteRoot, f), path.join(pristine, f), { recursive: true });

const edit = (dir, file, fn) => { const p = path.join(dir, file); const before = fs.readFileSync(p, "utf8"); const after = fn(before); if (after === before) throw new Error(`mutation did not change ${file}`); fs.writeFileSync(p, after); };
const css = (rules) => (dir) => fs.appendFileSync(path.join(dir, "assets/css/site.css"), `\n${rules}\n`);
const M0 = "modules/00-foundations/equations/index.html";   // a concept page
const intoMain = (html) => (dir) => edit(dir, M0, (s) => s.replace('<main id="main">', `<main id="main">${html}`));

const MUTATIONS = [
  { name: "primary-action: a second filled button beside the first", check: "primary-action", pages: "home", widths: "1280", apply: (dir) => edit(dir, "index.html", (s) => s.replace('<p class="muted" data-total-time></p>', '<p class="muted" data-total-time></p><button class="button" type="button">Extra</button>')) },
  { name: "primary-action: a demoted button turned filled again", check: "primary-action", pages: "m00-equations", widths: "375", apply: css(".button-secondary.button-small{background:#7A1F3D!important;color:#fff!important}") },
  { name: "hscroll: 1400px-wide block", check: "hscroll", pages: "m00-equations", widths: "375", apply: intoMain('<div style="width:1400px;height:20px;background:#ccc"></div>') },
  { name: "overlap: two buttons stacked", check: "overlap", pages: "m00-equations", widths: "1280", apply: intoMain('<button style="position:absolute;top:240px;left:300px;width:140px;height:50px">A</button><button style="position:absolute;top:250px;left:340px;width:140px;height:50px">B</button>') },
  { name: "clipped: card summary cut off", check: "clipped", pages: "m00-equations", widths: "1280", apply: css(".concept-card > header > p.muted{height:10px;overflow:hidden}") },
  { name: "tap-target: 30px primary button", check: "tap-target", pages: "home", widths: "1280", apply: css(".button{min-height:30px!important;padding:2px 8px!important}") },
  { name: "small-text: 11px lede", check: "small-text", pages: "home", widths: "1280", apply: css(".lede{font-size:11px!important}") },
  { name: "layout-shift: late 300px insert", check: "layout-shift", pages: "m00-equations", widths: "1280", apply: (dir) => edit(dir, M0, (s) => s.replace("</body>", '<script>setTimeout(()=>{const d=document.createElement("div");d.style.height="300px";document.querySelector("main").prepend(d)},150)</script></body>')) },
  { name: "focus-ring: indicators removed", check: "focus-ring", pages: "m00-equations", widths: "1280", apply: css("*:focus-visible,*:focus{box-shadow:none!important;outline:none!important}") },
  { name: "tab-reach: Tab trapped on first link", check: "tab-reach", pages: "m00-equations", widths: "1280", apply: (dir) => edit(dir, M0, (s) => s.replace("</body>", '<script>document.addEventListener("keydown",e=>{if(e.key==="Tab"){e.preventDefault();document.querySelector("main a, main button, main summary")?.focus()}})</script></body>')) },
  { name: "esc-popover: Esc handler broken", check: "esc-popover", pages: "m00-equations", widths: "1280", apply: (dir) => edit(dir, "assets/js/glossary.mjs", (s) => s.replace('ev.key === "Escape" && !pop.hidden', 'ev.key === "Escape__" && !pop.hidden')) },
  { name: "console: uncaught error and 404 image", check: "console", pages: "m00-equations", widths: "1280", apply: (dir) => edit(dir, M0, (s) => s.replace("</body>", '<img src="nope.png" alt=""><script>throw new Error("boom")</script></body>')) },
  { name: "glossary-ids: misspelt term", check: "glossary-ids", pages: "m00-equations", widths: "1280", apply: (dir) => edit(dir, M0, (s) => s.replace('data-term="equation"', 'data-term="equaton"')) },
  { name: "structure: a stage renamed", check: "structure", pages: "m00-equations", widths: "1280", apply: (dir) => edit(dir, M0, (s) => s.replace('data-stage="why-when"', 'data-stage="whywhen"')) },
  { name: "motion: autoplaying spinner", check: "motion", pages: "m00-equations", widths: "1280", apply: css("@keyframes spin{to{transform:rotate(1turn)}}.brand{display:inline-block;animation:spin 2s linear infinite!important}") },
  { name: "reduced-motion: spinner ignores preference", check: "reduced-motion", pages: "m00-equations", widths: "1280", apply: css("@keyframes spin{to{transform:rotate(1turn)}}.brand{display:inline-block;animation:spin 2s linear infinite!important}") },
];

const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;
function count(siteDir, m) {
  const out = path.join(tmp, "report");
  fs.rmSync(out, { recursive: true, force: true });
  spawnSync("node", [path.join(siteRoot, "tools/ui-verify.mjs"), "--no-shots", "--pages", m.pages, "--widths", m.widths, "--checks", m.check], { env: { ...process.env, SITE_DIR: siteDir, REPORT_DIR: out, BASE_URL: "" }, encoding: "utf8" });
  const res = JSON.parse(fs.readFileSync(path.join(out, "results.json"), "utf8"));
  return res.findings.filter((f) => f.check === m.check).length;
}

const rows = [];
for (const m of MUTATIONS) {
  if (only && !m.name.startsWith(only)) continue;
  const work = path.join(tmp, "work");
  fs.rmSync(work, { recursive: true, force: true });
  fs.cpSync(pristine, work, { recursive: true });
  const baseline = count(pristine, m);
  m.apply(work);
  const mutated = count(work, m);
  rows.push({ name: m.name, baseline, mutated, caught: mutated > baseline });
  console.log(`${mutated > baseline ? "CAUGHT" : "MISSED"}  ${m.name}  (findings: clean ${baseline}, mutated ${mutated})`);
}
fs.rmSync(tmp, { recursive: true, force: true });
const missed = rows.filter((r) => !r.caught);
console.log(`\n${rows.length - missed.length} of ${rows.length} planted defects caught`);
process.exit(missed.length ? 1 : 0);
