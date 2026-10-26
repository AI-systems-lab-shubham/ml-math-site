# ML Math Site: project rules

## What this is
An interactive static website that teaches the maths behind machine learning and large language models to learners who know high-school maths. A learner should be able to follow alone, then teach the ideas to someone else. Curriculum order follows *Mathematics for Machine Learning* (Deisenroth, Faisal, Ong). Design and UX follow the principles in Don Norman's *The Design of Everyday Things*.

## Read on demand (do not load everything every session)
- `DESIGN.md`: visual system. Read before writing any HTML or CSS.
- `docs/CURRICULUM.md`: module order, concept lists, status. Read at session start.
- `docs/CONCEPT-CARD.md`: the template every concept follows. Read before writing lesson content.
- `docs/GLOSSARY.md`: glossary and popover spec. Read before adding terms.
- `docs/LEARNING-UX.md`: course shell, progress, lesson template and home page patterns. Read before touching the shell or any page chrome.

## Hard constraints
- Static site for GitHub Pages: plain HTML, CSS and JavaScript (ES modules are fine). No framework, no build step, no bundler, no runtime CDN.
- Vendor KaTeX and the fonts (Fraunces, Inter, JetBrains Mono, all open-licensed) in `/vendor` so the site works offline.
- Diagrams and animations are hand-written SVG or canvas. No chart libraries.
- Use relative paths only (GitHub Pages serves from `/<repo>/`).
- Progress is saved in `localStorage` inside try/catch. The site must work when storage is empty or blocked.
- Do not install packages, run network commands, or push to GitHub without asking me first.

## Folder layout
`index.html`, `modules/NN-slug/index.html` (module overview: outcomes, time, list of built concepts, Start/Continue), `modules/NN-slug/<concept-slug>/index.html` (one page per concept), `assets/css`, `assets/js`, `data/glossary.json`, `vendor/`, `tools/` (checks), `tests/` (Node tests for all maths code).

## Page structure (one thing at a time)
- A concept page shows only that concept: no other concept's content, no "Up next", no list of upcoming concepts. Its only forward action is the single filled primary button at the end (Mark complete and continue / Continue; on the last concept of the course, Mark complete plus a Back to course home link). "Builds on" and Previous look backwards only.
- A module overview shows only that module: title, outcomes, time, its BUILT concepts with status icons, Start or Continue. Never list planned concepts there. Choosing a module goes to its overview; choosing a concept goes straight to its page. The home page shows every module (planned ones "Coming soon").
- Every concept has `path` in `data/course.json`; `check-course` verifies the page exists and the Continue chain. Add a concept by writing its page directly (the split tool was a one-off for Modules 0 and 1; see `docs/LEARNING-UX.md` section 2a). Run the module's widgets through `tools/measure-widgets.mjs --write` as before.
- Moving between pages is a ~200ms cross-fade of the content only (`site.css`, no animation under reduced motion).

## Non-negotiable quality rules
**Teaching**
- Every concept follows the seven-stage Concept Card. Nothing is too simple to explain (even x + y = 4).
- Start from meaning and a real or physical picture, then give the notation. Never open with a bare formula.
- Every concept ends with an "In an LLM" connection. State it precisely, from publicly documented knowledge. If the link is only conceptual, say so. Never claim insider knowledge of any company's systems.
- Tag every "How to arrive at it" as Derived, Motivated or Convention.

**Accuracy**
- Every number shown (worked examples, widget outputs) must come from code covered by `tests/`. Do not hand-type results.
- State simplifications where they are made. Do not invent mechanisms to make a story work.
- Cite MML chapters by number as further reading. Do not copy text or figures from MML or any other book.

**Design**
- Follow `DESIGN.md`. One idea per section, generous space, nothing overlapping, one animation at a time, nothing autoplays, reduced motion respected.

**Glossary**
- Every technical term goes through the glossary system (plain-language and mathematical definition on hover or tap). First use per section is highlighted, plus every use inside formulas, plus a "Highlight all terms" toggle on each page.

## Workflow (I am on a Claude Pro plan with shared, limited usage)
1. One module (or half a module) per session. Read only the files you need.
2. Plan first: list the module's concepts and widgets, then wait for my OK before building.
3. Write the maths code and its tests first, then the page.
4. Verify once per module, not after every edit:
   - `node --test tests/*.test.mjs`
   - glossary check: `node tools/check-glossary.mjs`
   - Playwright screenshots at 375, 768 and 1280 px wide; look for overlap, clipping and horizontal scroll
   - keyboard-only pass over popovers, sliders and collapsibles
   - `node tests/e2e/structure.mjs` and `node tests/e2e/redirects.mjs` (page structure and old links)
   - `node tests/e2e/nav-reachable.mjs` (rail/Menu reachable at 375, 768, 899, 900, 1000, 1100 and 1280 px; exits non-zero, with a loud SKIPPED message, if Playwright is not importable)
   - run the `web-design-guidelines` skill on the files changed
5. Fix what you find, commit as `Module N: <summary>`, and tick the module in `docs/CURRICULUM.md`.
6. Keep replies short. No recaps of files already read.

## Check tools
- `node tools/verify.mjs`: three tiers; add `--timings` to print each step's time and `--plan` to print what would run.
  - `--fast` (unit tests, check-course, check-glossary, check-claims, check-fonts; no browser): after every change.
  - `--changed`: at each checkpoint. Diffs from the commit recorded in git-ignored `reports/last-full-pass` (written by a passing `--full` on a clean tree), plus uncommitted and untracked files, and prints the base it used. It selects the pages that load a changed file (following imports), runs the e2e tests that matter for them and `ui-verify` on those pages at 375, 900 and 1280 px. A core file (`site.css`, `shell.mjs`, `widgets.mjs`, the progress code, ...), a file no page loads, anything it cannot classify, `data/course.json`, `DESIGN.md`, `tools/**`, `tests/**`, or a missing or stale marker runs `--full` instead.
  - `--full` (the default): unit tests, course, glossary, claims, fonts, every e2e test, `ui-verify` at six widths and the email check, in one run (a SKIPPED e2e counts as a failure). Run it once before you push.
- `node tools/ui-verify.mjs`: per-page layout, keyboard, console, structure, glossary and motion checks at six widths, plus axe-core if `AXE_PATH` is set; writes `reports/` and exits non-zero on any finding. Pages come from `data/course.json` (home, each overview `mNN`, each concept page `mNN-slug`, 404). Use `--pages m00-slope,m01-*` and `--widths 375,900,1280` at checkpoints and the full run once at the end; `--jobs N` sets how many pages run at once. `node tools/measure-widgets.mjs` takes the same `--pages` and `--widths` (reports only; `--write` needs the full sweep).

## Definition of done for a module
- [ ] Every concept in CURRICULUM has its full or compact card
- [ ] Each has Real life, Spot it, and In an LLM
- [ ] Every term is in the glossary and the check passes
- [ ] Widgets are keyboard-operable and labelled
- [ ] Tests pass; screenshots at three widths are clean
- [ ] Audit run; findings fixed or listed
- [ ] Committed

## Tools available
Playwright CLI (`.claude/skills/playwright-cli`) for screenshots and browser checks. `web-design-guidelines` (`.claude/skills/web-design-guidelines`) for UI audits.
