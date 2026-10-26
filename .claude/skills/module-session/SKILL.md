---
name: module-session
description: Build a whole module of the ML Math site in one session, from plan to checkpointed commits, following CLAUDE.md. Use when the user asks to build, extend or polish a module, or says "start module N".
---

# Module session

Build every concept that `docs/CURRICULUM.md` lists for the module, in one session. The user is on a limited plan: read only the files you need, keep replies short, never recap a file already read. Do not push, install packages or run network commands without asking. Never touch git config or history (no rebase, amend, reset, force).

## 0. Resume (when the session starts on a half-built module)
1. `git status` and `git log --oneline -10`: find the last `Module N:` checkpoint commit and any uncommitted work.
2. Compare `docs/CURRICULUM.md` and `data/course.json` with the pages on disk: which concepts have a page, which have tests, which have CLAIMS lines.
3. Run `node tools/verify.mjs --fast`. Fix what it reports before adding anything.
4. Tell the user in three lines where things stand, then continue at the first missing item. Do not redo finished cards.

## 1. Read
`docs/CURRICULUM.md` first. Then, only when the work touches them: `DESIGN.md`, `docs/CONCEPT-CARD.md`, `docs/GLOSSARY.md`, `docs/LEARNING-UX.md`, `docs/CLAIMS.md`.

## 2. Plan, then wait
Reply with a concept table and stop for the user's OK. Build nothing first.

| Page (slug) | Size (full or compact) | Widget (or none) | Claims (the "In an LLM" claim, source or "conceptual") |
|---|---|---|---|

Under the table list: the checkpoints (four or five, each a commit), the maths code and tests to write, glossary terms to add, and anything in CURRICULUM that looks wrong or missing. Say what you are unsure of.

## 3. Build
- **Maths first, tests first.** Write each piece of maths code and its test in `tests/` before the page that uses it. Every number on a page or in a widget comes from tested code; never type a result by hand.
- **One card at a time** with the `new-concept-card` skill. Seven stages for every card, compact or full. Follow `DESIGN.md`; widgets are keyboard-operable and labelled.
- **Links point backwards only.** A card may say "builds on" an earlier concept. It never previews, names or links a later concept, and the page shows no "Up next". Its only forward action is the single primary button.
- **"In an LLM".** Every claim is from publicly documented knowledge with a source, or is labelled conceptual. No insider claims about any company's systems. Add a CLAIMS line for each in `docs/CLAIMS.md` in its format `page · claim · basis`, where the basis is a source, "conceptual", or `Test: <function>` for a computed number.
- **Glossary.** Every technical term has an entry in `data/glossary.json`, plain and mathematical definitions, with no circular definitions (a term is never defined using itself, or in a loop of two or three terms). Run the check.
- **Wiring the module in.** Do these once, at the early course.json checkpoint below:
  - add the module's concepts to `data/course.json` (path, size, minutes, objectives, takeaways, status);
  - update the previous module's last concept so Continue goes to this module's overview, and the Continue-flow tests with it;
  - add the home page card and check the progress totals. Totals are derived from `course.json`; never type them;
  - add the module overview page and its Start or Continue wiring.

## 4. Checkpoints and verification
Four or five checkpoints (for example: wiring and course.json; first third of the cards; second third; last cards and module polish; final audit). At each, commit as `Module N: <summary>` and do not push. End commit messages with the attribution lines in the session's system reminder.

| When | Run |
|---|---|
| After every change | `node tools/verify.mjs --fast` |
| Early checkpoint, right after editing `data/course.json` | `node tools/verify.mjs --full`, straight away |
| Each later checkpoint | `node tools/verify.mjs --changed` (it escalates to full by itself when a shared file changed or the marker is stale) |
| Last step | `node tools/verify.mjs --full --timings` once, then `node tools/ui-verify.mjs` output reviewed by the `ui-reviewer` agent, a keyboard-only pass over popovers, sliders and collapsibles, and the `web-design-guidelines` skill on the files changed |

Anything FAIL, or a browser step that is SKIPPED, counts as a failure. Fix each real finding and re-run; stop after two fix rounds and list what is still open. Never loosen an allow-list or a budget to make a check pass; if a check looks wrong, say so and let the user decide. If `ui-reviewer` cannot view images, say so and treat visual judgement as unverified.

Finally tick the module in `docs/CURRICULUM.md` and commit.

## 5. Definition of done
Every concept in CURRICULUM has its card with all seven stages, Real life, Spot it and In an LLM; every number comes from tested code written tests-first; CLAIMS lines exist; the glossary check passes; the previous module continues into this one; the home card and totals are right; `--full` passes on a clean tree; the module is ticked and committed.

## 6. Final report
Use exactly these four headings.
- **Built:** files, concepts and widgets. For each card give its objectives, its takeaways and the new CLAIMS lines (quote them).
- **Verified:** commands run and what each showed (counts, widths, pages, timings). Say what each check does not cover.
- **Not verified:** anything skipped, not run, or outside the checks (axe-core, real devices, live site, screen readers).
- **Decisions:** choices made, anything the user must decide, conflicts between instructions.
