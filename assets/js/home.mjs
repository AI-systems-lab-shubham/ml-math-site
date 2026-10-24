// Course home page: hero with Start / Resume, outcomes, syllabus accordion, how it works, Export / Import.
import { initShell, hrefTo, stateIcon, ringSvg } from "./shell.mjs";
import { builtConcepts, findConcept, totalMinutes } from "./course.mjs";
import { teaserMatVec } from "./linalg-math.mjs";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
import { stateLabel } from "./state-icons.mjs";
const STATE_LABEL = new Proxy({}, { get: (_, k) => stateLabel(k) });

function duration(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h} h ${m} min` : `${m} min`;
}

const shell = await initShell({ moduleId: null });
if (shell) {
  const { course, progress } = shell;
  const built = course.modules.filter((m) => m.status === "built");

  // Hero action
  const action = document.querySelector("[data-hero-action]");
  const paintHero = () => {
    const r = progress.resume();
    const hit = r?.id ? findConcept(course, r.id) : null;
    if (hit) {
      const label = { start: "Start the course", resume: `Resume: ${hit.concept.title}`, next: `Continue: ${hit.concept.title}` }[r.kind];
      action.innerHTML = `<a class="button" href="${hrefTo(`${hit.module.path}#${hit.concept.anchor}`)}">${esc(label)}</a>`;
    } else {
      action.innerHTML = '<p class="muted">You have completed everything available so far. More modules are on the way.</p>';
    }
  };
  paintHero();
  progress.subscribe(paintHero);
  const total = totalMinutes(course);
  document.querySelector("[data-total-time]").textContent = `${duration(total)} of lessons available now, in ${built.length} modules. More are planned.`;

  // Outcomes and module cards are static HTML (tools/check-course.mjs keeps them in step with course.json).

  // Teaser: the exact helper tested in tests/linalg-math.test.mjs. No animation; the slider only rewrites text.
  const teaser = document.querySelector("[data-teaser]");
  if (teaser) {
    const M = [[2, 0], [1, 3]];
    const slide = teaser.querySelector("input");
    const shown = teaser.querySelector("[data-teaser-value]");
    const readout = teaser.querySelector("[data-teaser-readout]");
    const paintTeaser = () => {
      const v1 = Number(slide.value);
      const t = teaserMatVec(M, [v1, 2]);
      shown.textContent = String(v1);
      readout.innerHTML = `<span class="k">Row by row:</span> ${t.rowText.map(esc).join("; ")}<br><span class="k">Output:</span> (${t.out.join(", ")}) with v₂ = 2`;
    };
    slide.addEventListener("input", paintTeaser);
    paintTeaser();
  }

  // Syllabus accordion
  const syllabus = document.querySelector("[data-syllabus]");
  const paintSyllabus = () => {
    syllabus.innerHTML = course.modules.map((m, i) => {
      if (m.status !== "built") return ""; // planned modules are shown, unlinked, in the module cards above
      const p = progress.moduleProgress(m.id);
      const open = progress.isOpen(`syllabus:${m.id}`) ? " open" : "";
      const avail = p.planned ? `${p.total} of ${p.all} concepts available` : `${p.total} concepts`;
      const rows = m.concepts.map((c) => c.status === "built"
        ? `<li><a href="${hrefTo(`${m.path}#${c.anchor}`)}"><span class="outline-state state-${progress.status(c.id)}">${stateIcon(progress.status(c.id))}<span class="sr-only">${STATE_LABEL[progress.status(c.id)]}: </span></span><span class="syllabus-concept">${esc(c.title)}</span><span class="syllabus-min">${c.minutes}\u00a0min</span></a></li>`
        : `<li class="syllabus-soon"><span class="outline-state">${stateIcon("new")}</span><span class="syllabus-concept">${esc(c.title)}</span><span class="outline-soon">Coming soon</span></li>`).join("");
      return `<li><details data-module="${m.id}"${open}><summary><span class="chev" aria-hidden="true"></span><span class="syllabus-name">Module ${i}: ${esc(m.title)}</span>
        <span class="syllabus-meta">${avail} · ${p.done} complete ${ringSvg(p.percent)}</span></summary>
        <p class="syllabus-summary">${esc(m.summary)}</p><ul class="syllabus-rows">${rows}</ul></details></li>`;
    }).join("");
    syllabus.querySelectorAll("details").forEach((d) => d.addEventListener("toggle", () => progress.setOpen(`syllabus:${d.dataset.module}`, d.open)));
  };
  // Rebuilding while a learner is interacting would lose focus, so repaint only on load and after import.
  paintSyllabus();

  // Export / Import
  const msg = document.querySelector("[data-transfer-status]");
  document.querySelector("[data-export]").addEventListener("click", () => {
    const url = URL.createObjectURL(new Blob([progress.exportJSON()], { type: "application/json" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "mlmath-progress.json" });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    msg.textContent = "Progress file downloaded.";
  });
  const file = document.querySelector("[data-import-file]");
  document.querySelector("[data-import]").addEventListener("click", () => file.click());
  file.addEventListener("change", async () => {
    const f = file.files[0];
    if (!f) return;
    const before = progress.exportJSON();
    const r = progress.importJSON(await f.text());
    file.value = "";
    if (!r.ok) { msg.textContent = `Nothing was changed. ${r.error} Choose a file saved with Export progress.`; return; }
    msg.textContent = "Progress imported. It replaced the progress saved in this browser. ";
    const undo = Object.assign(document.createElement("button"), { type: "button", className: "button-secondary button-small transfer-undo", textContent: "Undo import" });
    undo.addEventListener("click", () => { progress.importJSON(before); paintSyllabus(); msg.textContent = "Import undone. Your earlier progress is back."; });
    msg.append(undo);
    paintSyllabus();
  });
}
