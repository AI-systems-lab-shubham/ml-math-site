// Read-only export of every built page's rendered text, for editorial review. Changes nothing in the site.
// Usage: node tools/export-text.mjs [--pages home,m00,m00-slope,m01-*] [--out reports/site-text]
// Writes <out>/<module>.md (overview + concept pages; home.md for the home page), each page with a metrics table.
// Pages render with JavaScript on; lazy widgets are mounted, collapsibles opened, and content that is hidden until
// the learner acts (model answers, hints) is included and marked "(hidden until revealed)".
// Existing files in <out> are overwritten; nothing is deleted.
import fs from "node:fs";
import path from "node:path";
import { requirePlaywright, serveStatic, siteRoot } from "./lib/playwright.mjs";

const arg = (n) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : null);
const ONLY = arg("--pages")?.split(",") ?? null;
const OUT = path.resolve(siteRoot, arg("--out") ?? "reports/site-text");

const pw = await requirePlaywright("export-text");
const server = await serveStatic(siteRoot);
const base = server.base.replace(/\/?$/, "/");
const course = await (await fetch(new URL("data/course.json", base))).json();

const pages = [{ key: "home", file: "home", title: "Home", url: "" }];
for (const m of course.modules.filter((x) => x.status === "built")) {
  pages.push({ key: m.id, file: m.id, title: `${m.title} (overview)`, url: m.path });
  for (const c of m.concepts.filter((x) => x.status === "built")) pages.push({ key: c.id, file: m.id, title: c.title, url: c.path });
}
const picks = (k) => !ONLY || ONLY.some((p) => (p.endsWith("*") ? k.startsWith(p.slice(0, -1)) : p === k));
const selected = pages.filter((p) => picks(p.key));

// Runs in the page: returns the main text as markdown-ish lines.
function extract() {
  const SKIP = new Set(["SCRIPT", "STYLE", "NAV", "TEMPLATE", "NOSCRIPT", "OPTION"]);
  const BLOCK = new Set(["ADDRESS","ARTICLE","ASIDE","BLOCKQUOTE","DETAILS","DIV","DL","FIELDSET","FIGCAPTION","FIGURE","FOOTER","FORM","H1","H2","H3","H4","H5","H6","HEADER","HR","LI","MAIN","OL","P","PRE","SECTION","SUMMARY","TABLE","TBODY","THEAD","TR","UL","DT","DD","OUTPUT","LABEL","CAPTION"]);
  const lines = [];
  // Buttons are controls, except symbol/term chips, which are content.
  const skipped = (n) => SKIP.has(n.tagName) || (n.tagName === "BUTTON" && !n.matches(".sym-term, .term, [data-sym], [data-term]"));
  const isSvg = (n) => n.tagName.toLowerCase() === "svg";
  const hasBlock = (el) => [...el.children].some((c) => BLOCK.has(c.tagName) || hasBlock(c));
  const inline = (n) => {
    if (n.nodeType === 3) return n.textContent;
    if (n.nodeType !== 1 || skipped(n) || isSvg(n)) return "";
    if (n.classList.contains("katex")) { const a = n.querySelector('annotation[encoding="application/x-tex"]'); return a ? `$${a.textContent.trim()}$` : n.textContent; }
    if (n.tagName === "INPUT") return n.type === "range" || n.type === "number" ? `[${n.type} = ${n.value}]` : "";
    if (n.tagName === "BR") return " ";
    return [...n.childNodes].map(inline).join("");
  };
  const svgNote = (el) => { const t = el.getAttribute("aria-label") || el.querySelector(":scope > title")?.textContent; return t ? `[Figure: ${t.trim()}]` : null; };
  const emit = (text, prefix = "") => { const t = text.replace(/\s+/g, " ").trim(); if (t) lines.push(prefix + t); };
  const walk = (el, hidden) => {
    if (skipped(el)) return;
    const isHidden = hidden || el.hidden || el.hasAttribute("hidden");
    const mark = isHidden && !hidden ? " (hidden until revealed)" : "";
    if (isSvg(el)) { const n = svgNote(el); if (n) emit(n); return; }
    if (/^H[1-6]$/.test(el.tagName)) { lines.push(""); emit(inline(el), "#".repeat(Math.min(6, +el.tagName[1] + 1)) + " "); return; }
    if (el.tagName === "DETAILS") { const s = el.querySelector(":scope > summary"); if (s) emit("▸ " + inline(s) + mark); }
    if (el.tagName === "SUMMARY") return;
    if (el.tagName === "TR") { emit([...el.children].map((c) => inline(c).replace(/\s+/g, " ").trim()).join(" | "), "| "); return; }
    if (BLOCK.has(el.tagName) && !hasBlock(el)) {
      let t = inline(el).replace(/\s+/g, " ").trim();
      const svgs = [...el.querySelectorAll("svg")].map(svgNote).filter(Boolean);
      if (el.tagName === "LI") t = "- " + t;
      if (t) lines.push(t + mark);
      svgs.forEach((s) => lines.push(s));
      return;
    }
    // Container: inline runs between block children are emitted too.
    let run = "";
    const flush = () => { emit(run); run = ""; };
    for (const c of el.childNodes) {
      if (c.nodeType === 1 && (BLOCK.has(c.tagName) || isSvg(c) || hasBlock(c) || c.querySelector("svg,details"))) { flush(); walk(c, isHidden); }
      else run += inline(c);
    }
    flush();
  };
  walk(document.querySelector("main") ?? document.body, false);
  return { title: document.querySelector("h1")?.textContent.trim() ?? document.title, lines };
}

function metrics(text) {
  const prose = text.replace(/\$[^$]*\$/g, " ").replace(/^#+ /gm, "").replace(/^[-|] ?/gm, "");
  const wordRe = /[A-Za-z][A-Za-z'’-]*|\d+(?:\.\d+)?/g;
  const words = prose.match(wordRe) ?? [];
  const sentences = prose.split(/(?<=[.!?])\s+|\n+/).filter((s) => /[A-Za-z]/.test(s));
  const count = (re) => (prose.match(re) ?? []).length;
  const total = sentences.reduce((a, s) => a + (s.match(wordRe) ?? []).length, 0);
  return [
    ["Words", words.length],
    ["Sentences (approx.)", sentences.length],
    ["Average sentence length (words)", sentences.length ? (total / sentences.length).toFixed(1) : "0"],
    ['"you" / "your"', count(/\byour?s?\b/gi)],
    ["Contractions", count(/\b[A-Za-z]+(?:n['’]t|['’](?:re|ve|ll|d|m))\b|\b(?:it|that|there|here|let|what|who|where|how|he|she)['’]s\b/gi)],   // curly or straight; possessives (card’s) are not contractions
    ["Questions (?)", count(/\?/g)],
    ['"this card"', count(/\bthis card\b/gi)],
    ['"tested code"', count(/\btested code\b/gi)],
    ['"claim"', count(/\bclaim\w*/gi)],
    ['"simplified"', count(/\bsimplif\w*/gi)],
  ];
}

fs.mkdirSync(OUT, { recursive: true });
const browser = await pw.chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
const byFile = new Map();
const add = (file, md) => (byFile.get(file) ?? byFile.set(file, []).get(file)).push(md);
let failed = 0;
for (const pg of selected) {
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e)));
  try {
    await page.goto(new URL(pg.url, base).href, { waitUntil: "networkidle" });
    await page.evaluate(async () => {
      document.querySelectorAll("details").forEach((d) => (d.open = true));
      if (document.querySelector("[data-widget]")) {
        const meta = document.querySelector('meta[name="site-root"]')?.content;
        const href = meta ? new URL(meta, document.baseURI) : location.href;
        (await import(new URL("assets/js/widgets.mjs", href))).mountAllLazy();
      }
    });
    await page.waitForFunction(() => [...document.querySelectorAll("[data-widget]")].every((h) => h.dataset.lazy === "mounted"), null, { timeout: 8000 });
    await page.evaluate(() => document.fonts?.ready);
    await page.waitForTimeout(400);
    const { title, lines } = await page.evaluate(extract);
    const body = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    const rows = metrics(body).map(([k, v]) => `| ${k} | ${v} |`).join("\n");
    add(pg.file, `## ${pg.key}: ${title}\n\n- Page id: \`${pg.key}\`\n- Path: \`${pg.url || "index.html"}\`\n${errs.length ? `- Page errors: ${errs.join("; ")}\n` : ""}\n### Metrics\n\n| Metric | Value |\n| --- | --- |\n${rows}\n\n### Text\n\n${body}\n`);
  } catch (e) {
    failed++;
    console.error(`FAILED ${pg.key}: ${e.message}`);
    add(pg.file, `## ${pg.key}: ${pg.title}\n\nEXPORT FAILED: ${e.message}\n`);
  }
  await page.close();
}
await browser.close();
server.close?.();
for (const [file, parts] of byFile) fs.writeFileSync(path.join(OUT, `${file}.md`), `# Site text: ${file}\n\n` + parts.join("\n---\n\n"));
for (const f of fs.readdirSync(OUT).sort()) console.log(`${String(fs.statSync(path.join(OUT, f)).size).padStart(8)} B  ${path.relative(siteRoot, path.join(OUT, f))}`);
process.exit(failed ? 1 : 0);
