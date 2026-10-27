// Module 2 (analytic geometry): widgets, worked examples and checks for all seven pages.
// Every number comes from analytic-math.mjs (tests/analytic-math.test.mjs).
import {
  norm1, norm2, distance, dot, isZero, cosineSimilarity, angleBetween, toDegrees, dotFromAngle, dotSign,
  isOrthogonal, work, polar, project, projectionCoefficient, leftover, shadowLength, unitBall, unit,
  simulateDotVariance, exactCoinDotStats, dotVarianceFormula, attentionScale, baseDK,
  dotFromLengths, sgdStepWithPenalty, sgdStepWithDecay,
} from "./analytic-math.mjs";
import { transformerBase } from "./linalg-math.mjs";
import { svg, html, slider, radios, widgetShell, nextId } from "./widgets.mjs";
import {
  n, tup, paren, bm, colTex, stroke, fillOf, text, OX, OY, PLANE_VIEW, px, py, drawPlane, arrow, bootPage,
} from "./linalg-shared.mjs";

const r2 = (x) => Math.round(x * 100) / 100;
const r3 = (x) => Math.round(x * 1000) / 1000;
const sub = (a, b) => a.map((v, i) => v - b[i]);
const dot0 = (x, y, color, parent, r = 5) => svg("circle", { cx: px(x), cy: py(y), r, style: fillOf(color) }, parent);
const seg = (parent, p, q, color, width = 3, dash = "") =>
  svg("line", { x1: px(p[0]), y1: py(p[1]), x2: px(q[0]), y2: py(q[1]), style: stroke(color, width, dash ? `stroke-dasharray:${dash}` : "") }, parent);
const tag = (parent, p, str, color, dx = 8, dy = -8, anchor = "start") =>
  text(parent, px(p[0]) + dx, py(p[1]) + dy, str, { "text-anchor": anchor, style: `fill:var(--c-${color})` });
const numbered = (v) => v.map(n).join(", ");

/* ---------- 1. Norms ---------- */
function normsWidget(host) {
  const w = widgetShell({
    title: "Two ways to measure an arrow",
    description: "A grid with an arrow from the origin to a point you choose. A navy straight line shows the L2 length. An ochre path goes along the grid lines, across and then up, and its total length is the L1 norm. A dashed curve or diamond shows every point with the same length as the arrow, for the norm you pick. The two lengths are written below.",
    viewBox: PLANE_VIEW,
  });
  const v = [3, 4];
  let show = "l2";
  const draw = () => {
    const c = w.canvas;
    c.replaceChildren();
    const plot = drawPlane(c);
    if (show !== "none") {
      const p = show === "l1" ? 1 : 2;
      const size = p === 1 ? norm1(v) : norm2(v);
      const pts = unitBall(p, 160).map((q) => q.map((t) => t * size));
      svg("polygon", { points: pts.map((q) => `${px(q[0])},${py(q[1])}`).join(" "), style: "fill:none;stroke:var(--c-ochre);stroke-width:2.5;stroke-dasharray:7 6" }, plot);
    }
    seg(plot, [0, 0], [v[0], 0], "ochre", 5);
    seg(plot, [v[0], 0], v, "ochre", 5);
    arrow(plot, [0, 0], v, "navy", { width: 4 });
    tag(c, [v[0] / 2, 0], `|${n(v[0])}|`, "ochre", 0, v[1] >= 0 ? 20 : -10, "middle");
    tag(c, [v[0], v[1] / 2], `|${n(v[1])}|`, "ochre", v[0] >= 0 ? 10 : -10, 5, v[0] >= 0 ? "start" : "end");
    const L2 = norm2(v), L1 = norm1(v);
    w.readout.style.whiteSpace = "pre-line";
    w.readout.textContent =
      `Arrow ${tup(v)}.\n` +
      `L2 (straight line, navy): √(${paren(v[0])}² + ${paren(v[1])}²) = √${n(r3(L2 * L2))} = ${n(r3(L2))}.\n` +
      `L1 (along the grid, ochre): |${n(v[0])}| + |${n(v[1])}| = ${n(L1)}.\n` +
      (show === "none" ? "" : `The dashed ${show === "l1" ? "diamond" : "circle"} is every point whose ${show === "l1" ? "L1" : "L2"} length equals this arrow's.`);
  };
  const sx = slider({ label: "Across (x)", min: -6, max: 6, step: 1, value: v[0], format: n, onInput: (t) => { v[0] = t; draw(); } });
  const sy = slider({ label: "Up (y)", min: -6, max: 6, step: 1, value: v[1], format: n, onInput: (t) => { v[1] = t; draw(); } });
  const picker = radios({
    legend: "Show every point with the same length", name: nextId("norm-set"), value: show,
    options: [{ value: "l2", label: "L2 (a circle)" }, { value: "l1", label: "L1 (a diamond)" }, { value: "none", label: "None" }],
    onChange: (t) => { show = t; draw(); },
  });
  w.controls.append(sx.el, sy.el, picker);
  draw();
  host.append(w.root);
}

/* ---------- 2. Distance (compact) ---------- */
const A_PT = [1, 2], B_PT = [4, 6];
function distanceWidget(host) {
  const w = widgetShell({
    title: "Distance is the length of a difference",
    description: "A grid with two points, A at (1, 2) and B at (4, 6). The difference arrow runs from A to B. In the straight-line setting a navy line joins them and its length is the L2 distance. In the grid-walk setting an ochre path goes across and then up, and its length is the L1 distance.",
    viewBox: PLANE_VIEW,
  });
  let mode = "l2";
  const draw = () => {
    const c = w.canvas;
    c.replaceChildren();
    const plot = drawPlane(c);
    const d = sub(B_PT, A_PT);
    if (mode === "l2") arrow(plot, A_PT, B_PT, "navy", { width: 4 });
    else { seg(plot, A_PT, [B_PT[0], A_PT[1]], "ochre", 5); arrow(plot, [B_PT[0], A_PT[1]], B_PT, "ochre", { width: 5 }); }
    dot0(A_PT[0], A_PT[1], "burgundy", plot, 6);
    dot0(B_PT[0], B_PT[1], "burgundy", plot, 6);
    tag(c, A_PT, "A", "burgundy", -10, 18, "end");
    tag(c, B_PT, "B", "burgundy", 10, -8);
    const p = mode === "l1" ? 1 : 2;
    w.readout.style.whiteSpace = "pre-line";
    w.readout.textContent =
      `B − A = ${tup(d)}.\n` +
      (p === 2 ? `L2 distance = ‖B − A‖₂ = √(${n(d[0])}² + ${n(d[1])}²) = ${n(distance(A_PT, B_PT, 2))}.` : `L1 distance = ‖B − A‖₁ = |${n(d[0])}| + |${n(d[1])}| = ${n(distance(A_PT, B_PT, 1))}.`) +
      `\nThe same two points: L2 is ${n(distance(A_PT, B_PT, 2))}, L1 is ${n(distance(A_PT, B_PT, 1))}.`;
  };
  w.controls.append(radios({
    legend: "How to travel from A to B", name: nextId("dist-mode"), value: mode,
    options: [{ value: "l2", label: "Straight line (L2)" }, { value: "l1", label: "Along the grid (L1)" }],
    onChange: (t) => { mode = t; draw(); },
  }));
  draw();
  host.append(w.root);
}

/* ---------- 3. Dot product ---------- */
const SIGN_TEXT = {
  same: "positive: the arrows lean the same way",
  perpendicular: "zero: the arrows are at right angles",
  opposite: "negative: the arrows lean opposite ways",
};
function dotWidget(host) {
  const w = widgetShell({
    title: "The dot product as a shadow",
    description: "A grid with two arrows from the origin: a in blue and b in teal. A faint line extends b in both directions. A dotted line drops from the tip of a straight onto that line at a right angle, and the ochre segment from the origin to that foot is the shadow of a on b. The sum a1 times b1 plus a2 times b2, the angle between the arrows, the product of the two lengths and the cosine, and the sign are written below.",
    viewBox: PLANE_VIEW,
  });
  const a = [3, 2], b = [4, 0];
  const draw = () => {
    const c = w.canvas;
    c.replaceChildren();
    const plot = drawPlane(c);
    if (!isZero(b)) {
      const u = unit(b);
      seg(plot, u.map((t) => -12 * t), u.map((t) => 12 * t), "teal", 1.5, "3 5");
      const foot = project(a, b);
      seg(plot, a, foot, "ochre", 2.5, "2 5");
      seg(plot, [0, 0], foot, "ochre", 8);
    }
    arrow(plot, [0, 0], b, "teal", { width: 4 });
    arrow(plot, [0, 0], a, "blue", { width: 4 });
    tag(c, a, "a", "blue", 8, -8);
    tag(c, b, "b", "teal", 8, -8);
    const d = dot(a, b);
    const theta = angleBetween(a, b);
    w.readout.style.whiteSpace = "pre-line";
    w.readout.textContent =
      `a·b = ${paren(a[0])}×${paren(b[0])} + ${paren(a[1])}×${paren(b[1])} = ${n(d)}.\n` +
      (theta === null
        ? "One arrow is the zero vector, so there is no angle; the dot product is 0 and there is no shadow."
        : `Lengths ‖a‖ = ${n(r2(norm2(a)))} and ‖b‖ = ${n(r2(norm2(b)))}; the angle between them is ${n(r2(toDegrees(theta)))}°, cos θ = ${n(r3(Math.cos(theta)))}.\n` +
          `‖a‖‖b‖cos θ = ${n(r2(dotFromAngle(a, b)))}, the same as the sum above.\n` +
          `The shadow of a on b is ${n(r2(shadowLength(a, b)))} long (signed).`) +
      `\nSign: ${SIGN_TEXT[dotSign(a, b)]}.`;
  };
  const mk = (label, arr, i, color) => slider({ label, min: -5, max: 5, step: 1, value: arr[i], format: n, onInput: (t) => { arr[i] = t; draw(); } });
  const g1 = html("div", { class: "control-group" }, mk("a across (a₁)", a, 0).el, mk("a up (a₂)", a, 1).el);
  const g2 = html("div", { class: "control-group" }, mk("b across (b₁)", b, 0).el, mk("b up (b₂)", b, 1).el);
  w.controls.append(g1, g2);
  draw();
  host.append(w.root);
}

/* ---------- 4. Angle and cosine similarity ---------- */
const A_FIXED = [4, 0];
function angleWidget(host) {
  const w = widgetShell({
    title: "Cosine ignores length",
    description: "A grid with a fixed blue arrow a pointing right. A teal arrow b has a direction and a length you set with two sliders. A burgundy arc marks the angle between them. Below the picture the dot product, which changes with the length of b, sits beside the cosine similarity, which only changes with the direction. If the length is zero, b is the zero vector and the cosine similarity is shown as undefined.",
    viewBox: PLANE_VIEW,
  });
  const s = { dir: 40, len: 3 };
  const draw = () => {
    const c = w.canvas;
    c.replaceChildren();
    const plot = drawPlane(c);
    const b = polar(s.len, s.dir).map((t) => Math.round(t * 1e6) / 1e6);
    arrow(plot, [0, 0], A_FIXED, "blue", { width: 4 });
    arrow(plot, [0, 0], b, "teal", { width: 4 });
    tag(c, A_FIXED, "a", "blue", 8, -8);
    if (!isZero(b)) tag(c, b, "b", "teal", 8, -8);
    const theta = angleBetween(A_FIXED, b);
    if (theta !== null && theta > 0.02) {
      const r = 42, sgn = s.dir > 180 ? 1 : -1; // screen y points down
      const ex = px(0) + r * Math.cos(theta), ey = py(0) + sgn * r * Math.sin(theta);
      svg("path", { d: `M ${px(0) + r} ${py(0)} A ${r} ${r} 0 ${theta > Math.PI ? 1 : 0} ${sgn < 0 ? 0 : 1} ${ex} ${ey}`, style: stroke("burgundy", 3) }, c);
    }
    const cs = cosineSimilarity(A_FIXED, b);
    w.readout.style.whiteSpace = "pre-line";
    if (cs === null) {
      w.readout.textContent = `b = ${tup(b)} is the zero vector: it has no direction, so the angle and the cosine similarity are undefined.\nThe dot product a·b is still 0.`;
    } else {
      w.readout.textContent =
        `b = ${tup(b.map(r2))}, ‖b‖ = ${n(r2(norm2(b)))}.\n` +
        `Angle θ = ${n(r2(toDegrees(theta)))}°. Cosine similarity = a·b / (‖a‖‖b‖) = ${n(r2(dot(A_FIXED, b)))} / (${n(r2(norm2(A_FIXED)))} × ${n(r2(norm2(b)))}) = ${n(r3(cs))}.\n` +
        `Dot product ${n(r2(dot(A_FIXED, b)))} changes when you change the length; cosine similarity ${n(r3(cs))} does not.`;
    }
  };
  const dir = slider({ label: "Direction of b", min: 0, max: 355, step: 5, value: s.dir, format: (t) => `${t}°`, onInput: (t) => { s.dir = t; draw(); } });
  const len = slider({ label: "Length of b", min: 0, max: 6, step: 0.5, value: s.len, format: n, onInput: (t) => { s.len = t; draw(); } });
  w.controls.append(dir.el, len.el);
  draw();
  host.append(w.root);
}

/* ---------- 5. Orthogonality (compact) ---------- */
const ORTHO_A = [2, 1];
function orthoWidget(host) {
  const w = widgetShell({
    title: "Find the arrows at right angles",
    description: "A grid with a fixed blue arrow a at (2, 1) and a teal arrow b whose two entries you set with sliders. A tick mark appears at the origin when the dot product is exactly zero. The sum, and whether the two arrows are orthogonal, are written below. Setting b to (0, 0) is allowed and counts as orthogonal.",
    viewBox: PLANE_VIEW,
  });
  const b = [-1, 2];
  const draw = () => {
    const c = w.canvas;
    c.replaceChildren();
    const plot = drawPlane(c);
    arrow(plot, [0, 0], ORTHO_A, "blue", { width: 4 });
    arrow(plot, [0, 0], b, "teal", { width: 4 });
    tag(c, ORTHO_A, "a", "blue", 8, -8);
    if (!isZero(b)) tag(c, b, "b", "teal", 8, -8);
    const ok = isOrthogonal(ORTHO_A, b);
    if (ok && !isZero(b)) {
      const u = unit(ORTHO_A), v = unit(b), s = 0.55;
      const p1 = [u[0] * s, u[1] * s], p2 = [v[0] * s, v[1] * s], p3 = [p1[0] + p2[0], p1[1] + p2[1]];
      svg("polyline", { points: [p1, p3, p2].map((q) => `${px(q[0])},${py(q[1])}`).join(" "), style: stroke("burgundy", 2.5) }, plot);
    }
    w.readout.style.whiteSpace = "pre-line";
    w.readout.textContent =
      `a·b = ${paren(ORTHO_A[0])}×${paren(b[0])} + ${paren(ORTHO_A[1])}×${paren(b[1])} = ${n(dot(ORTHO_A, b))}.\n` +
      (ok ? (isZero(b) ? "Orthogonal: the dot product is 0. (The zero vector is orthogonal to everything, though it is not an arrow you can see.)" : "Orthogonal: the dot product is 0, and the corner mark shows the right angle.") : `Not orthogonal: the dot product is ${n(dot(ORTHO_A, b))}, not 0.`);
  };
  const bx = slider({ label: "b across (b₁)", min: -4, max: 4, step: 1, value: b[0], format: n, onInput: (t) => { b[0] = t; draw(); } });
  const by = slider({ label: "b up (b₂)", min: -4, max: 4, step: 1, value: b[1], format: n, onInput: (t) => { b[1] = t; draw(); } });
  w.controls.append(html("div", { class: "control-group" }, bx.el, by.el));
  draw();
  host.append(w.root);
}

/* ---------- 6. Projections ---------- */
function projWidget(host) {
  const w = widgetShell({
    title: "Split an arrow into a part along b and a leftover",
    description: "A grid with two arrows from the origin: a in blue and b in teal, with a faint line through b. The ochre arrow is the projection of a onto b, the part of a that lies along b. A dashed teal arrow runs from the tip of the projection to the tip of a: the leftover, which meets b’s line at a right angle, marked with a small square. The coefficient, the projection, the leftover and the dot product of the leftover with b are written below.",
    viewBox: PLANE_VIEW,
  });
  const a = [3, 1], b = [1, 1];
  const draw = () => {
    const c = w.canvas;
    c.replaceChildren();
    const plot = drawPlane(c);
    const p = project(a, b);
    if (p !== null) {
      const u = unit(b);
      seg(plot, u.map((t) => -12 * t), u.map((t) => 12 * t), "teal", 1.5, "3 5");
      const rest = leftover(a, b);
      arrow(plot, p, a, "teal", { width: 3.5, dash: "6 5" });
      if (!isZero(rest) && !isZero(p)) {
        const ur = unit(rest), up = unit(p), s = 0.4;
        const q1 = [p[0] + ur[0] * s, p[1] + ur[1] * s], q3 = [q1[0] - up[0] * s, q1[1] - up[1] * s], q2 = [p[0] - up[0] * s, p[1] - up[1] * s];
        svg("polyline", { points: [q2, q3, q1].map((q) => `${px(q[0])},${py(q[1])}`).join(" "), style: stroke("burgundy", 2.5) }, plot);
      }
      arrow(plot, [0, 0], p, "ochre", { width: 6 });
    }
    arrow(plot, [0, 0], b, "teal", { width: 3 });
    arrow(plot, [0, 0], a, "blue", { width: 4 });
    tag(c, a, "a", "blue", 8, -8);
    if (!isZero(b)) tag(c, b, "b", "teal", 8, -8);
    w.readout.style.whiteSpace = "pre-line";
    if (p === null) {
      w.readout.textContent = "b is the zero vector, so there is no line to project onto.";
      return;
    }
    const k = projectionCoefficient(a, b);
    const rest = leftover(a, b);
    w.readout.textContent =
      `Coefficient (a·b)/(b·b) = ${n(dot(a, b))}/${n(dot(b, b))} = ${n(r3(k))}.\n` +
      `Projection = ${n(r3(k))} × ${tup(b)} = ${tup(p.map(r3))}.\n` +
      `Leftover a − projection = ${tup(rest.map(r3))}.\n` +
      `Leftover · b = ${n(r3(dot(rest, b)) + 0)}, so the leftover is ${isOrthogonal(rest, b) ? "orthogonal to b" : "not orthogonal to b"}.`;
  };
  const mk = (label, arr, i) => slider({ label, min: -5, max: 5, step: 1, value: arr[i], format: n, onInput: (t) => { arr[i] = t; draw(); } });
  w.controls.append(
    html("div", { class: "control-group" }, mk("a across (a₁)", a, 0).el, mk("a up (a₂)", a, 1).el),
    html("div", { class: "control-group" }, mk("b across (b₁)", b, 0).el, mk("b up (b₂)", b, 1).el));
  draw();
  host.append(w.root);
}

/* ---------- 7. Why divide by √d_k (compact) ---------- */
const D_CHOICES = [1, 4, 16, 64, 256];
const HIST_N = 2000;
function sqrtWidget(host) {
  const w = widgetShell({
    title: "How spread out are the dot products?",
    description: "Two bar charts share one horizontal axis from minus 40 to 40. The top chart shows the spread of 2000 simulated dot products q·k of random vectors with d entries, each entry with mean 0 and variance 1. The bottom chart shows the same values after dividing by the square root of d. The top chart widens as d grows; the bottom one stays equally narrow. The measured variances are written below.",
    viewBox: "0 0 640 400",
  });
  const s = { di: 3, dist: "normal" };
  const cache = new Map();
  const sim = (d, dist) => {
    const key = `${d}-${dist}`;
    if (!cache.has(key)) cache.set(key, simulateDotVariance({ d, samples: HIST_N, seed: 7000 + d, dist }));
    return cache.get(key);
  };
  const L = 50, R = 610, X0 = -40, X1 = 40;
  const sx = (v) => L + ((v - X0) / (X1 - X0)) * (R - L);
  const panel = (c, values, top, height, color, label) => {
    const bins = new Array(80).fill(0);
    for (const v of values) {
      const i = Math.floor(v - X0);
      if (i >= 0 && i < 80) bins[i]++;
    }
    const hi = Math.max(...bins, 1);
    bins.forEach((cnt, i) => {
      if (cnt === 0) return;
      const h = (cnt / hi) * (height - 10);
      svg("rect", { x: sx(X0 + i) + 0.5, y: top + height - h, width: (R - L) / 80 - 1, height: h, style: `fill:var(--c-${color});opacity:.85` }, c);
    });
    svg("line", { x1: L, y1: top + height, x2: R, y2: top + height, class: "axis" }, c);
    text(c, L, top + 12, label, { style: `fill:var(--c-${color})` });
  };
  const draw = () => {
    const c = w.canvas;
    c.replaceChildren();
    const d = D_CHOICES[s.di];
    const r = sim(d, s.dist);
    panel(c, r.raw, 20, 150, "burgundy", `q·k (d = ${d})`);
    panel(c, r.scaled, 210, 150, "teal", `q·k ÷ √${d}`);
    for (const t of [-40, -20, 0, 20, 40]) text(c, sx(t), 384, String(t).replace("-", "−"), { class: "tick-label", "text-anchor": "middle" });
    w.readout.style.whiteSpace = "pre-line";
    w.readout.textContent =
      `d = ${d}, ${s.dist === "coin" ? "entries are +1 or −1 with equal chance" : "entries are normal random numbers"}, ${HIST_N} simulated pairs (fixed seed).\n` +
      `Variance of q·k = ${r.rawStats.variance.toFixed(1)} (the formula says ${dotVarianceFormula(d)}).\n` +
      `Variance of q·k ÷ √${d} = ${r.scaledStats.variance.toFixed(2)} (the formula says 1).`;
  };
  const dsl = slider({ label: "Entries per vector (d)", min: 0, max: D_CHOICES.length - 1, step: 1, value: s.di, format: (t) => String(D_CHOICES[t]), onInput: (t) => { s.di = t; draw(); } });
  const dist = radios({
    legend: "Kind of random entry", name: nextId("sqrt-dist"), value: s.dist,
    options: [{ value: "normal", label: "Normal random numbers" }, { value: "coin", label: "Coin flips (+1 or −1)" }],
    onChange: (t) => { s.dist = t; draw(); },
  });
  w.controls.append(dsl.el, dist);
  draw();
  host.append(w.root);
}

/* ---------- worked examples ---------- */
const stepperData = {
  norms() {
    const v = [3, 4], u = [-2, 5];
    return [
      { title: "The straight-line length", text: `Walk 3 across and 4 up. The straight line back is the long side of a right triangle, so Pythagoras gives √(3² + 4²) = √${norm2(v) ** 2} = ${norm2(v)}.`, tex: `\\|\\mathbf{x}\\|_2=\\sqrt{3^2+4^2}=\\sqrt{${norm2(v) ** 2}}=${norm2(v)}` },
      { title: "The grid-walk length", text: `If you can only walk along the grid lines you travel 3 + 4 = ${norm1(v)} blocks, however you order the two legs.`, tex: `\\|\\mathbf{x}\\|_1=|3|+|4|=${norm1(v)}` },
      { title: "Signs are dropped", text: `For (−2, 5) the L1 norm is |−2| + |5| = ${norm1(u)} and the L2 norm is √(4 + 25) = √${norm2(u) ** 2} ≈ ${r3(norm2(u))}. A negative entry is still a step you walk.`, tex: `\\|(-2,5)\\|_1=${norm1(u)},\\qquad\\|(-2,5)\\|_2\\approx${r3(norm2(u))}` },
      { title: "L1 is never shorter", text: `For (3, 4): L1 is ${norm1(v)} and L2 is ${norm2(v)}. The straight line is the shortest way, so L2 ≤ L1 always. They match only when the arrow lies along an axis.`, tex: `\\|\\mathbf{x}\\|_2\\le\\|\\mathbf{x}\\|_1` },
    ];
  },
  distance() {
    const d = sub(B_PT, A_PT);
    return [
      { title: "Subtract to get the difference", text: `From A = ${tup(A_PT)} to B = ${tup(B_PT)}: 3 across and 4 up, the vector ${tup(d)}.`, tex: `B-A=${colTex(d)}` },
      { title: "Take its norm", text: `The L2 distance is the length of that arrow, ${n(distance(A_PT, B_PT, 2))}. The L1 distance is the blocks you walk, ${n(distance(A_PT, B_PT, 1))}.`, tex: `d_2=\\|B-A\\|_2=${n(distance(A_PT, B_PT, 2))},\\quad d_1=\\|B-A\\|_1=${n(distance(A_PT, B_PT, 1))}` },
      { title: "The order does not matter", text: `B to A gives ${tup(sub(A_PT, B_PT))}, whose norm is the same ${n(distance(B_PT, A_PT, 2))}. Distance has no direction.`, tex: `\\|A-B\\|_2=\\|B-A\\|_2` },
    ];
  },
  dot() {
    const a = [3, 2], b = [4, 0], c = [3, 1], d = [2, 2];
    return [
      { title: "Multiply entry by entry, then add", text: `For a = ${tup(a)} and b = ${tup(b)}: ${a[0]}×${b[0]} + ${a[1]}×${b[1]} = ${dot(a, b)}.`, tex: `\\mathbf{a}\\cdot\\mathbf{b}=3\\cdot4+2\\cdot0=${dot(a, b)}` },
      { title: "The same number from lengths and an angle", text: `‖a‖ = √${norm2(a) ** 2} ≈ ${r3(norm2(a))}, ‖b‖ = ${norm2(b)}, and the angle between them is about ${r2(toDegrees(angleBetween(a, b)))}°. Multiply: ${r3(norm2(a))} × ${norm2(b)} × cos ${r2(toDegrees(angleBetween(a, b)))}° ≈ ${r2(dotFromAngle(a, b))}.`, tex: `\\|\\mathbf{a}\\|\\|\\mathbf{b}\\|\\cos\\theta\\approx${r2(dotFromAngle(a, b))}` },
      { title: "Read it as a shadow", text: `The shadow of a on the line of b is ${r2(shadowLength(a, b))} long. Multiply it by the length of b: ${r2(shadowLength(a, b))} × ${norm2(b)} = ${r2(shadowLength(a, b) * norm2(b))}, the dot product again.`, tex: `\\text{shadow}\\times\\|\\mathbf{b}\\|=${r2(shadowLength(a, b))}\\times${norm2(b)}=${r2(shadowLength(a, b) * norm2(b))}` },
      { title: "The sign tells the direction", text: `${tup(c)}·${tup(d)} = ${dot(c, d)} (positive: same way). (1, 0)·(0, 5) = ${dot([1, 0], [0, 5])} (right angles). (1, 0)·(−2, 1) = ${dot([1, 0], [-2, 1])} (opposite ways).`, tex: `${dot(c, d)}>0,\\quad ${dot([1, 0], [0, 5])}=0,\\quad ${dot([1, 0], [-2, 1])}<0` },
    ];
  },
  angle() {
    const a = [1, 0], b = [1, 1], b10 = [10, 10], z = [0, 0];
    return [
      { title: "Divide the dot product by both lengths", text: `a = ${tup(a)}, b = ${tup(b)}: a·b = ${dot(a, b)}, ‖a‖ = ${norm2(a)}, ‖b‖ = √${norm2(b) ** 2} ≈ ${r3(norm2(b))}. So the cosine is ${dot(a, b)} / ${r3(norm2(b))} ≈ ${r3(cosineSimilarity(a, b))}.`, tex: `\\cos\\theta=\\dfrac{\\mathbf{a}\\cdot\\mathbf{b}}{\\|\\mathbf{a}\\|\\|\\mathbf{b}\\|}\\approx${r3(cosineSimilarity(a, b))}` },
      { title: "Turn the cosine into an angle", text: `The angle whose cosine is ${r3(cosineSimilarity(a, b))} is ${r2(toDegrees(angleBetween(a, b)))}°: the diagonal of a square sits halfway between the two axes.`, tex: `\\theta=\\arccos(${r3(cosineSimilarity(a, b))})=${r2(toDegrees(angleBetween(a, b)))}^\\circ` },
      { title: "Scaling does not change it", text: `Replace b with ${tup(b10)}, ten times as long. The dot product becomes ${dot(a, b10)} but the cosine similarity is still ${r3(cosineSimilarity(a, b10))}.`, tex: `\\cos\\theta\\ \\text{for}\\ (1,0),(10,10)=${r3(cosineSimilarity(a, b10))}` },
      { title: "The zero vector has no angle", text: `For ${tup(z)} the quotient would be 0/0, which means nothing. A direction needs a length above zero, so cosine similarity is undefined here. Code must check for it instead of dividing.`, tex: `\\cos\\theta=\\dfrac{0}{0}\\ \\text{is undefined}` },
    ];
  },
  ortho() {
    const a = [2, 1], b = [-1, 2], c = [1, 2];
    return [
      { title: "Compute the dot product", text: `(2, 1)·(−1, 2) = 2×(−1) + 1×2 = ${dot(a, b)}. Zero, so they are orthogonal.`, tex: `\\mathbf{a}\\cdot\\mathbf{b}=${dot(a, b)}` },
      { title: "A near miss", text: `(2, 1)·(1, 2) = ${dot(a, c)}, not zero, so these two are not orthogonal; the angle between them is about ${r2(toDegrees(angleBetween(a, c)))}°.`, tex: `\\mathbf{a}\\cdot\\mathbf{c}=${dot(a, c)}\\neq0` },
      { title: "The zero vector", text: `(0, 0)·(2, 1) = ${dot([0, 0], a)}. By the definition, the zero vector is orthogonal to every vector, even though it has no direction to be at right angles from.`, tex: `\\mathbf{0}\\cdot\\mathbf{a}=${dot([0, 0], a)}` },
    ];
  },
  proj() {
    const a = [3, 1], b = [1, 1], p = project(a, b), r = leftover(a, b);
    return [
      { title: "Find how many copies of b", text: `a·b = ${dot(a, b)} and b·b = ${dot(b, b)}, so the coefficient is ${dot(a, b)} / ${dot(b, b)} = ${projectionCoefficient(a, b)}.`, tex: `\\dfrac{\\mathbf{a}\\cdot\\mathbf{b}}{\\mathbf{b}\\cdot\\mathbf{b}}=\\dfrac{${dot(a, b)}}{${dot(b, b)}}=${projectionCoefficient(a, b)}` },
      { title: "Scale b by it", text: `The projection is ${projectionCoefficient(a, b)} × ${tup(b)} = ${tup(p)}.`, tex: `\\operatorname{proj}_{\\mathbf{b}}\\mathbf{a}=${projectionCoefficient(a, b)}${colTex(b)}=${colTex(p)}` },
      { title: "What is left over", text: `a − projection = ${tup(a)} − ${tup(p)} = ${tup(r)}.`, tex: `\\mathbf{a}-\\operatorname{proj}=${colTex(r)}` },
      { title: "The leftover is at right angles to b", text: `${tup(r)}·${tup(b)} = ${dot(r, b)}. Whatever a and b are, the leftover has no part along b, so the dot product is 0.`, tex: `${colTex(r)}\\cdot${colTex(b)}=${dot(r, b)}` },
    ];
  },
  sqrt() {
    const N = 20000;
    const sN = simulateDotVariance({ d: baseDK, samples: N, seed: 2017, dist: "normal" });
    const sC = simulateDotVariance({ d: baseDK, samples: N, seed: 2017, dist: "coin" });
    const ex = exactCoinDotStats(3);
    return [
      { title: "One product has variance 1", text: `Take one entry of q and one of k, independent, each with mean 0 and variance 1. Their product also has mean 0, and variance 1 × 1 = 1.`, tex: `\\operatorname{Var}(q_ik_i)=1\\cdot1=1` },
      { title: "A sum of d independent products adds the variances", text: `q·k adds d such products. Independent variances add, so the variance of q·k is d. Check it exactly for d = 3 with every ±1 choice: mean ${ex.mean}, variance ${ex.variance}.`, tex: `\\operatorname{Var}(\\mathbf{q}\\cdot\\mathbf{k})=d\\cdot1=d` },
      { title: "Dividing by √d divides the variance by d", text: `Dividing a quantity by c divides its variance by c². With c = √d the variance becomes d / d = 1. For d = ${baseDK}, √${baseDK} = ${Math.sqrt(baseDK)}.`, tex: `\\operatorname{Var}\\!\\left(\\dfrac{\\mathbf{q}\\cdot\\mathbf{k}}{\\sqrt d}\\right)=\\dfrac{d}{d}=1` },
      { title: "A simulation agrees", text: `With ${N.toLocaleString("en-US")} random pairs at d = ${baseDK} (seed 2017): normal entries gave variance ${sN.rawStats.variance.toFixed(1)} before and ${sN.scaledStats.variance.toFixed(2)} after dividing by ${Math.sqrt(baseDK)}; coin-flip entries gave ${sC.rawStats.variance.toFixed(1)} and ${sC.scaledStats.variance.toFixed(2)}.`, tex: `${sN.rawStats.variance.toFixed(1)}\\to${sN.scaledStats.variance.toFixed(2)}\\ (\\text{normal}),\\quad ${sC.rawStats.variance.toFixed(1)}\\to${sC.scaledStats.variance.toFixed(2)}\\ (\\text{coins})` },
    ];
  },
};

/* ---------- predict-then-reveal ---------- */
const predictions = {
  norms() {
    return { expected: norm1([-2, 5]), explain: `Drop the signs and add: |−2| + |5| = 2 + 5 = ${norm1([-2, 5])}.` };
  },
  distance() {
    const d = sub([6, 2], [2, 5]);
    return { expected: distance([2, 5], [6, 2], 1), explain: `The difference is ${tup(d)}. Drop the signs and add: ${Math.abs(d[0])} + ${Math.abs(d[1])} = ${distance([2, 5], [6, 2], 1)}.` };
  },
  dot() {
    return { expected: dot([2, 3], [4, -1]), explain: `2×4 + 3×(−1) = 8 − 3 = ${dot([2, 3], [4, -1])}.` };
  },
  angle() {
    return { expected: cosineSimilarity([3, 4], [6, 8]), explain: `(6, 8) is just (3, 4) doubled, so they point the same way: the angle is 0° and the cosine is ${cosineSimilarity([3, 4], [6, 8])}, whatever the lengths.` };
  },
  ortho() {
    const k = -dot([2, 1], [0, 4]) / 2;
    return { expected: k, explain: `(2, 1)·(k, 4) = 2k + 4. Set it to zero: k = ${k}. Check: (2, 1)·(${k}, 4) = ${dot([2, 1], [k, 4])}.` };
  },
  proj() {
    const p = project([2, 6], [0, 3]);
    return { expected: p[1], explain: `a·b = ${dot([2, 6], [0, 3])}, b·b = ${dot([0, 3], [0, 3])}, so the coefficient is ${projectionCoefficient([2, 6], [0, 3])}. The projection is ${projectionCoefficient([2, 6], [0, 3])} × (0, 3) = ${tup(p)}, so its second entry is ${p[1]}.` };
  },
  sqrt() {
    return { expected: dotVarianceFormula(16), explain: `Each of the 16 products has variance 1, and independent variances add, so the variance of q·k is 16. (Dividing by √16 = 4 would bring it back to ${dotVarianceFormula(16) / 16}.)` };
  },
};

/* ---------- numbers quoted in the prose ---------- */
let cachedSim = null;
const simAt64 = () => (cachedSim ??= {
  normal: simulateDotVariance({ d: baseDK, samples: 20000, seed: 2017, dist: "normal" }),
  coin: simulateDotVariance({ d: baseDK, samples: 20000, seed: 2017, dist: "coin" }),
});
const calcs = {
  l2_34: () => String(norm2([3, 4])),
  l1_34: () => String(norm1([3, 4])),
  dist5: () => String(distance(B_PT, A_PT)),
  dist7: () => String(distance(B_PT, A_PT, 1)),
  work: () => String(r2(work(polar(20, 30), [5, 0]))),
  workZero: () => String(r2(work([0, 7], [4, 0]))),
  dotMain: () => String(dot([3, 2], [4, 0])),
  cosScale: () => String(cosineSimilarity([1, 0], [10, 10]) === cosineSimilarity([1, 0], [1, 1]) ? "the same" : "different"),
  cos45: () => String(r3(cosineSimilarity([1, 0], [1, 1]))),
  projVec: () => tup(project([3, 1], [1, 1])),
  projLeft: () => tup(leftover([3, 1], [1, 1])),
  dK: () => String(baseDK),
  sqrtDK: () => String(Math.sqrt(baseDK)),
  scaleRecip: () => String(attentionScale(baseDK)),
  varNormal: () => simAt64().normal.rawStats.variance.toFixed(1),
  varNormalScaled: () => simAt64().normal.scaledStats.variance.toFixed(2),
  varCoin: () => simAt64().coin.rawStats.variance.toFixed(1),
  varCoinScaled: () => simAt64().coin.scaledStats.variance.toFixed(2),
  l2_122: () => String(norm2([1, 2, 2])),
  sgdPenalty: () => tup(sgdStepWithPenalty([2, -1], [0.5, 0.5], 0.1, 0.01).map(r3)),
  sgdDecay: () => tup(sgdStepWithDecay([2, -1], [0.5, 0.5], 0.1, 0.01).map(r3)),
  qk3: () => String(dot([1, 0, 2], [2, 1, 1])),
  varFour: () => String(dotVarianceFormula(16, 4, 4)),
  projX: () => tup(project([3, 2], [1, 0]).map((v) => v + 0)),
  polar12: () => String(dotFromLengths([3, 2], [4, 0])),
  dModel: () => String(transformerBase.dModel),
  projShape: () => `${baseDK}×${transformerBase.dModel}`,
  projK: () => String(projectionCoefficient([3, 1], [1, 1])),
  simN: () => "20,000",
  exact3: () => String(exactCoinDotStats(3).variance),
};
const texCalcs = {};

/* ---------- boot ---------- */
const widgetMounts = { norms: normsWidget, distance: distanceWidget, dot: dotWidget, angle: angleWidget, ortho: orthoWidget, proj: projWidget, sqrt: sqrtWidget };
bootPage({ widgetMounts, stepperData, predictions, calcs, texCalcs });
