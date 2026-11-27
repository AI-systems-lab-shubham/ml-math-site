// Module 3 (matrix decompositions): widgets, worked examples and the numbers quoted in the prose, for all six pages.
// Every number comes from decomposition-math.mjs (tests/decomposition-math.test.mjs). The Predict, Spot it, reveal and
// Explain-it-back items are data: data/checks/<concept-id>.json, drawn by checks.mjs.
import {
  EPS, matMul, matVec, transpose, diag, frobeniusSq, frobenius, inverse, matPower, maxAbsDiff, matSub,
  rotation, shear, scaling, projectionX, det2, unitSquareImage, signedArea, orientation, imageShape, trace,
  discriminant2, eigenvalues2, eigen2, parallelGap, eigenAngles, eigendecompose2, powerViaEigen, decomposeWith, symmetricEigen,
  traceOfProduct3, rankTolerance, rankFromSingular, svd, svdStages, circleImage, truncatedSvd, bestErrorFrobSq, bestErrorSpectral,
  storageTruncated, storageFull, storageLoRA, breakEvenRank, pattern16,
} from "./decomposition-math.mjs";
import { transformerBase } from "./linalg-math.mjs";
import { baseDK, denoise } from "./analytic-math.mjs";
import { svg, html, slider, radios, widgetShell, nextId } from "./widgets.mjs";
import { n, tup, bm, stroke, fillOf, text, PLANE_VIEW, px, py, drawPlane, arrow, bootPage } from "./linalg-shared.mjs";
import { renderChecks } from "./checks.mjs";

// The shared plane (linalg-shared.mjs) with 10 more units of room above, so the "6" tick label is not cut off; and a tighter ±5 view for a phone.
const VIEW = "110 5 420 390";
const VIEW_NARROW = "170 50 300 300";
// Keep an equals sign with the numbers on both sides, and an operator with the operand after it (non-breaking spaces), so a line
// breaks only before an operator and a result is never left alone on the next line.
const glue = (s) => s.replace(/ = (?=\S)/g, "\u00a0=\u00a0").replace(/([−+×]) (?=\S)/g, "$1\u00a0");
const r2 = (x) => Math.round(x * 100) / 100;
const f2 = (x) => n(x);                                       // 2 decimals, real minus sign
const f3 = (x) => String(Math.round(x * 1000) / 1000).replace("-", "−");
const tag = (parent, p, str, color, dx = 8, dy = -8, anchor = "start") =>
  text(parent, px(p[0]) + dx, py(p[1]) + dy, str, { "text-anchor": anchor, style: `fill:var(--c-${color})` });
// A label just past an arrow's tip, on the line from the origin through the tip, so it never sits on its own arrow.
// "taken" holds the labels already placed; one that would land on top of them is moved down. A halo in the page colour keeps it readable over grid lines.
function tipLabel(parent, p, str, color, taken) {
  const sx = px(p[0]) - px(0), sy = py(p[1]) - py(0), len = Math.hypot(sx, sy);
  const [ux, uy] = len > 1 ? [sx / len, sy / len] : [0.7, -0.7];
  const x = px(p[0]) + ux * 14;
  // An arrow lying along an axis would put its label on the axis line: lift it clear of the line.
  let y = py(p[1]) + uy * 14 + 4 - (Math.abs(uy) < 0.5 ? 10 : 0);
  while (taken.some((t) => Math.abs(t.x - x) < 64 && Math.abs(t.y - y) < 15)) y += 16;
  taken.push({ x, y });
  text(parent, x, y, str, { "text-anchor": ux > 0.35 ? "start" : ux < -0.35 ? "end" : "middle", style: `fill:var(--c-${color});paint-order:stroke;stroke:var(--paper);stroke-width:4px;stroke-linejoin:round` });
}
const poly = (parent, pts, style, closed = true) =>
  svg(closed ? "polygon" : "polyline", { points: pts.map((p) => `${px(p[0])},${py(p[1])}`).join(" "), style }, parent);
const matTex = (M) => bm(M.map((r) => r.map((v) => Math.round(v * 1000) / 1000)));
const rows = (M) => M.map((r) => `(${r.map(f2).join(", ")})`).join(" and ");
const setSlider = (s, v) => { s.input.value = String(v); s.show(); };

/* ---------- 1. Determinant ---------- */
const DET_PRESETS = [
  { value: "shear", label: "Shear (1, 1; 0, 1)", m: [1, 1, 0, 1] },
  { value: "scale", label: "Scale by 2 and 1.5", m: [2, 0, 0, 1.5] },
  { value: "turn", label: "Quarter turn", m: [0, -1, 1, 0] },
  { value: "swap", label: "Mirror (swap x and y)", m: [0, 1, 1, 0] },
  { value: "squash", label: "Project onto the x-axis", m: [1, 0, 0, 0] },
];
function detWidget(host) {
  const w = widgetShell({
    title: "What a matrix does to the unit square",
    description: "A grid with the unit square drawn as a dashed outline. The matrix you choose sends it to a filled shape: a parallelogram, or a line segment when the determinant is zero. The first column of the matrix is a blue arrow from the origin (where the arrow along x lands) and the second column is a teal arrow (where the arrow along y lands). The determinant ad minus bc, the signed area, and whether the orientation was kept, flipped or lost are written below.",
    viewBox: VIEW,
    narrowViewBox: VIEW_NARROW,
  });
  const m = { a: 1, b: 1, c: 0, d: 1 };
  const draw = () => {
    const c = w.canvas;
    c.replaceChildren();
    const plot = drawPlane(c);
    const A = [[m.a, m.b], [m.c, m.d]];
    const d = det2(A), o = orientation(d);
    poly(plot, [[0, 0], [1, 0], [1, 1], [0, 1]], `${stroke("navy", 2, "stroke-dasharray:4 4")}`);
    const img = unitSquareImage(A);
    if (o === "collapses") {
      const far = img.reduce((best, p) => (Math.hypot(...p) > Math.hypot(...best) ? p : best), [0, 0]);
      svg("line", { x1: px(0), y1: py(0), x2: px(far[0]), y2: py(far[1]), style: stroke("burgundy", 6) }, plot);
    } else {
      poly(plot, img, `fill:var(--c-${o === "keeps" ? "teal" : "ochre"});fill-opacity:0.28;${stroke(o === "keeps" ? "teal" : "ochre", 2.5)}`);
    }
    arrow(plot, [0, 0], [m.a, m.c], "blue", { width: 4 });
    arrow(plot, [0, 0], [m.b, m.d], "teal", { width: 4 });
    const taken = [];
    tipLabel(c, [m.a, m.c], "column 1", "blue", taken);
    tipLabel(c, [m.b, m.d], "column 2", "teal", taken);
    w.readout.style.whiteSpace = "pre-line";
    const area = signedArea(img);
    w.readout.textContent = glue(
      `det = ad − bc = ${f2(m.a)}×${f2(m.d)} − ${f2(m.b)}×${f2(m.c)} = ${f2(d)}.\n` +
      `The unit square (area 1) became ${imageShape(A)}; its signed area is ${f2(area)}.\n` +
      (o === "keeps" ? `Orientation kept: areas are multiplied by ${f2(d)}.` : o === "flips" ? `Orientation flipped, like a mirror: areas are multiplied by ${f2(Math.abs(d))}.` : "Determinant 0: the square collapsed, so this matrix has no inverse."));
  };
  const sl = {};
  const mk = (key, label) => (sl[key] = slider({ label, min: -2.5, max: 2.5, step: 0.5, value: m[key], format: f2, onInput: (t) => { m[key] = t; draw(); } }));
  const presets = radios({ legend: "Try a named matrix", name: nextId("det-preset"), options: [...DET_PRESETS.map((p) => ({ value: p.value, label: p.label })), { value: "own", label: "My own (use the sliders)" }], value: "shear", columns: 2, onChange: (v) => {
    const p = DET_PRESETS.find((q) => q.value === v);
    if (!p) return;
    [m.a, m.b, m.c, m.d] = p.m;
    for (const [key, s] of Object.entries(sl)) setSlider(s, m[key]);
    draw();
  } });
  const ownRadio = presets.querySelector('input[value="own"]');
  w.controls.append(html("div", { class: "control-group" }, mk("a", "a (top left)").el, mk("b", "b (top right)").el), html("div", { class: "control-group" }, mk("c", "c (bottom left)").el, mk("d", "d (bottom right)").el), presets);
  for (const s of Object.values(sl)) s.input.addEventListener("input", () => { ownRadio.checked = true; });
  draw();
  host.append(w.root);
}

/* ---------- 2. Trace ---------- */
function traceWidget(host) {
  const w = widgetShell({
    title: "Add up the diagonal",
    description: "A three by three table of numbers drawn in a grid. The three entries on the diagonal, from top left to bottom right, are shaded ochre; the others are plain. Two sliders change one diagonal entry and one off-diagonal entry. The trace, the sum of the diagonal, is written below, and changes only when the diagonal entry changes.",
    viewBox: "180 10 290 200",
  });
  const st = { diag: 4, off: 1 };
  const draw = () => {
    const c = w.canvas;
    c.replaceChildren();
    const M = [[2, st.off, 0], [1, st.diag, 3], [5, -1, 3]];
    const x0 = 190, y0 = 20, cw = 88, ch = 60;
    M.forEach((row, i) => row.forEach((v, j) => {
      const onDiag = i === j, changing = (i === 1 && j === 1) || (i === 0 && j === 1);
      svg("rect", { x: x0 + j * cw, y: y0 + i * ch, width: cw - 6, height: ch - 6, rx: 6, style: `${onDiag ? "fill:var(--c-ochre);fill-opacity:0.3;" : "fill:none;"}stroke:var(--c-${changing ? "teal" : "navy"});stroke-width:${changing ? 3 : 1.5}` }, c);
      text(c, x0 + j * cw + (cw - 6) / 2, y0 + i * ch + ch / 2 + 6, f2(v), { "text-anchor": "middle" });
    }));
    w.readout.textContent = glue(`tr = ${M.map((r, i) => f2(r[i])).join(" + ")} = ${f2(trace(M))}. The outlined teal entries are the two the sliders change; only the one on the diagonal moves the trace.`);
  };
  const a = slider({ label: "Diagonal entry (row 2, column 2)", min: -5, max: 9, step: 1, value: st.diag, format: f2, onInput: (t) => { st.diag = t; draw(); } });
  const b = slider({ label: "Off-diagonal entry (row 1, column 2)", min: -5, max: 9, step: 1, value: st.off, format: f2, onInput: (t) => { st.off = t; draw(); } });
  w.controls.append(html("div", { class: "control-group" }, a.el, b.el));
  draw();
  host.append(w.root);
}

/* ---------- 3. Eigenvectors ---------- */
const EIG_PRESETS = [
  { value: "two", label: "Two directions: rows (4, 1) and (2, 3)", A: () => [[4, 1], [2, 3]] },
  { value: "scale", label: "Scaling by 2 and 3", A: () => scaling(2, 3) },
  { value: "proj", label: "Projection onto the x-axis", A: () => projectionX() },
  { value: "rot", label: "Rotation by 60°", A: () => rotation(Math.PI / 3) },
  { value: "shear", label: "Shear, k = 1", A: () => shear(1) },
];
function eigenWidget(host) {
  const w = widgetShell({
    title: "Find the arrows a matrix only stretches",
    description: "A grid with a unit arrow v in blue, whose direction you set with a slider from 0 to 180 degrees, and the arrow Av in ochre, where the matrix sends it. A faint line runs through v. When Av lies along that line, v is an eigenvector, and a corner mark appears. The angle between v and Av and the stretch factor are written below. You can pick a matrix, and jump the slider to each eigenvector the matrix has, if it has any.",
    viewBox: VIEW,
    narrowViewBox: VIEW_NARROW,
  });
  const st = { preset: "two", theta: Math.PI / 6 };
  let A = EIG_PRESETS[0].A();
  const jump = html("div", { class: "jump-row" });
  const sl = slider({ label: "Direction of v", min: 0, max: 180, step: 1, value: 30, format: (v) => `${v}°`, onInput: (v) => { st.theta = (v * Math.PI) / 180; draw(); } });
  const draw = () => {
    const c = w.canvas;
    c.replaceChildren();
    const plot = drawPlane(c);
    const v = [Math.cos(st.theta), Math.sin(st.theta)];
    const Av = matVec(A, v);
    svg("line", { x1: px(-12 * v[0]), y1: py(-12 * v[1]), x2: px(12 * v[0]), y2: py(12 * v[1]), style: stroke("blue", 1.5, "stroke-dasharray:3 5") }, plot);
    arrow(plot, [0, 0], Av, "ochre", { width: 5 });
    arrow(plot, [0, 0], v, "blue", { width: 4 });
    tag(c, v, "v", "blue", 8, -8);
    const len = Math.hypot(...Av);
    if (len > 1e-9) tag(c, Av, "Av", "ochre", 8, -8);
    const gap = parallelGap(A, st.theta), dotv = v[0] * Av[0] + v[1] * Av[1];
    const phi = (Math.atan2(gap, dotv) * 180) / Math.PI;
    const onLine = len <= 1e-9 || Math.abs(gap) <= 1e-9 * Math.max(1, len);
    w.readout.style.whiteSpace = "pre-line";
    w.readout.textContent = glue(
      `v = ${tup(v.map(r2))}, Av = ${tup(Av.map(r2))}.\n` +
      (len <= 1e-9 ? "Av is the zero vector: this matrix squashes v to nothing, so v is an eigenvector with eigenvalue 0." :
        onLine ? `Av lies along v: Av = λv with λ = ${f3(dotv)}. v is an eigenvector.` :
          `The angle from v to Av is ${f2(phi)}°, not 0° or 180°, so v is not an eigenvector. Av is ${f2(len)} times as long as v.`));
    const e = eigen2(A);
    const note = e.kind === "none" ? "This matrix has no real eigenvalues: tr² − 4 det is negative, so every arrow is turned and none stays on its line." :
      e.defective ? "This matrix has the eigenvalue 1 repeated but only one eigenvector direction: it is defective." : "";
    if (note) w.readout.textContent += glue(`\n${note}`);
  };
  const setPreset = (value) => {
    st.preset = value;
    A = EIG_PRESETS.find((p) => p.value === value).A();
    const e = eigen2(A);
    jump.replaceChildren();
    if (e.vectors.length === 0) jump.append(html("p", { class: "muted", text: "No real eigenvector to jump to." }));
    eigenAngles(A).forEach((t, i) => {
      const b = html("button", { type: "button", class: "button-secondary button-small", text: `Jump to eigenvector ${i + 1} (λ = ${f3(e.values[i])})` });
      b.addEventListener("click", () => { st.theta = t; sl.input.value = String(Math.round((t * 180) / Math.PI) % 180); sl.show(); draw(); });
      jump.append(b);
    });
    draw();
  };
  const presets = radios({ legend: "Choose a matrix", name: nextId("eig-preset"), options: EIG_PRESETS.map((p) => ({ value: p.value, label: p.label })), value: "two", onChange: setPreset });
  w.controls.append(sl.el, jump, presets);
  setPreset("two");
  host.append(w.root);
}

/* ---------- 4. Eigendecomposition ---------- */
const SYM = [[1.25, 0.75], [0.75, 1.25]];
function powersWidget(host) {
  const w = widgetShell({
    title: "Powers of a symmetric matrix",
    description: "A grid with a faint unit circle and the ellipse that the circle becomes after the matrix is applied n times. The two eigenvector directions, along the diagonals, are drawn as dashed lines. The ellipse is stretched along them by the eigenvalue raised to the power n. The entries of the matrix power, worked out as P D to the n P inverse, and checked against repeated multiplication, are written below.",
    viewBox: VIEW,
    narrowViewBox: VIEW_NARROW,
  });
  const st = { n: 1 };
  const draw = () => {
    const c = w.canvas;
    c.replaceChildren();
    const plot = drawPlane(c);
    const An = matPower(SYM, st.n);
    const circle = circleImage(identityLike(), 72);
    poly(plot, circle, stroke("navy", 1.5, "stroke-dasharray:3 4"), true);
    svg("line", { x1: px(-9), y1: py(-9), x2: px(9), y2: py(9), style: stroke("teal", 1.5, "stroke-dasharray:3 5") }, plot);
    svg("line", { x1: px(-6), y1: py(6), x2: px(6), y2: py(-6), style: stroke("blue", 1.5, "stroke-dasharray:3 5") }, plot);
    poly(plot, circleImage(An, 72), `fill:var(--c-ochre);fill-opacity:0.2;${stroke("ochre", 3)}`);
    const { values } = symmetricEigen(SYM);
    const viaEigen = powerViaEigen(SYM, st.n);
    w.readout.style.whiteSpace = "pre-line";
    w.readout.textContent = glue(
      `A^${st.n} = ${rows(viaEigen)} (from P D^${st.n} P⁻¹).\n` +
      `The eigenvalues ${f2(values[0])} and ${f2(values[1])} become ${f3(values[0] ** st.n)} and ${f3(values[1] ** st.n)}: the ellipse is that long along the teal diagonal and that short along the blue one.\n` +
      `Largest difference from multiplying A by itself ${st.n} time${st.n === 1 ? "" : "s"}: ${maxAbsDiff(viaEigen, An) < 1e-12 ? "0 (to 12 decimals)" : maxAbsDiff(viaEigen, An).toExponential(1)}.`);
  };
  const sl = slider({ label: "Power n", min: 0, max: 3, step: 1, value: 1, format: String, onInput: (v) => { st.n = v; draw(); } });
  w.controls.append(sl.el);
  draw();
  host.append(w.root);
}
const identityLike = () => [[1, 0], [0, 1]];

/* ---------- 5. SVD ---------- */
const SVD_PRESETS = [
  { value: "shear", label: "Shear: (1, 1), (0, 1)", A: () => shear(1) },
  { value: "two", label: "Stretch: (4, 1), (2, 3)", A: () => [[4, 1], [2, 3]] },
  { value: "flip", label: "Mirror: (0, 2), (1, 0)", A: () => [[0, 2], [1, 0]] },
  { value: "flat", label: "Rank 1: (3, 0), (4, 0)", A: () => [[3, 0], [4, 0]] },
];
const STAGES = [
  { value: "0", label: "Start: unit circle" },
  { value: "1", label: "1. Turn or flip, V^T" },
  { value: "2", label: "2. Stretch, Σ" },
  { value: "3", label: "3. Turn or flip, U (now A)" },
];
function svdWidget(host) {
  const w = widgetShell({
    title: "Rotate, stretch, rotate",
    description: "A grid with the unit circle drawn as a dashed outline and the circle after each stage of the SVD as a filled shape: first V^T, which only turns or flips the circle, then Σ, which stretches it along the two axes into an ellipse, then U, which turns or flips the ellipse. Two arrows, ochre and navy, follow the right singular vectors through every stage, so you can see the semi-axes. A radio group picks the stage and another picks the matrix. The singular values, their product against the determinant, and the sum of their squares against the sum of the squared entries are written below.",
    viewBox: VIEW,
    narrowViewBox: VIEW_NARROW,
  });
  const st = { stage: 0, preset: "shear" };
  const draw = () => {
    const c = w.canvas;
    c.replaceChildren();
    const plot = drawPlane(c);
    const A = SVD_PRESETS.find((p) => p.value === st.preset).A();
    const { U, s, V, stages } = svdStages(A, 90);
    poly(plot, stages[0], stroke("navy", 1.5, "stroke-dasharray:3 4"));
    const shape = stages[st.stage];
    poly(plot, shape, `fill:var(--c-teal);fill-opacity:0.22;${stroke("teal", 3)}`);
    // the two right singular vectors, carried through the stages
    const v1 = [V[0][0], V[1][0]], v2 = [V[0][1], V[1][1]];
    const carry = (v) => {
      const a = matVec(transpose(V), v), b = matVec(diag(s), a), cc = matVec(U, b);
      return [v, a, b, cc][st.stage];
    };
    arrow(plot, [0, 0], carry(v2), "navy", { width: 4 });
    arrow(plot, [0, 0], carry(v1), "ochre", { width: 5 });
    w.readout.style.whiteSpace = "pre-line";
    const detA = det2(A), detUV = det2(U) * det2(V);
    w.readout.textContent = glue(
      `Singular values: σ₁ = ${f3(s[0])}, σ₂ = ${f3(s[1])}. The ellipse has those semi-axes; σ₁ is the biggest stretch.\n` +
      `σ₁σ₂ = ${f3(s[0] * s[1])} and |det A| = ${f3(Math.abs(detA))}. σ₁² + σ₂² = ${f3(s[0] ** 2 + s[1] ** 2)} and the sum of squared entries is ${f3(frobeniusSq(A))}.\n` +
      `U and V together ${detUV < 0 ? "include one flip (determinants multiply to −1)" : "contain no net flip (determinants multiply to +1)"}.` +
      (rankFromSingular(s, 2, 2) < 2 ? "\nσ₂ is 0 (below the rank tolerance): the ellipse is a line segment and the rank is 1." : ""));
  };
  const stage = radios({ legend: "Stage", name: nextId("svd-stage"), options: STAGES, value: "0", columns: 2, onChange: (v) => { st.stage = Number(v); draw(); } });
  const preset = radios({ legend: "Choose a matrix (its two rows)", name: nextId("svd-preset"), options: SVD_PRESETS.map((p) => ({ value: p.value, label: p.label })), value: "shear", columns: 2, onChange: (v) => { st.preset = v; draw(); } });
  w.controls.append(stage, preset);
  draw();
  host.append(w.root);
}

/* ---------- 6. Low-rank approximation ---------- */
let patternSvd = null;
const patternFactors = () => (patternSvd ??= svd(pattern16()));
function lowRankWidget(host) {
  const w = widgetShell({
    title: "Compress a 16 by 16 pattern",
    description: "Two 16 by 16 grids of grey squares and a bar chart. The left grid is a pattern made in code: a bright disc, a diagonal stripe and a soft ramp. The right grid is its best rank-k approximation, with k set by a slider from 0 to 16. The bar chart shows the 16 singular values, the first k in colour. The relative error, the sum of the dropped squared singular values, and how many numbers are stored against 256 are written below.",
    viewBox: "0 0 640 250",
  });
  const P = pattern16();
  const st = { k: 2 };
  const grid = (parent, M, x0, y0, cell) => {
    M.forEach((row, i) => row.forEach((v, j) => {
      svg("rect", { x: x0 + j * cell, y: y0 + i * cell, width: cell, height: cell, style: `fill:var(--c-navy);fill-opacity:${Math.max(0, Math.min(1, v))}` }, parent);
    }));
    svg("rect", { x: x0, y: y0, width: 16 * cell, height: 16 * cell, style: "fill:none;stroke:var(--c-navy);stroke-width:1.5" }, parent);
  };
  const draw = () => {
    const c = w.canvas;
    c.replaceChildren();
    const f = patternFactors();
    const Ak = truncatedSvd(P, st.k, f);
    grid(c, P, 20, 40, 12);
    grid(c, Ak, 245, 40, 12);
    text(c, 20 + 96, 28, "Original", { "text-anchor": "middle" });
    text(c, 245 + 96, 28, `Rank ${st.k}`, { "text-anchor": "middle" });
    const bx = 470, bw = 9, top = 40, hmax = 192;
    f.s.forEach((v, i) => {
      const h = (v / f.s[0]) * hmax;
      svg("rect", { x: bx + i * (bw + 1), y: top + hmax - h, width: bw, height: Math.max(h, 1), style: fillOf(i < st.k ? "ochre" : "navy") + (i < st.k ? "" : ";fill-opacity:0.25") }, c);
    });
    text(c, bx + 16 * (bw + 1) - 1, 28, "Singular values", { "text-anchor": "end" });   // right-aligned to the last bar: centred, the title ran off the edge on a phone
    const rel = Math.sqrt(bestErrorFrobSq(f.s, st.k) / frobeniusSq(P));
    const stored = storageTruncated(16, 16, st.k);
    w.readout.style.whiteSpace = "pre-line";
    w.readout.textContent = glue(
      `Rank ${st.k}: relative error ${f2(rel * 100)}%. Squared error ${f3(bestErrorFrobSq(f.s, st.k))} = the sum of the ${16 - st.k} dropped squared singular values.\n` +
      `Spectral error σ${subscript(st.k + 1)} = ${st.k < 16 ? f3(bestErrorSpectral(f.s, st.k)) : "0"}.\n` +
      `Numbers stored: ${st.k} × (16 + 16 + 1) = ${stored}, against ${storageFull(16, 16)} for the picture itself${stored >= 256 ? ": no saving at this rank." : "."}`);
  };
  const sl = slider({ label: "Rank k", min: 0, max: 16, step: 1, value: st.k, format: String, onInput: (v) => { st.k = v; draw(); } });
  w.controls.append(sl.el);
  draw();
  host.append(w.root);
}
const SUBS = "₀₁₂₃₄₅₆₇₈₉";
const subscript = (num) => String(num).split("").map((d) => SUBS[Number(d)]).join("");

/* ---------- worked examples (steppers) ---------- */
const A1 = [[2, 1], [1, 3]];
const stepperData = {
  det() {
    const img = unitSquareImage(A1), B = [[1, 1], [0, 2]], AB = matMul(A1, B);
    return [
      { title: "Send the corners through the matrix", text: `A has rows (2, 1) and (1, 3). The unit square's corners (0, 0), (1, 0), (1, 1) and (0, 1) land at ${img.map(tup).join(", ")}.`, tex: `A=${bm(A1)}` },
      { title: "Measure the area it covers", text: `The shoelace formula gives the signed area of that parallelogram: ${f2(signedArea(img))}, positive because the corners still run counter-clockwise.` },
      { title: "The shortcut", text: `ad − bc = 2×3 − 1×1 = ${det2(A1)}. The same number, with no drawing.`, tex: `\\det A=2\\cdot3-1\\cdot1=${det2(A1)}` },
      { title: "Chain two transformations", text: `B has rows (1, 1) and (0, 2), with determinant ${det2(B)}. Then AB has rows ${rows(AB)}, and its determinant is ${det2(AB)} = ${det2(A1)} × ${det2(B)}.`, tex: `\\det(AB)=${det2(AB)}=${det2(A1)}\\cdot${det2(B)}=\\det A\\,\\det B` },
    ];
  },
  trace() {
    const A = [[1, 2], [3, 4]], B = [[0, 1], [1, 0]], AB = matMul(A, B), BA = matMul(B, A);
    return [
      { title: "Add the diagonal", text: `For A with rows (1, 2) and (3, 4) the diagonal entries are 1 and 4, so the trace is ${trace(A)}.`, tex: `\\operatorname{tr}A=1+4=${trace(A)}` },
      { title: "Multiply in both orders", text: `B swaps the two entries of a vector; its rows are (0, 1) and (1, 0). AB has rows ${rows(AB)}; BA has rows ${rows(BA)}. They are different matrices.`, tex: `AB=${bm(AB)},\\quad BA=${bm(BA)}` },
      { title: "The traces agree anyway", text: `tr(AB) = ${AB[0][0]} + ${AB[1][1]} = ${trace(AB)} and tr(BA) = ${BA[0][0]} + ${BA[1][1]} = ${trace(BA)}.`, tex: `\\operatorname{tr}(AB)=${trace(AB)}=\\operatorname{tr}(BA)` },
      { title: "Squared entries", text: `Square every entry of A and add: 1 + 4 + 9 + 16 = ${frobeniusSq(A)}. The trace of A^T A, whose diagonal holds each column's sum of squares, is also ${trace(matMul(transpose(A), A))}.`, tex: `\\operatorname{tr}(A^{\\top}A)=${trace(matMul(transpose(A), A))}=\\textstyle\\sum a_{ij}^2` },
    ];
  },
  eigen() {
    const A = [[4, 1], [2, 3]], e = eigen2(A), tr = trace(A), dt = det2(A), disc = discriminant2(A);
    return [
      { title: "Trace and determinant", text: `A has rows (4, 1) and (2, 3). The trace is 4 + 3 = ${tr} and the determinant is 4×3 − 1×2 = ${dt}.`, tex: `\\operatorname{tr}A=${tr},\\quad \\det A=${dt}` },
      { title: "The discriminant", text: `tr² − 4 det = ${tr}² − 4×${dt} = ${disc}. It is positive, so there are two real eigenvalues; its square root is ${denoise(Math.sqrt(disc))}.`, tex: `\\Delta=${tr}^2-4\\cdot${dt}=${disc}` },
      { title: "The eigenvalues", text: `(${tr} ± ${denoise(Math.sqrt(disc))}) / 2 gives ${e.values[0]} and ${e.values[1]}. Their sum is ${e.values[0] + e.values[1]}, the trace, and their product is ${e.values[0] * e.values[1]}, the determinant.`, tex: `\\lambda=\\dfrac{${tr}\\pm${denoise(Math.sqrt(disc))}}{2}=${e.values[0]},\\ ${e.values[1]}` },
      { title: "An eigenvector for each", text: `For λ = ${e.values[0]}, the arrow (1, 1) works: A(1, 1) = ${tup(matVec(A, [1, 1]))} = ${e.values[0]}×(1, 1). For λ = ${e.values[1]}, the arrow (1, −2) works: A(1, −2) = ${tup(matVec(A, [1, -2]))} = ${e.values[1]}×(1, −2).`, tex: `A\\begin{bmatrix}1\\\\1\\end{bmatrix}=${e.values[0]}\\begin{bmatrix}1\\\\1\\end{bmatrix},\\quad A\\begin{bmatrix}1\\\\-2\\end{bmatrix}=${e.values[1]}\\begin{bmatrix}1\\\\-2\\end{bmatrix}` },
    ];
  },
  eigendecomp() {
    const A = [[4, 1], [2, 3]], f = decomposeWith([[1, 1], [1, -2]], [5, 2]);
    const A3 = matMul(matMul(f.P, diag([5 ** 3, 2 ** 3])), f.Pinv);
    const { values: rawValues, Q } = symmetricEigen(SYM);
    const values = rawValues.map(denoise);   // display only: 1.9999999999999996 becomes 2
    return [
      { title: "Stack the eigenvectors", text: `From the last card, A has eigenvectors (1, 1) and (1, −2) with eigenvalues 5 and 2. Put the eigenvectors in the columns of P and the eigenvalues on the diagonal of D.`, tex: `P=${bm(f.P)},\\quad D=${bm(f.D)}` },
      { title: "Check A = P D P⁻¹", text: `P⁻¹ has rows ${rows(f.Pinv.map((r) => r.map((v) => Math.round(v * 1000) / 1000)))} (thirds, rounded). Multiplying P D P⁻¹ gives back the rows ${rows(matMul(matMul(f.P, f.D), f.Pinv).map((r) => r.map((v) => Math.round(v))))}, which are the rows of A.`, tex: `A=PDP^{-1}=${bm(A)}` },
      { title: "A cube costs one cube per diagonal entry", text: `D³ is just ${5}³ = ${5 ** 3 /* num-ok: exact integer */} and ${2}³ = ${2 ** 3 /* num-ok: exact integer */} on the diagonal. P D³ P⁻¹ has rows ${rows(A3.map((r) => r.map(Math.round)))}, the same as multiplying A by itself three times: ${rows(matPower(A, 3))}.`, tex: `A^3=PD^3P^{-1}=${bm(matPower(A, 3))}` },
      { title: "A symmetric matrix does it with a rotation", text: `S with rows ${rows(SYM)} is symmetric. Its eigenvalues are ${values[0]} and ${values[1]}, and its eigenvectors, (1, 1) and (1, −1) scaled to length 1, are at right angles. With those in the columns of Q, Q^T is Q⁻¹.`, tex: `S=Q\\Lambda Q^{\\top},\\quad Q=\\tfrac{1}{\\sqrt2}${bm([[1, 1], [1, -1]])},\\ \\Lambda=${bm(diag(values))}` },
    ];
  },
  svd() {
    const A = shear(1), { U, s, V } = svd(A), G = matMul(transpose(A), A), L = symmetricEigen(G).values;
    return [
      { title: "Start from A^T A", text: `For the shear A with rows (1, 1) and (0, 1), A^T A has rows ${rows(G)}. Its trace is ${trace(G)} and its determinant is ${det2(G)}.`, tex: `A^{\\top}A=${bm(G)}` },
      { title: "Its eigenvalues", text: `(${trace(G)} ± √${discriminant2(G)}) / 2 = ${f3(L[0])} and ${f3(L[1])}. They are not negative, because A^T A is a sum of squares.`, tex: `\\lambda=\\dfrac{3\\pm\\sqrt5}{2}=${f3(L[0])},\\ ${f3(L[1])}` },
      { title: "Square roots are the singular values", text: `σ₁ = √${f3(L[0])} = ${f3(s[0])} and σ₂ = √${f3(L[1])} = ${f3(s[1])}. Their product is ${f3(s[0] * s[1])}, which is |det A| = 1, and their squares add to ${f3(s[0] ** 2 + s[1] ** 2)}, which is the sum of A's squared entries, 1 + 1 + 0 + 1 = ${frobeniusSq(A)} (that is 2 + k² with k = 1).`, tex: `\\sigma_1=\\tfrac{\\sqrt5+1}{2}=${f3(s[0])},\\quad\\sigma_2=\\tfrac{\\sqrt5-1}{2}=${f3(s[1])}` },
      { title: "The directions", text: `The right singular vectors v are the eigenvectors of A^T A: v₁ = ${tup([V[0][0], V[1][0]].map(f3))} and v₂ = ${tup([V[0][1], V[1][1]].map(f3))}. Then u = Av/σ gives u₁ = ${tup([U[0][0], U[1][0]].map(f3))} and u₂ = ${tup([U[0][1], U[1][1]].map(f3))}.`, tex: `A\\mathbf v_i=\\sigma_i\\mathbf u_i` },
      { title: "Rank and the tolerance", text: `Both singular values are far above the tolerance max(m, n) × ε × σ₁ = 2 × ${EPS.toExponential(2)} × ${f3(s[0])} = ${rankTolerance(2, 2, s[0]).toExponential(2)}, so the rank is ${rankFromSingular(s, 2, 2)}.` },
    ];
  },
  lowrank() {
    const A = [[4, 0], [3, -5]], f = svd(A), A1r = truncatedSvd(A, 1, f), E = matSub(A, A1r);
    return [
      { title: "The matrix and its singular values", text: `A has rows (4, 0) and (3, −5). Its singular values are σ₁ = ${f3(f.s[0])} and σ₂ = ${f3(f.s[1])}, and σ₁² = ${r2(f.s[0] ** 2)}, σ₂² = ${r2(f.s[1] ** 2)}. The sum of A's squared entries is ${frobeniusSq(A)}.`, tex: `\\sigma_1^2+\\sigma_2^2=${r2(f.s[0] ** 2)}+${r2(f.s[1] ** 2)}=${frobeniusSq(A)}` },
      { title: "Keep only the first term", text: `A₁ = σ₁u₁v₁^T has rows ${rows(A1r.map((r) => r.map((v) => Math.round(v * 100) / 100)))}. It has rank 1: its rows are multiples of each other.`, tex: `A_1=\\sigma_1\\mathbf u_1\\mathbf v_1^{\\top}=${matTex(A1r)}` },
      { title: "What was thrown away", text: `A − A₁ has rows ${rows(E.map((r) => r.map((v) => Math.round(v * 100) / 100)))}. Its squared entries add to ${r2(frobeniusSq(E))}, which is σ₂² = ${r2(f.s[1] ** 2)}, the dropped squared singular value.`, tex: `\\|A-A_1\\|_F^2=${r2(frobeniusSq(E))}=\\sigma_2^2` },
      { title: "Nothing of rank 1 does better", text: `Eckart–Young says no rank-1 matrix is closer to A than A₁: its squared error is at least ${r2(bestErrorFrobSq(f.s, 1))}. The spectral error is σ₂ = ${f3(bestErrorSpectral(f.s, 1))}. The tests try thousands of random rank-1 matrices and none beat it.` },
    ];
  },
};

/* ---------- numbers quoted in the prose ---------- */
const sheared = svd(shear(1));
const hu = { d: 512, r: 8 };
const calcs = {
  detFlip: () => String(det2([[0, 1], [1, 0]])),
  detRot: () => String(Math.round(det2(rotation(1)) * 1e9) / 1e9),
  detShear: () => String(det2(shear(7))),
  detScale: () => String(det2(scaling(2, 3))),
  detProj: () => String(det2(projectionX())),
  detA: () => String(det2(A1)),
  detCopy: () => String(det2(scaling(2, 2))),
  detTiny: () => String(Number(det2(scaling(0.001, 0.001)).toPrecision(6))),
  discTwo: () => String(discriminant2([[4, 1], [2, 3]])),
  discScale: () => String(discriminant2(scaling(2, 3))),
  discProj: () => String(discriminant2(projectionX())),
  discShear: () => String(discriminant2(shear(1))),
  valsTwo: () => `${eigenvalues2([[4, 1], [2, 3]])[0]} and ${eigenvalues2([[4, 1], [2, 3]])[1]}`,
  dModel: () => String(transformerBase.dModel),
  dK: () => String(baseDK),
  projShape: () => `${baseDK}×${transformerBase.dModel}`,
  traceA: () => String(trace([[3, 1], [4, 6]])),
  squaredEntries: () => String(frobeniusSq([[1, 2], [3, 4]])),
  eigSum: () => String(trace([[4, 1], [2, 3]])),
  eigProd: () => String(det2([[4, 1], [2, 3]])),
  rotDisc: () => String(Math.round(discriminant2(rotation(Math.PI / 3)) * 1000) / 1000),
  rotTrace: () => String(Math.round(trace(rotation(Math.PI / 3)) * 1000) / 1000),
  shearEig: () => String(eigenvalues2(shear(1))[0]),
  projEig: () => `${eigenvalues2(projectionX())[0]} and ${eigenvalues2(projectionX())[1]}`,
  scaleEig: () => `${eigenvalues2(scaling(2, 3))[0]} and ${eigenvalues2(scaling(2, 3))[1]}`,
  sigma1Shear: () => f3(sheared.s[0]),
  sigma2Shear: () => f3(sheared.s[1]),
  sigmaProd: () => f3(sheared.s[0] * sheared.s[1]),
  sigmaSq: () => String(Math.round(sheared.s[0] ** 2 + sheared.s[1] ** 2)),
  epsilon: () => EPS.toExponential(2),
  tol22: () => rankTolerance(2, 2, sheared.s[0]).toExponential(2),
  storage8: () => storageTruncated(512, 512, 8).toLocaleString("en-US"),
  storageFull512: () => storageFull(512, 512).toLocaleString("en-US"),
  storageLoRA8: () => storageLoRA(512, 512, 8).toLocaleString("en-US"),
  storageDiff: () => String(storageTruncated(512, 512, 8) - storageLoRA(512, 512, 8)),
  storage16: () => String(storageFull(16, 16)),
  per16: () => String(storageTruncated(16, 16, 1)),
  rank8of16: () => String(storageTruncated(16, 16, 8)),
  rank7of16: () => String(storageTruncated(16, 16, 7)),
  breakEven16: () => String(breakEvenRank(16, 16)),
  loraRank: () => String(hu.r),
  loraBMatrix: () => `${hu.d}×${hu.r}`,
  loraAMatrix: () => `${hu.r}×${hu.d}`,
  timesTableRank: () => String(rankFromSingular(svd(Array.from({ length: 6 }, (_, i) => Array.from({ length: 6 }, (_, j) => (i + 1) * (j + 1)))).s, 6, 6)),
  sumSqA: () => String(frobeniusSq([[4, 0], [3, -5]])),
};
const texCalcs = {};

/* ---------- boot ---------- */
const widgetMounts = { det: detWidget, trace: traceWidget, eigen: eigenWidget, powers: powersWidget, svd: svdWidget, lowrank: lowRankWidget };
const { predictions } = await renderChecks();
bootPage({ widgetMounts, stepperData, predictions, calcs, texCalcs });
