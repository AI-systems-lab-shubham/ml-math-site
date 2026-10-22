// Small helpers shared by every module: SVG drawing, controls, stepper, checks.
import { renderTex } from "./math-render.mjs";

const SVG_NS = "http://www.w3.org/2000/svg";

export function svg(tag, attrs = {}, parent) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (parent) parent.append(el);
  return el;
}

export function html(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else el.setAttribute(k, v);
  }
  el.append(...children.filter((c) => c != null));
  return el;
}

let uid = 0;
export const nextId = (prefix) => `${prefix}-${++uid}`;

/** A labelled slider with a live value. Returns {el, input, set(value)}. */
export function slider({ label, min, max, step, value, format = String, onInput, unit = "" }) {
  const id = nextId("range");
  const out = html("output", { for: id });
  const input = html("input", { type: "range", id, min, max, step, value });
  const show = () => { out.textContent = `${format(Number(input.value))}${unit}`; };
  input.addEventListener("input", () => { show(); onInput(Number(input.value)); });
  show();
  const el = html("div", { class: "control" },
    html("div", { class: "control-head" }, html("label", { for: id, text: label }), out), input);
  return { el, input, show };
}

/** A radio group. options: [{value,label}]. */
export function radios({ legend, name, options, value, onChange }) {
  const group = html("fieldset", {}, html("legend", { text: legend }));
  options.forEach((o) => {
    const id = nextId("radio");
    const input = html("input", { type: "radio", name, id, value: o.value });
    input.checked = o.value === value;
    input.addEventListener("change", () => onChange(o.value));
    group.append(html("label", { class: "radio-row", for: id }, input, html("span", { text: o.label })));
  });
  return html("div", { class: "control" }, group);
}

/** Build a widget shell: title, drawing area (with aria-label), controls, readout. */
export function widgetShell({ title, description, viewBox = "0 0 640 400" }) {
  const root = html("div", { class: "widget" });
  root.append(html("p", { class: "widget-title", text: title }));
  const figure = html("figure", { class: "widget-draw", role: "img", "aria-label": description });
  const canvas = svg("svg", { viewBox, preserveAspectRatio: "xMidYMid meet", "aria-hidden": "true" });
  figure.append(canvas);
  const controls = html("div", { class: "widget-controls" });
  const readout = html("p", { class: "readout", "aria-live": "polite" });
  root.append(figure, controls, readout);
  // Keep drawn text readable when the 640-unit drawing is squeezed onto a phone.
  const viewWidth = Number(viewBox.split(" ")[2]);
  const rescale = () => {
    const scale = figure.clientWidth / viewWidth;
    figure.style.setProperty("--ts", scale > 0 ? String(Math.max(1, 1 / scale)) : "1");
  };
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(rescale).observe(figure);
  return { root, canvas, controls, readout, figure };
}

/** Linear map from a data window onto an SVG box. */
export function makeScale(domain, range) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  return (v) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);
}

/** Axes, grid and tick labels for an x-y plot. Returns {sx, sy, plot}. */
export function drawAxes(canvas, { xMin, xMax, yMin, yMax, left = 48, right = 616, top = 24, bottom = 364, xStep = 1, yStep = 1 }) {
  const sx = makeScale([xMin, xMax], [left, right]);
  const sy = makeScale([yMin, yMax], [bottom, top]);
  const clipId = nextId("clip");
  const defs = svg("defs", {}, canvas);
  const clip = svg("clipPath", { id: clipId }, defs);
  svg("rect", { x: left, y: top, width: right - left, height: bottom - top }, clip);
  for (let x = Math.ceil(xMin / xStep) * xStep; x <= xMax + 1e-9; x += xStep) {
    svg("line", { class: x === 0 ? "axis" : "grid", x1: sx(x), x2: sx(x), y1: top, y2: bottom }, canvas);
    const t = svg("text", { class: "tick-label", x: sx(x), y: bottom + 18, "text-anchor": "middle" }, canvas);
    t.textContent = String(Math.round(x * 100) / 100);
  }
  for (let y = Math.ceil(yMin / yStep) * yStep; y <= yMax + 1e-9; y += yStep) {
    svg("line", { class: y === 0 ? "axis" : "grid", x1: left, x2: right, y1: sy(y), y2: sy(y) }, canvas);
    if (y === yMin) continue; // the corner label would collide with the first x label
    const t = svg("text", { class: "tick-label", x: left - 8, y: sy(y) + 4, "text-anchor": "end" }, canvas);
    t.textContent = String(Math.round(y * 100) / 100);
  }
  const plot = svg("g", { "clip-path": `url(#${clipId})` }, canvas);
  return { sx, sy, plot };
}

/** Axis names placed inside the plot so they never collide with tick labels. */
export function axisNames(canvas, { sx, sy }, { xMax, yMax, right = 616 }, names = { x: "x", y: "y" }) {
  const xt = svg("text", { class: "label", x: right - 6, y: sy(0) - 8, "text-anchor": "end" }, canvas);
  xt.textContent = names.x;
  const yt = svg("text", { class: "label", x: sx(0) + 8, y: sy(yMax) + 16, "text-anchor": "start" }, canvas);
  yt.textContent = names.y;
}

export const fmt = (n, digits = 2) => {
  const r = Math.round(n * 10 ** digits) / 10 ** digits;
  return String(Object.is(r, -0) ? 0 : r);
};

/* ---------- worked-example stepper ---------- */
/** steps: [{title, text, tex?}] computed by tested code. One step visible at a time. */
export function mountStepper(host, steps) {
  const body = html("div", { class: "stepper-body", "aria-live": "polite" });
  const count = html("span", { class: "stepper-count" });
  const back = html("button", { type: "button", class: "button-secondary button-small", text: "Back" });
  const next = html("button", { type: "button", class: "button button-small", text: "Next step" });
  host.classList.add("stepper");
  host.append(body, html("div", { class: "stepper-nav" }, back, next, count));
  let i = 0;
  const show = () => {
    const s = steps[i];
    body.replaceChildren(html("p", { class: "step-title", text: s.title }), html("p", { text: s.text }));
    if (s.tex) {
      const m = html("div", { class: "math-display" });
      renderTex(s.tex, m, true);
      body.append(m);
    }
    count.textContent = `Step ${i + 1} of ${steps.length}`;
    back.disabled = i === 0;
    next.disabled = i === steps.length - 1;
  };
  back.addEventListener("click", () => { i = Math.max(0, i - 1); show(); });
  next.addEventListener("click", () => { i = Math.min(steps.length - 1, i + 1); show(); });
  show();
}

/* ---------- checks ---------- */
function feedback(host, ok, lead, text) {
  let box = host.querySelector(".feedback");
  if (!box) { box = html("div", { class: "feedback", role: "status" }); host.append(box); }
  box.className = `feedback ${ok ? "ok" : "try"}`;
  box.hidden = false;
  box.replaceChildren(html("p", {}, html("span", { class: "tag", text: `${ok ? "✓" : "◐"} ${lead} ` }), text));
}

/**
 * Predict-then-reveal. The learner types a number first; the expected value and
 * the explanation come from tested code via `resolve()`.
 */
export function mountPredict(host, resolve) {
  const input = host.querySelector("input");
  const check = host.querySelector("[data-check]");
  const hint = host.querySelector("[data-hint]");
  const hintText = host.querySelector(".hint-text");
  check.addEventListener("click", () => {
    if (input.value.trim() === "") { feedback(host, false, "Commit to a guess first.", "Type a number, even if you are unsure. Guessing before the reveal is what makes the answer stick."); input.focus(); return; }
    const { expected, explain } = resolve();
    const ok = Math.abs(Number(input.value) - expected) < 1e-9;
    feedback(host, ok, ok ? "Yes." : `Not quite: the answer is ${fmt(expected, 4)}.`, explain);
  });
  hint?.addEventListener("click", () => { hintText.hidden = !hintText.hidden; });
}

/** Spot it: choose a concept; each option carries its own plain-language feedback. */
export function mountSpotIt(host) {
  host.querySelectorAll("input[type=radio]").forEach((r) => {
    r.addEventListener("change", () => {
      const ok = r.hasAttribute("data-correct");
      feedback(host, ok, ok ? "That's it." : "Not quite.", r.dataset.why);
    });
  });
}

/** Explain it back: write first, then reveal a model answer to compare. */
export function mountExplain(host) {
  const area = host.querySelector("textarea");
  const model = host.querySelector(".model-answer");
  host.querySelector("[data-reveal]").addEventListener("click", () => {
    if (area.value.trim() === "") { area.focus(); return; }
    model.hidden = false;
  });
}
