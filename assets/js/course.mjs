// Pure helpers over data/course.json (also used by tools/ and tests/).

export function builtModules(course) {
  return course.modules.filter((m) => m.status === "built");
}

export function builtConcepts(module) {
  return module.status === "built" ? module.concepts.filter((c) => c.status === "built") : [];
}

// The Previous / Up next chain: built concepts of built modules, in course order.
export function chain(course) {
  return builtModules(course).flatMap((m) => builtConcepts(m).map((c) => ({ ...c, moduleId: m.id })));
}

export function neighbours(course, id) {
  const list = chain(course);
  const i = list.findIndex((c) => c.id === id);
  if (i < 0) return { prev: null, next: null };
  return { prev: list[i - 1] ?? null, next: list[i + 1] ?? null };
}

// Where "Continue" goes after a concept: the next concept of the same module, else the next built module's overview,
// else null (end of the course so far).
export function continueTarget(course, id) {
  const hit = findConcept(course, id);
  if (!hit) return null;
  const { next } = neighbours(course, id);
  if (next && next.moduleId === hit.module.id) return { kind: "concept", path: next.path, title: next.title, id: next.id };
  const after = course.modules.slice(course.modules.indexOf(hit.module) + 1).find((m) => builtConcepts(m).length > 0);
  return after ? { kind: "module", path: after.path, title: after.title, id: after.id } : null;
}

// The button on a module overview: Start (nothing begun), Continue (first concept that is not complete) or Review.
export function overviewAction(module, statusOf) {
  const list = builtConcepts(module);
  if (list.length === 0) return null;
  if (list.every((c) => statusOf(c.id) === "not-started")) return { label: "Start", concept: list[0] };
  const open = list.find((c) => statusOf(c.id) !== "complete");
  return open ? { label: "Continue", concept: open } : { label: "Review from the start", concept: list[0] };
}

export function findModule(course, id) {
  return course.modules.find((m) => m.id === id) ?? null;
}

export function findConcept(course, id) {
  for (const m of course.modules) {
    const c = m.concepts.find((x) => x.id === id);
    if (c) return { concept: c, module: m };
  }
  return null;
}

export function totalMinutes(course) {
  return builtModules(course).reduce((sum, m) => sum + builtConcepts(m).reduce((s, c) => s + c.minutes, 0), 0);
}

// Text in course.json may mark glossary terms as [[shown text|term-id]].
const MARK = /\[\[([^\]|]+)\|([a-z0-9-]+)\]\]/g;
const escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Only ^T, ^-1 and ^{...} become superscripts; x^2 or a stray ^ stays as written. Runs on escaped text, so the body is safe.
const SUP = /\^(?:\{([^{}]+)\}|(-1)(?![0-9])|(T)(?![A-Za-z0-9]))/g;

export function renderInline(text) {
  return escapeHtml(text)
    .replace(SUP, (_, body, inv, t) => `<sup>${body ?? inv ?? t}</sup>`)
    .replace(MARK, '<span class="term" data-term="$2">$1</span>');
}

export function termIdsIn(text) {
  return [...text.matchAll(MARK)].map((m) => m[2]);
}

export function plainText(text) {
  return text.replace(MARK, "$1");
}
