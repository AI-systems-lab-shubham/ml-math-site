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

export function renderInline(text) {
  return escapeHtml(text).replace(MARK, '<span class="term" data-term="$2">$1</span>');
}

export function termIdsIn(text) {
  return [...text.matchAll(MARK)].map((m) => m[2]);
}

export function plainText(text) {
  return text.replace(MARK, "$1");
}
