// Renders a concept's questions from data/checks/<concept-id>.json into the page's slots, then returns the
// `predictions` map that bootPage mounts. Slots are empty elements: <div data-checks="predict|spot|reveal|explain">.
// The markup matches what the earlier hand-written cards use, so the existing mounts (predict, spot it, explain it back)
// and styles apply unchanged.
import { html } from "./widgets.mjs";
import { answers } from "./check-answers.mjs";
import { itemsFor, resolveAnswer, fillTemplate, validateChecks } from "./checks-core.mjs";

const siteRoot = () => new URL(document.querySelector('meta[name="site-root"]')?.content ?? "./", document.baseURI);

const fail = (slot, message) => slot.replaceChildren(html("p", { class: "muted", role: "status", text: message }));

function predictBox(item, cid) {
  const id = `p-${cid}-${item.id}`;
  const hint = html("p", { class: "hint-text", text: item.hint });
  hint.hidden = true;
  return html("div", { class: "check", "data-predict": item.id },
    html("h3", { text: "Predict, then reveal" }),
    html("p", {}, html("label", { for: id, text: item.prompt })),
    html("div", { class: "row" },
      html("input", { id, name: id, type: "number", inputmode: "decimal", autocomplete: "off" }),
      html("button", { class: "button-secondary button-small", type: "button", "data-check": "", text: "Check my answer" }),
      html("button", { class: "button-secondary button-small", type: "button", "data-hint": "", text: "Hint" })),
    hint);
}

function spotBox(item, cid) {
  const name = `spot-${cid}-${item.id}`;
  const fs = html("fieldset", {}, html("legend", { text: `Spot it. ${item.prompt}` }));
  for (const c of item.choices) {
    const input = html("input", { type: "radio", name, "data-why": c.why });
    if (c.correct) input.setAttribute("data-correct", "");
    fs.append(html("label", { class: "radio-row" }, input, html("span", { text: c.text })));
  }
  return html("div", { class: "check spot-it" }, fs);
}

function revealBox(item) {
  return html("div", { class: "reveal-block" },
    html("p", { text: item.prompt }),
    html("details", { class: "reveal" }, html("summary", { text: "I have made my prediction: show the reasoning" }), html("p", { text: item.reasoning })));
}

function explainBox(item, cid) {
  const id = `e-${cid}-${item.id}`;
  const model = html("div", { class: "model-answer" }, html("p", { text: item.model }));
  model.hidden = true;
  return html("div", { class: "check explain-back" },
    html("h3", { text: "Explain it back" }),
    html("p", {}, html("label", { for: id, text: item.prompt })),
    html("textarea", { id, name: id, autocomplete: "off" }),
    html("div", { class: "row" }, html("button", { type: "button", class: "button-secondary button-small", "data-reveal": "", text: "Show a model answer" })),
    model);
}

const BUILDERS = { predict: predictBox, spot: spotBox, reveal: revealBox, explain: explainBox };

/** Fetch and render. Returns { predictions } for bootPage; a missing or invalid file leaves a short message in each slot. */
export async function renderChecks() {
  const slots = [...document.querySelectorAll("[data-checks]")];
  const predictions = {};
  if (!slots.length) return { predictions };
  const cid = document.querySelector('meta[name="concept-id"]')?.content;
  let data;
  try {
    const res = await fetch(new URL(`data/checks/${cid}.json`, siteRoot()));
    if (!res.ok) throw new Error(String(res.status));
    data = await res.json();
  } catch { slots.forEach((s) => fail(s, "The practice questions could not be loaded.")); return { predictions }; }
  const problems = validateChecks(data, answers, cid);
  if (problems.length) { console.error("data/checks:", problems); slots.forEach((s) => fail(s, "The practice questions could not be loaded.")); return { predictions }; }
  for (const slot of slots) {
    const kind = slot.dataset.checks;
    slot.replaceChildren(...itemsFor(data, kind).map((it) => BUILDERS[kind](it, cid)));
  }
  for (const it of itemsFor(data, "predict")) {
    predictions[it.id] = () => { const value = resolveAnswer(it, answers); return { expected: value, explain: fillTemplate(it.explain, value) }; };
  }
  return { predictions };
}
