// Module overview page: fills in progress, status icons and the Start / Continue button from the saved progress,
// and redirects old links (#concept-x) from when a module was one long page.
import { initShell, hrefTo } from "./shell.mjs";
import { builtConcepts, overviewAction } from "./course.mjs";
import { stateIcon, stateLabel } from "./state-icons.mjs";
import { createToast } from "./toast.mjs";
import { showPendingUndo } from "./lesson.mjs";

async function boot() {
  const shell = await initShell({ moduleId: document.querySelector('meta[name="module-id"]')?.content });
  if (!shell) return;
  const { course, progress, moduleId } = shell;
  const mod = course.modules.find((m) => m.id === moduleId);
  if (!mod) return;
  const button = document.querySelector("[data-overview-action]");
  const slot = document.querySelector("[data-module-progress]");

  const paint = () => {
    for (const el of document.querySelectorAll("[data-ov-state]")) {
      const st = progress.status(el.dataset.ovState);
      if (el.dataset.status === st) continue;
      el.dataset.status = st;
      el.className = `ov-state state-${st}`;
      el.innerHTML = `${stateIcon(st)}<span class="sr-only">${stateLabel(st)}: </span>`;
    }
    const p = progress.moduleProgress(mod.id);
    if (slot) slot.textContent = `${p.done} of ${p.total} concepts complete${p.revisit ? ` · ${p.revisit} to revisit` : ""}`;
    const act = overviewAction(mod, (id) => progress.status(id));
    if (act && button) {
      button.textContent = act.label;
      button.setAttribute("href", hrefTo(act.concept.path));
    }
  };
  paint();
  progress.subscribe(paint);
  showPendingUndo(shell, createToast());
}
boot();
