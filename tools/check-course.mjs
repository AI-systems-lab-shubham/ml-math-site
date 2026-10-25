// Checks data/course.json: unique ids, every built concept has its own page, overview pages list only built concepts, Previous/Next chain is whole.
// Usage: node tools/check-course.mjs
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { chain, neighbours, termIdsIn, continueTarget, findConcept } from "../assets/js/course.mjs";

const STATUSES = new Set(["built", "planned"]);

// `fs` is injectable so tests can run without touching the disk. fs.termIds (optional) is the set of glossary ids.
export function checkCourse(course, fs) {
  const errors = [];
  const seen = new Set();
  const once = (kind, id) => {
    if (typeof id !== "string" || !id) errors.push(`${kind} has a missing id`);
    else if (seen.has(id)) errors.push(`duplicate id: ${id}`);
    else seen.add(id);
  };
  const moduleIds = new Set(course.modules.map((m) => m.id));

  for (const m of course.modules) {
    once("module", m.id);
    if (!STATUSES.has(m.status)) errors.push(`${m.id}: bad status "${m.status}"`);
    for (const p of m.prerequisites ?? []) if (!moduleIds.has(p)) errors.push(`${m.id}: unknown prerequisite ${p}`);
    const html = m.status === "built" ? fs.read(`${m.path}index.html`) : null;
    if (m.status === "built" && html === null) errors.push(`${m.id}: page missing at ${m.path}index.html`);
    if (m.status === "built" && !m.concepts.some((c) => c.status === "built")) errors.push(`${m.id}: built module has no built concept`);
    const sum = m.concepts.filter((c) => c.status === "built").reduce((n, c) => n + c.minutes, 0);
    if (m.status === "built" && m.minutes !== sum) errors.push(`${m.id}: minutes is ${m.minutes} but built concepts sum to ${sum}`);
    for (const c of m.concepts) {
      once("concept", c.id);
      if (c.status !== "built" && html !== null && c.path && html.includes(`href="${c.path.slice(m.path.length)}"`)) errors.push(`${m.id}: overview links to planned concept ${c.id}`);
      if (!STATUSES.has(c.status)) errors.push(`${c.id}: bad status "${c.status}"`);
      if (c.status === "built" && m.status !== "built") errors.push(`${c.id}: built concept inside planned module ${m.id}`);
      if (c.status === "built") {
        if (!(c.minutes > 0)) errors.push(`${c.id}: minutes must be positive`);
        if (!Array.isArray(c.objectives) || c.objectives.length === 0) errors.push(`${c.id}: needs at least one objective`);
        for (const r of c.requires ?? []) if (!course.modules.some((x) => x.concepts.some((y) => y.id === r))) errors.push(`${c.id}: requires unknown concept ${r}`);
        if (fs.termIds) for (const text of [...c.objectives, ...(c.takeaways ?? [])]) for (const t of termIdsIn(text)) if (!fs.termIds.has(t)) errors.push(`${c.id}: unknown glossary term "${t}"`);
        if (typeof c.path !== "string" || !c.path.startsWith(m.path) || !c.path.endsWith("/")) errors.push(`${c.id}: path must be a folder inside ${m.path}`);
        else {
          const page = fs.read(`${c.path}index.html`);
          if (page === null) errors.push(`${c.id}: page missing at ${c.path}index.html`);
          else {
            if (!page.includes(`id="${c.anchor}"`)) errors.push(`${c.id}: anchor #${c.anchor} not found in ${c.path}index.html`);
            if (!page.includes(`<meta name="concept-id" content="${c.id}">`)) errors.push(`${c.id}: page does not declare its concept id`);
            const others = (page.match(/<article class="concept-card"/g) ?? []).length;
            if (others !== 1) errors.push(`${c.id}: page holds ${others} concept cards, expected 1`);
          }
          if (html !== null && !html.includes(`href="${c.path.slice(m.path.length)}"`)) errors.push(`${m.id}: overview does not link to ${c.id}`);
        }
      }
    }
  }

  // Each overview's old-link map must match course.json (old #concept-x links go to the concept pages).
  for (const m of course.modules.filter((x) => x.status === "built")) {
    const html = fs.read(`${m.path}index.html`);
    if (html === null) continue;
    const raw = html.match(/<script type="application\/json" id="old-links">([\s\S]*?)<\/script>/)?.[1];
    if (!raw) { errors.push(`${m.id}: overview has no old-link map`); continue; }
    let map;
    try { map = JSON.parse(raw); } catch { errors.push(`${m.id}: old-link map is not valid JSON`); continue; }
    const want = Object.fromEntries(m.concepts.filter((c) => c.status === "built").map((c) => [c.anchor, c.path.slice(m.path.length)]));
    if (JSON.stringify(map) !== JSON.stringify(want)) errors.push(`${m.id}: old-link map does not match course.json`);
    if (!html.includes("assets/js/old-links.mjs")) errors.push(`${m.id}: overview does not load old-links.mjs`);
  }

  // Home page: module cards and outcomes are static HTML and must match course.json.
  const home = fs.read("index.html");
  if (home !== null) {
    const esc = (t) => t.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    course.modules.forEach((m, i) => {
      const card = `<span class="num">Module ${i}</span><strong>${esc(m.title)}</strong>`;
      if (!home.includes(card)) errors.push(`index.html: module card for ${m.id} is missing or out of date`);
      if (m.status === "built" && !home.includes(`<a class="module-card" href="${m.path}">`)) errors.push(`index.html: built module ${m.id} card is not a link`);
      if (m.status !== "built" && home.includes(`href="${m.path}"`)) errors.push(`index.html: planned module ${m.id} must not be linked`);
      if (m.status === "built") for (const o of m.outcomes) if (!home.includes(`<li>${esc(o)}</li>`)) errors.push(`index.html: outcome not listed: ${o}`);
    });
  }

  // Continue chain: every built concept continues to a page that exists; only the last one in the course has nowhere to go.
  for (const [i, c] of chain(course).entries()) {
    const t = continueTarget(course, c.id);
    if (t === null) { if (i !== chain(course).length - 1) errors.push(`${c.id}: Continue has no target but it is not the last concept`); continue; }
    if (fs.read(`${t.path}index.html`) === null) errors.push(`${c.id}: Continue goes to ${t.path}, which does not exist`);
    if (t.kind === "concept" && findConcept(course, t.id)?.module.id !== findConcept(course, c.id).module.id) errors.push(`${c.id}: Continue leaves the module without going to an overview`);
  }

  // Previous/Next chain: reciprocal and covering every built concept exactly once.
  const list = chain(course);
  const builtCount = course.modules.reduce((n, m) => n + (m.status === "built" ? m.concepts.filter((c) => c.status === "built").length : 0), 0);
  if (list.length !== builtCount) errors.push(`chain has ${list.length} concepts but ${builtCount} are built`);
  list.forEach((c, i) => {
    const { prev, next } = neighbours(course, c.id);
    if ((prev?.id ?? null) !== (list[i - 1]?.id ?? null)) errors.push(`${c.id}: previous link broken`);
    if ((next?.id ?? null) !== (list[i + 1]?.id ?? null)) errors.push(`${c.id}: next link broken`);
    if (next && neighbours(course, next.id).prev?.id !== c.id) errors.push(`${c.id}: next is not reciprocal`);
  });
  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const course = JSON.parse(readFileSync(join(root, "data/course.json"), "utf8"));
  const termIds = new Set(JSON.parse(readFileSync(join(root, "data/glossary.json"), "utf8")).entries.map((e) => e.id));
  const fs = { read: (p) => (existsSync(join(root, p)) ? readFileSync(join(root, p), "utf8") : null), termIds };
  const errors = checkCourse(course, fs);
  if (errors.length) { console.error(errors.map((e) => `✗ ${e}`).join("\n")); process.exit(1); }
  console.log(`course.json OK: ${course.modules.length} modules, ${chain(course).length} built concepts`);
}
