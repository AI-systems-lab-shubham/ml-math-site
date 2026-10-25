// Shared by the Module 1 pages: small formatters, the plane drawing helpers and the page boot sequence.
import { svg, html, fmt, nextId, mountStepper, mountWhenNeeded, mountPredict, mountSpotIt, mountExplain } from "./widgets.mjs";
import { renderMath } from "./math-render.mjs";
import { initGlossary } from "./glossary.mjs";
import { initShell } from "./shell.mjs";
import { initLesson } from "./lesson.mjs";
import { initPageNav, initSections } from "./page-nav.mjs";

/* ---------- small helpers ---------- */
export const n = (v) => fmt(v).replace("-", "−");
export const tup = (v) => `(${v.map(n).join(", ")})`;
export const paren = (v) => (v < 0 ? `(${n(v)})` : n(v));
const SUB = "₀₁₂₃₄₅₆₇₈₉";
export const sub = (i) => String(i).split("").map((d) => SUB[Number(d)]).join("");
export const bm = (M) => `\\begin{bmatrix}${M.map((r) => r.map((x) => fmt(x)).join("&")).join("\\\\")}\\end{bmatrix}`;
export const colTex = (v) => bm(v.map((x) => [x]));
export const rowTex = (v) => `(${v.map((x) => fmt(x)).join(",\\;")})`;
export const stroke = (color, width = 3, extra = "") => `stroke:var(--c-${color});stroke-width:${width};fill:none;${extra}`;
export const fillOf = (color) => `fill:var(--c-${color})`;
export const text = (parent, x, y, str, attrs = {}) => {
  const t = svg("text", { x, y, class: "label", ...attrs }, parent);
  t.textContent = str;
  return t;
};

/* ---------- the plane: 30 drawing units per step, origin at the centre ---------- */
export const U = 30, OX = 320, OY = 200, XMAX = 10, YMAX = 6;
// Narrow screens see about ±7 across; wider ones see the whole grid.
export const PLANE_VIEW = "110 15 420 370";
export const px = (x) => OX + U * x;
export const py = (y) => OY - U * y;

export function drawPlane(canvas) {
  for (let x = -XMAX; x <= XMAX; x++) {
    svg("line", { class: x === 0 ? "axis" : "grid", x1: px(x), x2: px(x), y1: py(YMAX), y2: py(-YMAX) }, canvas);
    if (x !== 0 && x % 2 === 0 && Math.abs(x) <= 8) text(canvas, px(x), py(0) + 16, String(x).replace("-", "−"), { class: "tick-label", "text-anchor": "middle" });
  }
  for (let y = -YMAX; y <= YMAX; y++) {
    svg("line", { class: y === 0 ? "axis" : "grid", x1: px(-XMAX), x2: px(XMAX), y1: py(y), y2: py(y) }, canvas);
    if (y !== 0 && y % 2 === 0) text(canvas, px(0) - 8, py(y) + 4, String(y).replace("-", "−"), { class: "tick-label", "text-anchor": "end" });
  }
  const clipId = nextId("clip");
  const clip = svg("clipPath", { id: clipId }, svg("defs", {}, canvas));
  svg("rect", { x: px(-XMAX), y: py(YMAX), width: 2 * XMAX * U, height: 2 * YMAX * U }, clip);
  return svg("g", { "clip-path": `url(#${clipId})` }, canvas);
}

/** An arrow from one data point to another. Zero-length arrows draw as a dot. */
export function arrow(parent, from, to, color, { width = 3.5, dash = "", opacity = 1 } = {}) {
  const x0 = px(from[0]), y0 = py(from[1]), x1 = px(to[0]), y1 = py(to[1]);
  const len = Math.hypot(x1 - x0, y1 - y0);
  const g = svg("g", { style: `opacity:${opacity}` }, parent);
  if (len < 1) {
    svg("circle", { cx: x0, cy: y0, r: 4.5, style: fillOf(color) }, g);
    return g;
  }
  const ux = (x1 - x0) / len, uy = (y1 - y0) / len;
  const head = Math.min(14, len * 0.6);
  const bx = x1 - ux * head, by = y1 - uy * head;
  svg("line", { x1: x0, y1: y0, x2: bx + ux * 2, y2: by + uy * 2, style: stroke(color, width, dash ? `stroke-dasharray:${dash}` : "") }, g);
  svg("polygon", { points: `${x1},${y1} ${bx - uy * head * 0.45},${by + ux * head * 0.45} ${bx + uy * head * 0.45},${by - ux * head * 0.45}`, style: fillOf(color) }, g);
  return g;
}

/** A label near the middle of a segment, nudged to the side. */
export function segmentLabel(parent, from, to, str, color, side = 1) {
  const mx = (px(from[0]) + px(to[0])) / 2, my = (py(from[1]) + py(to[1])) / 2;
  const dx = px(to[0]) - px(from[0]), dy = py(to[1]) - py(from[1]);
  const len = Math.hypot(dx, dy) || 1;
  text(parent, mx + (-dy / len) * 16 * side, my + (dx / len) * 16 * side + 5, str, { "text-anchor": "middle", style: `fill:var(--c-${color})` });
}

/** Lets a learner drag a point on the canvas. Redrawing the canvas does not interrupt a drag. */
export function enableTipDrag(canvas, getTip, setTip, clampTo) {
  const toData = (ev) => {
    const pt = canvas.createSVGPoint();
    pt.x = ev.clientX; pt.y = ev.clientY;
    const m = pt.matrixTransform(canvas.getScreenCTM().inverse());
    return [(m.x - OX) / U, (OY - m.y) / U];
  };
  let dragging = false;
  canvas.addEventListener("pointerdown", (ev) => {
    const [tx, ty] = toData(ev);
    const tip = getTip();
    if (Math.hypot(tx - tip[0], ty - tip[1]) > 0.8) return;
    dragging = true;
    canvas.setPointerCapture(ev.pointerId);
    ev.preventDefault();
  });
  canvas.addEventListener("pointermove", (ev) => {
    if (!dragging) return;
    const [dx, dy] = toData(ev);
    setTip(clampTo(Math.round(dx), Math.round(dy)));
  });
  const stop = () => { dragging = false; };
  canvas.addEventListener("pointerup", stop);
  canvas.addEventListener("pointercancel", stop);
}

/**
 * A labelled number box that arrow keys can nudge. Whole numbers only unless `integer: false`.
 * Anything else (empty, text, a decimal, out of range) gets a short polite message, is never passed to
 * `onInput`, and the box goes back to the last good value when the learner leaves it.
 */
export function numberField({ label, min, max, step = 1, value, onInput, integer = true }) {
  const id = nextId("num");
  const msgId = `${id}-msg`;
  const input = html("input", { type: "number", id, name: id, min, max, step, value, inputmode: integer ? "numeric" : "decimal", autocomplete: "off" });
  const msg = html("p", { class: "field-msg", id: msgId, role: "status" });
  let lastGood = value;
  const problem = () => {
    const v = input.valueAsNumber;
    if (input.validity.badInput || !Number.isFinite(v)) return `Please type a number between ${min} and ${max}${integer ? ", with no decimal point" : ""}.`;
    if (integer && !Number.isInteger(v)) return `Whole numbers only here, so ${v} will not work. Try ${Math.round(v)}.`;
    if (v < min || v > max) return `Please keep it between ${min} and ${max}.`;
    return "";
  };
  const show = (text) => {
    msg.textContent = text;
    if (text) { input.setAttribute("aria-invalid", "true"); input.setAttribute("aria-describedby", msgId); }
    else { input.removeAttribute("aria-invalid"); input.removeAttribute("aria-describedby"); }
  };
  input.addEventListener("input", () => {
    const text = problem();
    show(text);
    if (text) return;
    try { onInput(input.valueAsNumber); lastGood = input.valueAsNumber; }
    catch { show("That value could not be used. Try another whole number."); }
  });
  const restore = () => { if (problem()) input.value = lastGood; };
  input.addEventListener("change", restore);
  input.addEventListener("blur", restore);
  input.addEventListener("focus", () => { if (!problem()) show(""); });
  const el = html("div", { class: "control" }, html("label", { for: id, text: label }), input, msg);
  return { el, input, set: (v) => { input.value = v; lastGood = v; show(""); } };
}

export const fieldGroup = (legend, ...fields) =>
  html("div", { class: "control" }, html("fieldset", {}, html("legend", { text: legend }), html("div", { class: "field-grid" }, ...fields.map((f) => f.el))));


/** Mounts everything a Module 1 concept page declares, then starts the shell, lesson, page nav and glossary. */
export async function bootPage({ widgetMounts, stepperData, predictions, calcs, texCalcs }) {
  document.querySelectorAll("[data-widget]").forEach((h) => mountWhenNeeded(h, widgetMounts[h.dataset.widget]));
  document.querySelectorAll("[data-stepper]").forEach((h) => mountStepper(h, stepperData[h.dataset.stepper]()));
  document.querySelectorAll("[data-predict]").forEach((h) => mountPredict(h, predictions[h.dataset.predict]));
  document.querySelectorAll(".spot-it").forEach(mountSpotIt);
  document.querySelectorAll(".explain-back").forEach(mountExplain);
  document.querySelectorAll("[data-calc]").forEach((el) => { el.textContent = calcs[el.dataset.calc](); });
  document.querySelectorAll("[data-tex-calc]").forEach((el) => { el.dataset.tex = texCalcs[el.dataset.texCalc](); });
  renderMath();
  const shell = await initShell({ moduleId: document.querySelector('meta[name="module-id"]')?.content, conceptId: document.querySelector('meta[name="concept-id"]')?.content });
  initLesson(shell);
  renderMath();
  initPageNav(shell);
  await initGlossary();
  initSections();
}
