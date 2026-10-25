// Module 1 (second half): widgets, worked examples and checks. Every number comes from linalg-math.mjs.
import {
  matVec, matMul, shape, column, fromColumns, transpose, identity, det2, inverse, inverse2ByFormula, fracMatMul,
  fracMatrixToNumbers, fracToString, frac, rank, rank2, areIndependent, solveSystem, rotationDegrees, scaling, shear,
  projectionOntoX, transformedSquare, signedArea, unitSquare, linearCombination, add, resultShape, multiplyCount,
  transformerBase, lowRankEntryCount, entryCount, inSpan, determinant, isSquare,
} from "./linalg-math.mjs";
import { lineEndpoints } from "./foundations-math.mjs";
import { svg, html, slider, radios, widgetShell, fmt, nextId } from "./widgets.mjs";
import {
  n, tup, paren, bm, colTex, rowTex, stroke, fillOf, text, OX, OY, XMAX, YMAX, PLANE_VIEW, px, py, drawPlane, arrow,
  numberField, fieldGroup, bootPage,
} from "./linalg-shared.mjs";

const fracTex = (f) => (f.d === 1 ? String(f.n) : `${f.n < 0 ? "-" : ""}\\tfrac{${Math.abs(f.n)}}{${f.d}}`);
const fracBm = (F) => `\\begin{bmatrix}${F.map((r) => r.map(fracTex).join("&")).join("\\\\")}\\end{bmatrix}`;
const fracTup = (F) => `(${F.map(fracToString).join(", ").replace(/-/g, "−")})`;
const fx = (f) => fracToString(f).replace(/-/g, "−");
const signed = (v) => (v < 0 ? `− ${n(-v)}` : `+ ${n(v)}`);
const eqText = (a, b, c) => `${n(a)}x ${signed(b)}y = ${n(c)}`;

/* ---------- a small table of numbers, used by the inverse widget ---------- */
const CW = 56, CH = 40;
function table(c, M, x0, y0, { hiRow = null, hiCol = null, fmtCell = n } = {}) {
  const { rows, cols } = shape(M);
  const wd = cols * CW, ht = rows * CH;
  if (hiRow != null) svg("rect", { x: x0, y: y0 + hiRow * CH, width: wd, height: CH, rx: 4, style: "fill:#E4EAF4;stroke:var(--c-navy);stroke-width:2.5" }, c);
  if (hiCol != null) svg("rect", { x: x0 + hiCol * CW, y: y0, width: CW, height: ht, rx: 4, style: "fill:#E4EAF4;stroke:var(--c-navy);stroke-width:2.5" }, c);
  M.forEach((r, i) => r.forEach((value, j) => text(c, x0 + j * CW + CW / 2, y0 + i * CH + CH / 2 + 5, fmtCell(value), { "text-anchor": "middle" })));
  const br = (x, dir) => `M ${x + dir * 6} ${y0 - 4} H ${x} V ${y0 + ht + 4} H ${x + dir * 6}`;
  svg("path", { d: br(x0 - 6, 1), style: "stroke:var(--navy);stroke-width:2;fill:none" }, c);
  svg("path", { d: br(x0 + wd + 6, -1), style: "stroke:var(--navy);stroke-width:2;fill:none" }, c);
  return { wd, ht };
}

/* ---------- 1. Transpose and inverse ---------- */
function inverseWidget(host) {
  const w = widgetShell({
    title: "Flip it, then try to undo it",
    description: "Three tables of numbers. The left one is your matrix M. The middle one is its transpose, with row 1 of M outlined and the same numbers outlined as column 1 of the transpose. The right one is the inverse of M with exact fractions, or a message that no inverse exists when the determinant is zero.",
    viewBox: "40 100 560 170",
  });
  const M = [[1, 2], [3, 4]];
  w.readout.style.whiteSpace = "pre-line";
  const draw = () => {
    const c = w.canvas;
    c.replaceChildren();
    const top = 170;
    const label = (str, at, color) => text(c, at, top - 34, str, { "text-anchor": "middle", style: `fill:var(--c-${color})` });
    table(c, M, 70, top, { hiRow: 0 });
    label("M", 70 + CW, "navy");
    text(c, 70 + 2 * CW + 32, top + CH + 5, "→", { "text-anchor": "middle" });
    table(c, transpose(M), 245, top, { hiCol: 0 });
    label("M^T (transpose)", 245 + CW, "teal");
    const inv = inverse(M);
    const x3 = 420;
    if (inv) {
      table(c, inv, x3, top, { fmtCell: fx });
      label("M⁻¹ (inverse)", x3 + CW, "burgundy");
    } else {
      text(c, x3 + CW, top + CH, "no inverse", { "text-anchor": "middle", style: "fill:var(--try)" });
      label("M⁻¹", x3 + CW, "burgundy");
    }
    const d = det2(M);
    const lines = [
      `Transpose: row 1 of M, ${tup(M[0])}, becomes column 1 of M^T. Entry (1, 2) = ${n(M[0][1])} moved to position (2, 1).`,
      `Determinant ad − bc = ${paren(M[0][0])}·${paren(M[1][1])} − ${paren(M[0][1])}·${paren(M[1][0])} = ${n(d)}`,
    ];
    if (inv) {
      const check = fracMatrixToNumbers(fracMatMul(inv, M.map((r) => r.map((x) => frac(x)))));
      lines.push(`Inverse exists (the determinant is not zero). Check: M⁻¹·M = [${check.map((r) => `[${r.map(n).join(", ")}]`).join(", ")}], the identity.`);
    } else {
      lines.push("No inverse: the determinant is 0, so two different inputs reach the same output and nothing can tell them apart again.");
    }
    w.readout.textContent = lines.join("\n");
  };
  const fields = [];
  M.forEach((r, i) => r.forEach((value, j) => fields.push(numberField({
    label: `Row ${i + 1}, column ${j + 1}`, min: -5, max: 5, step: 1, value,
    onInput: (x) => { M[i][j] = Math.round(x); draw(); },
  }))));
  const setAll = (A) => { A.forEach((r, i) => r.forEach((x, j) => { M[i][j] = x; fields[i * 2 + j].set(x); })); draw(); };
  const presets = html("div", { class: "control" },
    html("span", { class: "control-label", text: "Try a matrix" }),
    html("div", { class: "button-row" },
      ...[["Invertible", [[1, 2], [3, 4]]], ["No inverse", [[1, 2], [2, 4]]], ["Identity", [[1, 0], [0, 1]]]].map(([label, A]) => {
        const b = html("button", { type: "button", class: "button-secondary button-small", text: label });
        b.addEventListener("click", () => setAll(A));
        return b;
      })));
  w.controls.append(fieldGroup("Matrix M (whole numbers, 2 rows, 2 columns)", ...fields), presets);
  host.append(w.root);
  draw();
}

/* ---------- 2. Systems of two equations ---------- */
const SYSTEM_PRESETS = {
  one: { label: "One solution", rows: [[1, 1, 4], [1, -1, 2]] },
  none: { label: "No solution", rows: [[1, 1, 4], [1, 1, 6]] },
  many: { label: "Infinitely many", rows: [[1, 1, 4], [2, 2, 8]] },
  single: { label: "Only x + y = 4", rows: [[1, 1, 4], [0, 0, 0]] },
};

function systemsWidget(host) {
  const w = widgetShell({
    title: "Two equations, two lines",
    description: "A grid with two straight lines, one for each equation, in teal and blue. Where the lines cross, a burgundy dot marks the one solution. Parallel lines never meet, so there is no solution. Two copies of the same line meet everywhere, so there are infinitely many solutions. The matrix form and a plain-language verdict are written below.",
    viewBox: PLANE_VIEW,
  });
  const rows = SYSTEM_PRESETS.one.rows.map((r) => [...r]);
  w.readout.style.whiteSpace = "pre-line";

  const draw = () => {
    const c = w.canvas;
    c.replaceChildren();
    const plot = drawPlane(c);
    const A = rows.map((r) => [r[0], r[1]]);
    const b = rows.map((r) => r[2]);
    const sol = solveSystem(A, b);
    rows.forEach(([a, bb, cc], i) => {
      if (a === 0 && bb === 0) return; // 0 = c is not a line
      const [p, q] = lineEndpoints({ a, b: bb, c: cc }, -XMAX, XMAX, -YMAX, YMAX);
      const color = i === 0 ? "teal" : "blue";
      const dash = i === 1 && sol.kind === "infinite" ? "stroke-dasharray:3 9;" : "";
      svg("line", { x1: px(p.x), y1: py(p.y), x2: px(q.x), y2: py(q.y), style: stroke(color, i === 1 && dash ? 3 : 3.5, dash) }, plot);
    });
    if (sol.kind === "one") {
      const [x, y] = sol.solution.map((f) => f.n / f.d);
      svg("circle", { cx: px(x), cy: py(y), r: 7, style: fillOf("burgundy") }, c);
      text(c, px(x) + 12, py(y) - 10, `(${fx(sol.solution[0])}, ${fx(sol.solution[1])})`, { "text-anchor": "start", style: "fill:var(--c-burgundy)" });
    }
    const lines = [
      `Equation 1: ${eqText(...rows[0])}      Equation 2: ${eqText(...rows[1])}`,
      `Matrix form A x = b: the rows of A are ${tup(A[0])} and ${tup(A[1])}, and b = ${tup(b)}`,
    ];
    const zeroRow = (r) => r[0] === 0 && r[1] === 0;
    if (sol.kind === "one") {
      const check = matVec(A, sol.solution.map((f) => f.n / f.d));
      lines.push(`Exactly one solution: (x, y) = ${fracTup(sol.solution)}. Check: row 1 gives ${n(check[0])}, row 2 gives ${n(check[1])}.`);
    } else if (sol.kind === "none") {
      lines.push(rows.some(zeroRow) ? "No solution: one equation says 0 = a non-zero number, which is never true." : "No solution: the two lines are parallel and never meet.");
    } else if (sol.freeVariables === 2) {
      lines.push("Infinitely many solutions: both equations say 0 = 0, so every point in the plane works.");
    } else if (rows.some(zeroRow)) {
      lines.push("Infinitely many solutions: only one real equation is left, so every point on its line works (one free choice).");
    } else {
      lines.push("Infinitely many solutions: the two equations describe the same line, so every point on it works (one free choice).");
    }
    lines.push("A linear system has no solution, exactly one, or infinitely many. It never has exactly two.");
    w.readout.textContent = lines.join("\n");
  };

  const fields = rows.map((r, i) => ["a", "b", "c"].map((nm, j) => numberField({
    label: `Equation ${i + 1}, ${nm === "a" ? "number of x" : nm === "b" ? "number of y" : "total"}`,
    min: nm === "c" ? -8 : -6, max: nm === "c" ? 8 : 6, step: 1, value: r[j],
    onInput: (x) => { rows[i][j] = Math.round(x); draw(); },
  })));
  const setPreset = (key) => {
    SYSTEM_PRESETS[key].rows.forEach((r, i) => r.forEach((x, j) => { rows[i][j] = x; fields[i][j].set(x); }));
    draw();
  };
  const presets = html("div", { class: "control" },
    html("span", { class: "control-label", text: "Try a system" }),
    html("div", { class: "button-row" }, ...Object.entries(SYSTEM_PRESETS).map(([key, { label }]) => {
      const b = html("button", { type: "button", class: "button-secondary button-small", text: label });
      b.addEventListener("click", () => setPreset(key));
      return b;
    })));
  w.controls.append(fieldGroup("Equation 1: (number of x)·x + (number of y)·y = total", ...fields[0]), fieldGroup("Equation 2: (number of x)·x + (number of y)·y = total", ...fields[1]), presets);
  host.append(w.root);
  draw();
}

/* ---------- 3. Span, independence, basis, rank ---------- */
function spanWidget(host) {
  const w = widgetShell({
    title: "What can two arrows reach?",
    description: "A grid with two arrows from the origin, v1 in teal and v2 in blue. If they point in different directions, the whole plane is tinted: every point can be reached. If they lie along one line, only that line through the origin is drawn. A burgundy dot marks a target point w, and when it can be reached the text gives the recipe.",
    viewBox: PLANE_VIEW,
  });
  const v1 = [1, 2], v2 = [2, 1], t = [3, 1];
  w.readout.style.whiteSpace = "pre-line";
  const draw = () => {
    const c = w.canvas;
    c.replaceChildren();
    const plot = drawPlane(c);
    const r = rank(fromColumns([v1, v2]));
    if (r === 2) svg("rect", { x: px(-XMAX), y: py(YMAX), width: 2 * XMAX * 30, height: 2 * YMAX * 30, style: "fill:var(--c-teal);opacity:0.10" }, plot);
    if (r === 1) {
      const d = v1.some((x) => x !== 0) ? v1 : v2;
      const k = 20 / Math.max(Math.abs(d[0]), Math.abs(d[1]));
      svg("line", { x1: px(-d[0] * k), y1: py(-d[1] * k), x2: px(d[0] * k), y2: py(d[1] * k), style: stroke("ochre", 8, "opacity:0.35") }, plot);
    }
    arrow(plot, [0, 0], v1, "teal");
    arrow(plot, [0, 0], v2, "blue");
    const rec = solveSystem(fromColumns([v1, v2]), t);
    if (rec.kind === "one") {
      const c1 = rec.solution[0].n / rec.solution[0].d, c2 = rec.solution[1].n / rec.solution[1].d;
      const mid = [c1 * v1[0], c1 * v1[1]];
      arrow(plot, [0, 0], mid, "teal", { width: 2, dash: "5 5", opacity: 0.8 });
      arrow(plot, mid, t, "blue", { width: 2, dash: "5 5", opacity: 0.8 });
    }
    svg("circle", { cx: px(t[0]), cy: py(t[1]), r: 7, style: fillOf("burgundy") }, c);
    text(c, px(t[0]) + 12, py(t[1]) - 10, "w", { "text-anchor": "start", style: "fill:var(--c-burgundy)" });
    const lines = [`rank of [v₁ v₂] = ${r}, the number of independent columns`];
    lines.push(r === 2 ? "v₁ and v₂ are independent, they span the whole plane, and so they are a basis."
      : r === 1 ? "v₁ and v₂ are dependent: one is a multiple of the other (or one is zero). They span only a line, so they are not a basis."
        : "Both vectors are zero. They span only the origin.");
    if (rec.kind === "one") lines.push(`w = ${tup(t)} is reached by exactly one recipe: ${fx(rec.solution[0])}·v₁ + ${fx(rec.solution[1])}·v₂.`);
    else if (rec.kind === "infinite") lines.push(`w = ${tup(t)} is on the span, and there are infinitely many recipes (the arrows are dependent).`);
    else lines.push(`w = ${tup(t)} is not in the span: no scaling and adding of v₁ and v₂ reaches it.`);
    w.readout.textContent = lines.join("\n");
  };
  const f = (label, arr, i) => numberField({ label, min: -4, max: 4, step: 1, value: arr[i], onInput: (x) => { arr[i] = Math.round(x); draw(); } });
  const fields = { v1: [f("v₁, first entry", v1, 0), f("v₁, second entry", v1, 1)], v2: [f("v₂, first entry", v2, 0), f("v₂, second entry", v2, 1)], t: [f("w, first entry", t, 0), f("w, second entry", t, 1)] };
  const preset = (label, a, b) => {
    const btn = html("button", { type: "button", class: "button-secondary button-small", text: label });
    btn.addEventListener("click", () => { v1[0] = a[0]; v1[1] = a[1]; v2[0] = b[0]; v2[1] = b[1]; fields.v1[0].set(a[0]); fields.v1[1].set(a[1]); fields.v2[0].set(b[0]); fields.v2[1].set(b[1]); draw(); });
    return btn;
  };
  const presets = html("div", { class: "control" }, html("span", { class: "control-label", text: "Try a pair" }),
    html("div", { class: "button-row" }, preset("Different directions", [1, 2], [2, 1]), preset("Same line", [1, 2], [2, 4]), preset("Unit arrows", [1, 0], [0, 1])));
  w.controls.append(fieldGroup("Vector v₁", ...fields.v1), fieldGroup("Vector v₂", ...fields.v2), fieldGroup("Target point w", ...fields.t), presets);
  host.append(w.root);
  draw();
}

/* ---------- 4. Linear transformations of the unit square ---------- */
// This widget uses 60 drawing units per step so the unit square is easy to see.
const Z = 60;
const zx = (x) => OX + Z * x;
const zy = (y) => OY - Z * y;
const Z_VIEW = "110 15 420 370";
const zt = (parent, x, y, str, attrs = {}) => text(parent, x, y, str, attrs);

function drawZPlane(canvas) {
  const clipId = nextId("clip");
  const clip = svg("clipPath", { id: clipId }, svg("defs", {}, canvas));
  svg("rect", { x: zx(-5), y: zy(3.2), width: 10 * Z, height: 6.4 * Z }, clip);
  const g = svg("g", { "clip-path": `url(#${clipId})` }, canvas);
  for (let x = -5; x <= 5; x++) svg("line", { class: x === 0 ? "axis" : "grid", x1: zx(x), x2: zx(x), y1: zy(3.2), y2: zy(-3.2) }, g);
  for (let y = -3; y <= 3; y++) svg("line", { class: y === 0 ? "axis" : "grid", x1: zx(-5), x2: zx(5), y1: zy(y), y2: zy(y) }, g);
  for (let x = -3; x <= 3; x++) if (x !== 0) zt(canvas, zx(x), zy(0) + 16, String(x).replace("-", "−"), { class: "tick-label", "text-anchor": "middle" });
  for (let y = -2; y <= 2; y++) if (y !== 0) zt(canvas, zx(0) - 8, zy(y) + 4, String(y).replace("-", "−"), { class: "tick-label", "text-anchor": "end" });
  return g;
}

function zarrow(parent, to, color, opts = {}) {
  const x1 = zx(to[0]), y1 = zy(to[1]), x0 = zx(0), y0 = zy(0);
  const len = Math.hypot(x1 - x0, y1 - y0);
  const g = svg("g", {}, parent);
  if (len < 1) { svg("circle", { cx: x0, cy: y0, r: 5, style: fillOf(color) }, g); return g; }
  const ux = (x1 - x0) / len, uy = (y1 - y0) / len, head = Math.min(14, len * 0.6);
  const bx = x1 - ux * head, by = y1 - uy * head;
  svg("line", { x1: x0, y1: y0, x2: bx + ux * 2, y2: by + uy * 2, style: stroke(color, opts.width ?? 4) }, g);
  svg("polygon", { points: `${x1},${y1} ${bx - uy * head * 0.45},${by + ux * head * 0.45} ${bx + uy * head * 0.45},${by - ux * head * 0.45}`, style: fillOf(color) }, g);
  return g;
}

const KINDS = {
  rotate: { label: "Rotate" },
  scale: { label: "Scale" },
  shear: { label: "Shear" },
  project: { label: "Project onto the x-axis" },
};

function transformWidget(host) {
  const w = widgetShell({
    title: "Where does the unit square go?",
    description: "A grid with the unit square outlined with a dashed line. The same square after the chosen transformation is filled in navy. A teal arrow shows where the arrow (1, 0) lands, which is column 1 of the matrix, and a blue arrow shows where (0, 1) lands, which is column 2. For a rotation, a curved burgundy arrow shows the turn and its direction. The matrix, the area scale and whether it can be undone are written below.",
    viewBox: Z_VIEW,
  });
  let kind = "rotate";
  const p = { angle: 30, sx: 2, sy: 1, k: 1 };
  w.readout.style.whiteSpace = "pre-line";
  const matrixNow = () => (kind === "rotate" ? rotationDegrees(p.angle) : kind === "scale" ? scaling(p.sx, p.sy) : kind === "shear" ? shear(p.k) : projectionOntoX);

  const draw = () => {
    const c = w.canvas;
    c.replaceChildren();
    const plot = drawZPlane(c);
    const M = matrixNow();
    const poly = (pts, style) => svg("polygon", { points: pts.map((q) => `${zx(q[0])},${zy(q[1])}`).join(" "), style }, plot);
    poly(unitSquare, "fill:none;stroke:var(--ink-muted, #6b6b6b);stroke-width:2;stroke-dasharray:6 6");
    poly(transformedSquare(M), "fill:var(--c-navy);fill-opacity:0.22;stroke:var(--c-navy);stroke-width:3");
    const c1 = column(M, 1), c2 = column(M, 2);
    zarrow(plot, c1, "teal");
    zarrow(plot, c2, "blue");
    // Keep the two labels on opposite sides of their tips so they do not run into each other.
    const left2 = c2[0] < c1[0] - 0.05;
    zt(c, zx(c1[0]) + 8, zy(c1[1]) + (c1[1] > 0.2 ? -8 : 18), "column 1", { "text-anchor": "start", style: "fill:var(--c-teal)" });
    zt(c, zx(c2[0]) + (left2 ? -8 : 8), zy(c2[1]) - 8, "column 2", { "text-anchor": left2 ? "end" : "start", style: "fill:var(--c-blue)" });
    let arcInfo = "";
    if (kind === "rotate" && p.angle !== 0) {
      // Screen coordinates: y points down, so a counter-clockwise turn on screen is SVG sweep-flag 0.
      const r = 0.55 * Z, th = (p.angle * Math.PI) / 180;
      const sx0 = zx(0) + r, sy0 = zy(0);
      const ex = zx(0) + r * Math.cos(th), ey = zy(0) - r * Math.sin(th);
      const sweep = p.angle > 0 ? 0 : 1;
      const arc = svg("path", { d: `M ${sx0} ${sy0} A ${r} ${r} 0 ${Math.abs(p.angle) > 180 ? 1 : 0} ${sweep} ${ex} ${ey}`, style: stroke("burgundy", 3), "data-arc": p.angle > 0 ? "counter-clockwise" : "clockwise" }, c);
      const dir = p.angle > 0 ? 1 : -1;
      const tx = dir * -Math.sin(th), ty = dir * -Math.cos(th); // screen-space direction of travel at the end of the arc
      const hl = 10;
      svg("polygon", { points: `${ex + tx * hl},${ey + ty * hl} ${ex - ty * 5},${ey + tx * 5} ${ex + ty * 5},${ey - tx * 5}`, style: fillOf("burgundy") }, c);
      arc.setAttribute("aria-hidden", "true");
      arcInfo = ` The burgundy arc turns ${p.angle > 0 ? "counter-clockwise" : "clockwise"} on the screen.`;
    }
    const d = det2(M);
    const area = signedArea(transformedSquare(M));
    const rk = rank2(M);
    const mt = (A) => `[${A.map((r) => `[${r.map((x) => n(Math.round(x * 1000) / 1000)).join(", ")}]`).join(", ")}]`;
    const lines = [`Matrix: ${mt(M)}. Column 1 = where (1, 0) lands = ${tup(c1.map((x) => Math.round(x * 1000) / 1000))}; column 2 = where (0, 1) lands = ${tup(c2.map((x) => Math.round(x * 1000) / 1000))}.`];
    if (kind === "rotate") lines.push(`Rotation by ${n(p.angle)}° ${p.angle < 0 ? "clockwise (negative angle)" : "counter-clockwise"}: rows (cos θ, −sin θ) and (sin θ, cos θ).${arcInfo}`);
    if (kind === "shear") lines.push(`Shear with k = ${n(p.k)}: (x, y) goes to (x + ${n(p.k)}·y, y). The x-axis stays put and the top edge slides sideways.`);
    if (kind === "scale") lines.push(`Scaling: x stretched by ${n(p.sx)}, y by ${n(p.sy)}.${p.sx < 0 || p.sy < 0 ? " A negative factor mirrors the shape." : ""}`);
    if (kind === "project") lines.push(`Projection: (3, 2) lands on ${tup(matVec(M, [3, 2]))} and (3, −5) lands on ${tup(matVec(M, [3, -5]))}. Different inputs, one output.`);
    lines.push(`Signed area of the transformed unit square = ${n(Math.round(area * 1000) / 1000)}; this is the determinant ${n(Math.round(d * 1000) / 1000)} (here only the unit square's signed area scale).`);
    lines.push(`Rank ${rk}. ${rk === 2 ? "It can be undone: a transformation with rank 2 has an inverse." : "It cannot be undone: it squashes the plane onto a " + (rk === 1 ? "line" : "point") + "."}`);
    w.readout.textContent = lines.join("\n");
  };

  const angle = slider({ label: "Angle θ", min: -180, max: 180, step: 15, value: p.angle, format: (v) => `${v}°`, onInput: (v) => { p.angle = v; draw(); } });
  const sx = slider({ label: "Stretch in x", min: -2, max: 3, step: 0.5, value: p.sx, format: n, onInput: (v) => { p.sx = v; draw(); } });
  const sy = slider({ label: "Stretch in y", min: -2, max: 3, step: 0.5, value: p.sy, format: n, onInput: (v) => { p.sy = v; draw(); } });
  const sk = slider({ label: "Shear amount k", min: -3, max: 3, step: 0.5, value: p.k, format: n, onInput: (v) => { p.k = v; draw(); } });
  const sliders = { rotate: [angle], scale: [sx, sy], shear: [sk], project: [] };
  const sliderBox = html("div", { class: "control-group" });
  const syncSliders = () => {
    // display:none, not the hidden attribute: the .control rule sets display and would override it.
    [angle, sx, sy, sk].forEach((s) => { s.el.style.display = sliders[kind].includes(s) ? "" : "none"; });
  };
  const picker = radios({
    legend: "Transformation", name: nextId("transform-kind"), value: kind,
    options: Object.entries(KINDS).map(([value, { label }]) => ({ value, label })),
    onChange: (value) => { kind = value; syncSliders(); draw(); },
  });
  sliderBox.append(angle.el, sx.el, sy.el, sk.el);
  w.controls.append(picker, sliderBox);
  syncSliders();
  host.append(w.root);
  draw();
}

/* ---------- worked examples (every number from tested code) ---------- */
const A23 = [[1, 2, 3], [4, 5, 6]];
const SQ = [[1, 2], [3, 4]];
const SING = [[1, 2], [2, 4]];
const PA = [[1, 2], [0, 1]], PB = [[1, 0], [3, 1]];
const inum = fracMatrixToNumbers;

const stepperData = {
  transpose() {
    const At = transpose(A23);
    const det = determinant(SQ);
    const inv = inverse2ByFormula(SQ);
    const prod = fracMatMul(inv, SQ.map((r) => r.map((x) => frac(x))));
    const AB = matMul(PA, PB);
    return [
      { title: "Transpose: rows become columns", text: `Take A, 2 rows by 3 columns. Row 1 is ${tup(A23[0])}; it becomes column 1 of A^T. The shape flips from ${shape(A23).rows}×${shape(A23).cols} to ${shape(At).rows}×${shape(At).cols}.`, tex: `A=${bm(A23)},\\quad A^{\\top}=${bm(At)}` },
      { title: "Identity: the do-nothing machine", text: `Multiplying by the identity changes nothing, from either side (the identity must be the right size each time).`, tex: `I_2A=${bm(matMul(identity(2), A23))}=A,\\quad AI_3=${bm(matMul(A23, identity(3)))}=A` },
      { title: "Inverse: first the determinant", text: `For a 2×2 matrix the determinant is ad − bc. Here a = 1, b = 2, c = 3, d = 4, so it is 1·4 − 2·3 = ${fracToString(det)}. It is not zero, so an inverse exists.`, tex: `\\det\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}=1\\cdot4-2\\cdot3=${fracToString(det)}` },
      { title: "Inverse: swap, flip two signs, divide", text: `Swap a and d, change the signs of b and c, then divide everything by the determinant (${fracToString(det)}).`, tex: `M^{-1}=\\tfrac{1}{${fracToString(det)}}\\begin{bmatrix}4&-2\\\\-3&1\\end{bmatrix}=${fracBm(inv)}` },
      { title: "Check that it undoes M", text: `Multiply M⁻¹ by M. For example, row 1 of M⁻¹ with column 1 of M: (${fx(inv[0][0])})·1 + (${fx(inv[0][1])})·3 = ${fx(prod[0][0])}. All four entries together give the identity.`, tex: `M^{-1}M=${fracBm(prod)}` },
      { title: "A matrix with no inverse", text: `For [[1, 2], [2, 4]] the determinant is 1·4 − 2·2 = ${n(det2(SING))}. And it sends both (2, 0) and (0, 1) to ${tup(matVec(SING, [2, 0]))}. Given that output, you could not tell which input it came from, so no machine can undo it.`, tex: `\\begin{bmatrix}1&2\\\\2&4\\end{bmatrix}${colTex([2, 0])}=${colTex(matVec(SING, [2, 0]))}=\\begin{bmatrix}1&2\\\\2&4\\end{bmatrix}${colTex([0, 1])}` },
      { title: "Reversing a chain reverses the order", text: `Take A = ${rowTex(PA[0])}, ${rowTex(PA[1])} and B = ${rowTex(PB[0])}, ${rowTex(PB[1])}. Here AB ≠ BA, so order shows up. (AB)^T matches B^TA^T and not A^TB^T; (AB)⁻¹ matches B⁻¹A⁻¹ and not A⁻¹B⁻¹.`, tex: `(AB)^{\\top}=${bm(transpose(AB))}=B^{\\top}A^{\\top},\\ \\text{but }A^{\\top}B^{\\top}=${bm(matMul(transpose(PA), transpose(PB)))}` },
      { title: "Same for the inverse", text: `Check: B⁻¹A⁻¹ gives the inverse of AB; A⁻¹B⁻¹ does not. Think of socks and shoes: you put socks on, then shoes; to undo, shoes come off first.`, tex: `(AB)^{-1}=${bm(inum(inverse(AB)))}=B^{-1}A^{-1},\\ \\text{but }A^{-1}B^{-1}=${bm(matMul(inum(inverse(PA)), inum(inverse(PB))))}` },
    ];
  },
  systems() {
    const A = [[1, 1], [1, -1]], b = [4, 2];
    const sol = solveSystem(A, b);
    const Ainv = inverse(A);
    const sum = add(A[0], A[1]);
    const AN = [[1, 1], [1, 1]], bN = [4, 6];
    const AI = [[1, 1], [2, 2]];
    const p1 = [1, 3], p2 = [0, 4];
    return [
      { title: "Two equations, one matrix equation", text: "Each equation is one row of weights, as in the Module 0 card. Stack the rows into A, the totals into b, and the unknowns into x.", tex: `${bm(A)}\\begin{bmatrix}x\\\\y\\end{bmatrix}=${colTex(b)}` },
      { title: "Add the two equations", text: `Adding equation 1 and equation 2 makes the y terms cancel: (${A[0][0]}+${A[1][0]})x + (${A[0][1]}+${A[1][1]})y = ${b[0]}+${b[1]}, which is ${sum[0]}x + ${sum[1]}y = ${b[0] + b[1]}.`, tex: `${sum[0]}x=${b[0] + b[1]}\\ \\Rightarrow\\ x=${fx(sol.solution[0])}` },
      { title: "Put x back in", text: `With x = ${fx(sol.solution[0])}, equation 1 reads ${fx(sol.solution[0])} + y = ${b[0]}, so y = ${b[0]} − ${fx(sol.solution[0])} = ${fx(sol.solution[1])}.`, tex: `(x,y)=${fracTup(sol.solution).replace(/−/g, "-")}` },
      { title: "Check in both equations", text: `Row 1: 1·${fx(sol.solution[0])} + 1·${fx(sol.solution[1])} = ${matVec(A, sol.solution.map((f) => f.n / f.d))[0]}. Row 2: 1·${fx(sol.solution[0])} + (−1)·${fx(sol.solution[1])} = ${matVec(A, sol.solution.map((f) => f.n / f.d))[1]}. Both match b = ${tup(b)}.`, tex: `${bm(A)}${colTex(sol.solution.map((f) => f.n / f.d))}=${colTex(matVec(A, sol.solution.map((f) => f.n / f.d)))}` },
      { title: "The same answer from the inverse", text: `The determinant is 1·(−1) − 1·1 = ${n(det2(A))}, not zero, so A⁻¹ exists. Then x = A⁻¹b: ${fx(Ainv[0][0])}·${b[0]} + ${fx(Ainv[0][1])}·${b[1]} = ${fx(sol.solution[0])}, and ${fx(Ainv[1][0])}·${b[0]} + (${fx(Ainv[1][1])})·${b[1]} = ${fx(sol.solution[1])}.`, tex: `\\mathbf{x}=A^{-1}\\mathbf{b}=${fracBm(Ainv)}${colTex(b)}=${colTex(sol.solution.map((f) => f.n / f.d))}` },
      { title: "When it fails: no solution", text: `x + y = 4 and x + y = 6 cannot both hold. Subtract: 0 = ${bN[1] - bN[0]}. The lines are parallel. Here solveSystem reports “${solveSystem(AN, bN).kind}”.`, tex: `x+y=4\\ \\text{and}\\ x+y=6\\ \\Rightarrow\\ 0=2` },
      { title: "When it fails: infinitely many", text: `x + y = 4 and 2x + 2y = 8: the second is the first doubled, so they are one line. (${p1.join(", ")}) and (${p2.join(", ")}) both work: row 2 gives ${matVec(AI, p1)[1]} and ${matVec(AI, p2)[1]}. One free choice remains.`, tex: `${bm(AI)}${colTex(p1)}=${colTex(matVec(AI, p1))},\\quad ${bm(AI)}${colTex(p2)}=${colTex(matVec(AI, p2))}` },
    ];
  },
  span() {
    const cols = [[1, 4, 7], [2, 5, 8], [3, 6, 9]];
    const M3 = fromColumns(cols);
    const rec = solveSystem(fromColumns([[1, 0], [0, 1]]), [5, -3]);
    return [
      { title: "One arrow reaches a line", text: `Scale (1, 2) by any number: (2, 4), (−1, −2), (0, 0). They all lie on one line through the origin. (2, 4) is in the span (${inSpan([[1, 2]], [2, 4])}); (1, 0) is not (${inSpan([[1, 2]], [1, 0])}).`, tex: `\\operatorname{span}\\{(1,2)\\}=\\{c\\,(1,2)\\}` },
      { title: "Two independent arrows reach everything", text: `With (1, 0) and (0, 1), the point (5, −3) is 5 of the first and −3 of the second: ${fracTup(rec.solution)}. Every point has such a recipe, so these two are a basis.`, tex: `5${rowTex([1, 0])}+(-3)${rowTex([0, 1])}=${rowTex(linearCombination([5, -3], [[1, 0], [0, 1]]))}` },
      { title: "A redundant arrow adds nothing", text: `(2, 4) is 2 times (1, 2), so the pair is dependent. Their matrix has rank ${rank([[1, 2], [2, 4]])}, not 2: one independent column.`, tex: `\\operatorname{rank}\\begin{bmatrix}1&2\\\\2&4\\end{bmatrix}=${rank([[1, 2], [2, 4]])}` },
      { title: "Rank of a bigger matrix", text: `In the 3×3 matrix with columns (1, 4, 7), (2, 5, 8), (3, 6, 9), column 3 = 2·column 2 − column 1: 2·(2, 5, 8) − (1, 4, 7) = ${tup(linearCombination([-1, 2], [cols[0], cols[1]]))}. So only two columns are independent.`, tex: `\\operatorname{rank}${bm(M3)}=${rank(M3)}` },
      { title: "Rank counts rows and columns alike", text: `Flip it: the transpose also has rank ${rank(transpose(M3))}. The number of independent columns equals the number of independent rows, and it can never exceed the smaller of the number of rows and columns.`, tex: `\\operatorname{rank}(M^{\\top})=${rank(transpose(M3))}=\\operatorname{rank}(M)` },
    ];
  },
  transformations() {
    const R = rotationDegrees(90), R30 = rotationDegrees(30);
    const v = [3, 2];
    const S = scaling(2, 3), H = shear(1);
    const P = projectionOntoX;
    const rr = matVec(R30, [3, 4]);
    const SH = matMul(H, R), HS = matMul(R, H);
    const r3 = (x) => Math.round(x * 1000) / 1000;
    return [
      { title: "Read the matrix off the unit arrows", text: `Turn the plane 90° counter-clockwise. (1, 0) lands on ${tup(matVec(R, [1, 0]))} and (0, 1) lands on ${tup(matVec(R, [0, 1]))}. Those landing spots are the columns of the matrix, exactly as on the Matrices card.`, tex: `R_{90^\\circ}=${bm(R)}` },
      { title: "It moves every other point too", text: `A matrix-vector product does the rest: (3, 2) goes to ${tup(matVec(R, v))}. Row 1: 0·3 + (−1)·2 = ${matVec(R, v)[0]}; row 2: 1·3 + 0·2 = ${matVec(R, v)[1]}.`, tex: `${bm(R)}${colTex(v)}=${colTex(matVec(R, v))}` },
      { title: "A rotation keeps lengths", text: `Rotate (3, 4), which has length 5, by 30°. The entries are cos 30° ≈ ${r3(R30[0][0])} and sin 30° = ${r3(R30[1][0])}. The result is ${tup(rr.map(r3))}, and its length is ${r3(Math.hypot(...rr))}.`, tex: `\\begin{bmatrix}\\cos30^\\circ&-\\sin30^\\circ\\\\\\sin30^\\circ&\\cos30^\\circ\\end{bmatrix}\\approx\\begin{bmatrix}${r3(R30[0][0])}&${r3(R30[0][1])}\\\\${r3(R30[1][0])}&${r3(R30[1][1])}\\end{bmatrix}` },
      { title: "Scaling stretches each axis", text: `Stretch x by 2 and y by 3. The point (1, 1) goes to ${tup(matVec(S, [1, 1]))}, and the unit square's area becomes 2·3 = ${det2(S)}.`, tex: `${bm(S)}${colTex([1, 1])}=${colTex(matVec(S, [1, 1]))}` },
      { title: "A shear leans the square", text: `With k = 1: (0, 1) goes to ${tup(matVec(H, [0, 1]))} while (1, 0) stays. (3, 2) goes to 3 + 1·2 = ${matVec(H, v)[0]} across, same height: ${tup(matVec(H, v))}. The area stays ${det2(H)}.`, tex: `${bm(H)}${colTex(v)}=${colTex(matVec(H, v))}` },
      { title: "A projection loses information", text: `Projecting onto the x-axis sends (3, 2) to ${tup(matVec(P, v))} and also (3, −5) to ${tup(matVec(P, [3, -5]))}. Different inputs, the same output, so it has rank ${rank(P)} and no inverse.`, tex: `${bm(P)}${colTex(v)}=${colTex(matVec(P, v))}=${bm(P)}${colTex([3, -5])}` },
      { title: "Chaining transformations multiplies matrices", text: `Rotate 90° first, then shear: the matrix is H·R. The other order, R·H, gives a different matrix, because the second transformation acts on the output of the first.`, tex: `HR=${bm(SH)},\\quad RH=${bm(HS)}` },
    ];
  },
};

/* ---------- predict-then-reveal ---------- */
const predictions = {
  transpose() {
    const At = transpose(A23);
    return { expected: At[2][0], explain: `A^T has 3 rows and 2 columns. Its entry in row 3, column 1 is the entry of A in row 1, column 3, which is ${A23[0][2]}.` };
  },
  systems() {
    const sol = solveSystem([[1, 1], [1, -1]], [4, 2]);
    return { expected: sol.solution[0].n / sol.solution[0].d, explain: `Adding the equations gives 2x = 6, so x = ${fx(sol.solution[0])}. Then y = 4 − ${fx(sol.solution[0])} = ${fx(sol.solution[1])}.` };
  },
  span() {
    return { expected: rank([[1, 2], [2, 4]]), explain: `The second column (2, 4) is 2 times the first column (1, 2), so there is only one independent column: the rank is ${rank([[1, 2], [2, 4]])}.` };
  },
  transformations() {
    const out = matVec(shear(2), [3, 2]);
    return { expected: out[0], explain: `A shear with k = 2 sends (x, y) to (x + 2y, y). For (3, 2) the first entry is 3 + 2·2 = ${out[0]}.` };
  },
};

/* ---------- numbers quoted in the prose ---------- */
const calcs = {
  dK: () => String(transformerBase.dK),
  dModel: () => String(transformerBase.dModel),
  qkShape: () => { const Q = Array.from({ length: 4 }, () => Array(transformerBase.dK).fill(0)); const s = resultShape(Q, transpose(Q)); return `${s.rows}×${s.cols}`; },
  qkMults: () => { const Q = Array.from({ length: 4 }, () => Array(transformerBase.dK).fill(0)); return String(multiplyCount(Q, transpose(Q))); },
  projShape: () => `${transformerBase.dK}×${transformerBase.dModel}`,
  projIsSquare: () => String(isSquare(Array.from({ length: transformerBase.dK }, () => Array(transformerBase.dModel).fill(0)))),
  probFree: () => String(solveSystem([[1, 1, 1, 1]], [1]).freeVariables),
  loraFull: () => entryCount({ rows: transformerBase.dModel, cols: transformerBase.dModel }).toLocaleString("en-US"),
  loraThin: () => lowRankEntryCount(transformerBase.dModel, transformerBase.dModel, 8).toLocaleString("en-US"),
  loraRank: () => String(rank(matMul([[1], [2], [0], [1]], [[1, 0, 2]]))),
  loraSmallFull: () => String(entryCount(shape(matMul([[1], [2], [0], [1]], [[1, 0, 2]])))),
  loraSmallThin: () => String(lowRankEntryCount(4, 3, 1)),
  eqRow: () => String(matVec([[1, 1]], [1, 3])[0]),
  stackedCheck: () => tup(matVec(matMul([[0, 1], [1, 1]], [[1, 2], [0, 1]]), [3, -1])),
  stackedTwo: () => tup(matVec([[0, 1], [1, 1]], matVec([[1, 2], [0, 1]], [3, -1]))),
};
const texCalcs = {
  stackedProduct: () => bm(matMul([[0, 1], [1, 1]], [[1, 2], [0, 1]])),
};

/* ---------- boot ---------- */
const widgetMounts = { inverse: inverseWidget, systems: systemsWidget, span: spanWidget, transform: transformWidget };
bootPage({ widgetMounts, stepperData, predictions, calcs, texCalcs });
