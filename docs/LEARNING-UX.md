# LEARNING-UX.md: making the site feel like a learning platform

Goal: the site should feel like a professional course (Coursera, edX, Khan Academy), not a set of web pages. This file lists the patterns to build, scoped to what a **static GitHub Pages site** can do. `DESIGN.md` still governs colours, type and spacing; this file governs structure and behaviour. Read both before touching the shell.

**Out of scope (cannot be done on a static site):** accounts, progress that syncs across devices, video hosting, graded certificates, forums and comments. Progress lives in the browser only, so offer **Export / Import progress** (a JSON file) as the cross-device workaround.

## Priorities (cut from the bottom if usage is tight)
- **P1:** `data/course.json`, progress store, outline with progress, lesson template, status control, Resume, accordions
- **P2:** course home page, Previous / Up next, "On this page" mini-nav
- **P3:** search (Cmd/Ctrl+K)
- **P4:** end-of-module quizzes
- **P5:** printable cheat sheets, prerequisite map, illustration and polish pass

## 1. One source of truth: `data/course.json`
Everything structural reads from it: home page, outline, Previous/Next, search index, progress totals.
```json
{
  "modules": [{
    "id": "m01", "title": "Linear algebra", "path": "modules/01-linear-algebra/",   // the module's overview page
    "status": "built",            // "built" | "planned"
    "summary": "…", "minutes": 90, "prerequisites": ["m00"],
    "outcomes": ["Multiply a matrix by a vector and explain what it does to space"],
    "concepts": [{ "id": "m01-vectors", "title": "Vectors", "anchor": "concept-vectors",
                   "path": "modules/01-linear-algebra/vectors/",   // the concept's own page
                   "size": "full", "minutes": 12,
                   "objectives": ["…", "…"] }]
  }]
}
```
- Concept ids are stable and never reused. Planned modules show as "Coming soon", visibly disabled, with a short note (a clear signifier, not a dead link).
- `tools/check-course.mjs` fails if ids repeat, a built concept's page (`path`) or card is missing or a page holds more than one card, an overview lists a planned concept or omits a built one, an overview's old-link map differs from `course.json`, a Continue target page does not exist, or the Previous/Continue chain breaks.

## 2. Progress store (`assets/js/progress.mjs`)
- `localStorage` key `mlmath:progress:v1`, always inside try/catch. It works when storage is empty, blocked or corrupted (reset to empty and say so).
- Shape (inner `v: 2`): `{ v, concepts: { "<id>": { status, statusAt: ISO } }, last: { id, at }, open: { "<id>": true }, quiz: {…} }`. `status` is `not-started`, `in-progress`, `complete` or `revisit`. A concept the learner set back to Not started keeps its record, so a merge can tell that apart from "never touched".
- **Rules:** opening a concept promotes only Not started to In progress. Complete and Revisit are set by the learner only. Revisit does not count toward complete. Never auto-complete.
- **Migration** (on load and on import): old `{ visited, done }` records become `complete` (at `done`) or `in-progress` (at `visited`).
- **Several tabs:** every change first re-reads storage and merges per concept by the **latest `statusAt`** (a tie goes to the stored copy), then writes. A `storage` event merges and repaints. A learner's own change is stamped at least 1 ms after the concept's saved time, so it wins even if the clock was set back.
- **Newer data:** if storage holds data with a higher `v` than this code knows, it is kept byte for byte and never written to; the page works in memory and shows a "reload to update" notice. (A tab still running the *previous* release cannot be changed after the fact: it treats `v: 2` as unreadable and may reset it. A reload fixes that tab.)
- Functions: `markOpened`, `setStatus` (returns `{ previous }`), `undo`, `status`, `resume()`, `revisitList()`, `moduleProgress(id)`, `courseProgress()`, `exportJSON()` (file version 2), `importJSON()` (accepts file versions 1 and 2; refuses anything else, including newer files, and leaves progress unchanged).
- **Resume:** the last-touched concept if it is In progress, else the most recently changed In-progress one, else the next Not started concept after the last-touched one (wrapping), else "all done" (Revisit concepts are listed on the home page, not resumed).
- Unit tests (`tests/progress.test.mjs`) use an injectable clock and cover: blocked storage, corrupted JSON, unknown ids, all 16 transitions, undo, v1 migration, two stores with timestamps, the storage event, newer-version data, export and import (old, new, bad).

## 2a. Page structure (Session S1: one thing at a time)
- **Each concept is its own page** at `modules/NN-slug/<concept-slug>/index.html` (slug = the concept id without `mNN-`). It holds that concept only: no other concept's content, no "Up next" title, no list of upcoming concepts. Concept ids, anchors (`concept-x`), glossary terms and content are unchanged.
- **Each module has an overview page** at `modules/NN-slug/index.html`: title, lede, estimated time, outcomes, module progress, one Start / Continue / Review button and the list of its BUILT concepts with status icons. Planned concepts are not listed (the home page still shows every module, planned ones as "Coming soon"). Start goes to the first concept; Continue to the first concept that is not complete (Revisit counts as not complete); Review from the start when all are complete.
- **Choosing a module anywhere** (outline, panel switcher, home card) goes to its overview. **Choosing a concept anywhere** goes straight to its page.
- **Where Continue goes** (`continueTarget` in `assets/js/course.mjs`): next concept page; after the last concept of a module the next built module's overview; after the last concept of the course so far there is no Continue: the button reads "Mark complete" and a "Back to course home" link sits beside it.
- **Generated, not hand-edited:** `node tools/split-modules.mjs` wrote these pages from the old long module pages (git revision `fbf615d`, read locally). Edit the pages directly from now on; `tests/split-preservation.test.mjs` shows the split lost no text (and is mutation-tested). Where the old hero's text went: the Module 1 "2D only" callout is on the Vectors page; the lede stays on the overview; the "dotted underline" sentence and the Expand/Collapse note moved to the home page's "How to use this site" line and the first-visit hint (`assets/js/first-hint.js`, dismissal remembered as `hintDismissed` on `mlmath:ui:v1`).
- **Old links:** each overview embeds a map (`<script type="application/json" id="old-links">`) and loads `assets/js/old-links.mjs`, which sends `#concept-x` and `#concept-x-<stage>` to the concept page (stage hash kept). Tested in `tests/old-links.test.mjs` and `tests/e2e/redirects.mjs`.
- **Opened = visible for about 2 seconds.** A concept page promotes only Not started to In progress after it has been visible for about 2 seconds (the clock stops while the tab is hidden; `createDwell` in `assets/js/continue-math.mjs`). Complete and Revisit are never changed. Focus is not scripted on load; the skip link jumps to `main`.
- **Page changes fade** (DESIGN.md section 7); progress, status menus and the undo toast work across pages (the undo of "Mark complete and continue" travels in `sessionStorage` for about a minute and is shown on the next page, concept or overview).

## 3. Shell: header, outline, footer
Injected by `assets/js/shell.mjs` from `course.json` so there is no duplicated markup. A `<noscript>` message and a plain fallback link list keep the page usable if scripts fail.
- **Header:** site name (links to course home), Search button (visible, not shortcut-only), overall progress, Menu. The "Highlight all terms" toggle moves into a consistent place here.
- **Course outline (left rail on desktop, drawer on phones):** modules collapse and expand; each concept row is a **status button** (its own control, never nested in the link) showing not started, in progress, complete or revisit as a distinct icon shape, colour *and* accessible text, which opens a four-option menu (arrows, Esc, Tab; focus returns to the button); only the open module's rows are in the tab order (a module row is a chevron button plus a link to the module overview; only the current module starts open, and other modules opened by hand are not remembered); the current concept has `aria-current="page"`; each module shows a small progress ring. `<nav aria-label="Course outline">`.
- **Footer:** sources and further reading, how to use the site, accessibility notes, licences. No personal information.
- A **skip-to-content** link is first in tab order.

## 4. Lesson template (every concept page section)
1. Breadcrumb: Course › Module › Concept.
2. Title, then meta: estimated minutes, level, prerequisites (soft signposts that link to the earlier concept, never locks).
3. **"By the end of this card you'll be able to…"** box: two or three verifiable outcomes (use verbs like compute, explain, identify).
4. The seven Concept Card stages (see `docs/CONCEPT-CARD.md`).
5. **Key takeaways** box: three or four lines.
6. Teach it panel.
7. The four-option **status control** (Not started, In progress, Complete, Revisit, with Undo) and the one primary button, **Mark complete and continue** (**Continue** when already Complete; on the last concept of the course **Mark complete** plus a "Back to course home" link), then **Previous** with the previous concept's title. Nothing names or links to the next concept except that button.
- **"On this page" mini-nav:** the stage list of this one concept, with the current stage marked as you scroll (a throttled scroll listener and a tested pure picker, `assets/js/page-nav-math.mjs`), plus the module switcher. Beside the content from 1200px, a collapsible sticky bar below that (its label names only the current stage). Anchors clear both sticky bars (`scroll-margin-top`).
- **Mark complete and continue:** the one primary action on a concept page. It sets Complete, goes to the next page (next concept, or the next module's overview) and offers Undo in a toast (`assets/js/toast.mjs`, timing in `assets/js/continue-math.mjs`).

## 5. Collapsibles and accordions
- Per page (one concept each). Use native `<details>`/`<summary>` for derivations, "go deeper", FAQs and the Teach it panel. One consistent chevron, a 44px minimum hit area, and a visible focus ring.
- **Expand all / Collapse all** per page (Teach it panels and symbol lists; predict-then-reveal answers are excluded and never remembered). Open state is remembered on `mlmath:ui:v1` (`sectionsOpen`). A link to an anchor inside a closed section opens it, and opening a section mounts the lazy widgets inside it. In print, everything opens.
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
| Visibility of system status | Progress rings, current-concept highlight, the four progress states |
| Recognition over recall | The persistent outline, search, breadcrumb |
| Signifiers | Chevrons on accordions, visible Search button, "Coming soon" labels |
| Constraints | Soft prerequisites, validated import, clear disabled states |
| Error tolerance | Undo of a status change, retry quizzes, safe handling of bad storage |
| Consistency | One lesson template and one component set for every module |

## 11. Quality bars
- Keyboard-only pass over the outline, accordions, search dialog and the status menu and status control, using real key presses.
- Screenshots at 375, 768 and 1280px: no overlap, clipping or sideways scroll.
- Audit against the downloaded `docs/web-interface-guidelines.md`.
- Report each page's HTML and JS size and flag anything unusually large. Run Lighthouse only if it can be run locally; ask before installing anything.
- Tests: progress store, `check-course`, search index, plus the existing math and glossary tests.

## 11a. Lazy widgets (added in polish session P2)
Every interactive widget mounts through one function, `mountWhenNeeded(el, mountFn)` in `assets/js/widgets.mjs`. **Session B (four-state progress) and every later module must use it; never call a widget's mount function directly.**
- `mountFn(el)` runs once, when `el` nears the viewport, when focus moves (the next and previous unmounted widget mount, so Tab never skips one), when the URL hash or a click on an in-page link names `el`, an ancestor or a descendant (mounted before the browser scrolls), on `beforeprint` and in print media, when a closed `<details>` that holds it opens (click, Expand all, a link to an anchor inside it), and when the placeholder is clicked. Calling it again for the same element does nothing.
- The host in the HTML is `<div data-widget="name">` and holds a static placeholder: the title and description as visible text (so find-in-page works), no focusable children, and a reserved height. `node tools/measure-widgets.mjs --write` mounts the real widget at every width, then writes the placeholder into the page and `assets/css/widget-reserve.css`. Run it after adding or changing any widget; `tests/e2e/widgets-lazy.mjs` fails on a stale placeholder or a layout shift.
- Steppers, predict, spot-it and explain-it blocks are cheap and stay eager.
- Anything Session B adds that is not part of a widget's own markup (progress controls, state icons) must not sit inside a pending placeholder.

## 12. Session plan
- **Session A:** `course.json`, progress store and tests, shell (header, outline, footer), lesson template, course home. Retrofit Module 0 only, as the proof.
- **Session B1:** the four-state progress model, outline status menu, lesson status control, home count and To revisit list.
- **Session B2:** Module 1 on the lesson template, On this page, Expand / Collapse all, Mark complete and continue with Undo.
- **Session S1:** one concept per page, a module overview page, page-change fade, old-link redirects (section 2a).
- **Session C:** search, quizzes for Modules 0 and 1, cheat sheets, prerequisite map, polish.
- After each session: push, open the live Pages URL, and test on a real phone.
- **Additions to `DESIGN.md`** (do these in Session A): progress ring colours (use `--ok` for complete, `--c-blue` for in progress, `--muted` for not started), accordion and chevron style, outline row states, dialog and search styles, key-takeaways box style.
