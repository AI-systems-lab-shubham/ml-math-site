// One command for the module checklist: unit tests, course, glossary, claims, e2e nav, email hygiene.
// Usage: node tools/verify.mjs [--only <name>] [--skip-e2e]
// Exit 0 only if nothing failed. Browser and email steps that could not run are listed as SKIPPED.
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
// Node 24 treats a directory argument as a file, so the test files are listed explicitly (tests/e2e is not included).
const STEPS = [
  { name: "unit", cmd: ["node", "--test", ...readdirSync(join(root, "tests")).filter((f) => f.endsWith(".test.mjs")).map((f) => `tests/${f}`)] },
  { name: "course", cmd: ["node", "tools/check-course.mjs"] },
  { name: "glossary", cmd: ["node", "tools/check-glossary.mjs"] },
  { name: "claims", cmd: ["node", "tools/check-claims.mjs"] },
  { name: "e2e-nav", cmd: ["node", "tests/e2e/nav-reachable.mjs"], browser: true },
  { name: "email", cmd: ["node", "tools/check-email.mjs"], skipWhen: (out) => /^skipped:/m.test(out) },
];
const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;

const results = [];
for (const step of STEPS) {
  if (only && step.name !== only) continue;
  if (process.argv.includes("--skip-e2e") && step.browser) { results.push({ name: step.name, status: "SKIPPED", note: "--skip-e2e" }); continue; }
  const r = spawnSync(step.cmd[0], step.cmd.slice(1), { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const out = `${r.stdout}${r.stderr}`;
  let status = r.status === 0 ? "PASS" : "FAIL";
  let note = "";
  if (r.status !== 0 && /SKIPPED:/.test(out)) { status = "SKIPPED"; note = "did not run; counts as a failure"; }
  else if (r.status === 0 && step.skipWhen?.(out)) { status = "SKIPPED"; note = out.trim().split("\n")[0]; }
  else if (r.status !== 0) note = out.trim().split("\n").slice(-6).join("\n    ");
  results.push({ name: step.name, status, note });
}

for (const r of results) console.log(`${r.status.padEnd(8)} ${r.name}${r.note ? `\n    ${r.note}` : ""}`);
const failed = results.filter((r) => r.status === "FAIL" || (r.status === "SKIPPED" && r.note.includes("counts as a failure")));
console.log(failed.length ? `\n${failed.length} step(s) failed` : "\nAll steps that ran passed" + (results.some((r) => r.status === "SKIPPED") ? " (some were SKIPPED, see above)" : ""));
process.exit(failed.length ? 1 : 0);
