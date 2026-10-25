// Module switcher inside "On this page": a secondary button labelled "Module › Card" that opens, inline, a list of
// every module read from course.json. Each module row is a link to the module's overview page plus a separate chevron
// button (a sibling of the link, never inside it) that shows or hides its concepts. Modules with no built concepts
// are "Coming soon" and are not links. Status icons are display-only.
import { hrefTo, stateIcon } from "./shell.mjs";
import { builtConcepts } from "./course.mjs";
import { stateLabel } from "./state-icons.mjs";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const CHEV = '<span class="chev" aria-hidden="true"></span>';

export function createModuleSwitch({ course, moduleId, progress }) {
  const root = document.createElement("div");
  root.className = "module-switch";
  const modules = course.modules.map((m, i) => ({ m, i, built: builtConcepts(m) }));
  const here = course.modules.find((m) => m.id === moduleId);
  const href = (c) => hrefTo(c.path);

  const rows = modules.map(({ m, i, built }) => {
    const num = `<span class="msw-num" aria-hidden="true">${i}</span><span class="sr-only">Module ${i}: </span>`;
    if (m.status !== "built" || built.length === 0) {
      return `<li class="msw-module is-planned"><div class="msw-head"><span class="msw-soon-title">${num}${esc(m.title)}</span><span class="outline-soon">Coming soon</span></div></li>`;
    }
    const open = m.id === moduleId;
    const concepts = built.map((c) => `<li><a href="${href(c)}" data-switch-cid="${c.id}"><span class="msw-state" data-switch-state="${c.id}" aria-hidden="true"></span><span class="msw-title">${esc(c.title)}</span><span class="sr-only" data-switch-sr="${c.id}"></span></a></li>`).join("");
    return `<li class="msw-module${open ? " is-current" : ""}"><div class="msw-head">
        <button type="button" class="msw-toggle" aria-expanded="${open}" aria-controls="msw-${m.id}" aria-label="Concepts in ${esc(m.title)}">${CHEV}</button>
        <a class="msw-link" href="${hrefTo(m.path)}">${num}${esc(m.title)}</a></div>
      <ul class="msw-concepts" id="msw-${m.id}"${open ? "" : " hidden"}>${concepts}</ul></li>`;
  }).join("");

  root.innerHTML = `<button type="button" class="button-secondary module-switch-btn" aria-expanded="false" aria-controls="module-switch-list"><span class="module-switch-label"></span>${CHEV}</button>
    <div class="module-switch-list" id="module-switch-list" hidden><ul class="msw-modules">${rows}</ul></div>`;

  const btn = root.querySelector(".module-switch-btn");
  const label = root.querySelector(".module-switch-label");
  const list = root.querySelector(".module-switch-list");

  const isOpen = () => btn.getAttribute("aria-expanded") === "true";
  const setOpen = (open) => { btn.setAttribute("aria-expanded", String(open)); list.hidden = !open; };
  btn.addEventListener("click", () => setOpen(!isOpen()));
  root.querySelectorAll(".msw-toggle").forEach((t) => t.addEventListener("click", () => {
    const open = t.getAttribute("aria-expanded") !== "true";
    t.setAttribute("aria-expanded", String(open));
    root.querySelector(`#${t.getAttribute("aria-controls")}`).hidden = !open;
  }));
  list.addEventListener("click", (ev) => { if (ev.target.closest("a")) setOpen(false); });

  const paint = () => {
    for (const el of root.querySelectorAll("[data-switch-state]")) {
      const st = progress.status(el.dataset.switchState);
      if (el.dataset.status === st) continue;
      el.dataset.status = st;
      el.className = `msw-state state-${st}`;
      el.innerHTML = stateIcon(st);
      root.querySelector(`[data-switch-sr="${el.dataset.switchState}"]`).textContent = `: ${stateLabel(st)}`;
    }
  };
  paint();
  progress.subscribe(paint);

  return {
    element: root, button: btn,
    isOpen, close: () => setOpen(false),
    // The card in view: the button's label and the current concept's aria-current.
    setCurrent(conceptId, cardTitle) {
      label.textContent = `${here?.title ?? ""} › ${cardTitle}`;
      root.querySelectorAll("[aria-current]").forEach((a) => a.removeAttribute("aria-current"));
      if (conceptId) root.querySelector(`a[data-switch-cid="${conceptId}"]`)?.setAttribute("aria-current", "true");
    },
  };
}
