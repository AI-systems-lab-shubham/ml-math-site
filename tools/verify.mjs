// One command for the module checklist: unit tests, course, glossary, claims, e2e, ui-verify, email hygiene.
// Usage: node tools/verify.mjs [--fast | --changed | --full] [--timings] [--plan] [--only <name>] [--skip-e2e] [--skip-ui]
//   --fast     unit, course, glossary, claims, fonts. No browser. Use after every change.
//   --changed  the --fast steps, then the e2e tests and ui-verify (375, 900, 1280 px) for the pages that depend on the files
//              changed since the last passing --full (reports/last-full-pass), plus uncommitted and untracked files.
//              A shared, core, unused or unclassifiable file, a missing or unusable marker: runs --full instead.
//              --base <ref> diffs from that ref instead of the marker (for example origin/main).
//   --full     everything (the default). On a clean tree where nothing failed it records HEAD in reports/last-full-pass.
//   --timings  print the time of every step.   --plan  print what would run and exit.
// Exit 0 only if nothing failed. Browser and email steps that could not run are listed as SKIPPED.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildGraph, changedSince, classify, e2eFor, listFiles } from "./lib/deps.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const opt = (n) => (flag(n) ? argv[argv.indexOf(n) + 1] : null);
const MARKER = join(root, "reports/last-full-pass");
const CHANGED_WIDTHS = "375,900,1280";

// Node 24 treats a directory argument as a file, so the test files are listed explicitly (tests/e2e is not included).
const ALL_STEPS = [
  { name: "unit", fast: true, cmd: ["node", "--test", ...readdirSync(join(root, "tests")).filter((f) => f.endsWith(".test.mjs")).map((f) => `tests/${f}`)] },
  { name: "course", fast: true, cmd: ["node", "tools/check-course.mjs"] },
  { name: "glossary", fast: true, cmd: ["node", "tools/check-glossary.mjs"] },
  { name: "fonts", fast: true, cmd: ["node", "tools/check-fonts.mjs"] },
  { name: "claims", fast: true, cmd: ["node", "tools/check-claims.mjs"] },
  { name: "e2e-nav", cmd: ["node", "tests/e2e/nav-reachable.mjs"], browser: true },
  { name: "e2e-symbols", cmd: ["node", "tests/e2e/symbols.mjs"], browser: true },
  { name: "e2e-progress-menu", cmd: ["node", "tests/e2e/progress-menu.mjs"], browser: true },
  { name: "e2e-lesson-nav", cmd: ["node", "tests/e2e/lesson-nav.mjs"], browser: true },
  { name: "e2e-widget-inputs", cmd: ["node", "tests/e2e/widget-inputs.mjs"], browser: true, pagesArg: true },
  { name: "e2e-structure", cmd: ["node", "tests/e2e/structure.mjs"], browser: true },
  { name: "e2e-redirects", cmd: ["node", "tests/e2e/redirects.mjs"], browser: true },
  { name: "e2e-switcher", cmd: ["node", "tests/e2e/module-switcher.mjs"], browser: true },
  { name: "e2e-widgets", cmd: ["node", "tests/e2e/widgets-lazy.mjs"], browser: true, pagesArg: true },
  { name: "e2e-404", cmd: ["node", "tests/e2e/404.mjs"], browser: true },
  { name: "ui", cmd: ["node", "tools/ui-verify.mjs"], browser: true, ui: true },
  { name: "email", cmd: ["node", "tools/check-email.mjs"], skipWhen: (out) => /^skipped:/m.test(out) },
];
const only = opt("--only");

const git = (...a) => spawnSync("git", a, { cwd: root, encoding: "utf8" });
const treeClean = () => { const r = git("status", "--porcelain"); return r.status === 0 && r.stdout.trim() === ""; };

const tiers = ["--fast", "--changed", "--full"].filter(flag);
if (tiers.length > 1) { console.error(`Choose one tier, got ${tiers.join(" ")}`); process.exit(2); }
let tier = (tiers[0] ?? "--full").slice(2);

// --changed: pick a base, list the changed files, and either select pages or escalate.
let plan = null;   // { base, changed, pages, ignored } when --changed stays partial
const notes = [];
if (tier === "changed") {
  let base = opt("--base"), baseNote;
  if (base) {
    const ok = git("rev-parse", "--verify", "--quiet", `${base}^{commit}`);
    if (ok.status !== 0) { notes.push(`--base ${base} is not a commit`); tier = "full"; }
    else baseNote = `${base} (--base)`;
  } else {
    let sha = "";
    try { sha = readFileSync(MARKER, "utf8").trim(); } catch { /* missing or unreadable */ }
    if (!/^[0-9a-f]{40}$/.test(sha)) notes.push("no usable reports/last-full-pass marker");
    else if (git("cat-file", "-e", `${sha}^{commit}`).status !== 0) notes.push(`marker commit ${sha.slice(0, 9)} does not exist`);
    else if (git("merge-base", "--is-ancestor", sha, "HEAD").status !== 0) notes.push(`marker commit ${sha.slice(0, 9)} is not an ancestor of HEAD`);
    else { base = sha; baseNote = `${sha.slice(0, 9)} (last passing --full)`; }
    if (!base) tier = "full";
  }
  if (tier === "changed") {
    const files = listFiles(root);
    const changed = changedSince(root, base);
    const cls = classify(changed, buildGraph(root, files));
    if (cls.escalate.length) {
      notes.push(`base ${baseNote}`, ...cls.escalate.map((e) => `${e.file}: ${e.reason}`));
      tier = "full";
    } else plan = { baseNote, changed, pages: [...cls.pages], ignored: cls.ignored, why: cls.why };
  }
}
if (notes.length && tier === "full" && tiers.includes("--changed")) console.log(`--changed -> running --full\n  ${notes.join("\n  ")}\n`);

// Choose the steps for the tier.
let steps = ALL_STEPS.map((s) => ({ ...s }));
if (tier === "fast") steps = steps.filter((s) => s.fast);
if (plan) {
  console.log(`--changed: base ${plan.baseNote}; ${plan.changed.length} changed file(s)${plan.ignored.length ? `, ${plan.ignored.length} ignored (docs and settings)` : ""}`);
  for (const [f, w] of plan.why) console.log(`  ${f} -> ${w}`);
  const want = e2eFor(new Set(plan.pages));
  const m1 = plan.pages.filter((k) => /^m01-/.test(k));
  steps = steps.filter((s) => s.fast || want.has(s.name) || (s.ui && plan.pages.length));
  steps = steps.filter((s) => !s.pagesArg || m1.length);
  for (const s of steps) {
    if (s.pagesArg) s.cmd = [...s.cmd, "--pages", m1.join(",")];
    if (s.ui) s.cmd = [...s.cmd, "--pages", plan.pages.join(","), "--widths", CHANGED_WIDTHS];
  }
  console.log(plan.pages.length ? `  pages: ${plan.pages.join(", ")}` : "  no page affected: only the --fast steps run");
}
if (only) steps = steps.filter((s) => s.name === only);
console.log(`tier: ${tier}${plan ? " (partial)" : ""}; steps: ${steps.map((s) => s.name).join(", ")}\n`);
if (flag("--plan")) process.exit(0);

// axe-core for ui-verify: AXE_PATH if set, else the copy in ~/.dev-tools/axe, else /tmp/axe. Missing means ui-verify reports SKIPPED, which fails.
const axePath = [process.env.AXE_PATH, join(homedir(), ".dev-tools/axe/node_modules/axe-core/axe.min.js"), "/tmp/axe/node_modules/axe-core/axe.min.js"].find((p) => p && existsSync(p));

const startedClean = treeClean();
const results = [];
const t0 = performance.now();
for (const step of steps) {
  if (flag("--skip-e2e") && step.browser) { results.push({ name: step.name, status: "SKIPPED", note: "--skip-e2e", ms: 0 }); continue; }
  if (flag("--skip-ui") && step.ui) { results.push({ name: step.name, status: "SKIPPED", note: "--skip-ui (counts as a failure)", ms: 0 }); continue; }
  const t = performance.now();
  const r = spawnSync(step.cmd[0], step.cmd.slice(1), { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, env: step.ui && axePath ? { ...process.env, AXE_PATH: axePath } : process.env });
  const ms = performance.now() - t;
  const out = `${r.stdout}${r.stderr}`;
  let status = r.status === 0 ? "PASS" : "FAIL";
  let note = "";
  if (r.status !== 0 && /SKIPPED:/.test(out)) { status = "SKIPPED"; note = "did not run; counts as a failure"; }
  else if (r.status === 0 && step.skipWhen?.(out)) { status = "SKIPPED"; note = out.trim().split("\n")[0]; }
  else if (r.status !== 0) note = out.trim().split("\n").slice(-6).join("\n    ");
  results.push({ name: step.name, status, note, ms });
}
const total = performance.now() - t0;

const secs = (ms) => `${(ms / 1000).toFixed(1)}s`;
const showTimes = flag("--timings");
for (const r of results) console.log(`${r.status.padEnd(8)} ${r.name}${showTimes ? `  ${secs(r.ms)}` : ""}${r.note ? `\n    ${r.note}` : ""}`);
if (showTimes) console.log(`\ntotal    ${secs(total)}`);
const failed = results.filter((r) => r.status === "FAIL" || (r.status === "SKIPPED" && r.note.includes("counts as a failure")));
console.log(failed.length ? `\n${failed.length} step(s) failed` : "\nAll steps that ran passed" + (results.some((r) => r.status === "SKIPPED") ? " (some were SKIPPED, see above)" : ""));

// Record the commit of a complete, passing --full run on a clean tree (a skipped e2e or ui step never qualifies).
const complete = tier === "full" && !only && !flag("--skip-e2e") && !flag("--skip-ui") && results.length === ALL_STEPS.length;
if (complete && !failed.length) {
  const head = git("rev-parse", "HEAD").stdout.trim();
  if (startedClean && treeClean() && /^[0-9a-f]{40}$/.test(head)) {
    mkdirSync(dirname(MARKER), { recursive: true });
    writeFileSync(MARKER, `${head}\n`);
    console.log(`recorded ${head.slice(0, 9)} in reports/last-full-pass`);
  } else console.log("marker not updated: the working tree was not clean");
}
process.exit(failed.length ? 1 : 0);
