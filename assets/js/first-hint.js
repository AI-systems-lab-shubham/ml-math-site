// Classic script, run while the page is being parsed (right after the breadcrumb), so the one-line hint is in the
// first paint and nothing below it moves. Shown until dismissed; dismissal is remembered on mlmath:ui:v1 (hintDismissed).
// Storage may be blocked or empty; then the hint simply shows on every visit.
(function () {
  var KEY = "mlmath:ui:v1";
  var HINT = "Terms with a dotted underline are a tap or hover away from a plain-language and a mathematical definition. Expand all and Collapse all open or close every Teach it panel and symbol list on a page. Answer reveals stay closed.";
  try { if (JSON.parse(localStorage.getItem(KEY)).hintDismissed === true) return; } catch (e) { /* nothing saved yet */ }
  var anchor = document.currentScript;
  if (!anchor || !anchor.parentNode) return;
  var p = document.createElement("p");
  p.className = "first-hint";
  p.setAttribute("role", "note");
  // The first sentence is the hint; the rest explains the page buttons and is hidden on phones (site.css).
  var cut = HINT.indexOf(". ") + 1;
  var text = document.createElement("span");
  text.textContent = HINT.slice(0, cut);
  var more = document.createElement("span");
  more.className = "first-hint-more";
  more.textContent = HINT.slice(cut);
  text.appendChild(more);
  var button = document.createElement("button");
  button.type = "button";
  button.className = "button-secondary button-small";
  button.textContent = "Dismiss";
  p.appendChild(text);
  p.appendChild(button);
  anchor.parentNode.insertBefore(p, anchor);
  button.addEventListener("click", function () {
    try {
      var ui = {};
      try { ui = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { /* start again */ }
      ui.hintDismissed = true;
      localStorage.setItem(KEY, JSON.stringify(ui));
    } catch (e) { /* storage blocked: the hint comes back next visit */ }
    p.remove();
    var h = document.querySelector("article.concept-card > header h1");
    if (h) h.focus({ preventScroll: true });
  });
})();
