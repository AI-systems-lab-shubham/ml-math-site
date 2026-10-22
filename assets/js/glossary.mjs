const glossaryUrl = new URL("../../data/glossary.json", import.meta.url);
const symbolDescriptions = {
  theta: "θ: the angle measured from the positive horizontal axis.",
  x: "x: the input or quantity whose role is defined by the surrounding expression.",
  y: "y: the output or second quantity whose role is defined by the surrounding expression.",
  m: "m: the slope in y = mx + b.",
  b: "b: the intercept in y = mx + b, or the chosen base in a logarithm; context distinguishes them.",
  f: "f: the name of a function rule.",
  A: "A: the amount being modeled.",
  t: "t: the step or time index in this expression.",
  r: "r: the repeated multiplier per step.",
  n: "n: the upper index or exponent specified in the expression.",
  i: "i: the index used to label terms in a sum.",
  S: "S: the collection whose elements are being discussed.",
  sum: "Σ: add the terms specified by the index and bounds.",
  x_1: "x₁: the first component in a labelled list.",
  x_i: "xᵢ: the component with index i.",
  a_i: "aᵢ: the term at index i.",
  A_0: "A₀: the starting amount at the initial step.",
  yhat: "ŷ: often a predicted or estimated value of y.",
  superscript: "A superscript is a small raised mark; here it indicates a power.",
  forall: "∀: for every element in the stated collection.",
  in: "∈: belongs to or is an element of.",
};

const storage = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn("Could not read the saved page preference.", error);
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn("Could not save the page preference.", error);
    }
  },
};

function renderMath(root) {
  if (!globalThis.katex) return;
  root.querySelectorAll("[data-math]").forEach((node) => {
    try {
      globalThis.katex.render(node.dataset.math, node, {
        throwOnError: true,
        displayMode: node.dataset.display !== "inline",
        strict: (errorCode) => errorCode === "htmlExtension" ? "ignore" : "warn",
        trust: (context) => context.command === "\\htmlData",
      });
      if (node.querySelector("[data-sym]")) {
        node.querySelector(".katex-mathml")?.setAttribute("aria-hidden", "true");
        node.querySelector(".katex-html")?.removeAttribute("aria-hidden");
      }
    } catch (error) {
      node.textContent = node.dataset.math;
      node.classList.add("math-error");
      console.error("Could not render a formula.", error);
    }
  });
}

function addTermButton(id, label, glossary, { className = "term", parentId = null } = {}) {
  const entry = glossary.get(id);
  if (!entry) return document.createTextNode(label);
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.dataset.term = id;
  button.dataset.parentTerm = parentId || "";
  button.textContent = label;
  button.tabIndex = 0;
  button.setAttribute("aria-haspopup", "dialog");
  button.setAttribute("aria-controls", "glossary-popover");
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-label", `${label}: open glossary definition`);
  return button;
}

function bindNestedTerm(link, id, openTerm) {
  let hoverTimer = 0;
  link.addEventListener("pointerenter", (event) => {
    if (event.pointerType !== "touch") hoverTimer = window.setTimeout(() => openTerm(id, link), 250);
  });
  link.addEventListener("pointerleave", () => window.clearTimeout(hoverTimer));
  link.addEventListener("focus", () => {
    hoverTimer = window.setTimeout(() => openTerm(id, link), 200);
  });
  link.addEventListener("blur", () => window.clearTimeout(hoverTimer));
  link.addEventListener("click", () => openTerm(id, link));
  link.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openTerm(id, link);
    }
  });
}

function appendLinkedDefinition(target, text, entry, glossary, openTerm) {
  const terms = (entry.uses || []).flatMap((id) => {
    const used = glossary.get(id);
    return used ? [used.term, ...(used.aliases || [])].map((label) => ({ id, label })) : [];
  }).sort((left, right) => right.label.length - left.label.length);
  if (!terms.length) {
    target.append(document.createTextNode(text));
    return;
  }
  const idsByLabel = new Map(terms.map(({ id, label }) => [label.toLocaleLowerCase(), id]));
  const alternatives = terms.map(({ label }) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const matcher = new RegExp(`(^|[^\\p{L}\\p{N}_])(${alternatives.join("|")})(?=$|[^\\p{L}\\p{N}_])`, "giu");
  let previousIndex = 0;
  for (const match of text.matchAll(matcher)) {
    const start = match.index;
    const prefix = match[1];
    const label = match[2];
    const phraseStart = start + prefix.length;
    target.append(document.createTextNode(text.slice(previousIndex, phraseStart)));
    const id = idsByLabel.get(label.toLocaleLowerCase());
    const link = addTermButton(id, label, glossary, { className: "term popover-term", parentId: entry.id });
    bindNestedTerm(link, id, openTerm);
    target.append(link);
    previousIndex = phraseStart + label.length;
  }
  target.append(document.createTextNode(text.slice(previousIndex)));
}

function createPopover(glossary) {
  const popover = document.createElement("aside");
  popover.className = "glossary-popover";
  popover.hidden = true;
  popover.id = "glossary-popover";
  popover.setAttribute("role", "dialog");
  popover.setAttribute("aria-modal", "false");
  popover.setAttribute("aria-label", "Glossary definition");
  document.body.append(popover);

  let stack = [];
  let trigger = null;
  let closeTimer = 0;
  let dismissedTrigger = null;
  let dismissedUntil = 0;

  const close = ({ returnFocus = false } = {}) => {
    window.clearTimeout(closeTimer);
    popover.hidden = true;
    trigger?.setAttribute("aria-expanded", "false");
    const oldTrigger = trigger;
    trigger = null;
    stack = [];
    if (returnFocus && oldTrigger) {
      dismissedTrigger = oldTrigger;
      dismissedUntil = performance.now() + 500;
      if (document.activeElement !== oldTrigger) oldTrigger.dataset.suppressGlossaryFocus = "true";
      oldTrigger.focus();
    }
  };

  const show = (id, opener, { push = false, preserveStack = false } = {}) => {
    const entry = glossary.get(id);
    if (!entry) return;
    if (opener === dismissedTrigger && performance.now() < dismissedUntil) return;
    const focusHeading = preserveStack || (push && popover.contains(opener) && document.activeElement === opener);
    if (push && stack.length) {
      stack.push(id);
    } else if (!preserveStack) {
      stack = [id];
      trigger?.setAttribute("aria-expanded", "false");
      trigger = opener;
    }
    opener?.setAttribute("aria-expanded", "true");
    const card = glossary.get(stack.at(-1));
    popover.replaceChildren();
    popover.setAttribute("aria-label", `${card.term} definition`);

    if (stack.length > 1) {
      const back = document.createElement("button");
      back.type = "button";
      back.className = "popover-back";
      back.textContent = "← Back";
      back.addEventListener("click", () => {
        stack.pop();
        show(stack.at(-1), trigger, { preserveStack: true });
      });
      popover.append(back);
    }

    const heading = document.createElement("h3");
    heading.textContent = card.term;
    if (focusHeading) heading.tabIndex = -1;
    popover.append(heading);
    const plain = document.createElement("p");
    appendLinkedDefinition(plain, card.plain, card, glossary, (usedId, link) => show(usedId, link, { push: true }));
    popover.append(plain);

    if (card.math) {
      const math = document.createElement("div");
      math.className = "popover-math";
      math.dataset.math = card.math;
      math.dataset.display = "inline";
      popover.append(math);
      renderMath(popover);
    }

    if (card.llm) {
      const llm = document.createElement("p");
      const label = document.createElement("strong");
      label.textContent = "In an LLM: ";
      const line = document.createElement("span");
      appendLinkedDefinition(line, card.llm, card, glossary, (usedId, link) => show(usedId, link, { push: true }));
      llm.append(label, line);
      popover.append(llm);
    }

    if (card.uses?.length) {
      const related = document.createElement("div");
      related.className = "popover-related";
      const label = document.createElement("span");
      label.textContent = "Explore a term in this definition:";
      related.append(label);
      card.uses.forEach((usedId) => {
        const used = glossary.get(usedId);
        if (!used) return;
        const link = addTermButton(usedId, used.term, glossary, {
          className: "term popover-term",
          parentId: card.id,
        });
        bindNestedTerm(link, usedId, (termId, termLink) => show(termId, termLink, { push: true }));
        related.append(link);
      });
      popover.append(related);
    }

    const learn = document.createElement("a");
    const siteRoot = new URL(document.querySelector('meta[name="site-root"]')?.content || "./", document.baseURI);
    learn.href = new URL(card.learnMore, siteRoot).href;
    learn.textContent = "Learn more";
    learn.className = "popover-learn";
    popover.append(learn);
    popover.hidden = false;
    if (focusHeading) heading.focus();

    if (opener) {
      const bounds = opener.getBoundingClientRect();
      const preferredTop = bounds.top - popover.offsetHeight - 10;
      const top = preferredTop >= 8 ? preferredTop : Math.min(bounds.bottom + 10, innerHeight - popover.offsetHeight - 8);
      const left = Math.max(8, Math.min(bounds.left, innerWidth - popover.offsetWidth - 8));
      popover.style.top = `${top}px`;
      popover.style.left = `${left}px`;
    }
  };

  const scheduleClose = () => {
    window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(() => {
      if (!popover.matches(":hover") && !trigger?.matches(":hover") && !popover.contains(document.activeElement)) close();
    }, 260);
  };

  popover.addEventListener("pointerenter", () => window.clearTimeout(closeTimer));
  popover.addEventListener("pointerleave", scheduleClose);
  popover.addEventListener("focusin", () => window.clearTimeout(closeTimer));
  popover.addEventListener("focusout", scheduleClose);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !popover.hidden) {
      event.preventDefault();
      close({ returnFocus: true });
    }
  });
  document.addEventListener("pointerdown", (event) => {
    if (!popover.hidden && !popover.contains(event.target) && !event.target.closest("[data-term], [data-sym]")) close();
  });

  return { element: popover, show, close, scheduleClose };
}

function initializeTermTriggers(glossary, popover) {
  document.querySelectorAll("[data-term]").forEach((trigger) => {
    const entry = glossary.get(trigger.dataset.term);
    if (!entry) {
      console.error(`Missing glossary entry: ${trigger.dataset.term}`);
      return;
    }
    trigger.tabIndex = 0;
    trigger.setAttribute("role", "button");
    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.setAttribute("aria-controls", "glossary-popover");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-label", `${entry.term}: open glossary definition`);
    let hoverTimer = 0;
    trigger.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "touch") return;
      hoverTimer = window.setTimeout(() => popover.show(entry.id, trigger), 250);
    });
    trigger.addEventListener("pointerleave", () => {
      window.clearTimeout(hoverTimer);
      popover.scheduleClose();
    });
    trigger.addEventListener("focus", () => {
      if (trigger.dataset.suppressGlossaryFocus) {
        delete trigger.dataset.suppressGlossaryFocus;
        return;
      }
      hoverTimer = window.setTimeout(() => popover.show(entry.id, trigger), 200);
    });
    trigger.addEventListener("blur", () => {
      window.clearTimeout(hoverTimer);
      popover.scheduleClose();
    });
    trigger.addEventListener("click", () => {
      if (trigger.getAttribute("aria-expanded") === "true") popover.close();
      else popover.show(entry.id, trigger);
    });
    trigger.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown" && trigger.getAttribute("aria-expanded") === "true") {
        event.preventDefault();
        popover.element.querySelector(".popover-related button, .popover-learn")?.focus();
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        popover.show(entry.id, trigger);
      }
    });
  });
}

function initializeSymbols() {
  document.querySelectorAll("[data-sym]").forEach((symbol) => {
    const description = symbolDescriptions[symbol.dataset.sym];
    if (!description) {
      console.error(`Missing symbol description: ${symbol.dataset.sym}`);
      return;
    }
    symbol.tabIndex = 0;
    symbol.classList.add("sym");
    symbol.setAttribute("role", "button");
    symbol.setAttribute("aria-haspopup", "dialog");
    symbol.setAttribute("aria-controls", "symbol-popover");
    symbol.setAttribute("aria-label", description);
    let closeTimer = 0;
    const close = ({ returnFocus = false } = {}) => {
      window.clearTimeout(closeTimer);
      document.getElementById("symbol-popover")?.remove();
      symbol.removeAttribute("aria-describedby");
      if (returnFocus) {
        symbol.dataset.dismissedUntil = String(performance.now() + 500);
        if (document.activeElement !== symbol) symbol.dataset.suppressGlossaryFocus = "true";
        symbol.focus();
      }
    };
    const scheduleClose = () => {
      window.clearTimeout(closeTimer);
      closeTimer = window.setTimeout(() => {
        const pop = document.getElementById("symbol-popover");
        if (!symbol.matches(":hover") && !pop?.matches(":hover") && document.activeElement !== symbol) close();
      }, 260);
    };
    const show = () => {
      if (performance.now() < Number(symbol.dataset.dismissedUntil || 0)) return;
      window.clearTimeout(closeTimer);
      const bounds = symbol.getBoundingClientRect();
      const pop = document.createElement("aside");
      pop.className = "glossary-popover symbol-popover";
      pop.id = "symbol-popover";
      pop.setAttribute("role", "dialog");
      pop.setAttribute("aria-label", "Symbol definition");
      pop.textContent = description;
      document.getElementById("symbol-popover")?.remove();
      document.body.append(pop);
      const preferredTop = bounds.top - pop.offsetHeight - 10;
      pop.style.top = `${preferredTop >= 8 ? preferredTop : Math.min(bounds.bottom + 10, innerHeight - pop.offsetHeight - 8)}px`;
      pop.style.left = `${Math.max(8, Math.min(bounds.left, innerWidth - 360))}px`;
      symbol.setAttribute("aria-describedby", "symbol-popover");
      pop.addEventListener("pointerenter", () => window.clearTimeout(closeTimer));
      pop.addEventListener("pointerleave", scheduleClose);
    };
    symbol.addEventListener("pointerenter", (event) => {
      if (event.pointerType !== "touch") closeTimer = window.setTimeout(show, 250);
    });
    symbol.addEventListener("pointerleave", scheduleClose);
    symbol.addEventListener("focus", () => {
      if (symbol.dataset.suppressGlossaryFocus) {
        delete symbol.dataset.suppressGlossaryFocus;
        return;
      }
      closeTimer = window.setTimeout(show, 200);
    });
    symbol.addEventListener("blur", scheduleClose);
    symbol.addEventListener("click", () => {
      if (document.getElementById("symbol-popover")) close();
      else show();
    });
    symbol.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close({ returnFocus: true });
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        show();
      }
    });
    document.addEventListener("pointerdown", (event) => {
      if (!event.target.closest("[data-sym]") && !event.target.closest("#symbol-popover")) close();
    });
  });
}

function initializeHighlighting() {
  const page = document.querySelector("[data-page]");
  const toggle = document.querySelector("[data-highlight-toggle]");
  if (!page || !toggle) return;
  page.querySelectorAll("section").forEach((section) => {
    const terms = new Set();
    section.querySelectorAll(".term[data-term]").forEach((term) => {
      if (!terms.has(term.dataset.term)) {
        term.classList.add("term-first");
        terms.add(term.dataset.term);
      }
    });
  });
  const key = `ml-math:${page.dataset.page}:highlight`;
  const apply = (all) => {
    page.classList.toggle("highlight-all", all);
    toggle.setAttribute("aria-pressed", String(all));
    const compact = window.matchMedia("(max-width: 479px)").matches;
    toggle.textContent = all
      ? (compact ? "Highlight: on" : "Highlight all terms: on")
      : (compact ? "Highlight terms" : "Highlight all terms");
  };
  apply(storage.get(key) === "true");
  toggle.addEventListener("click", () => {
    const enabled = toggle.getAttribute("aria-pressed") !== "true";
    apply(enabled);
    storage.set(key, String(enabled));
  });
  window.addEventListener("resize", () => apply(toggle.getAttribute("aria-pressed") === "true"));
}

function initializeProgress() {
  document.querySelectorAll("[data-progress-module]").forEach((module) => {
    const moduleId = module.dataset.progressModule;
    const checks = [...module.querySelectorAll("[data-progress-concept]")];
    const summary = module.querySelector("[data-progress-summary]");
    const key = `ml-math:${moduleId}:progress`;
    let saved = {};
    try {
      const parsed = JSON.parse(storage.get(key) || "{}");
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        saved = parsed;
      } else {
        console.warn("Saved progress was not an object; starting with an empty checklist.");
      }
    } catch (error) {
      console.warn("Saved progress was unreadable; starting with an empty checklist.", error);
    }
    const updateSummary = () => {
      const complete = checks.filter((item) => item.querySelector("input").checked).length;
      if (summary) summary.textContent = `${complete} of ${checks.length} concepts explored`;
    };
    checks.forEach((check) => {
      const id = check.dataset.progressConcept;
      const input = check.querySelector("input");
      input.checked = saved[id] === true;
      input.addEventListener("change", () => {
        saved[id] = input.checked;
        storage.set(key, JSON.stringify(saved));
        updateSummary();
      });
    });
    updateSummary();
  });
}

const response = await fetch(glossaryUrl);
if (!response.ok) throw new Error(`Could not load glossary: ${response.status}`);
const entries = await response.json();
const glossary = new Map(entries.map((entry) => [entry.id, entry]));
const popover = createPopover(glossary);
renderMath(document);
initializeTermTriggers(glossary, popover);
initializeSymbols();
initializeHighlighting();
initializeProgress();
