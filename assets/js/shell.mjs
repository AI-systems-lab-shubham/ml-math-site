// Page shell: navigation drawer / rail, and the saved progress checklist.
import { readStore, writeStore } from "./store.mjs";
import { createProgress } from "./progress.mjs";
import { chain, builtConcepts, totalMinutes } from "./course.mjs";

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

// ---------------------------------------------------------------------------
// Course shell (header, outline, footer) built from data/course.json.
// The static page keeps a plain fallback (brand link, link list) in case scripts fail.
// ---------------------------------------------------------------------------
const siteRoot = new URL(document.querySelector('meta[name="site-root"]')?.content ?? "./", document.baseURI);
export const hrefTo = (path) => new URL(path, siteRoot).href;

const STATE_LABEL = { new: "Not started", visited: "Visited", done: "Complete" };
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const RING_R = 9;
const RING_C = 2 * Math.PI * RING_R;

// Icon shapes differ as well as colour: empty circle, half-filled circle, tick in a circle.
export function stateIcon(status) {
  const base = '<svg class="state-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">';
  if (status === "done") return `${base}<circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M7 12.5l3.2 3.2L17 8.8" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  if (status === "visited") return `${base}<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg>`;
  return `${base}<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
}

export function ringSvg(percent) {
  const dash = (RING_C * percent) / 100;
  return `<svg class="ring" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="${RING_R}" fill="none" stroke="var(--rule)" stroke-width="3"/><circle cx="12" cy="12" r="${RING_R}" fill="none" stroke="var(--ok)" stroke-width="3" stroke-dasharray="${dash.toFixed(2)} ${RING_C.toFixed(2)}" transform="rotate(-90 12 12)"/></svg>`;
}

async function loadCourse() {
  try {
    const res = await fetch(hrefTo("data/course.json"));
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function initShell({ moduleId = null } = {}) {
  const course = await loadCourse();
  if (!course) return null;
  const progress = createProgress({ course });
  const shell = { course, progress, moduleId, setCurrent: () => {} };

  buildHeader(shell);
  if (moduleId) buildOutline(shell);
  buildFooter(shell);
  buildNotice(shell);
  return shell;
}

function buildHeader({ course, progress, moduleId }) {
  const header = document.getElementById("site-header");
  if (!header) return;
  header.innerHTML = `
    ${moduleId ? '<button class="button-secondary button-small" type="button" data-nav-toggle aria-controls="site-nav" aria-expanded="false">Menu</button>' : ""}
    <a class="brand" href="${hrefTo("index.html")}">ML Math</a>
    <div class="topbar-actions">
      <a class="topbar-progress" href="${hrefTo("index.html#syllabus")}" data-course-progress></a>
      <button class="button-secondary button-small" type="button" data-highlight-toggle aria-label="Highlight all terms" aria-pressed="false"><span class="long">Highlight all terms</span><span class="short">Terms</span></button>
    </div>`;
  const slot = header.querySelector("[data-course-progress]");
  const paint = () => {
    const p = progress.courseProgress();
    slot.setAttribute("aria-label", `Course progress: ${p.done} of ${p.total} available concepts complete. Go to the syllabus.`);
    slot.innerHTML = `${ringSvg(p.percent)}<span class="topbar-progress-text">${p.done} of ${p.total} complete</span>`;
  };
  paint();
  progress.subscribe(paint);
  if (moduleId) wireDrawer(header);
}

function wireDrawer(header) {
  const button = header.querySelector("[data-nav-toggle]");
  const nav = document.getElementById("site-nav");
  const layout = document.querySelector(".layout");
  const wide = window.matchMedia("(min-width: 1100px)");
  const set = (open, focus = false) => {
    button.setAttribute("aria-expanded", String(open));
    if (wide.matches) layout.classList.toggle("rail-collapsed", !open);
    else nav.classList.toggle("is-open", open);
    if (open && focus && !wide.matches) nav.querySelector("summary, a")?.focus();
  };
  set(wide.matches);
  button.addEventListener("click", () => set(button.getAttribute("aria-expanded") !== "true", true));
  wide.addEventListener("change", () => { layout.classList.remove("rail-collapsed"); nav.classList.remove("is-open"); set(wide.matches); });
  document.addEventListener("keydown", (ev) => {
    const popoverOpen = document.querySelector(".glossary-popover")?.hidden === false;
    if (ev.key === "Escape" && !wide.matches && nav.classList.contains("is-open") && !popoverOpen) { set(false); button.focus(); }
  });
  nav.addEventListener("click", (ev) => { if (ev.target.closest("a") && !wide.matches) set(false); });
}

function buildOutline(shell) {
  const { course, progress, moduleId } = shell;
  const nav = document.getElementById("site-nav");
  if (!nav) return;
  const link = (m, c) => (m.id === moduleId ? `#${c.anchor}` : hrefTo(`${m.path}#${c.anchor}`));
  const modules = course.modules.map((m) => {
    if (m.status !== "built") {
      return `<li class="outline-module is-planned"><div class="outline-planned"><span class="outline-planned-title">${esc(m.title)}</span><span class="outline-soon">Coming soon</span></div></li>`;
    }
    const open = m.id === moduleId || progress.isOpen(`outline:${m.id}`);
    const rows = m.concepts.map((c) => c.status === "built"
      ? `<li><a href="${link(m, c)}" data-cid="${c.id}"><span class="outline-state" data-state-of="${c.id}"></span><span class="outline-title">${esc(c.title)}</span></a></li>`
      : `<li><span class="outline-disabled" aria-disabled="true"><span class="outline-state">${stateIcon("new")}</span><span class="outline-title">${esc(c.title)}</span><span class="outline-soon">Coming soon</span></span></li>`).join("");
    return `<li class="outline-module"><details data-module="${m.id}"${open ? " open" : ""}>
      <summary><span class="chev" aria-hidden="true"></span><span class="outline-mod-title">${esc(m.title)}</span><span class="outline-mod-progress" data-mod-progress="${m.id}"></span></summary>
      <ul class="sub">${rows}</ul></details></li>`;
  }).join("");
  nav.innerHTML = `<h2 id="outline-title">Course outline</h2><ol aria-labelledby="outline-title">${modules}</ol>`;
  nav.setAttribute("aria-label", "Course outline");

  nav.querySelectorAll("details[data-module]").forEach((d) => d.addEventListener("toggle", () => progress.setOpen(`outline:${d.dataset.module}`, d.open)));

  const paint = () => {
    nav.querySelectorAll("[data-state-of]").forEach((el) => {
      const st = progress.status(el.dataset.stateOf);
      el.className = `outline-state state-${st}`;
      el.innerHTML = `${stateIcon(st)}<span class="sr-only">${STATE_LABEL[st]}: </span>`;
    });
    nav.querySelectorAll("[data-mod-progress]").forEach((el) => {
      const p = progress.moduleProgress(el.dataset.modProgress);
      el.innerHTML = `${ringSvg(p.percent)}<span class="outline-count">${p.done} of ${p.total}<span class="sr-only"> concepts complete</span></span>`;
    });
  };
  paint();
  progress.subscribe(paint);

  shell.setCurrent = (id) => {
    nav.querySelectorAll("[aria-current]").forEach((a) => a.removeAttribute("aria-current"));
    nav.querySelector(`a[data-cid="${id}"]`)?.setAttribute("aria-current", "page");
  };
}

function buildFooter({ course }) {
  const footer = document.getElementById("site-footer");
  if (!footer) return;
  footer.innerHTML = `
    <div class="footer-grid">
      <section aria-labelledby="f-sources"><h2 id="f-sources">Sources and further reading</h2>
        <p>Topic order follows <em>Mathematics for Machine Learning</em> by Deisenroth, Faisal and Ong (Cambridge University Press, 2020). Each concept points to the relevant chapter by number. The explanations and figures here are original.</p>
        <p>The interface follows ideas from <em>The Design of Everyday Things</em> by Don Norman.</p></section>
      <section aria-labelledby="f-use"><h2 id="f-use">How to use the site</h2>
        <p>Terms with a dotted underline open a plain-language and a mathematical definition on hover, focus or tap. Nothing is locked: the checklist is yours. Press <strong>Mark complete</strong> when you could explain the idea to someone else.</p>
        <p>Progress is saved only in this browser. Use Export and Import on the <a href="${hrefTo("index.html#how")}">course home page</a> to move it between devices.</p></section>
      <section aria-labelledby="f-a11y"><h2 id="f-a11y">Accessibility</h2>
        <p>Everything works from the keyboard. Animations start only when you press a button, and they stay still if your system asks for reduced motion. Every diagram has a text description.</p></section>
      <section aria-labelledby="f-lic"><h2 id="f-lic">Licences</h2>
        <p>Fonts: Fraunces, Inter and JetBrains Mono, under the SIL Open Font Licence (<a href="${hrefTo("licenses/Fraunces-OFL.txt")}">Fraunces</a>, <a href="${hrefTo("licenses/Inter-OFL.txt")}">Inter</a>, <a href="${hrefTo("licenses/JetBrainsMono-OFL.txt")}">JetBrains Mono</a>). Maths rendering: <a href="${hrefTo("vendor/katex/LICENSE")}">KaTeX, MIT licence</a>. Everything is bundled, so the site works offline.</p></section>
    </div>`;
}

// Says so when saved progress was unreadable or cannot be saved (never silent).
function buildNotice({ progress }) {
  const header = document.getElementById("site-header");
  if (!header) return;
  const box = document.createElement("div");
  box.className = "notice";
  box.setAttribute("role", "status");
  box.hidden = true;
  header.after(box);
  const paint = () => {
    const msgs = [];
    if (progress.recovered) msgs.push("Saved progress could not be read, so it was reset to empty.");
    if (!progress.persistent) msgs.push("This browser is blocking storage, so progress will be lost when you close the tab.");
    box.textContent = msgs.join(" ");
    box.hidden = msgs.length === 0;
  };
  paint();
  progress.subscribe(paint);
}
