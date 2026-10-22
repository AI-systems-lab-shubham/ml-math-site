import { access, readdir, readFile, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const require = createRequire(import.meta.url);
const katex = require(join(root, "vendor/katex/katex.min.js"));
const entries = JSON.parse(await readFile(join(root, "data/glossary.json"), "utf8"));
const entryById = new Map(entries.map((entry) => [entry.id, entry]));
const pages = [];
const pageMath = [];
const pageSymbols = new Set();

async function collectHtml(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, item.name);
    if (item.isDirectory()) await collectHtml(path);
    else if (item.name.endsWith(".html")) pages.push(path);
  }
}

await collectHtml(root);
const issues = [];
const seenIds = new Set();

for (const entry of entries) {
  if (seenIds.has(entry.id)) issues.push(`Duplicate glossary id: ${entry.id}`);
  seenIds.add(entry.id);
  if (!entry.id || !entry.term || !entry.plain?.trim()) issues.push(`Incomplete glossary entry: ${entry.id || "(missing id)"}`);
  for (const usedId of entry.uses || []) {
    if (!entryById.has(usedId)) issues.push(`${entry.id} uses missing glossary id ${usedId}`);
  }
  if (entry.math) {
    try {
      katex.renderToString(entry.math, { throwOnError: true, strict: "error" });
    } catch (error) {
      issues.push(`${entry.id} math does not render: ${error.message}`);
    }
  }
}

const visiting = new Set();
const visited = new Set();
function visit(id, path = []) {
  if (visiting.has(id)) {
    issues.push(`Circular glossary definition: ${[...path, id].join(" -> ")}`);
    return;
  }
  if (visited.has(id) || !entryById.has(id)) return;
  visiting.add(id);
  for (const usedId of entryById.get(id).uses || []) visit(usedId, [...path, id]);
  visiting.delete(id);
  visited.add(id);
}
entries.forEach((entry) => visit(entry.id));

const referenced = new Set();
for (const page of pages) {
  const source = await readFile(page, "utf8");
  for (const match of source.matchAll(/data-term=["']([^"']+)["']/g)) {
    referenced.add(match[1]);
    if (!entryById.has(match[1])) issues.push(`${page.replace(`${root}/`, "")} references missing glossary id ${match[1]}`);
  }
  for (const match of source.matchAll(/data-math=["']([^"']+)["']/g)) {
    pageMath.push({ page, formula: match[1] });
  }
  for (const match of source.matchAll(/(?:data-sym=["']|sym=)([a-zA-Z0-9_-]+)/g)) pageSymbols.add(match[1]);
}

for (const entry of entries) {
  if (!referenced.has(entry.id) && !entry.stub) issues.push(`Glossary entry is not referenced by a page: ${entry.id}`);
  if (entry.learnMore) {
    const [relativePath, fragment] = entry.learnMore.split("#");
    let target = resolve(root, relativePath);
    try {
      const targetStats = await stat(target);
      if (targetStats.isDirectory()) target = join(target, "index.html");
      await access(target);
      if (fragment) {
        const targetContent = await readFile(target, "utf8");
        if (!new RegExp(`\\bid=["']${fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`).test(targetContent)) {
          issues.push(`${entry.id} links to missing fragment #${fragment}`);
        }
      }
    } catch {
      issues.push(`${entry.id} links to missing page ${relativePath}`);
    }
  }
}

const glossarySource = await readFile(join(root, "assets/js/glossary.mjs"), "utf8");
const symbolDescriptions = new Set([...glossarySource.matchAll(/^\s*([a-zA-Z0-9_-]+):\s*"/gm)].map((match) => match[1]));
for (const symbol of pageSymbols) {
  if (!symbolDescriptions.has(symbol)) issues.push(`Missing symbol description: ${symbol}`);
}

for (const { page, formula } of pageMath) {
  try {
    katex.renderToString(formula, {
      throwOnError: true,
      strict: (errorCode) => errorCode === "htmlExtension" ? "ignore" : "error",
      trust: (context) => context.command === "\\htmlData",
    });
  } catch (error) {
    issues.push(`${page.replace(`${root}/`, "")} formula does not render: ${error.message}`);
  }
}

if (issues.length) {
  console.error(issues.map((issue) => `✗ ${issue}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log(`✓ ${entries.length} glossary entries validated; definitions are acyclic and all are referenced.`);
}
