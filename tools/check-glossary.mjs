// Glossary checks: schema, missing ids, cycles, KaTeX rendering, page references.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const katex = createRequire(import.meta.url)(join(root, "vendor/katex/katex.min.js"));
const data = JSON.parse(readFileSync(join(root, "data/glossary.json"), "utf8"));
const errors = [];
const fail = (msg) => errors.push(msg);

const byId = new Map();
for (const e of data.entries) {
  if (byId.has(e.id)) fail(`duplicate id: ${e.id}`);
  byId.set(e.id, e);
}

const tex = (label, s) => {
  try {
    katex.renderToString(s, { throwOnError: true, trust: (c) => c.command === "\\htmlData", strict: (code) => (code === "htmlExtension" ? "ignore" : "warn") });
  } catch (err) {
    fail(`${label}: KaTeX failed: ${err.message}`);
  }
};

for (const e of data.entries) {
  if (!e.plain || !e.plain.trim()) fail(`${e.id}: plain is empty`);
  if (!["math", "ml", "llm"].includes(e.kind)) fail(`${e.id}: bad kind "${e.kind}"`);
  if (e.math) tex(`${e.id}.math`, e.math);
  for (const u of e.uses ?? []) if (!byId.has(u)) fail(`${e.id}: uses unknown id "${u}"`);
  if (e.learnMore) {
    const path = e.learnMore.split("#")[0];
    if (!existsSync(join(root, path))) fail(`${e.id}: learnMore path missing: ${path}`);
  }
  // each used term should appear in the text that is shown
  const text = `${e.plain} ${e.llm ?? ""}`.toLowerCase();
  for (const u of e.uses ?? []) {
    const t = byId.get(u);
    if (!t) continue;
    const forms = [t.term, ...(t.aliases ?? [])].map((s) => s.toLowerCase());
    if (!forms.some((f) => text.includes(f.replace(/s$/, "")))) {
      fail(`${e.id}: uses "${u}" but the term does not appear in its text`);
    }
  }
}

// cycles
const state = new Map();
const visit = (id, path) => {
  if (state.get(id) === 2) return;
  if (state.get(id) === 1) return fail(`circular definition: ${[...path, id].join(" -> ")}`);
  state.set(id, 1);
  for (const u of byId.get(id)?.uses ?? []) if (byId.has(u)) visit(u, [...path, id]);
  state.set(id, 2);
};
for (const id of byId.keys()) visit(id, []);

for (const [id, s] of Object.entries(data.symbols ?? {})) {
  if (!s.meaning) fail(`symbol ${id}: meaning is empty`);
}

// page references
const pages = [];
const modulesDir = join(root, "modules");
if (existsSync(modulesDir)) {
  for (const d of readdirSync(modulesDir)) {
    const p = join(modulesDir, d, "index.html");
    if (existsSync(p)) pages.push(p);
  }
}
const referenced = new Set();
for (const p of pages) {
  const html = readFileSync(p, "utf8");
  for (const m of html.matchAll(/data-term="([^"]+)"/g)) {
    if (!byId.has(m[1])) fail(`${p}: unknown term "${m[1]}"`);
    referenced.add(m[1]);
  }
  for (const m of html.matchAll(/data-sym="([^"]+)"|\\htmlData\{sym=([^}]+)\}/g)) {
    const id = m[1] ?? m[2];
    if (!(id in (data.symbols ?? {}))) fail(`${p}: unknown symbol "${id}"`);
  }
  for (const m of html.matchAll(/data-tex(?:-display)?="([^"]+)"/g)) {
    tex(p, m[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"'));
  }
}
// terms reached through a referenced term's `uses` are shown as chained popovers
const queue = [...referenced];
while (queue.length) {
  const e = byId.get(queue.pop());
  for (const u of e?.uses ?? []) if (!referenced.has(u)) { referenced.add(u); queue.push(u); }
}
for (const id of byId.keys()) if (!referenced.has(id)) fail(`${id}: never referenced`);

if (errors.length) {
  console.error(errors.map((e) => `✖ ${e}`).join("\n"));
  process.exit(1);
}
console.log(`✓ ${byId.size} glossary entries, ${Object.keys(data.symbols ?? {}).length} symbols, ${pages.length} page(s) checked.`);
