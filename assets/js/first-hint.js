// Classic script, run while the page is being parsed (right after the breadcrumb), so the one-line hint is in the
// first paint and nothing below it moves. It is shown automatically on the first two different concept pages a learner
// visits (hintPages on mlmath:ui:v1), then never again, and never once dismissed (hintDismissed). The outline's
// "How to use this site" link shows it again on request through window.mlmathHint.show(); that does not change what is saved.
// Storage may be blocked or empty; then the hint simply shows on every visit.
(function () {
  var KEY = "mlmath:ui:v1";
  var AUTO_PAGES = 2;
  var HINT = "Terms with a dotted underline are a tap or hover away from a plain-language and a mathematical definition. Expand all and Collapse all open or close every Teach it panel and symbol list on a page. Answer reveals stay closed.";
  var anchor = document.currentScript;
  if (!anchor || !anchor.parentNode) return;
  var node = null;

  function read() {
    try { var ui = JSON.parse(localStorage.getItem(KEY)); return ui && typeof ui === "object" && !Array.isArray(ui) ? ui : {}; } catch (e) { return {}; }
  }
  function save(patch) {
    try {
      var ui = read();
      for (var k in patch) ui[k] = patch[k];
      localStorage.setItem(KEY, JSON.stringify(ui));
    } catch (e) { /* storage blocked: the hint comes back next visit */ }
  }

  function build() {
    var p = document.createElement("p");
    p.className = "first-hint";
    p.setAttribute("role", "note");
    p.tabIndex = -1;
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
      save({ hintDismissed: true });
      p.remove();
      node = null;
      var h = document.querySelector("article.concept-card > header h1");
      if (h) h.focus({ preventScroll: true });
    });
    node = p;
  }

  window.mlmathHint = {
    show: function () {
      if (!node) build();
      node.scrollIntoView({ block: "nearest" });
      node.focus({ preventScroll: true });
    }
  };

  var ui = read();
  if (ui.hintDismissed === true) return;
  var seen = Array.isArray(ui.hintPages) ? ui.hintPages : [];
  var page = location.pathname;
  if (seen.indexOf(page) < 0) {
    if (seen.length >= AUTO_PAGES) return;
    save({ hintPages: seen.concat(page) });
  }
  build();
})();
