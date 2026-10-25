// Deliberate changes made to the old long module pages' text after the split (Module 1 part 2 session).
// The split tool and the content-preservation test both read the old pages through these edits, so
// "nothing was lost" still means "nothing except what is listed here". Each entry says why.

// Applied to every card: the predict prompt no longer points at a "next part".
export const GLOBAL_EDITS = [
  { from: "Before you open the next part, predict", to: "Before you continue, predict", why: "A concept page must not preview a later part; the prompt just says to continue." },
];

// Applied to one card, matched by its article id.
export const ARTICLE_EDITS = {
  "concept-vectors": [{ from: "Full card · 1 of 4", to: "Full card · 1 of 8", why: "Module 1 now has eight built concepts." }],
  "concept-combine": [
    { from: "Full card · 2 of 4", to: "Full card · 2 of 8", why: "Module 1 now has eight built concepts." },
    { from: " is a question about linear combinations (explored fully in the next part).", to: " is a question about linear combinations.", why: "Remove the forward pointer." },
    { from: "MML Ch 2.4 (vector spaces) and Ch 2.5 (linear combinations in the next part).", to: "MML Ch 2.4 (vector spaces).", why: "Remove the forward pointer." },
  ],
  "concept-matrices": [
    { from: "Full card · 3 of 4", to: "Full card · 3 of 8", why: "Module 1 now has eight built concepts." },
    { from: '      <p class="muted">What a matrix does to the whole plane at once (rotating, stretching, shearing) is explored fully in the next part.</p>\n', to: "", why: "Remove the forward pointer (the Linear transformations card links back to Matrices instead)." },
    { from: "MML Ch 2.2 (matrices) and Ch 2.7 (linear mappings, in the next part).", to: "MML Ch 2.2 (matrices).", why: "Remove the forward pointer." },
  ],
  "concept-matmul": [
    { from: "Full card · 4 of 4", to: "Full card · 4 of 8", why: "Module 1 now has eight built concepts." },
    { from: " We will solve such systems in the next part.", to: "", why: "Remove the forward pointer." },
  ],
  "concept-equations": [
    { from: "(solving systems of linear equations) for the full treatment, coming in Module 1.", to: "(solving systems of linear equations).", why: "Remove the forward pointer." },
  ],
};

// The old Module 1 intro: counts and the "next part" line change because the module is now complete.
export const OVERVIEW_EDITS = {
  eyebrow: [{ from: "Module 1 · part 1 of 2", to: "Module 1" }],
  lede: [{ from: "Four ideas, each from a picture first", to: "Eight ideas, each from a picture first" }],
  // Remainder of the old intro paragraph that is dropped on purpose (it listed planned concepts).
  droppedLeftover: ["Systems of equations, span and linear transformations come in the next part."],
};

const apply = (s, edits) => {
  let out = s;
  for (const e of edits) out = out.split(e.from).join(e.to);
  return out;
};

export function editArticle(id, html) {
  return apply(apply(html, ARTICLE_EDITS[id] ?? []), GLOBAL_EDITS);
}
export const editOverviewPart = (part, s) => apply(s, OVERVIEW_EDITS[part] ?? []);
export const isDroppedLeftover = (s) => OVERVIEW_EDITS.droppedLeftover.includes(s);
