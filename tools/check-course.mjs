// Checks data/course.json: unique ids, built pages and anchors exist, Previous/Next chain is whole.
// Usage: node tools/check-course.mjs
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { chain, neighbours } from "../assets/js/course.mjs";

const STATUSES = new Set(["built", "planned"]);

// `fs` is injectable so tests can run without touching the disk.
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
      if (!STATUSES.has(c.status)) errors.push(`${c.id}: bad status "${c.status}"`);
      if (c.status === "built" && m.status !== "built") errors.push(`${c.id}: built concept inside planned module ${m.id}`);
      if (c.status === "built") {
        if (!(c.minutes > 0)) errors.push(`${c.id}: minutes must be positive`);
        if (!Array.isArray(c.objectives) || c.objectives.length === 0) errors.push(`${c.id}: needs at least one objective`);
        if (html !== null && !html.includes(`id="${c.anchor}"`)) errors.push(`${c.id}: anchor #${c.anchor} not found in ${m.path}index.html`);
      }
    }
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
  const fs = { read: (p) => (existsSync(join(root, p)) ? readFileSync(join(root, p), "utf8") : null) };
  const errors = checkCourse(course, fs);
  if (errors.length) { console.error(errors.map((e) => `✗ ${e}`).join("\n")); process.exit(1); }
  console.log(`course.json OK: ${course.modules.length} modules, ${chain(course).length} built concepts`);
}
