---
name: module-session
description: Run one module (or half a module) of the ML Math site from plan to commit, following CLAUDE.md. Use when the user asks to build, extend or polish a module, or says "start module N".
---

# Module session

One module (or half a module) per session. The user is on a limited plan: read only the files you need and keep replies short.

## Steps
1. **Read** `docs/CURRICULUM.md` for the module's concepts and status. Read `DESIGN.md`, `docs/CONCEPT-CARD.md`, `docs/GLOSSARY.md` and `docs/LEARNING-UX.md` only when the work touches them.
2. **Plan, then wait.** List the concepts and widgets (full or compact card for each). Stop and wait for the user's OK. Do not build before it.
3. **Maths first.** Write the maths code and its tests (`tests/*.test.mjs`) before any page. Every number on a page or in a widget comes from tested code; never type results by hand.
4. **Build the page(s)**, one concept at a time. For each concept use the `new-concept-card` skill. Follow DESIGN.md; every technical term goes through the glossary.
5. **Verify (once per module, last step):**
   1. `node tools/verify.mjs` (unit tests, course check, glossary check, claims lint, e2e nav test, email check). Anything FAIL, or an e2e step that is SKIPPED, counts as a failure. An email step reported as "skipped" because `NOREPLY_EMAIL` is unset is reported, not hidden.
   2. `node tools/ui-verify.mjs` (writes `reports/report.md`, `reports/results.json` and screenshots). If `AXE_PATH` is set it also runs axe-core; if not, say it was not run.
   3. Run the `ui-reviewer` agent on the report and screenshots. It must start with an image check; if it says it cannot view images, tell the user and treat all visual judgement as unverified.
   4. Keyboard-only pass over popovers, sliders and collapsibles, and the `web-design-guidelines` skill on the files changed.
6. **Fix and re-run.** Fix each real finding, then re-run steps 5.1 to 5.3. Stop after two fix rounds. Anything still open is listed in the final report, not hidden. Never loosen an allow-list or a budget just to make a check pass; if a check seems wrong, say so and let the user decide.
7. **Commit** as `Module N: <summary>` and tick the module in `docs/CURRICULUM.md`. Do not push, install packages or run network commands without asking.

## Final report format
- **Built:** what now exists (files, concepts, widgets).
- **Verified:** exactly what was run and what it showed (commands, counts, widths, pages). Say what each check does *not* cover.
- **Not verified:** anything skipped, not run, or outside the checks (axe-core, real devices, live site, screen readers).
- **Decisions:** choices made, anything the user must decide, and conflicts between instructions.
