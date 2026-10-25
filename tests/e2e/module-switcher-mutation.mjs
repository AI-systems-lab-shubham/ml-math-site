// Mutation test for tests/e2e/module-switcher.mjs: plant one defect at a time in a COPY of the site and require the
// e2e to fail on it (and to pass on the untouched copy). The real site is never changed.
// Defects: a toggle nested inside a link; a module with no built concepts rendered as a link; the toggle missing
// aria-controls; Esc not closing the switcher.
// Run: node tests/e2e/module-switcher-mutation.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { siteRoot, loadPlaywright } from "../../tools/lib/playwright.mjs";

if (!(await loadPlaywright())?.chromium) {
  console.error("\n# SKIPPED: module-switcher mutation test did NOT run (Playwright not importable). Exiting 1.\n");
  process.exit(1);
}
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sw-mut-"));
const pristine = path.join(tmp, "pristine");
for (const f of ["index.html", "modules", "assets", "data", "vendor"]) fs.cpSync(path.join(siteRoot, f), path.join(pristine, f), { recursive: true });

const SW = "assets/js/module-switch.mjs";
const edit = (dir, file, from, to) => {
  const p = path.join(dir, file);
  const before = fs.readFileSync(p, "utf8");
  if (!before.includes(from)) throw new Error(`mutation target not found in ${file}: ${from.slice(0, 60)}`);
  fs.writeFileSync(p, before.replace(from, to));
};

const MUTATIONS = [
  { name: "a toggle nested inside the module link", apply: (d) => {
    edit(d, SW, '<button type="button" class="msw-toggle" aria-expanded="${open}" aria-controls="msw-${m.id}" aria-label="Concepts in ${esc(m.title)}">${CHEV}</button>\n        <a class="msw-link" href="${href(m, built[0])}">${num}${esc(m.title)}</a></div>',
      '<a class="msw-link" href="${href(m, built[0])}"><button type="button" class="msw-toggle" aria-expanded="${open}" aria-controls="msw-${m.id}" aria-label="Concepts in ${esc(m.title)}">${CHEV}</button>${num}${esc(m.title)}</a></div>'); } },
  { name: "a module with no built concepts rendered as a link", apply: (d) => {
    edit(d, SW, '<span class="msw-soon-title">${num}${esc(m.title)}</span>', '<a class="msw-soon-title" href="${hrefTo(m.path)}">${num}${esc(m.title)}</a>'); } },
  { name: "toggle without aria-controls", apply: (d) => { edit(d, SW, ' aria-controls="msw-${m.id}"', ''); } },
  { name: "Esc no longer closes the switcher", apply: (d) => { edit(d, "assets/js/page-nav.mjs", "if (switcher?.isOpen()) {", "if (false) {"); } },
];

const run = (dir) => spawnSync("node", [path.join(siteRoot, "tests/e2e/module-switcher.mjs")], { env: { ...process.env, SITE_DIR: dir }, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const clean = run(pristine);
console.log(`${clean.status === 0 ? "ok    " : "BROKEN"} untouched copy passes (exit ${clean.status})`);
let missed = clean.status === 0 ? 0 : 1;
for (const m of MUTATIONS) {
  const work = path.join(tmp, "work");
  fs.rmSync(work, { recursive: true, force: true });
  fs.cpSync(pristine, work, { recursive: true });
  m.apply(work);
  const r = run(work);
  const fails = (r.stderr.match(/^FAIL /gm) ?? []).length;
  const caught = r.status !== 0;
  if (!caught) missed++;
  console.log(`${caught ? "CAUGHT" : "MISSED"}  ${m.name}  (${fails} failing checks)`);
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${MUTATIONS.length - (missed - (clean.status === 0 ? 0 : 1))} of ${MUTATIONS.length} planted defects caught`);
process.exit(missed ? 1 : 0);
