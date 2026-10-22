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
