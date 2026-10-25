// Lesson template for a concept page: meta, outcomes, takeaways, the four-option status control, the one primary
// button and a Previous link. A page holds one concept, and nothing on it previews what comes next.
// The status control is cheap, so it is built here, eagerly, and never inside a lazy [data-widget] placeholder.
import { findConcept, neighbours, continueTarget, renderInline } from "./course.mjs";
import { hrefTo } from "./shell.mjs";
import { STATUSES } from "./progress.mjs";
import { stateIcon, stateLabel } from "./state-icons.mjs";
import { continueMode, continueLabel, createDwell, makePending, readPending, PENDING_KEY } from "./continue-math.mjs";
import { createToast } from "./toast.mjs";

const el = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Shows the undo for a "Mark complete and continue" made on the previous page (kept in sessionStorage for a minute).
// Used by concept pages and module overviews. It never moves focus.
export function showPendingUndo(shell, toast) {
  const { course, progress } = shell;
  let raw = null;
  try { raw = sessionStorage.getItem(PENDING_KEY); sessionStorage.removeItem(PENDING_KEY); } catch { /* storage blocked */ }
  const pending = readPending(raw, Date.now(), (id) => !!findConcept(course, id));
  if (!pending) return;
  const c = findConcept(course, pending.id).concept;
  const res = { previous: pending.previous, statusAt: pending.expectedAt };
  toast.show({
    text: `“${c.title}” marked complete.`,
    actionLabel: "Undo",
    onAction: () => {
      const ok = progress.undo(c.id, res.previous, res.statusAt);
      toast.show(ok ? { text: `Undone: “${c.title}” is back to ${stateLabel(res.previous.status).toLowerCase()}.` }
                    : { text: `Could not undo: “${c.title}” has been changed since.` });
    },
  });
}

export function initLesson(shell) {
  if (!shell) return;
  const { course, progress, conceptId } = shell;
  const card = document.querySelector("article.concept-card[id]");
  const hit = findConcept(course, conceptId);
  if (!card || !hit || hit.concept.status !== "built") return;
  const c = hit.concept;
  const mod = hit.module;
  const toast = createToast();

  const header = card.querySelector(":scope > header");
  const heading = card.querySelector(":scope > header h1");
  heading?.setAttribute("tabindex", "-1");
  const { prev } = neighbours(course, c.id);
  const target = continueTarget(course, c.id);

  const needs = (c.requires ?? []).map((id) => findConcept(course, id)).filter(Boolean);
  const builds = needs.length
    ? `Builds on: ${needs.map((n) => `<a href="${hrefTo(n.concept.path)}">${esc(n.concept.title)}</a>`).join(", ")} (a suggestion, not a lock)`
    : "Needs only high-school maths";
  header.append(el(`<p class="lesson-meta"><span>About ${c.minutes} min</span><span>${c.size === "full" ? "Full card" : "Compact card"}</span><span>${builds}</span></p>`));

  if (c.objectives.length) {
    header.append(el(`<div class="outcomes"><h2 class="box-title">By the end of this card you’ll be able to…</h2>
      <ul>${c.objectives.map((o) => `<li>${renderInline(o)}</li>`).join("")}</ul></div>`));
  }

  const teach = card.querySelector(":scope > details.teach-it");
  const footer = card.querySelector(":scope > footer");
  if (c.takeaways.length) {
    (teach ?? footer).before(el(`<div class="takeaways"><h2 class="box-title">Key takeaways</h2>
      <ul>${c.takeaways.map((t) => `<li>${renderInline(t)}</li>`).join("")}</ul></div>`));
  }

  const group = `status-${c.id}`;
  const done = el(`<div class="lesson-done is-fresh"><fieldset class="status-control"><legend>Your progress on this card</legend>
    <div class="status-options">${STATUSES.map((st) => `<label class="status-opt state-${st}"><input type="radio" name="${group}" value="${st}"><span class="status-face">${stateIcon(st)}<span>${stateLabel(st)}</span></span></label>`).join("")}</div></fieldset>
    <div class="lesson-actions"><button class="button lesson-primary" type="button" data-continue></button>${target ? "" : `<a class="lesson-home-link" href="${hrefTo("index.html")}">Back to course home</a>`}</div>
    <div class="status-feedback"><p class="complete-status" role="status"></p><button class="button-secondary button-small" type="button" data-undo hidden>Undo</button></div></div>`);
  // Previous only: the previous concept's title may show; nothing points forward except the primary button.
  const pager = el(`<nav class="pager" aria-label="Previous concept">
    ${prev ? `<a class="pager-prev" href="${hrefTo(prev.path)}" rel="prev"><span class="pager-label">Previous</span><span class="pager-title">${esc(prev.title)}</span></a>` : ""}</nav>`);
  (footer ?? card).before(done, ...(prev ? [pager] : []));

  const undoBtn = done.querySelector("[data-undo]");
  const primary = done.querySelector("[data-continue]");
  const note = done.querySelector(".complete-status");
  const radios = [...done.querySelectorAll('input[type="radio"]')];
  const mode = () => continueMode(progress.status(c.id), target);
  const paint = () => {
    const st = progress.status(c.id);
    radios.forEach((r) => { r.checked = r.value === st; });
    const m = mode();
    primary.hidden = m === "none";
    primary.textContent = continueLabel(m);
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
    if (m === "continue") { location.href = hrefTo(target.path); return; }
    const res = progress.setStatus(c.id, "complete");
    if (!res) return;
    undoTo = res.previous;
    undoAt = res.statusAt;
    note.textContent = "Marked complete.";
    undoBtn.hidden = false;
    if (m === "mark-continue") {
      // The undo travels with the learner: it is shown on the next page.
      const pending = makePending({ id: c.id, title: c.title, previous: res.previous, expectedAt: res.statusAt }, Date.now());
      try { sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending)); } catch { /* storage blocked: the undo stays on this card */ }
      location.href = hrefTo(target.path);
    }
  });
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

  showPendingUndo(shell, toast);
  trackOpened(progress, c.id, done);
}

// A concept page counts as opened once it has been visible for about 2 seconds (Not started becomes In progress;
// Complete and Revisit are never changed by this).
function trackOpened(progress, id, done) {
  // Marking it opened is not a change the learner made, so the status control repaints without a transition.
  const quietly = () => {
    done.classList.add("is-fresh");
    progress.markOpened(id);
    requestAnimationFrame(() => requestAnimationFrame(() => done.classList.remove("is-fresh")));
  };
  const dwell = createDwell({ onFire: quietly, isVisible: () => document.visibilityState === "visible" });
  document.addEventListener("visibilitychange", () => dwell.visibilityChanged());
  dwell.start();
}
