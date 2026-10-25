// Pure helpers for the "On this page" nav and the collapsible sections (tested in tests/page-nav-math.test.mjs).

// Scrollspy: entries are { key, top } in document order, `top` measured from the viewport top.
// The current one is the last whose top has reached `line`; null while none has.
export function pickCurrent(entries, line) {
  let current = null;
  for (const e of entries) if (e.top <= line) current = e.key;
  return current;
}

// Stable key for a collapsible, saved in the UI store: "<card id>:<kind>" or "<card id>:<kind>:<n>".
export const sectionKey = (cardId, kind, index = 0) => (index > 0 ? `${cardId}:${kind}:${index}` : `${cardId}:${kind}`);

// New saved map after setting some keys open or closed. Only open keys are stored.
export function withOpen(saved, keys, open) {
  const out = { ...(saved ?? {}) };
  for (const k of keys) { if (open) out[k] = true; else delete out[k]; }
  return out;
}

// Keeps only entries with a real `true`, so a damaged store cannot open things.
export function cleanOpen(saved) {
  const out = {};
  if (saved && typeof saved === "object" && !Array.isArray(saved)) for (const [k, v] of Object.entries(saved)) if (v === true && typeof k === "string") out[k] = true;
  return out;
}

export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// Hide-on-scroll rule for the sticky bar: hide after scrolling down past `min` px by more than `slack`, show on any scroll up.
// A single move of more than `jump` px is a jump (a link, a hash, a late re-scroll), not reading, so the bar stays.
export function barAway({ y, lastY, away, min = 200, slack = 8, jump = 1000 }) {
  const d = y - lastY;
  if (y <= min || Math.abs(d) > jump) return false;
  if (d > slack) return true;
  if (d < -slack) return false;
  return away;
}
