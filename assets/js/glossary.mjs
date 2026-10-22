// Glossary engine: marks terms, renders popovers (hover, focus, tap), chains definitions, handles symbols.
import { renderTex } from "./math-render.mjs";
import { readStore, writeStore } from "./store.mjs";

const siteRoot = new URL(document.querySelector('meta[name="site-root"]')?.content ?? "./", document.baseURI);
const HOVER_DELAY = 250;
const LEAVE_DELAY = 250;

let entries = new Map();
let symbols = {};
let forms = new Map(); // normalised surface form -> id

const norm = (s) => s.toLowerCase().replace(/s$/, "");
const colorVar = (name) => `var(--c-${name})`;

const pop = document.createElement("div");
pop.className = "glossary-popover";
pop.setAttribute("role", "dialog");
pop.tabIndex = -1;
pop.hidden = true;

let stack = [];
let trigger = null;
let pinned = false;
let hoverTimer = 0;
let leaveTimer = 0;
let restoringFocus = false;

export async function initGlossary() {
  try {
    const res = await fetch(new URL("data/glossary.json", siteRoot));
    const data = await res.json();
    entries = new Map(data.entries.map((e) => [e.id, e]));
    symbols = data.symbols ?? {};
  } catch {
    // Without the data file the terms stay readable as plain text.
    return;
  }
  for (const e of entries.values()) {
    for (const f of [e.term, ...(e.aliases ?? [])]) forms.set(norm(f), e.id);
  }
  document.body.append(pop);
  prepare(document);
  applyHighlightAll(readStore("highlightAll", false));
  wireToggle();
  document.addEventListener("keydown", onKeydown);
  document.addEventListener("pointerdown", onOutside);
  pop.addEventListener("pointerenter", () => clearTimeout(leaveTimer));
  pop.addEventListener("pointerleave", () => { if (!pinned) scheduleClose(); });
}

/** Wire every term and symbol under root. Safe to call again after new content is added. */
export function prepare(root) {
  markFirstUses(root);
  root.querySelectorAll("[data-term]:not([data-ready])").forEach((el) => {
    el.dataset.ready = "1";
    bind(el, () => ({ kind: "term", id: el.dataset.term }));
  });
  root.querySelectorAll("[data-sym]:not([data-ready])").forEach((el) => {
    const s = symbols[el.dataset.sym];
    if (!s) return;
    el.dataset.ready = "1";
    el.classList.add("sym");
    el.tabIndex = 0;
    el.setAttribute("role", "button");
    el.setAttribute("aria-haspopup", "dialog");
    if (s.color) el.style.color = colorVar(s.color);
    bind(el, () => ({ kind: "sym", id: el.dataset.sym, text: el.textContent.trim() }));
  });
}

function markFirstUses(root) {
  const scopes = root.querySelectorAll
    ? root.querySelectorAll("[data-stage], .concept-card > header, .page-hero, .progress-panel")
    : [];
  scopes.forEach((scope) => {
    const seen = new Set();
    scope.querySelectorAll("[data-term]").forEach((el) => {
      if (!seen.has(el.dataset.term)) {
        seen.add(el.dataset.term);
        el.classList.add("is-marked");
        el.tabIndex = 0;
      }
    });
  });
}

function bind(el, makeRef) {
  el.setAttribute("aria-haspopup", "dialog");
  el.addEventListener("pointerenter", (ev) => {
    if (ev.pointerType !== "mouse") return;
    clearTimeout(leaveTimer);
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => { if (!pinned || trigger !== el) open(el, makeRef(), false); }, HOVER_DELAY);
  });
  el.addEventListener("pointerleave", () => {
    clearTimeout(hoverTimer);
    if (!pinned && trigger === el) scheduleClose();
  });
  el.addEventListener("focus", () => {
    if (!restoringFocus && el.matches(":focus-visible")) open(el, makeRef(), true);
  });
  el.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      open(el, makeRef(), true);
      pop.focus();
    }
  });
  el.addEventListener("click", (ev) => {
    if (ev.detail === 0) return; // keyboard activation handled above
    if (!pop.hidden && trigger === el && pinned) close(false);
    else open(el, makeRef(), true);
  });
}

function scheduleClose() {
  clearTimeout(leaveTimer);
  leaveTimer = setTimeout(() => close(false), LEAVE_DELAY);
}

function open(el, ref, pin) {
  clearTimeout(leaveTimer);
  trigger = el;
  pinned = pin;
  stack = [ref];
  render();
  pop.hidden = false;
  position();
}

function close(returnFocus) {
  clearTimeout(hoverTimer);
  clearTimeout(leaveTimer);
  if (pop.hidden) return;
  pop.hidden = true;
  stack = [];
  const t = trigger;
  trigger = null;
  pinned = false;
  if (returnFocus && t) {
    restoringFocus = true; // returning focus must not reopen the popover
    t.focus({ preventScroll: true });
    restoringFocus = false;
  }
}

function onKeydown(ev) {
  if (ev.key === "Escape" && !pop.hidden) {
    ev.preventDefault();
    close(true);
  }
}

function onOutside(ev) {
  if (pop.hidden || pop.contains(ev.target) || trigger?.contains(ev.target)) return;
  close(false);
}

function position() {
  const r = trigger.getBoundingClientRect();
  const gap = 8;
  const pw = pop.offsetWidth;
  const ph = pop.offsetHeight;
  const below = window.innerHeight - r.bottom;
  const placeBelow = below >= ph + gap || below >= r.top;
  const top = placeBelow ? r.bottom + gap : r.top - ph - gap;
  let left = r.left + r.width / 2 - pw / 2;
  left = Math.max(12, Math.min(left, document.documentElement.clientWidth - pw - 12));
  pop.style.top = `${Math.max(window.scrollY + 4, window.scrollY + top)}px`;
  pop.style.left = `${window.scrollX + left}px`;
}

function render() {
  const ref = stack[stack.length - 1];
  pop.replaceChildren();
  const add = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    pop.append(n);
    return n;
  };

  let uses = [];
  if (ref.kind === "sym") {
    const s = symbols[ref.id];
    pop.setAttribute("aria-label", `Symbol ${ref.text}`);
    add("p", "pop-kind", "Symbol in this formula");
    add("h4", "", ref.text);
    add("p", "", s.meaning);
  } else {
    const e = entries.get(ref.id);
    if (!e) return;
    pop.setAttribute("aria-label", e.term);
    add("p", "pop-kind", { math: "Maths term", ml: "Machine-learning term", llm: "Language-model term" }[e.kind] ?? "Term");
    add("h4", "", e.term);
    linkedText(add("p", ""), e.plain, e.uses);
    if (e.math) {
      const m = add("div", "pop-math");
      renderTex(e.math, m, false);
    }
    if (e.llm) {
      const p = add("p", "pop-llm");
      p.append(Object.assign(document.createElement("strong"), { textContent: "In an LLM: " }));
      linkedText(p, e.llm, e.uses);
    }
    if (e.looseUse) add("p", "pop-loose", `Used loosely: ${e.looseUse}`);
    uses = e.uses ?? [];
  }

  const actions = add("div", "pop-actions");
  if (stack.length > 1) {
    const back = document.createElement("button");
    back.type = "button";
    back.className = "pop-back";
    back.textContent = "← Back";
    back.addEventListener("click", () => { stack.pop(); render(); position(); pop.focus(); });
    actions.append(back);
  }
  if (ref.kind === "term") {
    const e = entries.get(ref.id);
    if (e?.learnMore) {
      const a = document.createElement("a");
      a.href = new URL(e.learnMore, siteRoot).href;
      a.textContent = "Learn more";
      actions.append(a);
    }
  }
  const x = document.createElement("button");
  x.type = "button";
  x.className = "pop-close";
  x.textContent = "Close";
  x.addEventListener("click", () => close(true));
  actions.append(x);

  const remaining = uses.filter((u) => entries.has(u) && !pop.querySelector(`[data-chain="${u}"]`));
  if (remaining.length) {
    const p = add("p", "pop-uses", "Also used here: ");
    remaining.forEach((u, i) => {
      if (i) p.append(", ");
      p.append(chainButton(u, entries.get(u).term));
    });
  }
}

function chainButton(id, text) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "pop-term";
  b.dataset.chain = id;
  b.textContent = text;
  b.addEventListener("click", () => {
    stack.push({ kind: "term", id });
    render();
    position();
    pop.focus();
  });
  return b;
}

/** Fill `target` with `text`, turning the first mention of each id in `uses` into a chained-term button. */
function linkedText(target, text, uses = []) {
  const wanted = new Set(uses.filter((u) => entries.has(u)));
  const surface = [];
  for (const [f, id] of forms) if (wanted.has(id)) surface.push(f);
  if (!surface.length) { target.textContent = text; return; }
  surface.sort((a, b) => b.length - a.length);
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\b(?:${surface.map(esc).join("|")})s?\\b`, "gi");
  const done = new Set();
  let last = 0;
  for (const m of text.matchAll(re)) {
    const id = forms.get(norm(m[0]));
    if (!id || done.has(id)) continue;
    done.add(id);
    target.append(text.slice(last, m.index));
    target.append(chainButton(id, m[0]));
    last = m.index + m[0].length;
  }
  target.append(text.slice(last));
}

/* ---------- highlight all terms ---------- */
function applyHighlightAll(on) {
  document.body.classList.toggle("highlight-all", on);
  document.querySelectorAll("[data-term]").forEach((el) => {
    if (on) el.tabIndex = 0;
    else if (!el.classList.contains("is-marked")) el.removeAttribute("tabindex");
  });
  document.querySelectorAll("[data-highlight-toggle]").forEach((b) => b.setAttribute("aria-pressed", String(on)));
}

function wireToggle() {
  document.querySelectorAll("[data-highlight-toggle]").forEach((b) => {
    b.addEventListener("click", () => {
      const on = !document.body.classList.contains("highlight-all");
      writeStore("highlightAll", on);
      applyHighlightAll(on);
    });
  });
}
