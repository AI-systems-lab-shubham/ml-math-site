# LEARNING-UX.md: making the site feel like a learning platform

Goal: the site should feel like a professional course (Coursera, edX, Khan Academy), not a set of web pages. This file lists the patterns to build, scoped to what a **static GitHub Pages site** can do. `DESIGN.md` still governs colours, type and spacing; this file governs structure and behaviour. Read both before touching the shell.

**Out of scope (cannot be done on a static site):** accounts, progress that syncs across devices, video hosting, graded certificates, forums and comments. Progress lives in the browser only, so offer **Export / Import progress** (a JSON file) as the cross-device workaround.

## Priorities (cut from the bottom if usage is tight)
- **P1:** `data/course.json`, progress store, outline with progress, lesson template, Mark complete, Resume, accordions
- **P2:** course home page, Previous / Up next, "On this page" mini-nav
- **P3:** search (Cmd/Ctrl+K)
- **P4:** end-of-module quizzes
- **P5:** printable cheat sheets, prerequisite map, illustration and polish pass

## 1. One source of truth: `data/course.json`
Everything structural reads from it: home page, outline, Previous/Next, search index, progress totals.
```json
{
  "modules": [{
    "id": "m01", "title": "Linear algebra", "path": "modules/01-linear-algebra/",
    "status": "built",            // "built" | "planned"
    "summary": "…", "minutes": 90, "prerequisites": ["m00"],
    "outcomes": ["Multiply a matrix by a vector and explain what it does to space"],
    "concepts": [{ "id": "m01-vectors", "title": "Vectors", "anchor": "vectors",
                   "size": "full", "minutes": 12,
                   "objectives": ["…", "…"] }]
  }]
}
```
- Concept ids are stable and never reused. Planned modules show as "Coming soon", visibly disabled, with a short note (a clear signifier, not a dead link).
- `tools/check-course.mjs` fails if ids repeat, a built module's page or anchor is missing, or the Previous/Next chain breaks.

## 2. Progress store (`assets/js/progress.mjs`)
- `localStorage` key `mlmath:progress:v1`, always inside try/catch. It works when storage is empty, blocked or corrupted (reset to empty and say so).
- Shape: `{ concepts: { "<id>": { visited: ISO, done: ISO|null } }, last: { id, at }, open: { "<id>": true }, quiz: {…} }`.
- **Visited** (automatic) and **Complete** (explicit, via a "Mark complete" button) are different states and look different. Never auto-complete.
- Functions: `markVisited`, `setDone`, `resume()`, `moduleProgress(id)`, `exportJSON()`, `importJSON()` (validates shape and version before accepting).
- Unit tests cover: blocked storage, corrupted JSON, unknown ids, import of a bad file, completion toggling.

## 3. Shell: header, outline, footer
Injected by `assets/js/shell.mjs` from `course.json` so there is no duplicated markup. A `<noscript>` message and a plain fallback link list keep the page usable if scripts fail.
- **Header:** site name (links to course home), Search button (visible, not shortcut-only), overall progress, Menu. The "Highlight all terms" toggle moves into a consistent place here.
- **Course outline (left rail on desktop, drawer on phones):** modules collapse and expand; each concept shows not-started, visited or complete as a distinct icon *and* text for screen readers; the current concept has `aria-current="page"`; each module shows a small progress ring. `<nav aria-label="Course outline">`.
- **Footer:** sources and further reading, how to use the site, accessibility notes, licences. No personal information.
- A **skip-to-content** link is first in tab order.

## 4. Lesson template (every concept page section)
1. Breadcrumb: Course › Module › Concept.
2. Title, then meta: estimated minutes, level, prerequisites (soft signposts that link to the earlier concept, never locks).
3. **"By the end of this card you'll be able to…"** box: two or three verifiable outcomes (use verbs like compute, explain, identify).
4. The seven Concept Card stages (see `docs/CONCEPT-CARD.md`).
5. **Key takeaways** box: three or four lines.
6. Teach it panel.
7. **Mark complete** button, then **Previous** and **Up next** (with the next concept's title and time).
- **"On this page" mini-nav:** the stage list, with the current stage highlighted as you scroll (IntersectionObserver). Sticky beside the content on wide screens, a collapsible bar on phones.

## 5. Collapsibles and accordions
- Use native `<details>`/`<summary>` for derivations, "go deeper", FAQs and the Teach it panel. One consistent chevron, a 44px minimum hit area, and a visible focus ring.
- **Expand all / Collapse all** per page. Open state is remembered. A link to an anchor inside a closed section opens it. In print, everything opens.
- Respect `prefers-reduced-motion` (no height animation when set).

## 6. Course home page (`index.html`)
- Hero: title, one-sentence promise, **Start** (or **Resume: <concept>**) button, estimated total time.
- **What you'll learn:** six to eight outcomes.
- **Who it's for / prerequisites:** high-school maths.
- **Syllabus accordion:** each module expands to its concepts with minutes and progress; planned modules clearly marked.
- **Prerequisite map:** a simple SVG diagram of the modules plus a text list alternative. (P5)
- **How this course works:** the seven-stage card and the glossary hover, in three short lines, with the Export/Import progress control.

## 7. Search (P3)
- `tools/build-search.mjs` generates `data/search-index.json` from `course.json`, headings and `data/glossary.json`. Commit the generated file.
- Cmd/Ctrl+K and the header button open a dialog (`role="dialog"`, focus trapped, Esc closes, focus returns). Arrow keys move through results, Enter opens one. Results are grouped: Concepts, Glossary.
- A test checks the index builds and that known queries ("dot product", "logarithm") return the right entry first.

## 8. End-of-module quiz (P4)
- 8 to 12 questions in `data/quizzes/mNN.json`: multiple choice and numeric. Any numeric answer is computed by tested code, not typed.
- Immediate feedback with a short explanation. Wrong answers use the amber "not quite" style, never red. Retry allowed; a **Review what you missed** list at the end. Results saved locally. **No scores that imply certification.**

## 9. Cheat sheet and polish (P5)
- Printable `modules/NN-…/cheatsheet.html`: each concept's key idea, formula and one example, with a print stylesheet.
- An inline SVG icon set (no icon fonts, no CDN), a simple SVG motif per module header, helpful empty states, favicon, and page titles and descriptions for sharing.

## 10. Norman principles applied
| Principle | How it shows up |
|---|---|
| Visibility of system status | Progress rings, current-concept highlight, visited vs complete |
| Recognition over recall | The persistent outline, search, breadcrumb |
| Signifiers | Chevrons on accordions, visible Search button, "Coming soon" labels |
| Constraints | Soft prerequisites, validated import, clear disabled states |
| Error tolerance | Undo "Mark complete", retry quizzes, safe handling of bad storage |
| Consistency | One lesson template and one component set for every module |

## 11. Quality bars
- Keyboard-only pass over the outline, accordions, search dialog and Mark complete, using real key presses.
- Screenshots at 375, 768 and 1280px: no overlap, clipping or sideways scroll.
- Audit against the downloaded `docs/web-interface-guidelines.md`.
- Report each page's HTML and JS size and flag anything unusually large. Run Lighthouse only if it can be run locally; ask before installing anything.
- Tests: progress store, `check-course`, search index, plus the existing math and glossary tests.

## 12. Session plan
- **Session A:** `course.json`, progress store and tests, shell (header, outline, footer), lesson template, course home. Retrofit Module 0 only, as the proof.
- **Session B:** retrofit Module 1; add accordions, on-this-page, Mark complete, Resume, Previous/Next.
- **Session C:** search, quizzes for Modules 0 and 1, cheat sheets, prerequisite map, polish.
- After each session: push, open the live Pages URL, and test on a real phone.
- **Additions to `DESIGN.md`** (do these in Session A): progress ring colours (use `--ok` for complete, `--c-blue` for visited, `--muted` for not started), accordion and chevron style, outline row states, dialog and search styles, key-takeaways box style.
