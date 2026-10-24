// The characters the site can show, gathered from its own pages, scripts, course.json and glossary, plus a baseline
// of Latin, Greek, punctuation and the maths symbols the course uses. Shared by tools/subset-fonts.mjs and tools/check-fonts.mjs.
import fs from "node:fs";
import path from "node:path";
import { siteRoot } from "./playwright.mjs";

const NAMED = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", times: "×", minus: "−", middot: "·", rarr: "→", larr: "←", hellip: "…", ndash: "–", mdash: "—", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", copy: "©", deg: "°", plusmn: "±", divide: "÷", thinsp: " ", ensp: " ", emsp: " ", check: "✓" };
const decode = (s) => s
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&([a-z]+);/gi, (m, n) => NAMED[n] ?? m)
  .replace(/\\u\{([0-9a-f]+)\}/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/\\u([0-9a-f]{4})/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)));

/** Baseline ranges [from, to] that are always kept, so small content edits do not need a re-subset. */
export const BASELINE = [
  [0x20, 0x7e], [0xa0, 0xff], [0x100, 0x17f], // Basic Latin, Latin-1, Latin Extended-A
  [0x370, 0x3ff], // Greek and Coptic
  [0x2010, 0x2027], [0x2030, 0x203a], [0x2044, 0x2044], [0x20ac, 0x20ac], // punctuation, per mille, fraction slash, euro
  [0x2070, 0x209f], // super- and subscripts
  [0x2190, 0x2199], [0x21d0, 0x21d5], // arrows
  [0x2200, 0x2200], [0x2202, 0x2203], [0x2205, 0x2209], [0x220f, 0x2212], [0x2218, 0x221a], [0x221d, 0x2220], [0x2225, 0x222b], [0x2248, 0x2248], [0x2260, 0x2262], [0x2264, 0x2265], [0x22a4, 0x22a5], [0x22c5, 0x22c5], // maths operators used in the course
  [0x2713, 0x2713], [0x27e8, 0x27e9],
];

const read = (p) => fs.readFileSync(path.join(siteRoot, p), "utf8");
const list = (dir, ext) => fs.existsSync(path.join(siteRoot, dir)) ? fs.readdirSync(path.join(siteRoot, dir)).filter((f) => ext.some((e) => f.endsWith(e))).map((f) => path.join(dir, f)) : [];

function htmlPages() {
  const out = ["index.html", "404.html"].filter((p) => fs.existsSync(path.join(siteRoot, p)));
  for (const d of fs.readdirSync(path.join(siteRoot, "modules"))) {
    const p = `modules/${d}/index.html`;
    if (fs.existsSync(path.join(siteRoot, p))) out.push(p);
  }
  return out;
}

function jsonStrings(v, out = []) {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => jsonStrings(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => jsonStrings(x, out));
  return out;
}

const chars = (s) => new Set([...s].map((c) => c.codePointAt(0)).filter((c) => c >= 0x20 && c !== 0x7f));
const union = (...sets) => new Set(sets.flatMap((s) => [...s]));

/** { all, headings, code }: used code points, those in headings, and those in code or numeric readouts. */
export function usedChars() {
  const pages = htmlPages();
  const html = pages.map((p) => decode(read(p)));
  const scripts = [...list("assets/js", [".mjs", ".js"]), ...list("tools", [])].map((p) => decode(read(p)));
  const course = JSON.parse(read("data/course.json"));
  const glossary = JSON.parse(read("data/glossary.json"));
  const json = jsonStrings(course).concat(jsonStrings(glossary)).map(decode);
  const css = decode(read("assets/css/site.css"));
  const all = union(...html.map(chars), ...scripts.map(chars), ...json.map(chars), chars(css));
  const headings = union(
    ...html.flatMap((h) => [...h.matchAll(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/g)].map((m) => chars(m[1].replace(/<[^>]+>/g, "")))),
    ...[...course.modules, ...course.modules.flatMap((m) => m.concepts)].map((x) => chars(x.title ?? "")),
    chars("ML Math"),
  );
  const code = union(
    ...html.flatMap((h) => [...h.matchAll(/<(?:code|kbd|pre)[^>]*>([\s\S]*?)<\/(?:code|kbd|pre)>/g)].map((m) => chars(m[1].replace(/<[^>]+>/g, "")))),
    chars("0123456789+-−×÷·=()[],.:;|<>%≈≠≤≥→ "), // numbers and operators in readouts
  );
  return { all, headings, code };
}

/** Everything to put in the subset: the used characters plus the baseline. */
export function subsetChars() {
  const set = new Set(usedChars().all);
  for (const [a, b] of BASELINE) for (let c = a; c <= b; c++) set.add(c);
  return set;
}
