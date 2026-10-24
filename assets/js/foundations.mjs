// Module 0: widgets, worked examples and checks. Every number comes from foundations-math.mjs.
import {
  affine, splitTotal, solveTwoEquations, tabulate, slopeBetween, linearValue, xIntercept,
  exponentialValue, growthSequence, additionSequence, stepsToReach, namedFunctions,
  lineEndpoints, total, remainingTokens,
  logSteps, magnitudeAmplitudeRatio, magnitudeEnergyRatio, powerRatioFromDecibels, amplitudeRatioFromDecibels,
  decibelsFromPowerRatio, octavesBetween, bitsToChoose, product, sumOfLogs, perplexityFromNats, natsToBits,
  sigma, sigmaTerms, sigmaRules, dotProduct, totalSurpriseBits, mean, median, percentChange, percentOf,
  cosSinDegrees, forceComponents, positionEncodingPair, entryAt, pH,
} from "./foundations-math.mjs";
import {
  svg, slider, radios, widgetShell, drawAxes, axisNames, makeScale, fmt, mountStepper, mountPredict, mountSpotIt, mountExplain,
} from "./widgets.mjs";
import { renderMath } from "./math-render.mjs";
import { initGlossary, prepare } from "./glossary.mjs";
import { initShell } from "./shell.mjs";
import { initLesson } from "./lesson.mjs";

const stroke = (color, width = 3, extra = "") => `stroke:var(--c-${color});stroke-width:${width};fill:none;${extra}`;
const fill = (color) => `fill:var(--${color === "ochre" ? "fill-ochre" : "c-" + color})`;
const text = (parent, x, y, str, attrs = {}) => {
  const t = svg("text", { x, y, class: "label", ...attrs }, parent);
  t.textContent = str;
  return t;
};
const minus = (n) => fmt(n).replace("-", "−");

/* ---------- 1. Variables and expressions ---------- */
function variablesWidget(host) {
  const w = widgetShell({
    title: "Fill the box: 3x + 2",
    description: "Three bars of length x and a block of length 2 are laid end to end. Their combined length is the value of 3x + 2.",
  });
  const c = w.canvas;
  const u = 540 / 32;
  const draw = (x) => {
    c.replaceChildren();
    const colors = ["blue", "blue", "blue"];
    let cursor = 50;
    text(c, 50, 40, "Three copies of x, then 2 more", { "text-anchor": "start" });
    colors.forEach((col, i) => {
      if (x > 0) {
        svg("rect", { x: cursor, y: 70, width: x * u, height: 56, rx: 6, style: `${fill(col)};stroke:#fff;stroke-width:2` }, c);
        if (x * u > 24) text(c, cursor + (x * u) / 2, 104, "x", { "text-anchor": "middle", style: "fill:#fff" });
      }
      cursor += x * u;
    });
    svg("rect", { x: cursor, y: 70, width: 2 * u, height: 56, rx: 6, style: `${fill("ochre")};stroke:#fff;stroke-width:2` }, c);
    text(c, cursor + u, 104, "2", { "text-anchor": "middle", style: "fill:#fff" });
    const value = affine(3, x, 2);
    text(c, 50, 190, "Total length", { "text-anchor": "start" });
    svg("rect", { x: 50, y: 206, width: Math.max(value * u, 2), height: 56, rx: 6, style: `${fill("navy")}` }, c);
    text(c, 50 + Math.max(value * u, 2) + 12, 242, String(value), { "text-anchor": "start" });
    w.readout.textContent = `x = ${x}   →   3 × ${x} + 2 = ${affine(3, x, 0)} + 2 = ${value}`;
  };
  const s = slider({ label: "Value in the box, x", min: 0, max: 10, step: 1, value: 4, onInput: draw });
  w.controls.append(s.el);
  host.append(w.root);
  draw(4);
}

/* ---------- 2. Equations ---------- */
const secondEquations = {
  none: null,
  cross: { a: 1, b: -1, c: 2, label: "x − y = 2" },
  parallel: { a: 1, b: 1, c: 6, label: "x + y = 6" },
  same: { a: 2, b: 2, c: 8, label: "2x + 2y = 8" },
};
function equationsWidget(host) {
  const w = widgetShell({
    title: "Solutions of x + y = 4",
    description: "A plot of the straight line x + y = 4. Every point on the line is a solution. A second equation can be added to see where its line meets the first.",
  });
  const first = { a: 1, b: 1, c: 4 };
  let x = 1;
  let which = "none";
  const win = { xMin: -2, xMax: 8, yMin: -2, yMax: 8 };
  const draw = () => {
    w.canvas.replaceChildren();
    const { sx, sy, plot } = drawAxes(w.canvas, win);
    axisNames(w.canvas, { sx, sy }, win);
    const line = (eq, color, dash) => {
      const [p, q] = lineEndpoints(eq, win.xMin, win.xMax, win.yMin, win.yMax);
      svg("line", { x1: sx(p.x), y1: sy(p.y), x2: sx(q.x), y2: sy(q.y), style: stroke(color, 3, dash) }, plot);
    };
    line(first, "blue");
    splitTotal(4, [-2, -1, 0, 1, 2, 3, 4, 5, 6]).forEach((p) => svg("circle", { cx: sx(p.x), cy: sy(p.y), r: 4, style: `${fill("blue")};opacity:.45` }, plot));
    const second = secondEquations[which];
    if (second) line(second, "burgundy", "stroke-dasharray:8 5");
    const y = 4 - x;
    svg("circle", { cx: sx(x), cy: sy(y), r: 9, style: `${fill("teal")};stroke:#fff;stroke-width:2` }, plot);
    let msg = `Point (x, y) = (${x}, ${y}).   x + y = ${x + y}   ✓ on the line`;
    if (second) {
      const res = solveTwoEquations(first, second);
      const holds = second.a * x + second.b * y === second.c;
      msg += `\n${second.label}: ${second.a * x + second.b * y} vs ${second.c}   ${holds ? "✓ also true here" : "✗ not true here"}`;
      if (res.kind === "unique") {
        svg("circle", { cx: sx(res.x), cy: sy(res.y), r: 12, style: `${stroke("burgundy", 3)}` }, plot);
        msg += `\nBoth hold only at (${res.x}, ${res.y}): one equation per unknown pins down a point.`;
      } else if (res.kind === "none") {
        msg += `\nThe lines never meet, so no (x, y) satisfies both: no solution.`;
      } else {
        msg += `\nThe second equation is the first, rescaled: it adds no information, so a whole line of solutions remains.`;
      }
    } else {
      msg += `\nOne equation, two unknowns: pick x freely and y follows.`;
    }
    w.readout.style.whiteSpace = "pre-line";
    w.readout.textContent = msg;
  };
  const s = slider({ label: "Choose x", min: -2, max: 6, step: 1, value: x, onInput: (v) => { x = v; draw(); } });
  const r = radios({
    legend: "Add a second equation", name: "second-eq", value: "none", onChange: (v) => { which = v; draw(); },
    options: [
      { value: "none", label: "None" },
      { value: "cross", label: "x − y = 2" },
      { value: "parallel", label: "x + y = 6" },
      { value: "same", label: "2x + 2y = 8" },
    ],
  });
  w.controls.append(s.el, r);
  host.append(w.root);
  draw();
}

/* ---------- 3. Functions and graphs ---------- */
function functionsWidget(host) {
  const w = widgetShell({
    title: "A function as a machine and as a graph",
    description: "A curve showing the chosen rule's output for every input from minus three to three, with a marker at the chosen input.",
  });
  let key = "doublePlusOne";
  let x = 2;
  const win = { xMin: -3, xMax: 3, yMin: -6, yMax: 10 };
  const draw = () => {
    w.canvas.replaceChildren();
    const { sx, sy, plot } = drawAxes(w.canvas, { ...win, yStep: 2 });
    const f = namedFunctions[key];
    const xs = Array.from({ length: 121 }, (_, i) => -3 + i * 0.05);
    const pts = tabulate(f.fn, xs).map((p) => `${sx(p.x)},${sy(p.y)}`).join(" ");
    svg("polyline", { points: pts, style: stroke("blue", 3) }, plot);
    const y = f.fn(x);
    svg("line", { x1: sx(x), x2: sx(x), y1: sy(0), y2: sy(y), style: stroke("ochre", 2, "stroke-dasharray:6 4") }, plot);
    svg("line", { x1: sx(0), x2: sx(x), y1: sy(y), y2: sy(y), style: stroke("teal", 2, "stroke-dasharray:6 4") }, plot);
    svg("circle", { cx: sx(x), cy: sy(y), r: 9, style: `${fill("burgundy")};stroke:#fff;stroke-width:2` }, plot);
    axisNames(w.canvas, { sx, sy }, win, { x: "input", y: "output" });
    const table = tabulate(f.fn, [-2, -1, 0, 1, 2]).map((p) => `${minus(p.x)}→${minus(p.y)}`).join("   ");
    w.readout.style.whiteSpace = "pre-line";
    w.readout.textContent = `Rule: ${f.label}\nInput ${minus(x)} → output ${minus(y)}\nTable: ${table}`;
  };
  const s = slider({ label: "Input", min: -3, max: 3, step: 0.5, value: x, format: minus, onInput: (v) => { x = v; draw(); } });
  const r = radios({
    legend: "Rule", name: "fn-rule", value: key, onChange: (v) => { key = v; draw(); },
    options: Object.entries(namedFunctions).map(([value, f]) => ({ value, label: f.label })),
  });
  w.controls.append(s.el, r);
  host.append(w.root);
  draw();
}

/* ---------- 4. Slope and linear functions ---------- */
function slopeWidget(host) {
  const w = widgetShell({
    title: "Draw the line y = m·x + b",
    description: "A straight line with adjustable slope and intercept. A small triangle shows the rise for a run of one.",
  });
  let m = 1;
  let b = 1;
  const win = { xMin: -5, xMax: 5, yMin: -8, yMax: 8 };
  const draw = () => {
    w.canvas.replaceChildren();
    const { sx, sy, plot } = drawAxes(w.canvas, { ...win, yStep: 2 });
    const [p, q] = lineEndpoints({ a: -m, b: 1, c: b }, win.xMin, win.xMax, win.yMin, win.yMax);
    svg("line", { x1: sx(p.x), y1: sy(p.y), x2: sx(q.x), y2: sy(q.y), style: stroke("blue", 3) }, plot);
    const p0 = { x: 0, y: linearValue(m, 0, b) };
    const p1 = { x: 1, y: linearValue(m, 1, b) };
    svg("polyline", { points: `${sx(0)},${sy(p0.y)} ${sx(1)},${sy(p0.y)} ${sx(1)},${sy(p1.y)}`, style: stroke("burgundy", 3) }, plot);
    svg("circle", { cx: sx(0), cy: sy(b), r: 8, style: `${fill("ochre")};stroke:#fff;stroke-width:2` }, plot);
    const xi = xIntercept(m, b);
    if (xi !== null && xi >= win.xMin && xi <= win.xMax) {
      svg("rect", { x: sx(xi) - 7, y: sy(0) - 7, width: 14, height: 14, style: `${fill("teal")};stroke:#fff;stroke-width:2` }, plot);
    }
    axisNames(w.canvas, { sx, sy }, win);
    const slope = slopeBetween(p0, p1);
    w.readout.style.whiteSpace = "pre-line";
    w.readout.textContent =
      `y = ${minus(m)}·x + ${minus(b)}\nSlope: rise ${minus(p1.y - p0.y)} for run 1 → m = ${minus(slope)}\n` +
      `Crosses the y-axis at (0, ${minus(b)}) ●   ` +
      (xi === null ? "Never crosses y = 0 (flat line)" : `Crosses y = 0 at x = ${minus(xi)} ■`);
  };
  w.controls.append(
    slider({ label: "Slope, m", min: -3, max: 3, step: 0.5, value: m, format: minus, onInput: (v) => { m = v; draw(); } }).el,
    slider({ label: "Intercept, b", min: -4, max: 4, step: 1, value: b, format: minus, onInput: (v) => { b = v; draw(); } }).el,
  );
  host.append(w.root);
  draw();
}

/* ---------- 5. Exponents, growth and decay ---------- */
function exponentsWidget(host) {
  const w = widgetShell({
    title: "Multiplying versus adding",
    description: "Bars show a quantity after each step when it is multiplied by a fixed factor. Diamonds show the quantity if the same first-step change were added every time instead.",
  });
  let factor = 2;
  let steps = 6;
  const maxSteps = 10;
  const draw = () => {
    w.canvas.replaceChildren();
    const mult = growthSequence(1, factor, steps);
    const add = additionSequence(1, factor - 1, steps);
    const top = Math.max(...mult, ...add);
    const left = 48, right = 616, base = 340, ceiling = 30;
    const sy = makeScale([0, top], [base, ceiling]);
    const slot = (right - left) / (maxSteps + 1);
    svg("line", { class: "axis", x1: left, x2: right, y1: base, y2: base }, w.canvas);
    mult.forEach((v, n) => {
      const x0 = left + n * slot + slot * 0.15;
      svg("rect", { x: x0, y: sy(v), width: slot * 0.7, height: Math.max(base - sy(v), 1), rx: 3, style: fill("burgundy") }, w.canvas);
      const a = Math.max(add[n], 0);
      const cx = x0 + slot * 0.35, cy = sy(a);
      svg("polygon", { points: `${cx},${cy - 7} ${cx + 7},${cy} ${cx},${cy + 7} ${cx - 7},${cy}`, style: `${fill("ochre")};stroke:#fff;stroke-width:1.5` }, w.canvas);
      const t = svg("text", { class: "tick-label", x: x0 + slot * 0.35, y: base + 18, "text-anchor": "middle" }, w.canvas);
      t.textContent = String(n);
    });
    text(w.canvas, right, 388, "steps taken", { "text-anchor": "end" });
    text(w.canvas, left, 20, `Scale tops out at ${fmt(top, 1)}`, { "text-anchor": "start", class: "tick-label" });
    const addLast = add[steps];
    w.readout.style.whiteSpace = "pre-line";
    w.readout.textContent =
      `Multiply by ${factor} each step (bars):   1 × ${factor}^${steps} = ${fmt(exponentialValue(1, factor, steps), 4)}\n` +
      `Add ${minus(factor - 1)} each step (diamonds): 1 ${factor - 1 < 0 ? "−" : "+"} ${fmt(Math.abs(factor - 1))} × ${steps} = ${minus(addLast)}` +
      (addLast < 0 ? "  (drawn at 0)" : "") +
      `\nPattern: ${factor > 1 ? "growth" : "decay"}.`;
  };
  w.controls.append(
    slider({ label: "Steps taken", min: 0, max: maxSteps, step: 1, value: steps, onInput: (v) => { steps = v; draw(); } }).el,
    radios({
      legend: "Factor at each step", name: "growth-factor", value: String(factor),
      onChange: (v) => { factor = Number(v); draw(); },
      options: [{ value: "2", label: "× 2 (doubling)" }, { value: "1.5", label: "× 1.5" }, { value: "0.5", label: "× 0.5 (halving)" }],
    }),
  );
  host.append(w.root);
  draw();
}

/* ---------- 6. Logarithms ---------- */
const subs = "₀₁₂₃₄₅₆₇₈₉";
const sub = (n) => String(n).split("").map((d) => subs[Number(d)] ?? d).join("");
function logsWidget(host) {
  const w = widgetShell({
    title: "Count the multiplications",
    description: "A row of boxes shows 1 multiplied by the base again and again. Two rulers below place the current number: on an ordinary ruler it sits very close to the start, on a log ruler each multiplication moves it the same distance.",
  });
  let base = 10;
  let k = 3;
  const maxK = 5;
  const short = (n) => (n >= 1e6 ? `${n / 1e6}M` : n >= 1e3 ? `${n / 1e3}k` : String(n));
  const draw = () => {
    const c = w.canvas;
    c.replaceChildren();
    const slotW = 93;
    for (let j = 0; j <= maxK; j += 1) {
      const reached = j <= k;
      svg("rect", { x: 40 + j * slotW, y: 40, width: slotW - 8, height: 44, rx: 6, style: reached ? fill("blue") : "fill:none;stroke:var(--c-blue);stroke-width:1.5;stroke-dasharray:5 4" }, c);
      text(c, 40 + j * slotW + (slotW - 8) / 2, 68, short(exponentialValue(1, base, j)), { "text-anchor": "middle", style: reached ? "fill:#fff" : "" });
      if (j > 0) text(c, 40 + j * slotW - 4, 28, `×${base}`, { "text-anchor": "middle", class: "tick-label" });
    }
    
    const top = exponentialValue(1, base, maxK);
    const N = exponentialValue(1, base, k);
    const ruler = (y, name, pos) => {
      text(c, 40, y - 30, name, { "text-anchor": "start" });
      svg("line", { class: "axis", x1: 40, x2: 600, y1: y, y2: y }, c);
      for (let j = 0; j <= maxK; j += 1) svg("line", { class: "grid", x1: pos(j), x2: pos(j), y1: y - 8, y2: y + 8 }, c);
      svg("circle", { cx: pos(k), cy: y, r: 11, style: `${fill("burgundy")};stroke:#fff;stroke-width:2` }, c);
    };
    ruler(200, "Ordinary ruler", (j) => 40 + (exponentialValue(1, base, j) / top) * 560);
    ruler(320, "Log ruler", (j) => 40 + (j / maxK) * 560);
    text(c, 40, 232, "1", { class: "tick-label", "text-anchor": "start" });
    text(c, 600, 232, short(top), { class: "tick-label", "text-anchor": "end" });
    text(c, 40, 352, "1", { class: "tick-label", "text-anchor": "start" });
    text(c, 600, 352, short(top), { class: "tick-label", "text-anchor": "end" });
    w.readout.textContent = `log${sub(base)} ${N} = ${logSteps(base, N)}   →   multiply 1 by ${base}, ${k} time${k === 1 ? "" : "s"}, to reach ${N}`;
  };
  w.controls.append(
    slider({ label: "Steps taken, k", min: 0, max: maxK, step: 1, value: k, onInput: (v) => { k = v; draw(); } }).el,
    radios({ legend: "Base", name: "log-base", value: String(base), onChange: (v) => { base = Number(v); draw(); },
      options: [{ value: "10", label: "10" }, { value: "2", label: "2" }] }),
  );
  host.append(w.root);
  draw();
}

/* ---------- 7. Σ notation ---------- */
function sigmaWidget(host) {
  const w = widgetShell({
    title: "Expand a sum",
    description: "Bars show the terms of a sum for counter values one to six. The bars inside the chosen range are filled and are the ones added up; the rest are outlined.",
  });
  let rule = "square";
  let lo = 1;
  let hi = 4;
  const slots = 6;
  const draw = () => {
    const c = w.canvas;
    c.replaceChildren();
    const f = sigmaRules[rule].fn;
    const top = Math.max(...sigmaTerms(1, slots, f).map((t) => t.value));
    const sy = makeScale([0, top], [330, 40]);
    svg("line", { class: "axis", x1: 40, x2: 610, y1: 330, y2: 330 }, c);
    const slot = 570 / slots;
    sigmaTerms(1, slots, f).forEach(({ i, value }) => {
      const on = i >= lo && i <= hi;
      svg("rect", { x: 40 + (i - 1) * slot + slot * 0.2, y: sy(value), width: slot * 0.6, height: 330 - sy(value), rx: 3,
        style: on ? fill("blue") : "fill:none;stroke:var(--c-blue);stroke-width:1.5;stroke-dasharray:5 4" }, c);
      text(c, 40 + (i - 1) * slot + slot / 2, sy(value) - 6, String(value), { "text-anchor": "middle", class: "tick-label" });
      text(c, 40 + (i - 1) * slot + slot / 2, 366, `i = ${i}`, { "text-anchor": "middle", class: "tick-label" });
    });
    const terms = sigmaTerms(lo, hi, f);
    const shown = terms.length ? terms.map((t) => t.value).join(" + ") : "nothing to add";
    w.readout.textContent = `Σ from i = ${lo} to ${hi} of ${sigmaRules[rule].label}   =   ${shown}   =   ${sigma(lo, hi, f)}` +
      (terms.length ? "" : "   (an empty sum is 0)");
  };
  w.controls.append(
    slider({ label: "Start, i =", min: 1, max: slots, step: 1, value: lo, onInput: (v) => { lo = v; draw(); } }).el,
    slider({ label: "Stop, i =", min: 1, max: slots, step: 1, value: hi, onInput: (v) => { hi = v; draw(); } }).el,
    radios({ legend: "Recipe for each term", name: "sigma-rule", value: rule, onChange: (v) => { rule = v; draw(); },
      options: Object.entries(sigmaRules).map(([value, r]) => ({ value, label: r.label })) }),
  );
  host.append(w.root);
  draw();
}

/* ---------- 8. Averages ---------- */
function averageWidget(host) {
  const w = widgetShell({
    title: "Mean versus median",
    description: "Five values on a number line. Four stay put; one can be dragged out to the right. The mean marker follows it; the median marker stays near the middle of the group.",
  });
  let last = 7;
  const fixed = [3, 4, 5, 6];
  const draw = () => {
    const c = w.canvas;
    c.replaceChildren();
    const values = [...fixed, last];
    const sx = makeScale([0, 40], [50, 600]);
    svg("line", { class: "axis", x1: 50, x2: 600, y1: 200, y2: 200 }, c);
    for (let t = 0; t <= 40; t += 10) {
      svg("line", { class: "grid", x1: sx(t), x2: sx(t), y1: 194, y2: 206 }, c);
      text(c, sx(t), 226, String(t), { class: "tick-label", "text-anchor": "middle" });
    }
    values.forEach((v, idx) => svg("circle", { cx: sx(v), cy: 200, r: idx === 4 ? 7 : 6, style: `${fill(idx === 4 ? "ochre" : "blue")};stroke:#fff;stroke-width:2;opacity:.9` }, c));
    const m = mean(values);
    const md = median(values);
    svg("polygon", { points: `${sx(m)},250 ${sx(m) - 10},274 ${sx(m) + 10},274`, style: `${fill("burgundy")}` }, c);
    text(c, sx(m), 304, "mean", { "text-anchor": "middle", style: "fill:var(--c-burgundy)" });
    svg("rect", { x: sx(md) - 8, y: 120, width: 16, height: 16, style: `${fill("teal")}` }, c);
    text(c, sx(md), 108, "median", { "text-anchor": "middle", style: "fill:var(--c-teal)" });
    w.readout.textContent = `Values: ${values.join(", ")}\nMean ▲ = ${fmt(m, 2)}   Median ■ = ${fmt(md, 2)}`;
    w.readout.style.whiteSpace = "pre-line";
  };
  w.controls.append(slider({ label: "The last value", min: 6, max: 40, step: 1, value: last, onInput: (v) => { last = v; draw(); } }).el);
  host.append(w.root);
  draw();
}

/* ---------- 9. Sine and cosine ---------- */
function circleWidget(host) {
  const w = widgetShell({
    title: "Turn around the unit circle",
    description: "A circle of radius one with an arrow from the centre. Dropping straight down to the horizontal axis gives the cosine; going across to the vertical axis gives the sine.",
  });
  let deg = 60;
  const cx = 320, cy = 200, R = 150;
  const draw = () => {
    const c = w.canvas;
    c.replaceChildren();
    svg("line", { class: "axis", x1: cx - R - 20, x2: cx + R + 20, y1: cy, y2: cy }, c);
    svg("line", { class: "axis", x1: cx, x2: cx, y1: cy - R - 20, y2: cy + R + 20 }, c);
    svg("circle", { cx, cy, r: R, style: "fill:none;stroke:var(--line-strong);stroke-width:1.5" }, c);
    const { cos, sin } = cosSinDegrees(deg);
    const px = cx + R * cos, py = cy - R * sin;
    svg("line", { x1: cx, y1: cy, x2: px, y2: py, style: stroke("burgundy", 3) }, c);
    svg("line", { x1: cx, y1: cy, x2: px, y2: cy, style: stroke("blue", 5) }, c);
    svg("line", { x1: px, y1: cy, x2: px, y2: py, style: stroke("teal", 5, "stroke-dasharray:2 7;stroke-linecap:round") }, c);
    const a = ((deg % 360) + 360) % 360;
    if (a > 0) {
      const r2 = 36, end = (a * Math.PI) / 180;
      svg("path", { d: `M ${cx + r2} ${cy} A ${r2} ${r2} 0 ${a > 180 ? 1 : 0} 0 ${cx + r2 * Math.cos(end)} ${cy - r2 * Math.sin(end)}`, style: stroke("burgundy", 2) }, c);
    }
    svg("circle", { cx: px, cy: py, r: 9, style: `${fill("burgundy")};stroke:#fff;stroke-width:2` }, c);
    text(c, cx + R + 22, cy - 8, "1", { class: "tick-label", "text-anchor": "start" });
    text(c, cx + 8, cy - R - 24, "1", { class: "tick-label", "text-anchor": "start" });
    w.readout.style.whiteSpace = "pre-line";
    w.readout.textContent = `θ = ${a}°\ncos θ = ${fmt(cos, 3).replace("-", "−")} (blue, across)   sin θ = ${fmt(sin, 3).replace("-", "−")} (teal dots, up)`;
  };
  w.controls.append(slider({ label: "Angle θ, degrees", min: 0, max: 360, step: 15, value: deg, unit: "°", onInput: (v) => { deg = v; draw(); } }).el);
  host.append(w.root);
  draw();
}
const round3 = (n) => Math.round(n * 1000) / 1000 || 0;

/* ---------- 10. Reading notation ---------- */
function notationWidget(host) {
  const w = widgetShell({
    title: "x with a subscript picks one entry",
    description: "A list of five boxes, each labelled with its position as a subscript. The chosen box is highlighted.",
  });
  const list = [4, 7, 1, 9, 5];
  let i = 3;
  const draw = () => {
    const c = w.canvas;
    c.replaceChildren();
    text(c, 50, 60, "x = (4, 7, 1, 9, 5)", { "text-anchor": "start" });
    list.forEach((v, idx) => {
      const x0 = 50 + idx * 112;
      const on = idx + 1 === i;
      svg("rect", { x: x0, y: 130, width: 96, height: 80, rx: 8, style: on ? fill("burgundy") : "fill:none;stroke:var(--line-strong);stroke-width:2" }, c);
      text(c, x0 + 48, 182, String(v), { "text-anchor": "middle", style: on ? "fill:#fff" : "" });
      text(c, x0 + 48, 120, `x${sub(idx + 1)}`, { "text-anchor": "middle", style: on ? "fill:var(--c-burgundy)" : "" });
    });
    w.readout.textContent = `x${sub(i)} = ${entryAt(list, i)}   ·   ${i} ∈ {1, …, ${list.length}} ✓`;
  };
  w.controls.append(slider({ label: "Subscript, i", min: 1, max: list.length, step: 1, value: i, onInput: (v) => { i = v; draw(); } }).el);
  host.append(w.root);
  draw();
}

/* ---------- worked examples (all numbers computed) ---------- */
const stepperData = {
  variables() {
    const x = 4;
    return [
      { title: "The recipe", text: "The expression 3x + 2 says: take three copies of x, then add 2. The letter x is empty until we choose a number.", tex: "3x+2" },
      { title: `Fill the box with x = ${x}`, text: `Wherever x appears, write ${x}.`, tex: `3\\times ${x}+2` },
      { title: "Multiply first", text: "Multiplication binds tighter than addition, so work out the three copies first.", tex: `3\\times ${x}=${affine(3, x, 0)}` },
      { title: "Then add", text: "Now add the 2.", tex: `${affine(3, x, 0)}+2=${affine(3, x, 2)}` },
    ];
  },
  equations() {
    const e1 = { a: 1, b: 1, c: 4 };
    const e2 = { a: 1, b: -1, c: 2 };
    const r = solveTwoEquations(e1, e2);
    return [
      { title: "Two rules about the same pair", text: "x and y must satisfy both equations at once.", tex: `x+y=${e1.c},\\qquad x-y=${e2.c}` },
      { title: "Add the equations", text: "The +y and −y cancel, which removes one unknown.", tex: `2x=${e1.c}+${e2.c}=${e1.c + e2.c}` },
      { title: "Solve for x", text: "Divide both sides by 2.", tex: `x=${(e1.c + e2.c) / 2}` },
      { title: "Use the first equation to find y", text: "Put x back into x + y = 4.", tex: `${r.x}+y=${e1.c}\;\\Rightarrow\; y=${e1.c - r.x}` },
      { title: "Check both equations", text: "A solution must make every equation true.", tex: `${r.x}+${r.y}=${r.x + r.y},\\qquad ${r.x}-${r.y}=${r.x - r.y}` },
    ];
  },
  functions() {
    const f = namedFunctions.doublePlusOne.fn;
    const rows = tabulate(f, [-1, 0, 2]);
    return [
      { title: "The rule", text: "Double the input, then add 1. Same input, same output, every time.", tex: "f(x)=2x+1" },
      ...rows.map((p) => ({
        title: `Feed in ${p.x}`, text: `Replace x with ${p.x} and work it out.`,
        tex: `f(${p.x})=2\\times(${p.x})+1=${p.y}`,
      })),
      { title: "Read the table as points", text: "Each pair (input, output) is one point on the graph.", tex: rows.map((p) => `(${p.x},${p.y})`).join(",\;") },
    ];
  },
  slope() {
    const p = { x: 1, y: 3 };
    const q = { x: 3, y: 7 };
    const m = slopeBetween(p, q);
    const b = p.y - m * p.x;
    return [
      { title: "Two points on a line", text: `A line passes through (${p.x}, ${p.y}) and (${q.x}, ${q.y}). Find its rule.`, tex: `(${p.x},${p.y}),\;(${q.x},${q.y})` },
      { title: "Rise over run", text: "Slope is how far up you go for each step across.", tex: `m=\\dfrac{${q.y}-${p.y}}{${q.x}-${p.x}}=\\dfrac{${q.y - p.y}}{${q.x - p.x}}=${m}` },
      { title: "Find the intercept", text: "The line must pass through the first point, so b is whatever makes that true.", tex: `${p.y}=${m}\\times ${p.x}+b\;\\Rightarrow\; b=${b}` },
      { title: "Write the rule and check the other point", text: "A rule found from one point should still work at the other.", tex: `y=${m}x+${b};\\quad x=${q.x}:\; ${m}\\times ${q.x}+${b}=${linearValue(m, q.x, b)}` },
    ];
  },
  exponents() {
    const seq = growthSequence(1, 2, 10);
    const add = additionSequence(1, 1, 10);
    const n = stepsToReach(1, 2, 1000);
    return [
      { title: "Start with 1 and double", text: "Each step multiplies by the same factor, 2.", tex: seq.slice(0, 6).join(",\;") + ",\\dots" },
      { title: "Count the multiplications", text: "After n steps we have multiplied n times, which we write with an exponent.", tex: `2\\times 2\\times\\cdots\\times 2\;(10\\text{ times})=2^{10}=${seq[10]}` },
      { title: "Compare with adding 1 each step", text: "Adding the same amount ten times gives a far smaller number.", tex: `1+10\\times 1=${add[10]}\\quad\\text{versus}\\quad ${seq[10]}` },
      { title: "How many doublings reach 1000?", text: "Keep doubling from 1 until the amount is at least 1000.", tex: `2^{${n - 1}}=${exponentialValue(1, 2, n - 1)}<1000\\le 2^{${n}}=${exponentialValue(1, 2, n)}` },
    ];
  },

  logarithms() {
    const a = 100, b = 1000;
    return [
      { title: "Count the multiplications", text: "Start at 1 and multiply by 2 until you reach 8. The number of multiplications is the logarithm.", tex: `1\\times2\\times2\\times2=${exponentialValue(1, 2, 3)}\\quad\\Rightarrow\\quad \\log_2 ${exponentialValue(1, 2, 3)}=${logSteps(2, 8)}` },
      { title: "Logs of two numbers", text: "Use base 10 now: how many tens multiply to give each number?", tex: `\\log_{10}${a}=${logSteps(10, a)},\\qquad \\log_{10}${b}=${logSteps(10, b)}` },
      { title: "Multiply the numbers", text: "Multiplying the numbers joins the two runs of tens into one longer run.", tex: `${a}\\times${b}=${a * b}` },
      { title: "Add the logs", text: "The long run has as many tens as the two short runs together. Adding the logs gives the log of the product.", tex: `\\log_{10}${a * b}=${logSteps(10, a * b)}=${logSteps(10, a)}+${logSteps(10, b)}` },
      { title: "Between the powers", text: "A number that is not a power of the base has a log between whole numbers. 50 lies between 10 and 100, so its log lies between 1 and 2.", tex: `\\log_{10}50\\approx ${fmt(logSteps(10, 50), 2)}` },
    ];
  },
  sigma() {
    const f = sigmaRules.square.fn;
    const terms = sigmaTerms(1, 4, f);
    return [
      { title: "Read the recipe", text: "Start the counter i at 1, stop at 4. For each value of i, work out i², then add everything up.", tex: "\\sum_{i=1}^{4} i^{2}" },
      { title: "Run the counter", text: "Write one term for each value of i.", tex: terms.map((t) => `${t.i}^{2}`).join("+") },
      { title: "Work out each term", text: "Square each counter value.", tex: terms.map((t) => t.value).join("+") },
      { title: "Add", text: "The Σ asks for the total of those terms.", tex: `${terms.map((t) => t.value).join("+")}=${sigma(1, 4, f)}` },
      { title: "A shortcut for 1 + 2 + … + n", text: "Pairing the first with the last, the second with the second last, and so on gives n(n + 1)/2. For n = 100:", tex: `\\sum_{i=1}^{100} i=\\dfrac{100\\times101}{2}=${sigma(1, 100, (i) => i)}` },
    ];
  },
  ratios() {
    return [
      { title: "A rise", text: "A price goes from 80 to 100. The change is 20, which as a share of the old price is:", tex: `\\dfrac{100-80}{80}=${percentChange(80, 100) / 100}=${percentChange(80, 100)}\\%` },
      { title: "The way back", text: "Now the price falls from 100 back to 80. The same change of 20 is a share of the new, larger starting point:", tex: `\\dfrac{80-100}{100}=${percentChange(100, 80) / 100}=${percentChange(100, 80)}\\%` },
      { title: "Why they differ", text: "A percentage is always measured against where you started, so a rise of 25% is undone by a fall of 20%, not 25%." },
      { title: "Mean and median of 3, 4, 5, 6, 60", text: `The sum is ${total([3, 4, 5, 6, 60])} over 5 values; the middle value of the sorted list is ${median([3, 4, 5, 6, 60])}. The outlier drags the mean but not the median.`, tex: `\\text{mean}=\\dfrac{${total([3, 4, 5, 6, 60])}}{5}=${mean([3, 4, 5, 6, 60])},\\qquad \\text{median}=${median([3, 4, 5, 6, 60])}` },
    ];
  },
  trig() {
    const F = 50, deg = 60;
    const { cos, sin } = cosSinDegrees(deg);
    const f = forceComponents(F, deg);
    return [
      { title: "The set-up", text: `A sled is pulled with a rope at ${deg}° above the ground, with a force of ${F} newtons. How much of that force pulls it forward?`, tex: `F=${F}\\,\\text{N},\\quad\\theta=${deg}^{\\circ}` },
      { title: "Read the circle", text: "At 60° the arrow's shadows on the axes are given by cosine and sine.", tex: `\\cos ${deg}^{\\circ}=${round3(cos)},\\qquad \\sin ${deg}^{\\circ}=${round3(sin)}` },
      { title: "Scale up to the rope", text: "The circle has radius 1, the rope's force is 50, so multiply each shadow by 50.", tex: `\\text{forward}=${F}\\times${round3(cos)}=${fmt(f.along, 1)}\\,\\text{N}` },
      { title: "The part that lifts", text: "The vertical shadow is the part that lifts the sled instead of pulling it along.", tex: `\\text{lift}=${F}\\times${round3(sin)}\\approx${fmt(f.up, 1)}\\,\\text{N}` },
    ];
  },
  notation() {
    const x = [4, 7, 1, 9, 5];
    const w = 2, b = 1, i = 3;
    return [
      { title: "A sentence in symbols", text: "Read it aloud: for all i in the set one to five, y-hat sub i equals w times x sub i plus b.", tex: "\\forall\\, i\\in\\{1,\\dots,5\\}:\\quad \\hat{y}_i=w\\,x_i+b" },
      { title: "Pick values", text: `Let w = ${w}, b = ${b} and x = (${x.join(", ")}). The “for all” means we may do this for any i in the set. Take i = ${i}.`, tex: `\\hat{y}_{${i}}=${w}\\,x_{${i}}+${b}` },
      { title: "Look up the entry", text: `The subscript ${i} means the ${i === 3 ? "third" : "chosen"} entry of x.`, tex: `x_{${i}}=${entryAt(x, i)}` },
      { title: "Work it out", text: "Now it is an ordinary calculation. The hat only tells us this is a prediction.", tex: `\\hat{y}_{${i}}=${w}\\times${entryAt(x, i)}+${b}=${affine(w, entryAt(x, i), b)}` },
    ];
  },
};

/* ---------- predict-then-reveal ---------- */
const predictions = {
  variables() {
    const v = affine(3, 5, 2);
    return { expected: v, explain: `Three copies of 5 is ${affine(3, 5, 0)}, and 2 more makes ${v}. Same recipe, a different number in the box.` };
  },
  equations() {
    const p = splitTotal(4, [1])[0];
    return { expected: p.y, explain: `x + y = 4 with x = ${p.x} leaves ${p.y} for y. Fixing one unknown turns the equation into a short sum.` };
  },
  functions() {
    const v = namedFunctions.doublePlusOne.fn(5);
    return { expected: v, explain: `Double 5 to get ${affine(2, 5, 0)}, then add 1: ${v}. The rule never changes, only the input does.` };
  },
  slope() {
    const m = slopeBetween({ x: 0, y: 1 }, { x: 2, y: 5 });
    return { expected: m, explain: `The line rises ${5 - 1} while going across ${2 - 0}, so ${5 - 1} ÷ ${2 - 0} = ${m} up per step across.` };
  },
  exponents() {
    const v = exponentialValue(1, 2, 5);
    return { expected: v, explain: `Doubling five times: 1 → 2 → 4 → 8 → 16 → ${v}, which is 2⁵.` };
  },

  logarithms() {
    const v = logSteps(2, 32);
    return { expected: v, explain: `Double 1 → 2 → 4 → 8 → 16 → 32: that is ${v} doublings, so log₂ 32 = ${v}.` };
  },
  sigma() {
    const v = sigma(1, 4, (i) => i);
    return { expected: v, explain: `The terms are 1, 2, 3 and 4. Added together they make ${v}.` };
  },
  ratios() {
    const v = mean([2, 4, 9]);
    return { expected: v, explain: `The sum is ${total([2, 4, 9])}; shared across 3 values that is ${v} each.` };
  },
  trig() {
    const v = cosSinDegrees(180).cos;
    return { expected: v, explain: `Half a turn lands on the far left of the circle, one unit to the left of the centre, so cosine is ${v}. Cosine can be negative.` };
  },
  notation() {
    const x = [4, 7, 1, 9, 5];
    const v = entryAt(x, 4);
    return { expected: v, explain: `The subscript 4 picks the fourth entry of (${x.join(", ")}), which is ${v}.` };
  },
};

/* ---------- numbers quoted in the "In an LLM" stages ---------- */
const calcs = {
  contextLeft: () => remainingTokens(2048, 1500).toLocaleString("en-US"),
  missingProbability: () => fmt(1 - total([0.5, 0.25, 0.125]), 3),
  pairCount: () => exponentialValue(1, 37000, 2).toLocaleString("en-US"),
  probTotal: () => String(total([0.5, 0.25, 0.125, 0.125])),

  log50: () => fmt(logSteps(10, 50), 2),
  db120: () => powerRatioFromDecibels(120).toLocaleString("en-US"),
  eqAmp: () => String(magnitudeAmplitudeRatio(1)),
  eqEnergyRounded: () => String(Math.round(magnitudeEnergyRatio(1))),
  eqAmp2: () => String(magnitudeAmplitudeRatio(2)),
  eqEnergy2: () => String(Math.round(magnitudeEnergyRatio(2))),
  db10Power: () => String(powerRatioFromDecibels(10)),
  db20Amp: () => String(amplitudeRatioFromDecibels(20)),
  db20Power: () => String(powerRatioFromDecibels(20)),
  db3Power: () => fmt(decibelsFromPowerRatio(2), 2),
  octaves: () => String(octavesBetween(110, 880)),
  bits8: () => String(bitsToChoose(8)),
  ph7: () => String(pH(1e-7)),
  underflow: () => String(product(Array(400).fill(0.01))),
  sumLogs: () => fmt(sumOfLogs(Array(400).fill(0.01)), 1),
  ppl4: () => fmt(perplexityFromNats(Math.log(4)), 2),
  nats4: () => fmt(Math.log(4), 3),
  bits4: () => fmt(natsToBits(Math.log(4)), 2),
  dotExample: () => String(dotProduct([2, -1, 3], [4, 5, 1])),
  surpriseBits: () => String(totalSurpriseBits([0.5, 0.25, 0.125])),
  surpriseMean: () => String(totalSurpriseBits([0.5, 0.25, 0.125]) / 3),
  forceAlong: () => fmt(forceComponents(50, 60).along, 1),
  forceUp: () => fmt(forceComponents(50, 60).up, 1),
  posSin: () => fmt(positionEncodingPair(1, 0, 512).sin, 3),
  posCos: () => fmt(positionEncodingPair(1, 0, 512).cos, 3),
  rise2to3: () => fmt(percentChange(2, 3), 0),
  mean60: () => String(mean([3, 4, 5, 6, 60])),
  median60: () => String(median([3, 4, 5, 6, 60])),
  percentOf15: () => String(percentOf(15, 60)),
};

/* ---------- boot ---------- */
const widgetMounts = { variables: variablesWidget, equations: equationsWidget, functions: functionsWidget, slope: slopeWidget, exponents: exponentsWidget,
  logs: logsWidget, sigma: sigmaWidget, average: averageWidget, circle: circleWidget, notation: notationWidget };

async function boot() {
  document.querySelectorAll("[data-widget]").forEach((h) => widgetMounts[h.dataset.widget]?.(h));
  document.querySelectorAll("[data-stepper]").forEach((h) => mountStepper(h, stepperData[h.dataset.stepper]()));
  document.querySelectorAll("[data-predict]").forEach((h) => mountPredict(h, predictions[h.dataset.predict]));
  document.querySelectorAll(".spot-it").forEach(mountSpotIt);
  document.querySelectorAll(".explain-back").forEach(mountExplain);
  document.querySelectorAll("[data-calc]").forEach((el) => { el.textContent = calcs[el.dataset.calc](); });
  renderMath();
  const shell = await initShell({ moduleId: document.querySelector('meta[name="module-id"]')?.content });
  initLesson(shell);
  renderMath();
  await initGlossary();
}
boot();
