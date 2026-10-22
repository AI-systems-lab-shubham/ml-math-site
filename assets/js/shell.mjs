// Page shell: navigation drawer / rail, and the saved progress checklist.
import { readStore, writeStore } from "./store.mjs";

export function initNav() {
  const button = document.querySelector("[data-nav-toggle]");
  const nav = document.getElementById("site-nav");
  const layout = document.querySelector(".layout");
  if (!button || !nav) return;
  const wide = window.matchMedia("(min-width: 1100px)");

  const set = (open) => {
    button.setAttribute("aria-expanded", String(open));
    if (wide.matches) layout.classList.toggle("rail-collapsed", !open);
    else nav.classList.toggle("is-open", open);
  };
  set(wide.matches);
  button.addEventListener("click", () => set(button.getAttribute("aria-expanded") !== "true"));
  wide.addEventListener("change", () => { layout.classList.remove("rail-collapsed"); nav.classList.remove("is-open"); set(wide.matches); });
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && !wide.matches && nav.classList.contains("is-open") && document.querySelector(".glossary-popover")?.hidden !== false) {
      set(false);
      button.focus();
    }
  });
  nav.addEventListener("click", (ev) => { if (ev.target.closest("a") && !wide.matches) set(false); });
}

export function initProgress() {
  document.querySelectorAll("[data-progress-module]").forEach((panel) => {
    const key = `progress.${panel.dataset.progressModule}`;
    const done = new Set(readStore(key, []));
    const boxes = [...panel.querySelectorAll("[data-progress-concept]")];
    const summary = panel.querySelector("[data-progress-summary]");
    const update = () => {
      if (summary) summary.textContent = `${done.size} of ${boxes.length} concepts explored`;
    };
    boxes.forEach((li) => {
      const id = li.dataset.progressConcept;
      const input = li.querySelector("input");
      input.checked = done.has(id);
      input.addEventListener("change", () => {
        if (input.checked) done.add(id); else done.delete(id);
        writeStore(key, [...done]);
        update();
      });
    });
    update();
  });
}
