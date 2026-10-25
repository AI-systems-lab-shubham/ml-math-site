// Lesson template: breadcrumb, meta, outcomes, takeaways, the four-option status control, Previous / Up next,
// and automatic "in progress" tracking. Reads everything from course.json via the shell.
// The status control is cheap, so it is built here, eagerly, and never inside a lazy [data-widget] placeholder.
import { findConcept, neighbours, renderInline } from "./course.mjs";
import { hrefTo } from "./shell.mjs";
import { STATUSES } from "./progress.mjs";
import { stateIcon, stateLabel } from "./state-icons.mjs";
import { continueMode, continueLabel, makePending, readPending, PENDING_KEY } from "./continue-math.mjs";
import { createToast } from "./toast.mjs";

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
    // `c` may be a copy from the Previous / Up next chain, so find its module by id rather than by identity.
    const m = course.modules.find((x) => x.concepts.some((y) => y.id === c.id)) ?? from;
    return m.id === moduleId ? `#${c.anchor}` : hrefTo(`${m.path}#${c.anchor}`);
  };

  const toast = createToast();
  const goTo = (c) => { // jump to a concept's card and put focus on its heading (no scroll of its own)
    const h = document.querySelector(`#${c.anchor} > header h2`);
    if (h) requestAnimationFrame(() => h.focus({ preventScroll: true }));
  };
  const undoToast = (c, res) => toast.show({
    text: `“${c.title}” marked complete.`,
    actionLabel: "Undo",
    onAction: () => {
      const ok = progress.undo(c.id, res.previous, res.statusAt);
      toast.show(ok ? { text: `Undone: “${c.title}” is back to ${stateLabel(res.previous.status).toLowerCase()}.` }
                    : { text: `Could not undo: “${c.title}” has been changed since.` });
    },
  });

  for (const card of cards) {
    const c = byAnchor.get(card.id);
    if (!c || c.status !== "built") continue;
    const header = card.querySelector(":scope > header");
    card.querySelector(":scope > header h2")?.setAttribute("tabindex", "-1");
    const { prev, next } = neighbours(course, c.id);

    const needs = (c.requires ?? []).map((id) => findConcept(course, id)).filter(Boolean);
    const builds = needs.length
      ? `Builds on: ${needs.map((n) => `<a href="${linkTo(n.concept, n.module)}">${esc(n.concept.title)}</a>`).join(", ")} (a suggestion, not a lock)`
      : "Needs only high-school maths";
    header.append(el(`<p class="lesson-meta"><span>About ${c.minutes} min</span><span>${c.size === "full" ? "Full card" : "Compact card"}</span><span>${builds}</span></p>`));

    if (c.objectives.length) {
      header.append(el(`<div class="outcomes"><h3 class="box-title">By the end of this card you’ll be able to…</h3>
        <ul>${c.objectives.map((o) => `<li>${renderInline(o)}</li>`).join("")}</ul></div>`));
    }

    const teach = card.querySelector(":scope > details.teach-it");
    const footer = card.querySelector(":scope > footer");
    if (c.takeaways.length) {
      (teach ?? footer).before(el(`<div class="takeaways"><h3 class="box-title">Key takeaways</h3>
        <ul>${c.takeaways.map((t) => `<li>${renderInline(t)}</li>`).join("")}</ul></div>`));
    }

    const group = `status-${c.id}`;
    const done = el(`<div class="lesson-done is-fresh"><fieldset class="status-control"><legend>Your progress on this card</legend>
      <div class="status-options">${STATUSES.map((st) => `<label class="status-opt state-${st}"><input type="radio" name="${group}" value="${st}"><span class="status-face">${stateIcon(st)}<span>${stateLabel(st)}</span></span></label>`).join("")}</div></fieldset>
      <div class="lesson-actions"><button class="button lesson-primary" type="button" data-continue></button></div>
      <div class="status-feedback"><p class="complete-status" role="status"></p><button class="button-secondary button-small" type="button" data-undo hidden>Undo</button></div></div>`);
    const nextHref = next ? linkTo(next, mod) : null;
    const pager = el(`<nav class="pager" aria-label="Previous and next concept for ${esc(c.title)}">
      ${prev ? `<a class="pager-prev" href="${linkTo(prev, mod)}" rel="prev"><span class="pager-label">Previous</span><span class="pager-title">${esc(prev.title)}</span></a>` : "<span></span>"}
      ${next ? `<a class="pager-next" href="${nextHref}" rel="next"><span class="pager-label">Up next · about ${next.minutes} min</span><span class="pager-title">${esc(next.title)}</span></a>`
             : `<p class="pager-end">That is everything available so far. More modules are on the way.</p>`}</nav>`);
    (footer ?? card).before(done, pager);

    const undoBtn = done.querySelector("[data-undo]");
    const primary = done.querySelector("[data-continue]");
    const note = done.querySelector(".complete-status");
    const radios = [...done.querySelectorAll('input[type="radio"]')];
    const mode = () => continueMode(progress.status(c.id), next);
    const paint = () => {
      const st = progress.status(c.id);
      radios.forEach((r) => { r.checked = r.value === st; });
      const m = mode();
      primary.hidden = m === "none";
      primary.textContent = continueLabel(m, next?.title);
    };
    paint();
    progress.subscribe(paint);
    // The first paint of the saved status is not a change the learner made: no transition until the next frame.
    requestAnimationFrame(() => requestAnimationFrame(() => done.classList.remove("is-fresh")));
    let undoTo = null;
    let undoAt = null;
    for (const r of radios) {
      r.addEventListener("change", () => {
        if (!r.checked) return;
        const res = progress.setStatus(c.id, r.value);
        if (!res) return;
        undoTo = res.previous;
        undoAt = null;
        note.textContent = `Marked ${stateLabel(r.value).toLowerCase()}.`;
        undoBtn.hidden = false;
      });
    }
    primary.addEventListener("click", () => {
      const m = mode();
      if (m === "continue") { go(); return; }
      const res = progress.setStatus(c.id, "complete");
      if (!res) return;
      undoTo = res.previous;
      undoAt = res.statusAt;
      note.textContent = "Marked complete.";
      undoBtn.hidden = false;
      if (m === "mark-continue") go(res);
    });
    // Moves to the next concept: in this page by hash, in another page by address. The undo travels with the learner.
    const go = (res) => {
      if (res) {
        const pending = makePending({ id: c.id, title: c.title, previous: res.previous, expectedAt: res.statusAt }, Date.now());
        if (next.moduleId === mod.id) { undoToast(c, res); location.hash = `#${next.anchor}`; goTo(next); return; }
        try { sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending)); } catch { /* storage blocked: the undo stays on this card */ }
      }
      location.href = linkTo(next, mod);
    };
    undoBtn.addEventListener("click", () => {
      if (!undoTo) return;
      if (undoAt && !progress.undo(c.id, undoTo, undoAt)) { note.textContent = "Could not undo: this card has been changed since."; undoTo = null; undoAt = null; undoBtn.hidden = true; return; }
      if (!undoAt) progress.undo(c.id, undoTo);
      note.textContent = `Back to ${stateLabel(undoTo.status).toLowerCase()}.`;
      undoTo = null;
      undoAt = null;
      undoBtn.hidden = true;
      (radios.find((r) => r.checked) ?? primary).focus();
    });
  }

  // Arrived through "Mark complete and continue" from another page: show its undo here, and put focus on the heading.
  let raw = null;
  try { raw = sessionStorage.getItem(PENDING_KEY); sessionStorage.removeItem(PENDING_KEY); } catch { /* storage blocked */ }
  const pending = readPending(raw, Date.now(), (id) => !!findConcept(course, id));
  if (pending) {
    const c = findConcept(course, pending.id).concept;
    undoToast(c, { previous: pending.previous, statusAt: pending.expectedAt });
    const here = byAnchor.get(location.hash.slice(1));
    if (here) goTo(here);
  }

  track(shell, cards, byAnchor);
  summariseModule(shell, mod);
}

// Opened: the card heading reaches the top 30% of the viewport, or its heading has stayed in view ~2 s.
function track({ progress, setCurrent }, cards, byAnchor) {
  if (!("IntersectionObserver" in window)) return;
  const timers = new Map();
  const visit = (card) => {
    const c = byAnchor.get(card.id);
    if (!c || c.status !== "built") return;
    progress.markOpened(c.id);
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
    slot.textContent = `${p.done} of ${p.total} concepts complete${p.revisit ? ` · ${p.revisit} to revisit` : ""}${p.planned ? ` · ${p.total} of ${p.all} concepts available` : ""}`;
  };
  paint();
  progress.subscribe(paint);
}
