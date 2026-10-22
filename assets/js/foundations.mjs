import {
  average,
  calculateSlope,
  exponentialValue,
  linearValue,
  logarithm,
  percentOf,
  solveLinearSystem,
  sum,
  unitCircle,
} from "./foundations-math.mjs";

const svgNamespace = "http://www.w3.org/2000/svg";

function formatNumber(value) {
  if (Number.isInteger(value)) return String(value);
  return String(Number(value.toFixed(3)));
}

function svgElement(name, attributes = {}, text = "") {
  const element = document.createElementNS(svgNamespace, name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
  if (text) element.textContent = text;
  return element;
}

function appendText(svg, x, y, text, anchor = "middle") {
  svg.append(svgElement("text", { x, y, "text-anchor": anchor }, text));
}

function graphFrame(svg, { minX, maxX, minY, maxY, xStep = 1, yStep = 1, xLabel = "x", yLabel = "y" }) {
  const bounds = { left: 56, right: 606, top: 32, bottom: 350 };
  const x = (value) => bounds.left + ((value - minX) / (maxX - minX)) * (bounds.right - bounds.left);
  const y = (value) => bounds.bottom - ((value - minY) / (maxY - minY)) * (bounds.bottom - bounds.top);
  svg.replaceChildren();

  for (let tick = Math.ceil(minX / xStep) * xStep; tick <= maxX; tick += xStep) {
    svg.append(svgElement("line", { x1: x(tick), y1: bounds.top, x2: x(tick), y2: bounds.bottom, class: "gridline" }));
    if (tick !== 0) appendText(svg, x(tick), bounds.bottom + 20, formatNumber(tick));
  }
  for (let tick = Math.ceil(minY / yStep) * yStep; tick <= maxY; tick += yStep) {
    svg.append(svgElement("line", { x1: bounds.left, y1: y(tick), x2: bounds.right, y2: y(tick), class: "gridline" }));
    if (tick !== 0) appendText(svg, bounds.left - 14, y(tick) + 4, formatNumber(tick), "end");
  }

  if (minX <= 0 && maxX >= 0) svg.append(svgElement("line", { x1: x(0), y1: bounds.top, x2: x(0), y2: bounds.bottom, class: "axis" }));
  if (minY <= 0 && maxY >= 0) svg.append(svgElement("line", { x1: bounds.left, y1: y(0), x2: bounds.right, y2: y(0), class: "axis" }));
  appendText(svg, bounds.right, bounds.bottom + 34, xLabel, "end");
  appendText(svg, bounds.left - 18, bounds.top - 10, yLabel, "start");
  return { ...bounds, x, y };
}

function drawFunction(svg, frame, fn, minX, maxX, className = "plot-main", steps = 100) {
  const points = [];
  for (let index = 0; index <= steps; index += 1) {
    const xValue = minX + ((maxX - minX) * index) / steps;
    points.push(`${index === 0 ? "M" : "L"}${frame.x(xValue)},${frame.y(fn(xValue))}`);
  }
  svg.append(svgElement("path", { d: points.join(" "), class: className }));
}

function bindRange(id, callback) {
  const input = document.getElementById(id);
  if (!input) return;
  input.addEventListener("input", callback);
  callback();
}

function initializeVariableWidget() {
  const slider = document.getElementById("variable-x");
  if (!slider) return;
  bindRange("variable-x", () => {
    const x = Number(slider.value);
    const result = linearValue(2, 1, x);
    document.getElementById("variable-x-value").textContent = formatNumber(x);
    document.getElementById("variable-input-label").textContent = formatNumber(x);
    document.getElementById("variable-output-label").textContent = formatNumber(result);
    document.getElementById("variable-expression-result").textContent = `When x is ${formatNumber(x)}, 2x + 1 is ${formatNumber(result)}.`;
  });
}

function initializeEquationWidget() {
  const slider = document.getElementById("equation-x");
  const svg = document.getElementById("equation-graph");
  if (!slider || !svg) return;
  const frame = graphFrame(svg, { minX: -1, maxX: 5, minY: -1, maxY: 5, xLabel: "x", yLabel: "y" });
  drawFunction(svg, frame, (x) => 4 - x, -1, 5, "plot-main");
  drawFunction(svg, frame, (x) => x, -1, 5, "plot-secondary");
  const intersection = solveLinearSystem(1, 1, 4, 1, -1, 0);
  svg.append(svgElement("circle", { cx: frame.x(intersection.x), cy: frame.y(intersection.y), r: 7, class: "plot-point" }));
  appendText(svg, frame.x(intersection.x) + 34, frame.y(intersection.y) - 10, "shared solution", "start");

  bindRange("equation-x", () => {
    const x = Number(slider.value);
    const y = linearValue(-1, 4, x);
    document.getElementById("equation-x-value").textContent = formatNumber(x);
    document.getElementById("equation-result").textContent = `On x + y = 4, x = ${formatNumber(x)} gives y = ${formatNumber(y)}. Both equations meet at (${formatNumber(intersection.x)}, ${formatNumber(intersection.y)}).`;
    svg.querySelector(".selected-solution")?.remove();
    svg.append(svgElement("circle", { cx: frame.x(x), cy: frame.y(y), r: 6, class: "plot-point selected-solution" }));
  });
}

function initializeFunctionWidget() {
  const svg = document.getElementById("function-graph");
  if (!svg) return;
  const update = () => {
    const slope = Number(document.getElementById("function-slope").value);
    const intercept = Number(document.getElementById("function-intercept").value);
    const input = Number(document.getElementById("function-x").value);
    const output = linearValue(slope, intercept, input);
    document.getElementById("function-slope-value").textContent = formatNumber(slope);
    document.getElementById("function-intercept-value").textContent = formatNumber(intercept);
    document.getElementById("function-x-value").textContent = formatNumber(input);
    document.getElementById("function-result").textContent = `For y = ${formatNumber(slope)}x + ${formatNumber(intercept)}, input x = ${formatNumber(input)} gives output y = ${formatNumber(output)}.`;
    const frame = graphFrame(svg, { minX: -5, maxX: 5, minY: -10, maxY: 10, xStep: 1, yStep: 2 });
    drawFunction(svg, frame, (x) => linearValue(slope, intercept, x), -5, 5);
    svg.append(svgElement("circle", { cx: frame.x(input), cy: frame.y(output), r: 7, class: "plot-point" }));
  };
  ["function-slope", "function-intercept", "function-x"].forEach((id) => {
    document.getElementById(id).addEventListener("input", update);
  });
  update();
}

function initializeSlopeWidget() {
  const svg = document.getElementById("slope-graph");
  if (!svg) return;
  const update = () => {
    const slope = Number(document.getElementById("slope-m").value);
    const intercept = Number(document.getElementById("slope-b").value);
    const x1 = -2;
    const x2 = 0;
    const y1 = linearValue(slope, intercept, x1);
    const y2 = linearValue(slope, intercept, x2);
    const measuredSlope = calculateSlope(x1, y1, x2, y2);
    document.getElementById("slope-m-value").textContent = formatNumber(slope);
    document.getElementById("slope-b-value").textContent = formatNumber(intercept);
    document.getElementById("slope-result").textContent = `From x = ${formatNumber(x1)} to x = ${formatNumber(x2)}, the run is ${formatNumber(x2 - x1)} and the rise is ${formatNumber(y2 - y1)}. Slope = ${formatNumber(measuredSlope)}.`;
    const frame = graphFrame(svg, { minX: -5, maxX: 5, minY: -8, maxY: 8, yStep: 2 });
    drawFunction(svg, frame, (x) => linearValue(slope, intercept, x), -5, 5);
    const xA = frame.x(x1);
    const xB = frame.x(x2);
    const yA = frame.y(y1);
    const yB = frame.y(y2);
    svg.append(svgElement("line", { x1: xA, y1: yA, x2: xB, y2: yA, stroke: "#166a65", "stroke-width": 3, "stroke-dasharray": "7 5" }));
    svg.append(svgElement("line", { x1: xB, y1: yA, x2: xB, y2: yB, stroke: "#2f5f99", "stroke-width": 3, "stroke-dasharray": "7 5" }));
    svg.append(svgElement("circle", { cx: xA, cy: yA, r: 6, class: "plot-point" }));
    svg.append(svgElement("circle", { cx: xB, cy: yB, r: 6, class: "plot-point" }));
    appendText(svg, (xA + xB) / 2, yA + 20, "run");
    appendText(svg, xB + 22, (yA + yB) / 2, "rise", "start");
  };
  ["slope-m", "slope-b"].forEach((id) => document.getElementById(id).addEventListener("input", update));
  update();
}

function initializeExponentialWidget() {
  const svg = document.getElementById("exponential-graph");
  if (!svg) return;
  const update = () => {
    const selectedRate = Number(document.getElementById("exponential-rate").value);
    const steps = Number(document.getElementById("exponential-steps").value);
    const pairedRate = 2 - selectedRate;
    const growthRate = Math.max(selectedRate, pairedRate);
    const decayRate = Math.min(selectedRate, pairedRate);
    const growthValue = exponentialValue(10, growthRate, steps);
    const decayValue = exponentialValue(10, decayRate, steps);
    document.getElementById("exponential-rate-value").textContent = formatNumber(selectedRate);
    document.getElementById("exponential-steps-value").textContent = formatNumber(steps);
    document.getElementById("exponential-result").textContent = `From the same starting amount, multiplier ${formatNumber(growthRate)} gives ${formatNumber(growthValue)}; multiplier ${formatNumber(decayRate)} gives ${formatNumber(decayValue)} after ${formatNumber(steps)} steps.`;
    const frame = graphFrame(svg, { minX: 0, maxX: 8, minY: 0, maxY: 300, yStep: 50, xLabel: "steps", yLabel: "amount" });
    drawFunction(svg, frame, (x) => exponentialValue(10, growthRate, x), 0, 8, "plot-main");
    drawFunction(svg, frame, (x) => exponentialValue(10, decayRate, x), 0, 8, "plot-secondary");
    appendText(svg, 120, 22, `Growth factor ${formatNumber(growthRate)}`, "start");
    appendText(svg, 340, 22, `Decay factor ${formatNumber(decayRate)}`, "start");
  };
  ["exponential-rate", "exponential-steps"].forEach((id) => document.getElementById(id).addEventListener("input", update));
  update();
}

function initializeLogWidget() {
  const svg = document.getElementById("log-steps-graph");
  if (!svg) return;
  const update = () => {
    const base = Number(document.getElementById("log-base").value);
    const value = Number(document.getElementById("log-value").value);
    const steps = logarithm(base, value);
    document.getElementById("log-base-value").textContent = formatNumber(base);
    document.getElementById("log-value-value").textContent = formatNumber(value);
    document.getElementById("log-result").textContent = `log base ${formatNumber(base)} of ${formatNumber(value)} is ${formatNumber(steps)} multiplication steps.`;
    svg.replaceChildren();
    const maxStep = Math.max(1, Math.ceil(steps));
    const left = 70;
    const right = 580;
    const y = 190;
    svg.append(svgElement("line", { x1: left, y1: y, x2: right, y2: y, class: "axis" }));
    for (let index = 0; index <= maxStep; index += 1) {
      const px = left + (index / maxStep) * (right - left);
      svg.append(svgElement("line", { x1: px, y1: y - 18, x2: px, y2: y + 18, stroke: "#7a1f3d", "stroke-width": 3 }));
      appendText(svg, px, y + 42, `step ${formatNumber(index)}`);
      const power = base ** index;
      appendText(svg, px, y - 32, formatNumber(power));
    }
    const exactX = left + (steps / maxStep) * (right - left);
    svg.append(svgElement("circle", { cx: exactX, cy: y, r: 8, class: "plot-point" }));
    appendText(svg, 320, 88, `Target value: ${formatNumber(value)} · exponent: ${formatNumber(steps)}`);
    appendText(svg, 320, 300, "Powers of the selected base");
  };
  ["log-base", "log-value"].forEach((id) => document.getElementById(id).addEventListener("input", update));
  update();
}

function initializeSigmaWidget() {
  const svg = document.getElementById("sigma-visual");
  if (!svg) return;
  const update = () => {
    const n = Number(document.getElementById("sigma-n").value);
    const values = Array.from({ length: n }, (_, index) => index + 1);
    const total = sum(values);
    document.getElementById("sigma-n-value").textContent = formatNumber(n);
    document.getElementById("sigma-result").textContent = `${values.join(" + ")} = ${formatNumber(total)}.`;
    svg.replaceChildren();
    const baseline = 330;
    const barWidth = Math.min(58, 440 / n);
    values.forEach((value, index) => {
      const height = (value / n) * 250;
      const x = 90 + index * (440 / n);
      svg.append(svgElement("rect", {
        x: x + 2,
        y: baseline - height,
        width: barWidth,
        height,
        rx: 6,
        fill: index % 2 === 0 ? "#7a1f3d" : "#166a65",
      }));
      appendText(svg, x + barWidth / 2, baseline - height - 10, formatNumber(value));
    });
    svg.append(svgElement("line", { x1: 70, y1: baseline, x2: 580, y2: baseline, class: "axis" }));
    appendText(svg, 320, 374, `Terms added: ${formatNumber(n)}`);
  };
  document.getElementById("sigma-n").addEventListener("input", update);
  update();
}

function initializeRatiosWidget() {
  const percent = document.getElementById("percent-value");
  if (!percent) return;
  const sampleValues = [2, 4, 6, 8, 10, 12];
  const update = () => {
    const percentage = Number(percent.value);
    const total = Number(document.getElementById("percent-total").value);
    const count = Number(document.getElementById("average-count").value);
    const amount = percentOf(percentage, total);
    const mean = average(sampleValues.slice(0, count));
    document.getElementById("percent-value-label").textContent = formatNumber(percentage);
    document.getElementById("percent-total-label").textContent = formatNumber(total);
    document.getElementById("average-count-label").textContent = formatNumber(count);
    document.getElementById("percent-bar").setAttribute("width", String(460 * percentage / 100));
    document.getElementById("ratio-result").textContent = `${formatNumber(percentage)}% of ${formatNumber(total)} is ${formatNumber(amount)}. The average of ${sampleValues.slice(0, count).join(", ")} is ${formatNumber(mean)}.`;
  };
  ["percent-value", "percent-total", "average-count"].forEach((id) => document.getElementById(id).addEventListener("input", update));
  update();
}

function initializeTrigonometryWidget() {
  const svg = document.getElementById("unit-circle-graph");
  if (!svg) return;
  const centerX = 320;
  const centerY = 195;
  const radius = 125;
  const update = () => {
    const degrees = Number(document.getElementById("angle-degrees").value);
    const radians = degrees * Math.PI / 180;
    const { cosine, sine } = unitCircle(radians);
    const pointX = centerX + cosine * radius;
    const pointY = centerY - sine * radius;
    document.getElementById("angle-degrees-value").textContent = formatNumber(degrees);
    document.getElementById("trig-result").textContent = `cos(${formatNumber(degrees)}°) = ${formatNumber(cosine)} (horizontal); sin(${formatNumber(degrees)}°) = ${formatNumber(sine)} (vertical).`;
    svg.replaceChildren();
    svg.append(svgElement("line", { x1: 70, y1: centerY, x2: 570, y2: centerY, class: "axis" }));
    svg.append(svgElement("line", { x1: centerX, y1: 35, x2: centerX, y2: 355, class: "axis" }));
    svg.append(svgElement("circle", { cx: centerX, cy: centerY, r: radius, fill: "none", stroke: "#7d7565", "stroke-width": 2 }));
    svg.append(svgElement("line", { x1: centerX, y1: centerY, x2: pointX, y2: pointY, stroke: "#7a1f3d", "stroke-width": 3 }));
    svg.append(svgElement("line", { x1: pointX, y1: pointY, x2: pointX, y2: centerY, stroke: "#166a65", "stroke-width": 2, "stroke-dasharray": "6 5" }));
    svg.append(svgElement("line", { x1: centerX, y1: pointY, x2: pointX, y2: pointY, stroke: "#2f5f99", "stroke-width": 2, "stroke-dasharray": "6 5" }));
    svg.append(svgElement("circle", { cx: pointX, cy: pointY, r: 7, class: "plot-point" }));
    appendText(svg, (centerX + pointX) / 2, centerY + 28, `cos = ${formatNumber(cosine)}`);
    appendText(svg, pointX + 34, (centerY + pointY) / 2, `sin = ${formatNumber(sine)}`, "start");
  };
  document.getElementById("angle-degrees").addEventListener("input", update);
  update();
}

function appendExample(container, heading, lines) {
  container.replaceChildren();
  const title = document.createElement("h4");
  title.textContent = heading;
  container.append(title);
  const list = document.createElement("ol");
  lines.forEach((line) => {
    const item = document.createElement("li");
    item.textContent = line;
    list.append(item);
  });
  container.append(list);
}

function initializeExamples() {
  const solutions = solveLinearSystem(1, 1, 4, 1, -1, 0);
  const examples = {
    variables: ["Substitute x = 3 into 2x + 1.", `Multiply: 2 × 3 = ${formatNumber(linearValue(2, 0, 3))}.`, `Add one: the expression equals ${formatNumber(linearValue(2, 1, 3))}.`],
    equations: [`Start with x + y = 4 and x - y = 0.`, `The shared solution is x = ${formatNumber(solutions.x)}, y = ${formatNumber(solutions.y)}.`, `Check both: ${formatNumber(solutions.x)} + ${formatNumber(solutions.y)} = ${formatNumber(solutions.x + solutions.y)}, and their difference is ${formatNumber(solutions.x - solutions.y)}.`],
    functions: [`Use the rule f(x) = 2x + 1.`, `For input x = 3, calculate 2 × 3 + 1.`, `The output is ${formatNumber(linearValue(2, 1, 3))}.`],
    slope: [`Choose points (${formatNumber(2)}, ${formatNumber(3)}) and (${formatNumber(6)}, ${formatNumber(11)}).`, `The run is ${formatNumber(6 - 2)} and the rise is ${formatNumber(11 - 3)}.`, `The slope, rise divided by run, is ${formatNumber(calculateSlope(2, 3, 6, 11))}.`],
    exponents: [`Begin with ${formatNumber(4)} units and multiply by ${formatNumber(2)} at each step.`, `After ${formatNumber(3)} steps, evaluate 4 × 2³.`, `The resulting amount is ${formatNumber(exponentialValue(4, 2, 3))} units.`],
    logarithms: [`Ask how many factors of ${formatNumber(2)} make ${formatNumber(8)}.`, `Because 2³ = 8, the exponent is ${formatNumber(logarithm(2, 8))}.`, `Therefore log base 2 of 8 is ${formatNumber(logarithm(2, 8))}.`],
    sigma: [`Expand the sum of the first ${formatNumber(4)} positive integers.`, `${[1, 2, 3, 4].join(" + ")} = ${formatNumber(sum([1, 2, 3, 4]))}.`, `The sigma symbol is a compact way to write that same addition.`],
    ratios: [`Find ${formatNumber(15)}% of ${formatNumber(80)}.`, `Convert the percentage to a fraction and multiply: ${formatNumber(percentOf(15, 80))}.`, `The arithmetic average of 12, 15, 18, and 15 is ${formatNumber(average([12, 15, 18, 15]))}.`],
    trigonometry: [`Use an angle of π/3 radians, equivalent to ${formatNumber(60)} degrees.`, `The unit-circle coordinates come from the tested cosine and sine calculation.`, `Cosine is ${formatNumber(unitCircle(Math.PI / 3).cosine)} and sine is ${formatNumber(unitCircle(Math.PI / 3).sine)}.`],
    notation: ["Read x₁ as a labelled component; the small lower label is a subscript.", "Read x² as a power in this context; the raised label is a superscript.", "Translate symbols into words and check the author's definitions before using them."],
  };
  document.querySelectorAll("[data-example]").forEach((container) => {
    const key = container.dataset.example;
    if (!examples[key]) throw new Error(`Missing worked example data for ${key}.`);
    appendExample(container, "One step at a time", examples[key]);
  });
}

function initializeSpotIt() {
  document.querySelectorAll(".spot-it").forEach((spot, index) => {
    const button = spot.querySelector(".reveal-button");
    if (!button) return;
    const input = document.createElement("textarea");
    const inputId = `spot-answer-${index + 1}`;
    input.id = inputId;
    input.className = "answer-input";
    input.name = `spot-answer-${index + 1}`;
    input.rows = 2;
    input.autocomplete = "off";
    input.setAttribute("aria-describedby", `${inputId}-hint`);
    const label = document.createElement("label");
    label.className = "control";
    label.htmlFor = inputId;
    label.textContent = "Commit your explanation first";
    const hint = document.createElement("span");
    hint.id = `${inputId}-hint`;
    hint.className = "muted";
    hint.textContent = "A phrase or sentence is enough; the reveal is a comparison, not a score.";
    label.append(input, hint);
    button.closest(".predict-row").prepend(label);
    button.disabled = true;
    input.addEventListener("input", () => {
      button.disabled = input.value.trim().length === 0;
    });
    button.addEventListener("click", () => {
      const feedback = spot.querySelector(".feedback");
      feedback.dataset.state = "try";
      feedback.textContent = `Your idea: ${input.value.trim()} A possible explanation: ${button.dataset.answer}`;
    });
  });
}

function initializeTeachBack() {
  document.querySelectorAll('.concept-card[data-size="full"] .teach-content').forEach((content, index) => {
    const model = [...content.querySelectorAll("p")].find((paragraph) => paragraph.textContent.startsWith("60-second explanation:"));
    if (!model) return;
    const label = document.createElement("label");
    label.className = "control";
    label.htmlFor = `explain-back-${index + 1}`;
    label.textContent = "Explain it in your own words";
    const input = document.createElement("textarea");
    input.id = `explain-back-${index + 1}`;
    input.className = "explain-input";
    input.name = `explain-back-${index + 1}`;
    input.rows = 3;
    input.autocomplete = "off";
    label.append(input);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "button-secondary";
    button.textContent = "Compare with a model explanation";
    const answer = document.createElement("p");
    answer.className = "feedback";
    answer.setAttribute("aria-live", "polite");
    button.addEventListener("click", () => {
      answer.dataset.state = "correct";
      answer.textContent = `${model.textContent} Compare the ideas in your explanation; the wording does not need to match.`;
    });
    content.append(label, button, answer);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initializeVariableWidget();
  initializeEquationWidget();
  initializeFunctionWidget();
  initializeSlopeWidget();
  initializeExponentialWidget();
  initializeLogWidget();
  initializeSigmaWidget();
  initializeRatiosWidget();
  initializeTrigonometryWidget();
  initializeExamples();
  initializeSpotIt();
  initializeTeachBack();
});
