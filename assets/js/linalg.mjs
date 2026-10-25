// Module 1 (first half): widgets, worked examples and checks. Every number comes from linalg-math.mjs.
import {
  dimension, entryOf, add, scale, linearCombination, tipToTailPath, shape, entryCount, row, column,
  canMultiply, resultShape, matVec, matVecByColumns, matMul, entryStep, multiplyCount,
  multiplyCountFromShapes, entrywiseProduct, transformerBase, illustrativeEmbedding,
} from "./linalg-math.mjs";
import {
  svg, html, slider, radios, widgetShell, fmt, nextId,
} from "./widgets.mjs";

import {
  n, tup, paren, sub, bm, colTex, rowTex, stroke, fillOf, text, PLANE_VIEW, px, py, drawPlane, arrow, segmentLabel,
  enableTipDrag, numberField, fieldGroup, bootPage,
} from "./linalg-shared.mjs";

/* ---------- 1. Vectors as arrows and lists ---------- */
function vectorsWidget(host) {
  const w = widgetShell({
    title: "One vector, two pictures",
    description: "With two entries, a flat grid shows an arrow from the origin to the point given by the entries. With more entries, a row of labelled boxes shows the list. The values are repeated in the text below the drawing.",
    viewBox: PLANE_VIEW,
  });
  const vals = [3, 2, 7, 1, 4];
  let count = 2;
  const fieldsHost = html("div", { class: "control" });
  let fields = [];
  w.readout.style.whiteSpace = "pre-line";
  const v = () => vals.slice(0, count);

  const draw = () => {
    const c = w.canvas;
    c.replaceChildren();
    if (count === 2) {
      const plot = drawPlane(c);
      const tip = [vals[0], vals[1]];
      svg("line", { x1: px(0), y1: py(0), x2: px(tip[0]), y2: py(0), style: stroke("blue", 3, "stroke-dasharray:3 6;stroke-linecap:round") }, plot);
      svg("line", { x1: px(tip[0]), y1: py(0), x2: px(tip[0]), y2: py(tip[1]), style: stroke("teal", 3, "stroke-dasharray:3 6;stroke-linecap:round") }, plot);
      arrow(plot, [0, 0], tip, "burgundy");
      svg("circle", { cx: px(tip[0]), cy: py(tip[1]), r: 10, style: "fill:var(--c-burgundy);stroke:#fff;stroke-width:2;cursor:grab;touch-action:none" }, plot);
      text(c, px(tip[0]) + 14, py(tip[1]) - 12, `v = ${tup(tip)}`, { "text-anchor": "start", style: "fill:var(--c-burgundy)" });
      w.readout.textContent = `v = ${tup(v())}\nv${sub(1)} = ${n(vals[0])} across (blue dots)  ·  v${sub(2)} = ${n(vals[1])} up (teal dots)`;
    } else {
      text(c, 320, 60, `v = ${tup(v())}`, { "text-anchor": "middle", style: "fill:var(--c-burgundy)" });
      const gap = 84, box = 72, x0 = 320 - (count * gap) / 2 + (gap - box) / 2;
      v().forEach((value, k) => {
        const x = x0 + k * gap;
        svg("rect", { x, y: 140, width: box, height: 72, rx: 8, style: "fill:#fff;stroke:var(--c-burgundy);stroke-width:2.5" }, c);
        text(c, x + box / 2, 184, n(value), { "text-anchor": "middle" });
        text(c, x + box / 2, 130, `v${sub(k + 1)}`, { "text-anchor": "middle", style: "fill:var(--c-burgundy)" });
      });
      const notes = count === 3
        ? ["Three entries would need a 3D picture,", "so the list is shown instead."]
        : ["Five entries cannot be drawn", "as one arrow. The list still works."];
      notes.forEach((line, q) => text(c, 320, 262 + q * 22, line, { "text-anchor": "middle", class: "tick-label" }));
      text(c, 320, 318, "Order matters: v₁ first, v₂ second, …", { "text-anchor": "middle", class: "tick-label" });
      w.readout.textContent = `v = ${tup(v())}\nv${sub(count)} = ${n(entryOf(v(), count))}  ·  number of entries (dimension) = ${dimension(v())}`;
    }
  };

  const buildFields = () => {
    fields = Array.from({ length: count }, (_, k) => numberField({
      label: `Entry v${sub(k + 1)}`,
      min: count === 2 ? (k === 0 ? -XMAX : -YMAX) : -99,
      max: count === 2 ? (k === 0 ? XMAX : YMAX) : 99,
      value: vals[k],
      onInput: (value) => { vals[k] = value; draw(); },
    }));
    fieldsHost.replaceChildren(html("fieldset", {}, html("legend", { text: "Entries of v" }), html("div", { class: "field-grid" }, ...fields.map((f) => f.el))));
  };

  const sizePicker = radios({
    legend: "Number of entries", name: nextId("vec-n"), value: "2",
    options: [{ value: "2", label: "2 entries (arrow)" }, { value: "3", label: "3 entries (list)" }, { value: "5", label: "5 entries (list)" }],
    onChange: (value) => { count = Number(value); buildFields(); draw(); },
  });
  w.controls.append(sizePicker, fieldsHost);
  host.append(w.root);

  enableTipDrag(
    w.canvas,
    () => [vals[0], vals[1]],
    ([x, y]) => {
      if (count !== 2) return;
      vals[0] = x; vals[1] = y;
      fields[0].set(x); fields[1].set(y);
      draw();
    },
    (x, y) => [Math.min(XMAX, Math.max(-XMAX, x)), Math.min(YMAX, Math.max(-YMAX, y))],
  );
  buildFields();
  draw();
}

/* ---------- 2. Addition, scaling, linear combinations ---------- */
const A_VEC = [2, 1];
const B_VEC = [-1, 2];

function combineWidget(host) {
  const w = widgetShell({
    title: "Scale two arrows, then add them tip to tail",
    description: "Two fixed arrows, a and b, drawn from the origin. Each is multiplied by a number the learner chooses. The scaled a is drawn from the origin, the scaled b starts at its tip, and a third arrow from the origin to the end is their sum.",
    viewBox: PLANE_VIEW,
  });
  let c1 = 1, c2 = 1, stage = 3;
  w.readout.style.whiteSpace = "pre-line";

  const draw = () => {
    const c = w.canvas;
    c.replaceChildren();
    const plot = drawPlane(c);
    arrow(plot, [0, 0], A_VEC, "teal", { width: 2, dash: "5 5", opacity: 0.7 });
    arrow(plot, [0, 0], B_VEC, "blue", { width: 2, dash: "5 5", opacity: 0.7 });
    text(c, px(A_VEC[0]) + 8, py(A_VEC[1]) + 20, "a", { "text-anchor": "start", style: "fill:var(--c-teal)" });
    text(c, px(B_VEC[0]) - 8, py(B_VEC[1]) - 6, "b", { "text-anchor": "end", style: "fill:var(--c-blue)" });
    const path = tipToTailPath([c1, c2], [A_VEC, B_VEC]);
    const sa = scale(c1, A_VEC);
    arrow(plot, path[0], path[1], "teal");
    if (stage >= 2) arrow(plot, path[1], path[2], "blue");
    if (stage >= 3) arrow(plot, path[0], path[2], "burgundy", { width: 4.5 });
    if (c1 !== 0) segmentLabel(c, path[0], path[1], `c${sub(1)}a`, "teal", 1);
    if (stage >= 2 && c2 !== 0) segmentLabel(c, path[1], path[2], `c${sub(2)}b`, "blue", 1);
    if (stage >= 3) text(c, px(path[2][0]) + 12, py(path[2][1]) - 12, tup(path[2]), { "text-anchor": "start", style: "fill:var(--c-burgundy)" });
    const sb = scale(c2, B_VEC);
    const parts = [`c${sub(1)} = ${n(c1)}, c${sub(2)} = ${n(c2)}`, `c${sub(1)}a = ${n(c1)}·${tup(A_VEC)} = ${tup(sa)}`];
    if (stage >= 2) parts.push(`c${sub(2)}b = ${n(c2)}·${tup(B_VEC)} = ${tup(sb)}`);
    if (stage >= 3) parts.push(`sum = ${tup(sa)} + ${tup(sb)} = ${tup(linearCombination([c1, c2], [A_VEC, B_VEC]))}`);
    w.readout.textContent = parts.join("\n");
  };

  const s1 = slider({ label: "Number c₁ (scales a)", min: -2, max: 2, step: 0.5, value: c1, format: n, onInput: (v) => { c1 = v; draw(); } });
  const s2 = slider({ label: "Number c₂ (scales b)", min: -2, max: 2, step: 0.5, value: c2, format: n, onInput: (v) => { c2 = v; draw(); } });
  const setBoth = (a, b) => { c1 = a; c2 = b; s1.input.value = a; s2.input.value = b; s1.show(); s2.show(); draw(); };
  const stagePicker = radios({
    legend: "Build it up", name: nextId("combo-stage"), value: "3",
    options: [{ value: "1", label: "Step 1: c₁a only" }, { value: "2", label: "Step 2: add c₂b at its tip" }, { value: "3", label: "Step 3: show the sum" }],
    onChange: (value) => { stage = Number(value); draw(); },
  });
  const presets = html("div", { class: "control" },
    html("span", { class: "control-label", text: "Try a recipe" }),
    html("div", { class: "button-row" },
      ...[["a + b", 1, 1], ["2a − b", 2, -1], ["Reset", 1, 1]].map(([label, a, b]) => {
        const btn = html("button", { type: "button", class: "button-secondary button-small", text: label });
        btn.addEventListener("click", () => setBoth(a, b));
        return btn;
      })));
  w.controls.append(s1.el, s2.el, stagePicker, presets);
  host.append(w.root);
  draw();
}

/* ---------- 3. Matrices as tables and machines ---------- */
function matrixWidget(host) {
  const w = widgetShell({
    title: "A matrix as a machine: its columns are where the unit arrows land",
    description: "A two-by-two table of numbers. Its first column is drawn as an arrow in teal, its second column in blue. The input vector v scales each column arrow, the scaled arrows are placed tip to tail, and the burgundy arrow from the origin to the end is the output, Mv.",
    viewBox: PLANE_VIEW,
  });
  const M = [[2, -1], [1, 1]];
  const v = [1, 2];
  w.readout.style.whiteSpace = "pre-line";

  const draw = () => {
    const c = w.canvas;
    c.replaceChildren();
    const plot = drawPlane(c);
    const c1 = column(M, 1), c2 = column(M, 2);
    arrow(plot, [0, 0], c1, "teal", { width: 2, dash: "5 5", opacity: 0.7 });
    arrow(plot, [0, 0], c2, "blue", { width: 2, dash: "5 5", opacity: 0.7 });
    text(c, px(c1[0]) + 8, py(c1[1]) + 18, "column 1", { "text-anchor": "start", style: "fill:var(--c-teal)" });
    text(c, px(c2[0]) - 8, py(c2[1]) - 8, "column 2", { "text-anchor": "end", style: "fill:var(--c-blue)" });
    const s1 = scale(v[0], c1);
    const out = matVec(M, v);
    arrow(plot, [0, 0], s1, "teal");
    arrow(plot, s1, out, "blue");
    arrow(plot, [0, 0], out, "burgundy", { width: 4.5 });
    text(c, px(out[0]) + 12, py(out[1]) - 12, `Mv = ${tup(out)}`, { "text-anchor": "start", style: "fill:var(--c-burgundy)" });
    const lines = [
      `Table view (each output entry is a row · v):`,
      ...M.map((r, i) => `  row ${i + 1}: ${r.map((x, k) => `${paren(x)}·${paren(v[k])}`).join(" + ")} = ${n(out[i])}`),
      `Machine view: ${paren(v[0])}·${tup(c1)} + ${paren(v[1])}·${tup(c2)} = ${tup(matVecByColumns(M, v))}`,
      `Shape ${shape(M).rows}×${shape(M).cols}: ${shape(M).cols} numbers in, ${shape(M).rows} numbers out`,
    ];
    w.readout.textContent = lines.join("\n");
  };

  const mFields = [];
  M.forEach((r, i) => r.forEach((value, j) => {
    mFields.push(numberField({
      label: `Row ${i + 1}, column ${j + 1}`, min: -4, max: 4, step: 1, value,
      onInput: (x) => { M[i][j] = x; draw(); },
    }));
  }));
  const vFields = v.map((value, k) => numberField({
    label: `Entry v${sub(k + 1)}`, min: -3, max: 3, step: 1, value,
    onInput: (x) => { v[k] = x; draw(); },
  }));
  w.controls.append(fieldGroup("Matrix M (2 rows, 2 columns)", ...mFields), fieldGroup("Input vector v", ...vFields));
  host.append(w.root);
  draw();
}

/* ---------- 4. Matrix-vector and matrix-matrix multiplication ---------- */
const PRESETS = {
  ab: { label: "A·B: a 2×3 times a 3×2", A: [[1, 2, 3], [4, 5, 6]], B: [[7, 8], [9, 10], [11, 12]], names: ["A", "B", "AB"] },
  av: { label: "A·v: a matrix times a vector", A: [[1, 2, 3], [4, 5, 6]], B: [[1], [0], [-1]], names: ["A", "v", "Av"] },
  ps: { label: "P·S: swap on the right", A: [[1, 2], [3, 4]], B: [[0, 1], [1, 0]], names: ["P", "S", "PS"] },
  sp: { label: "S·P: swap on the left", A: [[0, 1], [1, 0]], B: [[1, 2], [3, 4]], names: ["S", "P", "SP"] },
  bad: { label: "A·A: shapes that do not fit", A: [[1, 2, 3], [4, 5, 6]], B: [[1, 2, 3], [4, 5, 6]], names: ["A", "A", "?"] },
};

function multiplyWidget(host) {
  const w = widgetShell({
    title: "Multiply, one output entry at a time",
    description: "Two tables of numbers side by side with their product on the right. For the chosen output entry, the matching row of the left table and column of the right table are outlined, and the output entry is filled in from their dot product. The working is repeated in the text below.",
    viewBox: "70 90 500 270",
  });
  let key = "ab", k = 0, showAll = false;
  w.readout.style.whiteSpace = "pre-line";
  const CW = 48, CH = 40;

  const matrix = (c, M, x0, y0, opts = {}) => {
    const { rows, cols } = shape(M);
    const wd = cols * CW, ht = rows * CH;
    if (opts.hiRow != null) svg("rect", { x: x0, y: y0 + opts.hiRow * CH, width: wd, height: CH, rx: 4, style: "fill:#E4EAF4;stroke:var(--c-navy);stroke-width:2.5" }, c);
    if (opts.hiCol != null) svg("rect", { x: x0 + opts.hiCol * CW, y: y0, width: CW, height: ht, rx: 4, style: "fill:#DDEFEC;stroke:var(--c-teal);stroke-width:2.5" }, c);
    if (opts.hiCell) svg("rect", { x: x0 + opts.hiCell[1] * CW + 2, y: y0 + opts.hiCell[0] * CH + 2, width: CW - 4, height: CH - 4, rx: 6, style: "fill:var(--c-burgundy)" }, c);
    M.forEach((r, i) => r.forEach((value, j) => {
      const hidden = opts.mask && !opts.mask(i, j);
      const onCell = opts.hiCell && opts.hiCell[0] === i && opts.hiCell[1] === j;
      text(c, x0 + j * CW + CW / 2, y0 + i * CH + CH / 2 + 5, hidden ? "·" : n(value), { "text-anchor": "middle", style: onCell ? "fill:#fff" : "" });
    }));
    const br = (x, dir) => `M ${x + dir * 6} ${y0 - 4} H ${x} V ${y0 + ht + 4} H ${x + dir * 6}`;
    svg("path", { d: br(x0 - 6, 1), style: "stroke:var(--navy);stroke-width:2;fill:none" }, c);
    svg("path", { d: br(x0 + wd + 6, -1), style: "stroke:var(--navy);stroke-width:2;fill:none" }, c);
    return { wd, ht };
  };

  const draw = () => {
    const p = PRESETS[key];
    const c = w.canvas;
    c.replaceChildren();
    const sa = shape(p.A), sb = shape(p.B);
    const fits = canMultiply(p.A, p.B);
    const outShape = resultShape(p.A, p.B);
    const total = sa.cols * CW + sb.cols * CW + (fits ? outShape.cols * CW : 0) + (fits ? 2 : 1) * 56;
    let x = (640 - total) / 2;
    const top = 150;
    const label = (str, at, y, color) => text(c, at, y, str, { "text-anchor": "middle", style: color ? `fill:var(--c-${color})` : "" });
    const info = (str, at) => text(c, at, top + 3 * CH + 36, str, { "text-anchor": "middle", class: "tick-label" });

    if (!fits) {
      matrix(c, p.A, x, top);
      label(p.names[0], x + (sa.cols * CW) / 2, top - 30, "navy");
      info(`${sa.rows}×${sa.cols}`, x + (sa.cols * CW) / 2);
      text(c, x + sa.cols * CW + 28, top + CH + 5, "×", { "text-anchor": "middle" });
      const x2 = x + sa.cols * CW + 56;
      matrix(c, p.B, x2, top);
      label(p.names[1], x2 + (sb.cols * CW) / 2, top - 30, "teal");
      info(`${sb.rows}×${sb.cols}`, x2 + (sb.cols * CW) / 2);
      text(c, 320, 332, `${sa.cols} columns on the left, ${sb.rows} rows on the right`, { "text-anchor": "middle", style: "fill:var(--try)" });
      text(c, 320, 352, "◐ These shapes do not fit, so there is no product.", { "text-anchor": "middle", style: "fill:var(--try)" });
      w.readout.textContent = `Shapes: (${sa.rows}×${sa.cols})(${sb.rows}×${sb.cols})\nThe left matrix has ${sa.cols} columns but the right has ${sb.rows} rows: not defined.`;
      return;
    }

    const prod = matMul(p.A, p.B);
    const i = Math.floor(k / outShape.cols), j = k % outShape.cols;
    const step = entryStep(p.A, p.B, i + 1, j + 1);
    matrix(c, p.A, x, top, { hiRow: i });
    label(p.names[0], x + (sa.cols * CW) / 2, top - 30, "navy");
    info(`${sa.rows}×${sa.cols}`, x + (sa.cols * CW) / 2);
    x += sa.cols * CW + 28;
    text(c, x, top + (sa.rows * CH) / 2 + 5, "×", { "text-anchor": "middle" });
    x += 28;
    matrix(c, p.B, x, top, { hiCol: j });
    label(p.names[1], x + (sb.cols * CW) / 2, top - 30, "teal");
    info(`${sb.rows}×${sb.cols}`, x + (sb.cols * CW) / 2);
    x += sb.cols * CW + 28;
    text(c, x, top + (sa.rows * CH) / 2 + 5, "=", { "text-anchor": "middle" });
    x += 28;
    matrix(c, prod, x, top, { hiCell: [i, j], mask: (r, q) => showAll || r * outShape.cols + q <= k });
    label(p.names[2], x + (outShape.cols * CW) / 2, top - 30, "burgundy");
    info(`${outShape.rows}×${outShape.cols}`, x + (outShape.cols * CW) / 2);

    w.readout.textContent = [
      `Output entry (${i + 1}, ${j + 1}) = row ${i + 1} of ${p.names[0]} · column ${j + 1} of ${p.names[1]}`,
      `${step.row.map((a, q) => `${paren(a)}·${paren(step.column[q])}`).join(" + ")} = ${step.terms.map(n).join(" + ").replace(/\+ −/g, "− ")} = ${n(step.sum)}`,
      `Shapes: (${sa.rows}×${sa.cols})(${sb.rows}×${sb.cols}) → ${outShape.rows}×${outShape.cols}  ·  ${multiplyCount(p.A, p.B)} multiplications in all`,
    ].join("\n");
  };

  const picker = radios({
    legend: "Example", name: nextId("mul-example"), value: key,
    options: Object.entries(PRESETS).map(([value, { label }]) => ({ value, label })),
    onChange: (value) => { key = value; k = 0; draw(); sync(); },
  });
  const prev = html("button", { type: "button", class: "button-secondary button-small", text: "Previous entry" });
  const next = html("button", { type: "button", class: "button-secondary button-small", text: "Next entry" });
  const all = html("button", { type: "button", class: "button-secondary button-small", "aria-pressed": "false", text: "Fill in the whole product" });
  const count = () => {
    const p = PRESETS[key];
    return canMultiply(p.A, p.B) ? resultShape(p.A, p.B).rows * resultShape(p.A, p.B).cols : 0;
  };
  const sync = () => {
    const fits = count() > 0;
    prev.disabled = !fits || k === 0;
    next.disabled = !fits || k >= count() - 1;
    all.disabled = !fits;
    // A disabled button cannot keep keyboard focus, so hand it to the other one.
    if (fits && next.disabled && document.activeElement === next) prev.focus();
    if (fits && prev.disabled && document.activeElement === prev) next.focus();
  };
  prev.addEventListener("click", () => { k = Math.max(0, k - 1); draw(); sync(); });
  next.addEventListener("click", () => { k = Math.min(count() - 1, k + 1); draw(); sync(); });
  all.addEventListener("click", () => { showAll = !showAll; all.setAttribute("aria-pressed", String(showAll)); draw(); });
  const steps = html("div", { class: "control" },
    html("span", { class: "control-label", text: "Step through the output" }),
    html("div", { class: "button-row" }, prev, next, all));
  w.controls.append(picker, steps);
  host.append(w.root);
  draw();
  sync();
}

/* ---------- worked examples (every number from tested code) ---------- */
const stepperData = {
  vectors() {
    const v = [3, 2, 7];
    return [
      { title: "A list of numbers", text: `The vector is the list ${tup(v)}. The order matters: (7, 2, 3) is a different vector.`, tex: `\\mathbf{v}=${rowTex(v)}` },
      { title: "Count the entries", text: `It has ${dimension(v)} entries, so we say its dimension is ${dimension(v)}.`, tex: `\\text{dimension}=${dimension(v)}` },
      { title: "Pick out one entry", text: "A subscript says which position to read, counting from 1.", tex: `v_3=${entryOf(v, 3)}` },
      { title: "Two entries make a flat arrow", text: "Take just (3, 2): start at the origin, walk 3 across and 2 up. The tip lands on the point (3, 2).", tex: `(3,2):\\;3\\text{ across},\\;2\\text{ up}` },
      { title: "Three entries need a third direction", text: "(3, 2, 7) would be 3 across, 2 up and 7 out of the page. With 5 or 512 entries we cannot draw it, but every rule below still works entry by entry." },
    ];
  },
  combine() {
    const cs = [2, -1];
    const path = tipToTailPath(cs, [A_VEC, B_VEC]);
    const sum = linearCombination(cs, [A_VEC, B_VEC]);
    return [
      { title: "The recipe", text: `Take two arrows, a = ${tup(A_VEC)} and b = ${tup(B_VEC)}. Make 2a − b: twice a, then take away one b.`, tex: `2\\mathbf{a}-\\mathbf{b}=2${rowTex(A_VEC)}+(-1)${rowTex(B_VEC)}` },
      { title: "Scale a by 2", text: "Multiply every entry of a by 2. The arrow points the same way and is twice as long.", tex: `2${rowTex(A_VEC)}=${rowTex(scale(2, A_VEC))}` },
      { title: "Scale b by −1", text: "A negative number flips the arrow to point the opposite way.", tex: `(-1)${rowTex(B_VEC)}=${rowTex(scale(-1, B_VEC))}` },
      { title: "Add entry by entry", text: "Add the first entries together, then the second entries.", tex: `${rowTex(scale(2, A_VEC))}+${rowTex(scale(-1, B_VEC))}=${rowTex(sum)}` },
      { title: "Check with a walk", text: `Start at the origin, walk along 2a to ${tup(path[1])}, then along −b. You finish at ${tup(path[2])}, the same place the entries gave.`, tex: `${rowTex(path[0])}\\to${rowTex(path[1])}\\to${rowTex(path[2])}` },
    ];
  },
  matrix() {
    const M = [[2, 1], [0, 3]];
    const v = [3, 2];
    const N = [[1, 0], [0, 1], [1, 1]];
    const out = matVec(M, v);
    return [
      { title: "The set-up", text: "A 2×2 matrix M and an input vector v.", tex: `M=${bm(M)},\\quad \\mathbf{v}=${colTex(v)}` },
      { title: "Table view: a row at a time", text: "Each output entry is a row of M multiplied entry by entry with v, then added (a dot product).", tex: `${M.map((r, i) => `\\text{row }${i + 1}:\\ ${r.map((x, q) => `${x}\\cdot${v[q]}`).join("+")}=${out[i]}`).join(",\\quad ")}` },
      { title: "Machine view: a column at a time", text: `The columns of M are ${tup(column(M, 1))} and ${tup(column(M, 2))}. Scale each by the matching entry of v, then add.`, tex: `${v[0]}${rowTex(column(M, 1))}+${v[1]}${rowTex(column(M, 2))}=${rowTex(scale(v[0], column(M, 1)))}+${rowTex(scale(v[1], column(M, 2)))}=${rowTex(matVecByColumns(M, v))}` },
      { title: "Same answer both ways", text: `Both views give ${tup(out)}. The row view is easier to calculate; the column view is easier to picture.`, tex: `M\\mathbf{v}=${colTex(out)}` },
      { title: "The shape can change", text: `A 3×2 matrix takes 2 numbers in and gives 3 out. For ${tup(v)} it gives ${tup(matVec(N, v))}. The number of columns must match the input's length; the number of rows sets the output's length.`, tex: `${bm(N)}${colTex(v)}=${colTex(matVec(N, v))}` },
    ];
  },
  matmul() {
    const { A, B } = PRESETS.ab;
    const step = entryStep(A, B, 1, 2);
    const P = PRESETS.ps.A, S = PRESETS.ps.B;
    return [
      { title: "Check the shapes", text: "The left matrix has 3 columns and the right has 3 rows, so they fit. The result has the left's rows and the right's columns.", tex: `(${shape(A).rows}\\times${shape(A).cols})(${shape(B).rows}\\times${shape(B).cols})\\to ${resultShape(A, B).rows}\\times${resultShape(A, B).cols}` },
      { title: "Pick one output entry", text: "Take the entry in row 1, column 2. Use row 1 of A and column 2 of B.", tex: `\\text{row }1=${rowTex(step.row)},\\quad\\text{column }2=${rowTex(step.column)}` },
      { title: "Pair and multiply", text: "Multiply the first with the first, the second with the second, the third with the third.", tex: step.row.map((a, q) => `${a}\\cdot${step.column[q]}`).join(",\\;") + "\\;=\\;" + step.terms.join(",\\;") },
      { title: "Add", text: "The sum of those products is one entry of the answer.", tex: `${step.terms.join("+")}=${step.sum}` },
      { title: "Repeat for every entry", text: "Do the same for the other three positions.", tex: `AB=${bm(matMul(A, B))}` },
      { title: "Order matters", text: "Swap the order of two matrices and you usually get a different answer. Here S swaps things: on the right it swaps columns, on the left it swaps rows.", tex: `PS=${bm(matMul(P, S))},\\quad SP=${bm(matMul(S, P))}` },
    ];
  },
};

/* ---------- predict-then-reveal ---------- */
const predictions = {
  vectors() {
    const v = [3, 2, 7];
    return { expected: entryOf(v, 3), explain: `The subscript 3 picks the third entry of ${tup(v)}, which is ${entryOf(v, 3)}. Positions count from 1.` };
  },
  combine() {
    const sum = linearCombination([2, -1], [A_VEC, B_VEC]);
    return { expected: sum[0], explain: `2a is ${tup(scale(2, A_VEC))} and −b is ${tup(scale(-1, B_VEC))}. Adding the first entries gives ${sum[0]}. (The second entries give ${sum[1]}.)` };
  },
  matrix() {
    const M = [[2, 1], [0, 3]];
    const v = [3, 2];
    const out = matVec(M, v);
    return { expected: out[0], explain: `Row 1 of M is ${tup(row(M, 1))}. Pair it with ${tup(v)}: ${row(M, 1)[0]}·${v[0]} + ${row(M, 1)[1]}·${v[1]} = ${out[0]}.` };
  },
  matmul() {
    const { A, B } = PRESETS.ab;
    const s = entryStep(A, B, 2, 1);
    return { expected: s.sum, explain: `Row 2 of A is ${tup(s.row)} and column 1 of B is ${tup(s.column)}. The products are ${s.terms.join(", ")}, and they add to ${s.sum}.` };
  },
};

/* ---------- numbers quoted in the prose ---------- */
const illustrativeUpdate = [0.1, 0.3, -0.2, 0];
const calcs = {
  embText: () => tup(illustrativeEmbedding),
  embDim: () => String(dimension(illustrativeEmbedding)),
  embUpdate: () => tup(illustrativeUpdate),
  embSum: () => tup(add(illustrativeEmbedding, illustrativeUpdate)),
  dModel: () => String(transformerBase.dModel),
  dK: () => String(transformerBase.dK),
  dFf: () => String(transformerBase.dFf),
  matDefaultOut: () => tup(matVec([[2, -1], [1, 1]], [1, 2])),
  qEntries: () => entryCount({ rows: transformerBase.dK, cols: transformerBase.dModel }).toLocaleString("en-US"),
  qShape: () => `${transformerBase.dK}×${transformerBase.dModel}`,
  ffEntries: () => entryCount({ rows: transformerBase.dFf, cols: transformerBase.dModel }).toLocaleString("en-US"),
  ffShape: () => `${transformerBase.dFf}×${transformerBase.dModel}`,
  ffMults: () => multiplyCountFromShapes({ rows: transformerBase.dFf, cols: transformerBase.dModel }, { rows: transformerBase.dModel, cols: 1 }).toLocaleString("en-US"),
  abShape: () => { const s = resultShape(PRESETS.ab.A, PRESETS.ab.B); return `${s.rows}×${s.cols}`; },
  eqRowCheck: () => String(matVec([[1, 1]], [1, 3])[0]),
  entrywiseVec: () => tup(matVec(entrywiseProduct([[1, 2], [3, 4]], [[0, 1], [1, 1]]), [1, 0])),
  composedVec: () => tup(matVec([[1, 2], [3, 4]], matVec([[0, 1], [1, 1]], [1, 0]))),
};
const texCalcs = {
  entrywiseMatrix: () => bm(entrywiseProduct([[1, 2], [3, 4]], [[0, 1], [1, 1]])),
  productMatrix: () => bm(matMul([[1, 2], [3, 4]], [[0, 1], [1, 1]])),
  summedUp: () => `${colTex(illustrativeEmbedding)}+${colTex(illustrativeUpdate)}=${colTex(add(illustrativeEmbedding, illustrativeUpdate))}`,
};

/* ---------- boot ---------- */
const widgetMounts = { vectors: vectorsWidget, combine: combineWidget, matrix: matrixWidget, multiply: multiplyWidget };

bootPage({ widgetMounts, stepperData, predictions, calcs, texCalcs });
