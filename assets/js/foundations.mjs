// Module 0 (first half): widgets, worked examples and checks. Every number comes from foundations-math.mjs.
import {
  affine, splitTotal, solveTwoEquations, tabulate, slopeBetween, linearValue, xIntercept,
  exponentialValue, growthSequence, additionSequence, stepsToReach, namedFunctions,
  lineEndpoints, total, remainingTokens,
} from "./foundations-math.mjs";
import {
  svg, slider, radios, widgetShell, drawAxes, axisNames, makeScale, fmt, mountStepper, mountPredict, mountSpotIt, mountExplain,
} from "./widgets.mjs";
import { renderMath } from "./math-render.mjs";
import { initGlossary, prepare } from "./glossary.mjs";
import { initNav, initProgress } from "./shell.mjs";

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
};

/* ---------- numbers quoted in the "In an LLM" stages ---------- */
const calcs = {
  contextLeft: () => remainingTokens(2048, 1500).toLocaleString("en-US"),
  missingProbability: () => fmt(1 - total([0.5, 0.25, 0.125]), 3),
  pairCount: () => exponentialValue(1, 37000, 2).toLocaleString("en-US"),
  probTotal: () => String(total([0.5, 0.25, 0.125, 0.125])),
};

/* ---------- boot ---------- */
const widgetMounts = { variables: variablesWidget, equations: equationsWidget, functions: functionsWidget, slope: slopeWidget, exponents: exponentsWidget };

function boot() {
  document.querySelectorAll("[data-widget]").forEach((h) => widgetMounts[h.dataset.widget]?.(h));
  document.querySelectorAll("[data-stepper]").forEach((h) => mountStepper(h, stepperData[h.dataset.stepper]()));
  document.querySelectorAll("[data-predict]").forEach((h) => mountPredict(h, predictions[h.dataset.predict]));
  document.querySelectorAll(".spot-it").forEach(mountSpotIt);
  document.querySelectorAll(".explain-back").forEach(mountExplain);
  document.querySelectorAll("[data-calc]").forEach((el) => { el.textContent = calcs[el.dataset.calc](); });
  renderMath();
  initNav();
  initProgress();
  initGlossary();
}
boot();
