// Claims lint: the "In an LLM" rule says never claim insider knowledge of any company's systems.
// Flags (1) insider-sounding phrases and (2) a named model with a hard number and no hedge in the same paragraph.
// It is a tripwire for review, not a proof: a pass does not mean the claims are correct.
// Usage: node tools/check-claims.mjs
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const COMPANY = "(?:OpenAI|Google|Anthropic|Meta|DeepMind|Microsoft|Mistral|xAI)";
const INSIDER = new RegExp(
  `\\b(?:insider|leaked|proprietary (?:details|architecture|weights)|internal(?:ly)? (?:at|inside) ${COMPANY}|we know (?:that )?${COMPANY}|${COMPANY}['’]s (?:secret|internal|private|undisclosed))\\b`, "i");
// Models whose designs are publicly documented in papers or open weights are fine to cite; others need a hedge.
const MODEL = /\b(?:GPT-4\w*|GPT-5\w*|o[13]-?\w*|Claude(?: \d[\w.]*)?|Gemini(?: \d[\w.]*)?|Grok\w*)\b/;
const NUMBER = /\b\d[\d,.]*\s*(?:billion|million|trillion|B|M|T)?\s*(?:parameters|layers|heads|tokens|experts|dimensions)\b/i;
const HEDGE = /\b(?:publicly|published|paper|reported|documented|illustrative|illustration|assum|for example|e\.g\.|not disclosed|undisclosed|unknown|simplif|conceptual|toy|made-up|hypothetical)/i;

export function lintText(text, where = "") {
  const out = [];
  for (const para of text.split(/\n{2,}|(?<=[.!?])\s{2,}/)) {
    const flat = para.replace(/\s+/g, " ").trim();
    if (!flat) continue;
    const m = flat.match(INSIDER);
    if (m) out.push({ where, rule: "insider-phrase", text: m[0], context: flat.slice(0, 160) });
    if (MODEL.test(flat) && NUMBER.test(flat) && !HEDGE.test(flat)) out.push({ where, rule: "unhedged-model-number", text: flat.match(MODEL)[0], context: flat.slice(0, 160) });
  }
  return out;
}

const htmlToText = (html) => html
  .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
  .replace(/<\/(p|li|h[1-6]|div|section|details|summary|tr|aside|article)>/gi, "\n\n")
  .replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&[a-z#0-9]+;/g, " ");

export function collectFiles(root) {
  const files = [];
  if (existsSync(join(root, "index.html"))) files.push("index.html");
  const mods = join(root, "modules");
  // Every page under modules/ (overviews and concept pages), at any depth.
  const walk = (dir, rel) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) walk(join(dir, e.name), `${rel}/${e.name}`);
      else if (e.name === "index.html") files.push(`${rel}/${e.name}`);
    }
  };
  if (existsSync(mods)) walk(mods, "modules");
  for (const f of ["data/course.json", "data/glossary.json"]) if (existsSync(join(root, f))) files.push(f);
  return files;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const findings = collectFiles(root).flatMap((f) => {
    const raw = readFileSync(join(root, f), "utf8");
    return lintText(f.endsWith(".html") ? htmlToText(raw) : raw.replace(/\\n/g, "\n"), f);
  });
  for (const f of findings) console.error(`${f.where}: ${f.rule}: "${f.text}": ${f.context}`);
  console.log(findings.length ? `${findings.length} possible claim problem(s)` : `claims lint OK (${collectFiles(root).length} files)`);
  process.exit(findings.length ? 1 : 0);
}
