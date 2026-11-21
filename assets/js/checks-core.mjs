// Questions as data. Each concept's Predict, Spot it, Reveal and Explain-it-back items live in
// data/checks/<concept-id>.json. This file is the pure part: validation and answer resolution, no DOM.
// A numeric answer is never typed in: it names a function from the answer registry (assets/js/check-answers.mjs),
// which calls tested maths code, plus JSON arguments.

export const SLOTS = ["predict", "spot", "reveal", "explain"];
const TOKENS = /\{([a-zA-Z]+)\}/g;

/** Format a number the way pages do: at most 4 decimals, no trailing zeros, a real minus sign is left to the caller. */
export const formatNumber = (x, digits = 4) => {
  const r = Math.round(x * 10 ** digits) / 10 ** digits;
  return String(Object.is(r, -0) ? 0 : r);
};

/** Replace {answer} in a template with the computed number. Other tokens are an error (see validateChecks). */
export const fillTemplate = (template, value) => template.replace(TOKENS, (_, name) => {
  if (name !== "answer") throw new RangeError(`unknown token {${name}}`);
  return formatNumber(value);
});

/** Run the item's answer function with its JSON arguments. Throws if the name is unknown or the result is not a finite number. */
export function resolveAnswer(item, registry) {
  const { fn, args = [] } = item.answer ?? {};
  if (typeof registry[fn] !== "function") throw new RangeError(`${item.id}: unknown answer function "${fn}"`);
  const value = registry[fn](...structuredClone(args));
  if (typeof value !== "number" || !Number.isFinite(value)) throw new RangeError(`${item.id}: answer function "${fn}" did not return a finite number`);
  return value;
}

const isText = (s) => typeof s === "string" && s.trim() !== "";

/** Returns a list of problems (empty when the file is valid). `conceptId` must match the file's own "concept" field. */
export function validateChecks(data, registry, conceptId) {
  const errs = [];
  if (data === null || typeof data !== "object") return ["not an object"];
  if (data.concept !== conceptId) errs.push(`"concept" is ${JSON.stringify(data.concept)}, expected ${JSON.stringify(conceptId)}`);
  if (!Array.isArray(data.items) || data.items.length === 0) return [...errs, "no items"];
  const ids = new Set();
  data.items.forEach((it, n) => {
    const at = `item ${n + 1}${it?.id ? ` (${it.id})` : ""}`;
    if (!it || typeof it !== "object") { errs.push(`${at}: not an object`); return; }
    if (!/^[a-z][a-z0-9-]*$/.test(it.id ?? "")) errs.push(`${at}: id must be kebab-case`);
    else if (ids.has(it.id)) errs.push(`${at}: duplicate id`);
    else ids.add(it.id);
    if (!SLOTS.includes(it.slot)) errs.push(`${at}: slot must be one of ${SLOTS.join(", ")}`);
    if (!isText(it.prompt)) errs.push(`${at}: prompt is empty`);
    const templates = [];
    if (it.slot === "predict") {
      if (!isText(it.hint)) errs.push(`${at}: predict needs a hint`);
      if (!isText(it.explain)) errs.push(`${at}: predict needs an explanation`);
      else templates.push(it.explain);
      try { resolveAnswer(it, registry); } catch (e) { errs.push(String(e.message)); }
      if (it.answer && !Array.isArray(it.answer.args ?? [])) errs.push(`${at}: answer.args must be an array`);
    } else if (it.slot === "spot") {
      const ch = it.choices;
      if (!Array.isArray(ch) || ch.length < 2) errs.push(`${at}: spot needs at least two choices`);
      else {
        if (ch.filter((c) => c.correct === true).length !== 1) errs.push(`${at}: exactly one choice must be correct`);
        ch.forEach((c, j) => { if (!isText(c.text) || !isText(c.why)) errs.push(`${at}: choice ${j + 1} needs text and why`); });
      }
    } else if (it.slot === "reveal") {
      if (!isText(it.reasoning)) errs.push(`${at}: reveal needs reasoning`);
    } else if (it.slot === "explain") {
      if (!isText(it.model)) errs.push(`${at}: explain needs a model answer`);
    }
    if (it.slot !== "predict" && "answer" in it) errs.push(`${at}: only predict items have an answer`);
    for (const t of templates) for (const m of t.matchAll(TOKENS)) if (m[1] !== "answer") errs.push(`${at}: unknown token {${m[1]}}`);
  });
  return errs;
}

/** Items for one slot, in file order. */
export const itemsFor = (data, slot) => data.items.filter((it) => it.slot === slot);
