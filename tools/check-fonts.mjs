// Fails if the vendored WOFF2 fonts cannot show the characters the site uses.
//   - every @font-face points at an existing .woff2 file; every preload has type="font/woff2" and crossorigin, names a declared font,
//     and there are at most 3 per page (the above-the-fold fonts);
//   - every character the site uses (pages, scripts, course.json, glossary) is in the font that CSS puts first for that text:
//     Inter for everything, Fraunces for headings, JetBrains Mono for code and numeric readouts. A character missing from its
//     primary font is a failure that names the font the browser would fall back to, unless it is listed in ALLOWED_FALLBACK;
//   - the OpenType features the CSS uses are in the font (tnum for font-variant-numeric: tabular-nums);
//   - the licence metadata (name IDs 0 and 14) survived subsetting.
// If a character is missing and the source font had it, re-run tools/subset-fonts.mjs (see its header).
import fs from "node:fs";
import path from "node:path";
import { siteRoot } from "./lib/playwright.mjs";
import { usedChars } from "./lib/font-chars.mjs";
import { woff2Codepoints, woff2Features, woff2Names } from "./lib/woff2.mjs";

// Characters we accept falling back on purpose: "family:U+XXXX" -> why. Each is printed when the check passes.
// Maths inside formulas is drawn by KaTeX with its own fonts; these are the few that appear in ordinary text.
const ALLOWED_FALLBACK = {
  "Inter:U+25D0": "◐ marks \"not quite\" next to the words, so the shape may come from the system symbol font",
  "Inter:U+2208": "∈ in a Spot it question and a widget readout; neither Inter nor JetBrains Mono has it, the system maths font draws it",
  "Inter:U+2200": "∀ in glossary text and the symbol table; the system maths font draws it",
  "Inter:U+211D": "ℝ in a Spot it question and the symbol table; the system maths font draws it",
  "Inter:U+1D431": "bold x in the no-script fallback text of a formula (KaTeX draws it when scripts run)",
  "Fraunces:U+03A3": "Σ in a heading; Fraunces has no Greek, so Georgia draws it",
};
const allowedSeen = [];

const errors = [];
const fail = (m) => errors.push(m);
const read = (p) => fs.readFileSync(path.join(siteRoot, p), "utf8");
const css = read("assets/css/site.css");
const coverage = JSON.parse(read("vendor/fonts/coverage.json"));

// @font-face -> family -> files
const faces = [...css.matchAll(/@font-face\s*{([^}]*)}/g)].map((m) => ({
  family: m[1].match(/font-family:\s*"([^"]+)"/)?.[1], url: m[1].match(/url\("([^"]+)"\)/)?.[1], format: m[1].match(/format\("([^"]+)"\)/)?.[1] }));
const files = new Map();
for (const f of faces) {
  if (!f.url?.endsWith(".woff2") || f.format !== "woff2") { fail(`@font-face ${f.family}: ${f.url} must be a .woff2 file with format("woff2")`); continue; }
  const file = path.join(siteRoot, "assets/css", f.url);
  if (!fs.existsSync(file)) { fail(`@font-face ${f.family}: ${f.url} does not exist`); continue; }
  if (!files.has(f.family)) files.set(f.family, []);
  files.get(f.family).push(file);
}
for (const fam of ["Fraunces", "Inter", "JetBrains Mono"]) if (!files.has(fam)) fail(`no @font-face for ${fam}`);

// Preloads
const pages = ["index.html", ...fs.readdirSync(path.join(siteRoot, "modules")).map((d) => `modules/${d}/index.html`), "404.html"].filter((p) => fs.existsSync(path.join(siteRoot, p)));
const declared = new Set([...files.values()].flat().map((f) => path.basename(f)));
for (const p of pages) {
  const preloads = [...read(p).matchAll(/<link\s+rel="preload"[^>]*>/g)].map((m) => m[0]).filter((t) => /as="font"/.test(t));
  if (preloads.length > 3) fail(`${p}: ${preloads.length} font preloads (keep to the above-the-fold fonts, at most 3)`);
  for (const t of preloads) {
    const href = t.match(/href="([^"]+)"/)?.[1] ?? "";
    if (!/type="font\/woff2"/.test(t)) fail(`${p}: preload ${href} needs type="font/woff2"`);
    if (!/\scrossorigin(?=[\s>=])/.test(t)) fail(`${p}: preload ${href} needs the crossorigin attribute`);
    if (!declared.has(path.basename(href))) fail(`${p}: preload ${href} is not a font declared in site.css`);
    else if (!fs.existsSync(path.join(siteRoot, path.dirname(p), href))) fail(`${p}: preload ${href} does not exist`);
  }
}

// Stacks, to name fallbacks
const stack = (v) => (css.match(new RegExp(`--font-${v}:\\s*([^;]+);`))?.[1] ?? "").split(",").map((s) => s.trim().replace(/"/g, ""));
const SCOPES = [
  { family: "Inter", stack: stack("body"), use: "all" },
  { family: "Fraunces", stack: stack("head"), use: "headings" },
  { family: "JetBrains Mono", stack: stack("mono"), use: "code" },
];
const used = usedChars();
const charName = (c) => `U+${c.toString(16).toUpperCase().padStart(4, "0")} ${JSON.stringify(String.fromCodePoint(c))}`;
for (const s of SCOPES) {
  const have = new Set();
  const lacks = new Set();
  for (const f of files.get(s.family) ?? []) {
    for (const c of woff2Codepoints(f)) have.add(c);
    for (const c of coverage.fonts[path.basename(f)]?.sourceLacks ?? []) lacks.add(c);
  }
  for (const c of used[s.use]) {
    if (have.has(c)) continue;
    if (c === 0x20 || c === 0xa0) { fail(`${s.family}: space is missing`); continue; }
    const fallback = s.stack[1] ?? "the browser default";
    const generic = s.stack.at(-1);
    const named = `${fallback} (then ${generic})`;
    const key = `${s.family}:U+${c.toString(16).toUpperCase().padStart(4, "0")}`;
    if (ALLOWED_FALLBACK[key] && lacks.has(c)) { allowedSeen.push(`${key} -> ${named}: ${ALLOWED_FALLBACK[key]}`); continue; }
    if (lacks.has(c)) fail(`${s.family}: ${charName(c)} is used in ${s.use} text but not in ${s.family}; the browser falls back to ${named}`);
    else fail(`${s.family}: ${charName(c)} is used in ${s.use} text, the source font may have it, but the subset does not; re-run tools/subset-fonts.mjs`);
  }
}

// Features and licence metadata
if (/font-variant-numeric:\s*[^;]*tabular-nums/.test(css)) {
  for (const f of files.get("Inter") ?? []) if (!woff2Features(f).has("tnum")) fail(`${path.basename(f)}: site.css uses tabular-nums but the font has no tnum feature`);
}
for (const f of [...files.values()].flat()) {
  const ids = new Set(woff2Names(f).map((n) => n.id));
  for (const id of [0, 14]) if (!ids.has(id)) fail(`${path.basename(f)}: name ID ${id} (copyright / licence URL) was dropped`);
}

if (errors.length) { console.error(errors.map((e) => `FAIL  ${e}`).join("\n")); console.error(`\n${errors.length} font problem(s)`); process.exit(1); }
for (const a of allowedSeen) console.log(`allowed fallback  ${a}`);
console.log(`fonts OK: ${[...files.values()].flat().length} WOFF2 files, ${used.all.size} used characters checked, preloads and licence metadata fine`);
