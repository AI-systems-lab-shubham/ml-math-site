// Lesson template: breadcrumb, meta, outcomes, takeaways, Mark complete, Previous / Up next,
// and automatic "visited" tracking. Reads everything from course.json via the shell.
import { findConcept, neighbours, renderInline } from "./course.mjs";
import { hrefTo } from "./shell.mjs";

const VISIT_DWELL_MS = 2000;
const el = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function initLesson(shell) {
  if (!shell) return;
  const { course, progress, moduleId } = shell;
  const cards = [...document.querySelectorAll("article.concept-card[id]")];
  const mod = course.modules.find((m) => m.id === moduleId);
  if (!mod) return;
  const byAnchor = new Map(mod.concepts.map((c) => [c.anchor, c]));
  const linkTo = (c, from) => {
    const m = course.modules.find((x) => x.concepts.includes(c)) ?? from;
    return m.id === moduleId ? `#${c.anchor}` : hrefTo(`${m.path}#${c.anchor}`);
  };

  for (const card of cards) {
    const c = byAnchor.get(card.id);
    if (!c || c.status !== "built") continue;
    const header = card.querySelector(":scope > header");
    const { prev, next } = neighbours(course, c.id);

    header.prepend(el(`<nav class="breadcrumb" aria-label="Breadcrumb"><ol>
      <li><a href="${hrefTo("index.html")}">Course</a></li>
      <li><a href="${hrefTo(mod.path)}">${esc(mod.title)}</a></li>
      <li><span aria-current="page">${esc(c.title)}</span></li></ol></nav>`));

    const needs = (c.requires ?? []).map((id) => findConcept(course, id)).filter(Boolean);
    const builds = needs.length
      ? `Builds on: ${needs.map((n) => `<a href="${linkTo(n.concept, n.module)}">${esc(n.concept.title)}</a>`).join(", ")} (a suggestion, not a lock)`
      : "Needs only high-school maths";
    header.append(el(`<p class="lesson-meta"><span>About ${c.minutes} min</span><span>${c.size === "full" ? "Full card" : "Compact card"}</span><span>${builds}</span></p>`));

    if (c.objectives.length) {
      header.append(el(`<aside class="outcomes" aria-labelledby="out-${card.id}"><h3 class="box-title" id="out-${card.id}">By the end of this card you’ll be able to…</h3>
        <ul>${c.objectives.map((o) => `<li>${renderInline(o)}</li>`).join("")}</ul></aside>`));
    }

    const teach = card.querySelector(":scope > details.teach-it");
    const footer = card.querySelector(":scope > footer");
    if (c.takeaways.length) {
      (teach ?? footer).before(el(`<aside class="takeaways" aria-labelledby="key-${card.id}"><h3 class="box-title" id="key-${card.id}">Key takeaways</h3>
        <ul>${c.takeaways.map((t) => `<li>${renderInline(t)}</li>`).join("")}</ul></aside>`));
    }

    const done = el(`<div class="lesson-done"><button class="button" type="button" data-complete="${c.id}"></button><p class="complete-status" role="status"></p></div>`);
    const nextHref = next ? linkTo(next, mod) : null;
    const pager = el(`<nav class="pager" aria-label="Previous and next concept">
      ${prev ? `<a class="pager-prev" href="${linkTo(prev, mod)}" rel="prev"><span class="pager-label">Previous</span><span class="pager-title">${esc(prev.title)}</span></a>` : "<span></span>"}
      ${next ? `<a class="pager-next" href="${nextHref}" rel="next"><span class="pager-label">Up next · about ${next.minutes} min</span><span class="pager-title">${esc(next.title)}</span></a>`
             : `<p class="pager-end">That is everything available so far. More modules are on the way.</p>`}</nav>`);
    (footer ?? card).before(done, pager);

    const btn = done.querySelector("button");
    const status = done.querySelector(".complete-status");
    const paint = () => {
      const isDone = progress.status(c.id) === "done";
      btn.textContent = isDone ? "✓ Completed · undo" : "Mark complete";
      btn.classList.toggle("button-secondary", isDone);
      btn.classList.toggle("button", !isDone);
    };
    paint();
    progress.subscribe(paint);
    btn.addEventListener("click", () => {
      const nowDone = progress.status(c.id) !== "done";
      progress.setDone(c.id, nowDone);
      status.textContent = nowDone ? "Marked complete. Press the button again to undo." : "Completion undone. This card is still marked visited.";
    });
  }

  track(shell, cards, byAnchor);
  summariseModule(shell, mod);
}

// Visited: the card heading reaches the top 30% of the viewport, or its heading has stayed in view ~2 s.
function track({ progress, setCurrent }, cards, byAnchor) {
  if (!("IntersectionObserver" in window)) return;
  const timers = new Map();
  const visit = (card) => {
    const c = byAnchor.get(card.id);
    if (!c || c.status !== "built") return;
    progress.markVisited(c.id);
  };
  const band = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const card = e.target.closest("article.concept-card");
      visit(card);
      setCurrent(byAnchor.get(card.id)?.id);
    }
  }, { rootMargin: "0px 0px -70% 0px" });
  const dwell = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const card = e.target.closest("article.concept-card");
      clearTimeout(timers.get(card));
      if (e.isIntersecting) {
        timers.set(card, setTimeout(() => { if (document.visibilityState === "visible") visit(card); }, VISIT_DWELL_MS));
      }
    }
  });
  for (const card of cards) {
    const h = card.querySelector(":scope > header h2");
    if (h) { band.observe(h); dwell.observe(h); }
  }
}

// Module hero line: "3 of 10 concepts complete" and a Resume link.
function summariseModule({ course, progress }, mod) {
  const slot = document.querySelector("[data-module-progress]");
  if (!slot) return;
  const paint = () => {
    const p = progress.moduleProgress(mod.id);
    slot.textContent = `${p.done} of ${p.total} concepts complete${p.planned ? ` · ${p.total} of ${p.all} concepts available` : ""}`;
  };
  paint();
  progress.subscribe(paint);
}
