// Email hygiene: commits and tracked files should only carry the no-reply address.
// The address comes from NOREPLY_EMAIL in the environment and is never written to a file or printed.
// Unset: prints "skipped" and exits 0 (verify.mjs reports it as skipped, not as a pass).
// Checks: git config user.email; author and committer of every commit; any other address in tracked text files.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const want = (process.env.NOREPLY_EMAIL ?? "").trim().toLowerCase();
if (!want) {
  console.log("skipped: NOREPLY_EMAIL is not set, so the email check did not run");
  process.exit(0);
}
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
let problems = 0;
const fail = (msg) => { problems++; console.error(`FAIL  ${msg}`); };

if (git("config", "user.email").trim().toLowerCase() !== want) fail("git config user.email is not the NOREPLY_EMAIL address (address not shown)");

const bad = git("log", "--format=%h %ae %ce").trim().split("\n").filter(Boolean)
  .filter((l) => { const [, a, c] = l.split(" "); return a.toLowerCase() !== want || c.toLowerCase() !== want; })
  .map((l) => l.split(" ")[0]);
if (bad.length) fail(`${bad.length} commit(s) use another author or committer address: ${bad.slice(0, 10).join(", ")}${bad.length > 10 ? ", …" : ""}`);

const OK_DOMAINS = /@(?:users\.noreply\.github\.com|example\.(?:com|org)|anthropic\.com)$/i;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
for (const f of git("ls-files", "-z").split("\0").filter(Boolean)) {
  if (/^(vendor|licenses)\//.test(f) || /\.(ttf|woff2?|png|jpe?g|gif|ico)$/i.test(f)) continue;
  let text;
  try { text = readFileSync(join(root, f), "utf8"); } catch { continue; }
  text.split("\n").forEach((line, i) => {
    for (const m of line.match(EMAIL) ?? []) if (m.toLowerCase() !== want && !OK_DOMAINS.test(m)) fail(`${f}:${i + 1} contains an email address (not shown)`);
  });
}
console.log(problems ? `${problems} email problem(s)` : "email check OK");
process.exit(problems ? 1 : 0);
