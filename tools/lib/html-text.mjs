// Small helpers to compare the visible text of HTML pages (no DOM, no packages).
const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function textOf(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
      if (e[0] === "#") return String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
      return ENT[e.toLowerCase()] ?? m;
    })
    .replace(/\s+/g, " ")
    .trim();
}

// First place two texts differ, as a readable message ("" when equal). Words are compared, not characters.
export function firstDiff(a, b, context = 8) {
  if (a === b) return "";
  const x = a.split(" "), y = b.split(" ");
  let i = 0;
  while (i < x.length && i < y.length && x[i] === y[i]) i++;
  const show = (w) => `${i > context ? "… " : ""}${w.slice(Math.max(0, i - context), i + context).join(" ")}${w.length > i + context ? " …" : ""}`;
  return `differs at word ${i} (expected ${x.length} words, got ${y.length}):\n  expected: ${show(x)}\n  actual:   ${show(y)}`;
}
