// "On this page" nav (fixed beside the content from 1200px, a collapsible sticky bar below) with scrollspy,
// plus Expand all / Collapse all for the collapsible sections, anchors that open closed sections, and print.
// Predict-then-reveal panels (details.reveal) are answer gates: Expand all skips them and they are never remembered.
import { readUi, writeUi } from "./shell.mjs";
import { createModuleSwitch } from "./module-switch.mjs";
import { pickCurrent, sectionKey, withOpen, cleanOpen, plural, barAway } from "./page-nav-math.mjs";

const WIDE = "(min-width: 1200px)";
const el = (tag, attrs = {}, text) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (text != null) e.textContent = text; return e; };

const cards = () => [...document.querySelectorAll("main article.concept-card[id]")];
const stageLabel = (s) => { const h = s.querySelector(":scope > .stage-heading"); if (!h) return s.dataset.stage; const c = h.cloneNode(true); c.querySelector(".stage-number")?.remove(); return c.textContent.trim(); };

export function initPageNav(shell) {
  const nav = document.querySelector("[data-page-toc]");
  if (!nav) return;
  const toggle = nav.querySelector(".page-toc-toggle");
  const panel = nav.querySelector("[data-toc-panel]");
  const course = shell?.course;
  const moduleId = shell?.moduleId;
  const conceptOf = (cardId) => course?.modules.flatMap((m) => m.concepts).find((c) => c.anchor === cardId);
  // The switcher sits above the stage list; without course data the panel just names the card.
  const switcher = course && shell.progress ? createModuleSwitch({ course, moduleId, progress: shell.progress }) : null;
  const plainCard = switcher ? null : el("p", { class: "page-toc-card" });
  panel.append(switcher?.element ?? plainCard);
  const currentText = nav.querySelector("[data-toc-current]");
  const header = document.getElementById("site-header");
  const wide = matchMedia(WIDE);

  // One list per card, built once; only the current card's list is shown.
  const model = cards().map((card) => {
    const items = [...card.querySelectorAll(":scope > section[data-stage], :scope > details.teach-it")].map((s) => {
      const stage = s.dataset.stage ?? "teach-it";
      if (!s.id) s.id = `${card.id}-${stage}`;
      return { node: s, id: s.id, label: s.matches("details") ? "Teach it" : stageLabel(s) };
    });
    const list = el("ol", { class: "page-toc-list", "data-for": card.id });
    list.hidden = true;
    for (const it of items) {
      const li = el("li");
      const a = el("a", { href: `#${it.id}` }, it.label);
      li.append(a);
      list.append(li);
      it.link = a;
    }
    panel.append(list);
    return { card, title: card.querySelector(":scope > header h1")?.textContent.trim() ?? card.id, items, list };
  });

  let shownCard = null;
  let shownStage = null;
  const setOpen = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("is-open", open);
    if (!open) switcher?.close();
  };

  const measure = () => (header?.getBoundingClientRect().height ?? 61) + (wide.matches ? 0 : nav.getBoundingClientRect().height) + 24;
  const update = () => {
    const line = measure();
    const cardKey = pickCurrent(model.map((m) => ({ key: m.card.id, top: m.card.getBoundingClientRect().top })), line) ?? model[0]?.card.id;
    const m = model.find((x) => x.card.id === cardKey);
    if (!m) return;
    // The first stage counts as reached once the card heading is in view.
    const stageKey = pickCurrent(m.items.map((i) => ({ key: i.id, top: i.node.getBoundingClientRect().top })), line);
    if (cardKey !== shownCard) {
      for (const x of model) x.list.hidden = x !== m;
      if (switcher) switcher.setCurrent(conceptOf(m.card.id)?.id, m.title); else plainCard.textContent = m.title;
      shownCard = cardKey;
      shownStage = undefined;
    }
    if (stageKey !== shownStage) {
      for (const i of m.items) { if (i.id === stageKey) i.link.setAttribute("aria-current", "location"); else i.link.removeAttribute("aria-current"); }
      const item = m.items.find((i) => i.id === stageKey);
      // One concept per page, so the bar names only the stage (a long concept title would not fit the bar).
      currentText.textContent = item ? item.label : "Start of page";
      shownStage = stageKey;
    }
  };

  // Sticky bar below 1200px: slides away while reading down, returns on any scroll up.
  let lastY = scrollY;
  let away = false;
  let raf = 0;
  // A jump (page load with a hash, a link, a status shortcut) is not reading down: keep the bar for a moment.
  let calmUntil = performance.now() + 1500;
  const calm = () => { calmUntil = performance.now() + 1500; };
  addEventListener("hashchange", calm);
  document.addEventListener("click", (ev) => { if (ev.target.closest?.("a[href^='#'], a[href*='#']")) calm(); }, true);
  const onScroll = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      update();
      const keep = wide.matches || nav.classList.contains("is-open") || nav.contains(document.activeElement) || performance.now() < calmUntil;
      const next = keep ? false : barAway({ y: scrollY, lastY, away });
      lastY = scrollY;
      if (next !== away) { away = next; nav.classList.toggle("is-away", away); }
    });
  };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);
  nav.addEventListener("focusin", () => { if (away) { away = false; nav.classList.remove("is-away"); } });

  toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
  nav.addEventListener("keydown", (ev) => {
    if (ev.key !== "Escape") return;
    // First Esc closes the module switcher and puts focus back on its button; the next closes the bar list.
    if (switcher?.isOpen()) { ev.preventDefault(); ev.stopPropagation(); switcher.close(); switcher.button.focus(); return; }
    if (nav.classList.contains("is-open")) { ev.preventDefault(); setOpen(false); toggle.focus(); }
  });
  panel.addEventListener("click", (ev) => { if (ev.target.closest("a") && !wide.matches) setOpen(false); });
  document.addEventListener("pointerdown", (ev) => { if (nav.classList.contains("is-open") && !nav.contains(ev.target)) setOpen(false); });
  wide.addEventListener("change", () => { setOpen(false); away = false; nav.classList.remove("is-away"); update(); });
  update();
}

// ---------------------------------------------------------------------------
// Collapsible sections
// ---------------------------------------------------------------------------
const ELIGIBLE = "main details.teach-it, main details.eq-symbols";

export function initSections() {
  const tools = document.querySelector("[data-page-tools]");
  const keyed = () => {
    const seen = new Map();
    return [...document.querySelectorAll(ELIGIBLE)].map((d) => {
      const card = d.closest("article.concept-card[id]");
      const kind = d.classList.contains("teach-it") ? "teach" : "sym";
      const base = `${card?.id ?? "page"}:${kind}`;
      const n = seen.get(base) ?? 0;
      seen.set(base, n + 1);
      return { d, key: sectionKey(card?.id ?? "page", kind, n) };
    });
  };
  const items = keyed();
  const saved = () => cleanOpen(readUi().sectionsOpen);
  const store = (map) => writeUi({ sectionsOpen: map });
  const setQuiet = (d, open) => { if (d.open === open) return false; d.dataset.quiet = "1"; d.open = open; return true; };

  // Restore what the learner left open.
  const was = saved();
  for (const { d, key } of items) if (was[key]) setQuiet(d, true);

  // A learner's own toggle is remembered; one made by this module (anchor, print) is not.
  document.addEventListener("toggle", (ev) => {
    const d = ev.target;
    if (!(d instanceof HTMLDetailsElement)) return;
    if (d.dataset.quiet) { delete d.dataset.quiet; return; }
    const it = items.find((x) => x.d === d);
    if (it) store(withOpen(saved(), [it.key], d.open));
  }, true);

  const status = tools?.querySelector("[data-tools-status]");
  const all = (open) => {
    const keys = [];
    let changed = 0;
    for (const { d, key } of items) { keys.push(key); if (setQuiet(d, open)) changed++; }
    store(withOpen(saved(), keys, open));
    if (status) status.textContent = `${open ? "Expanded" : "Collapsed"} ${plural(keys.length, "section")}.`;
    return changed;
  };
  tools?.querySelector("[data-expand-all]")?.addEventListener("click", () => all(true));
  tools?.querySelector("[data-collapse-all]")?.addEventListener("click", () => all(false));

  // A link to an anchor inside a closed section opens it (on load, on hashchange and before a click jumps).
  const openAround = (target) => {
    let opened = false;
    for (let d = target?.closest("details"); d; d = d.parentElement?.closest("details")) if (setQuiet(d, true)) opened = true;
    return opened;
  };
  const targetOf = (hash) => { try { return hash.length > 1 ? document.getElementById(decodeURIComponent(hash.slice(1))) : null; } catch { return null; } };
  document.addEventListener("click", (ev) => {
    const a = ev.target.closest?.("a[href]");
    if (!a || !a.hash || a.target) return;
    const there = new URL(a.href, document.baseURI);
    if (there.origin !== location.origin || there.pathname !== location.pathname || there.search !== location.search) return;
    openAround(targetOf(a.hash));
  }, true);
  const onHash = () => { const t = targetOf(location.hash); if (openAround(t)) requestAnimationFrame(() => t.scrollIntoView()); };
  addEventListener("hashchange", onHash);
  onHash();
  // Symbol lists and widgets are built after the browser honoured the hash and push the content down; land on the target again.
  const t0 = targetOf(location.hash);
  if (t0 && !openAround(t0)) requestAnimationFrame(() => t0.scrollIntoView());

  // Print: everything opens, then goes back to how it was.
  let beforePrint = null;
  const openAllForPrint = () => {
    if (beforePrint) return;
    beforePrint = [...document.querySelectorAll("main details")].map((d) => [d, d.open]);
    for (const [d] of beforePrint) setQuiet(d, true);
  };
  const restoreAfterPrint = () => {
    if (!beforePrint) return;
    // A phone-details disclosure follows its widget's width (shell.mjs syncPhoneDetails), not what it was before printing.
    for (const [d, was] of beforePrint) setQuiet(d, d.classList.contains("phone-details") ? d.hasAttribute("data-wide") : was);
    beforePrint = null;
  };
  addEventListener("beforeprint", openAllForPrint);
  addEventListener("afterprint", restoreAfterPrint);
  matchMedia("print").addEventListener("change", (e) => (e.matches ? openAllForPrint() : restoreAfterPrint()));
  if (matchMedia("print").matches) openAllForPrint();
}
