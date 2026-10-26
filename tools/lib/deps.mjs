// Which pages does a changed file affect? Builds page -> files from what each page loads (script, link, then
// ES imports, CSS @import and url(), and data/*.json named in a script), and turns a list of changed files into
// either a set of page keys or an escalation to the full run. Pure functions plus one git helper; nothing is written.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

// Files whose effect is not visible from the graph alone (behaviour shared by every page): they always escalate.
export const CORE = new Set([
  "assets/css/site.css", "assets/js/shell.mjs", "assets/js/widgets.mjs", "assets/js/progress.mjs", "assets/js/course.mjs",
  "assets/js/store.mjs", "assets/js/lesson.mjs", "assets/js/page-nav.mjs", "assets/js/rail-init.js", "assets/js/state-icons.mjs",
  "assets/js/status-menu.mjs", "assets/js/glossary.mjs", "assets/js/math-render.mjs",
]);
// Always escalate: the course data, the visual system, the checks themselves.
export const ESCALATE = [/^data\/course\.json$/, /^DESIGN\.md$/, /^tools\//, /^tests\//];
// Never affect a page or a check that --fast does not already run.
export const IGNORED = [/^docs\//, /^CLAUDE\.md$/, /^\.claude\//, /^\.agents\//, /^\.gitignore$/, /^licenses\//, /^reports\//];

const git = (root, ...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

// Tracked plus untracked-but-not-ignored files, as repo-relative posix paths that exist now.
export function listFiles(root) {
  return git(root, "ls-files", "-co", "--exclude-standard").split("\n").filter((f) => f && existsSync(path.join(root, f)));
}

// Files changed since `base` (committed, staged, unstaged and untracked). Read-only git commands.
export function changedSince(root, base) {
  const diff = git(root, "diff", "--name-only", "--no-renames", base).split("\n");
  const fresh = git(root, "ls-files", "--others", "--exclude-standard").split("\n");
  return [...new Set([...diff, ...fresh].filter(Boolean))].sort();
}

// page file -> key, as ui-verify names them: home, mNN, mNN-slug, 404.
export function pageKeys(root) {
  const course = JSON.parse(readFileSync(path.join(root, "data/course.json"), "utf8"));
  const keys = new Map([["index.html", "home"], ["404.html", "404"]]);
  for (const m of course.modules) {
    keys.set(`${m.path}index.html`, m.id);
    for (const c of m.concepts) keys.set(`${c.path}index.html`, c.id);
  }
  return keys;
}

const resolveRef = (from, ref) => {
  const clean = ref.split(/[?#]/)[0];
  if (!clean || /^[a-z][a-z0-9+.-]*:/i.test(clean) || clean.startsWith("//")) return null;
  return path.posix.normalize(path.posix.join(path.posix.dirname(from), clean));
};

function refsOf(file, text) {
  const out = [];
  if (file.endsWith(".html")) {
    for (const tag of text.matchAll(/<(?:script|link)\b[^>]*>/gi)) {
      const m = /\b(?:src|href)="([^"]+)"/i.exec(tag[0]);
      if (m) out.push(resolveRef(file, m[1]));
    }
  } else if (/\.m?js$/.test(file)) {
    for (const m of text.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)["']([^"']+)["']/g)) if (m[1].startsWith(".")) out.push(resolveRef(file, m[1]));
    for (const m of text.matchAll(/["'`]([^"'`]*\bdata\/[\w.-]+\.json)["'`]/g)) out.push(`data/${m[1].split("data/").pop()}`);
  } else if (file.endsWith(".css")) {
    for (const m of text.matchAll(/@import\s+(?:url\()?["']?([^"')\s;]+)/g)) out.push(resolveRef(file, m[1]));
    for (const m of text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) out.push(resolveRef(file, m[1]));
  }
  return out.filter(Boolean);
}

// Map file -> Set of page keys that load it (directly or through imports). Pages are the files named in course.json plus 404.
export function buildGraph(root, files = listFiles(root)) {
  const keys = pageKeys(root);
  const present = new Set(files);
  const used = new Map();
  const pages = [];
  for (const [file, key] of keys) {
    if (!present.has(file)) continue;
    pages.push(key);
    const seen = new Set([file]);
    const queue = [file];
    while (queue.length) {
      const f = queue.pop();
      let text = "";
      try { text = readFileSync(path.join(root, f), "utf8"); } catch { continue; }
      if (!/\.(html|m?js|css)$/.test(f)) continue;
      for (const r of refsOf(f, text)) {
        if (!present.has(r) || seen.has(r)) continue;
        seen.add(r);
        queue.push(r);
      }
    }
    for (const f of seen) { if (f === file) continue; if (!used.has(f)) used.set(f, new Set()); used.get(f).add(key); }
  }
  return { keys, pages, used, present };
}

// -> { escalate: [{file, reason}], pages: Set<key>, ignored: [file], why: Map<file, string> }
export function classify(changed, graph) {
  const escalate = [], ignored = [], pages = new Set(), why = new Map();
  for (const f of changed) {
    if (ESCALATE.some((re) => re.test(f))) { escalate.push({ file: f, reason: "shared: course data, design or checks" }); continue; }
    if (IGNORED.some((re) => re.test(f))) { ignored.push(f); continue; }
    if (graph.keys.has(f)) { if (graph.present.has(f)) { pages.add(graph.keys.get(f)); why.set(f, `page ${graph.keys.get(f)}`); } else escalate.push({ file: f, reason: "page was deleted" }); continue; }
    if (CORE.has(f)) { escalate.push({ file: f, reason: "core file: every page depends on it" }); continue; }
    const users = graph.used.get(f);
    if (!users) { escalate.push({ file: f, reason: "no page loads it, or it cannot be classified" }); continue; }
    if (users.size === graph.pages.length) { escalate.push({ file: f, reason: "every page loads it" }); continue; }
    why.set(f, `${users.size} page(s): ${[...users].join(", ")}`);
    for (const k of users) pages.add(k);
  }
  return { escalate, pages, ignored, why };
}

// Which e2e scripts matter for the selected pages. widget-inputs and widgets-lazy take --pages (Module 1 keys).
export function e2eFor(pages) {
  const kinds = new Set();
  for (const k of pages) kinds.add(k === "home" ? "home" : k === "404" ? "404" : /^m\d+$/.test(k) ? "overview" : "concept");
  const names = new Set();
  if (kinds.has("concept")) ["e2e-structure", "e2e-redirects", "e2e-lesson-nav", "e2e-symbols", "e2e-widget-inputs", "e2e-widgets"].forEach((n) => names.add(n));
  if (kinds.has("overview")) ["e2e-structure", "e2e-lesson-nav", "e2e-switcher"].forEach((n) => names.add(n));
  if (kinds.has("home")) ["e2e-structure", "e2e-nav", "e2e-progress-menu"].forEach((n) => names.add(n));
  if (kinds.has("404")) names.add("e2e-404");
  return names;
}
