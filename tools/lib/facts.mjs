// "Facts preserved": what a voice rewrite must not change. Extracts, from one card, every number, TeX string,
// citation, provenance tag, bold/italic lead-in label, heading, glossary term and caveat marker, from the page HTML
// plus the card's entries in data/course.json and data/checks/<id>.json. Pure functions; the caller supplies the text.
// Tokens are compared as SETS per category (wording may repeat a number more or fewer times); count changes are
// reported separately as notes, never as failures.
import { textOf } from "./html-text.mjs";

const norm = (s) => String(s).replace(/−/g, "-").replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();
const article = (html) => html.match(/<article class="concept-card"[\s\S]*?<\/article>/)?.[0] ?? html;
const decode = (s) => textOf(`<x>${s}</x>`);

/** Flatten the data entries (course concept + checks items) into plain strings, with [[text|term]] markup split out. */
function dataStrings(courseEntry, checks) {
  const out = [], terms = [];
  const add = (s) => {
    if (typeof s !== "string") return;
    for (const m of s.matchAll(/\[\[([^\]|]+)\|([^\]]+)\]\]/g)) terms.push(m[2]);
    out.push(s.replace(/\[\[([^\]|]+)\|[^\]]+\]\]/g, "$1"));
  };
  if (courseEntry) { (courseEntry.objectives ?? []).forEach(add); (courseEntry.takeaways ?? []).forEach(add); }
  for (const it of checks?.items ?? []) {
    ["prompt", "hint", "explain", "model", "reasoning"].forEach((k) => add(it[k]));
    (it.choices ?? []).forEach((c) => { add(c.text); add(c.why); });
  }
  return { strings: out, terms };
}

const CITE = /\b((?:[A-Z][A-Za-z'-]+)(?:(?:,| and|,? and) [A-Z][A-Za-z'-]+)*(?: et al\.)?)(?:,| in| \() ?\(?((?:19|20)\d\d)\b/g;

export function extractFacts({ html, courseEntry = null, checks = null }) {
  const art = article(html);
  const d = dataStrings(courseEntry, checks);
  const prose = [textOf(art.replace(/<!--[\s\S]*?-->/g, " ")), ...d.strings].map(norm);
  const all = prose.join(" ¶ ");
  const f = {};
  const set = (k, arr) => (f[k] = new Set(arr.filter(Boolean).map(norm)));

  set("number", [...all.matchAll(/(?<![\w.])-?\d[\d,]*(?:\.\d+)?/g)].map((m) => m[0].replace(/,$/, "")));
  const tex = [...art.matchAll(/data-tex(?:-display)?="([^"]*)"/g)].map((m) => decode(m[1]));
  for (const it of checks?.items ?? []) for (const s of [it.prompt, it.hint, it.explain, it.model, it.reasoning]) if (s) tex.push(...[...String(s).matchAll(/\$([^$]+)\$/g)].map((m) => m[1]));
  set("tex", tex);
  set("citation", [
    ...[...all.matchAll(CITE)].map((m) => `${m[1]} ${m[2]}`),
    ...[...all.matchAll(/MML Ch(?:apter)?s? [\d.]+(?:\s*(?:and|,)\s*(?:Ch )?[\d.]+)*/g)].map((m) => m[0]),
    ...[...all.matchAll(/(?:§|section )\s?[\d.]+/gi)].map((m) => m[0]),
  ]);
  set("provenance", [...art.matchAll(/class="badge badge-(derived|motivated|convention)"/g)].map((m) => m[1]));
  set("label", [...art.matchAll(/<(?:strong|em)>([\s\S]*?)<\/(?:strong|em)>/g)].map((m) => decode(m[1]).replace(/[.:]$/, "")));
  set("heading", [...art.matchAll(/<h([123])[^>]*>([\s\S]*?)<\/h\1>/g)].map((m) => decode(m[2]).replace(/^\d\d\s/, "")));
  set("stage", [...art.matchAll(/<section data-stage="([^"]+)"/g)].map((m) => m[1]));
  set("term", [...art.matchAll(/data-term="([^"]+)"/g)].map((m) => m[1]).concat(d.terms));
  set("widget", [...art.matchAll(/data-(?:widget|stepper|calc|checks|predict)="([^"]+)"/g)].map((m) => m[0]));
  set("caveat", [/Where it breaks down/i.test(art) && "analogy breaks", /class="callout simplified"/.test(art) && "simplified callout", /Conceptual|nothing specific|not a named step/i.test(all) && "conceptual-or-none"]);
  set("question", (checks?.items ?? []).map((it) => `${it.id}|${it.slot}|${JSON.stringify(it.answer ?? it.choices?.map((c) => [c.text, !!c.correct]) ?? null)}`));
  // Count of each number, for the report only.
  const counts = new Map();
  for (const m of all.matchAll(/(?<![\w.])-?\d[\d,]*(?:\.\d+)?/g)) { const k = m[0].replace(/,$/, ""); counts.set(k, (counts.get(k) ?? 0) + 1); }
  return { sets: f, counts };
}

/** Differences between two extractions: [{ kind: "removed"|"added", category, token }] and number-count notes. */
export function diffFacts(oldF, newF) {
  const diffs = [], notes = [];
  for (const cat of Object.keys(oldF.sets)) {
    for (const t of oldF.sets[cat]) if (!newF.sets[cat].has(t)) diffs.push({ kind: "removed", category: cat, token: t });
    for (const t of newF.sets[cat]) if (!oldF.sets[cat].has(t)) diffs.push({ kind: "added", category: cat, token: t });
  }
  for (const [n, c] of oldF.counts) { const c2 = newF.counts.get(n) ?? 0; if (c2 && c2 !== c) notes.push(`${n}: ${c} -> ${c2} mentions`); }
  return { diffs, notes };
}

/** Apply allowed exceptions ([{ kind, category, token, reason }]). Returns { unexplained, stale } (both should be empty). */
export function applyExceptions(diffs, exceptions) {
  const key = (e) => `${e.kind}|${e.category}|${norm(e.token)}`;
  const want = new Map(exceptions.map((e) => [key(e), e]));
  for (const e of exceptions) if (!e.reason || e.reason.trim().length < 8) throw new Error(`exception without a reason: ${key(e)}`);
  const seen = new Set();
  const unexplained = diffs.filter((d) => { const k = key(d); if (want.has(k)) { seen.add(k); return false; } return true; });
  const stale = [...want.keys()].filter((k) => !seen.has(k));
  return { unexplained, stale };
}
