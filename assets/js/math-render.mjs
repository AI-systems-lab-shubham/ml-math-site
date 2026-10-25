// Renders KaTeX into <span class="math" data-tex> and <div class="math-display" data-tex-display>.
// Only KaTeX's \htmlData command is trusted, so authored symbols can carry data-sym.
const trust = (context) => context.command === "\\htmlData";
const strict = (code) => (code === "htmlExtension" ? "ignore" : "warn");

export function renderTex(tex, target, displayMode = false) {
  if (typeof katex === "undefined") {
    target.textContent = tex;
    return;
  }
  try {
    katex.render(tex, target, { displayMode, throwOnError: false, trust, strict, output: "html" });
  } catch {
    target.textContent = tex;
  }
  if (displayMode) watchOverflow(target);
}

// A display equation wider than its box scrolls sideways. Then it needs to be reachable and named for keyboard
// and screen-reader users; when it fits, it is plain content and gets no tab stop.
// Each name is unique ("Equation 3, scrolls sideways") because a named region is a landmark.
const watched = new WeakSet();
let equationCount = 0;
function watchOverflow(el) {
  if (watched.has(el) || typeof ResizeObserver === "undefined") return;
  watched.add(el);
  const n = ++equationCount;
  const sync = () => {
    if (el.scrollWidth > el.clientWidth + 1) {
      el.tabIndex = 0;
      el.setAttribute("role", "region");
      el.setAttribute("aria-label", `Equation ${n}, scrolls sideways`);
    } else {
      el.removeAttribute("tabindex");
      el.removeAttribute("role");
      el.removeAttribute("aria-label");
    }
  };
  const ro = new ResizeObserver(sync);
  ro.observe(el);
  // The formula itself changes width when the maths fonts arrive, without the box changing size.
  const watchInner = () => { const inner = el.querySelector(".katex"); if (inner) ro.observe(inner); };
  watchInner();
  // A stepper re-renders its equation into the same box: follow the new formula too.
  new MutationObserver(() => { watchInner(); sync(); }).observe(el, { childList: true });
  sync();
  // Attached a moment later, or widened when the maths fonts arrive: look again.
  requestAnimationFrame(sync);
  document.fonts?.ready.then(sync);
  // Fonts load on demand, one after another, as the formulas that use them appear: look again after each batch.
  document.fonts?.addEventListener("loadingdone", sync);
}

export function renderMath(root = document) {
  root.querySelectorAll("[data-tex]").forEach((el) => {
    renderTex(el.dataset.tex, el, false);
    el.removeAttribute("data-tex-pending");
  });
  root.querySelectorAll("[data-tex-display]").forEach((el) => {
    renderTex(el.dataset.texDisplay, el, true);
  });
}
