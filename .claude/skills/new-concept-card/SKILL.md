---
name: new-concept-card
description: Write one concept card (full or compact) for a module page, following the seven-stage template in docs/CONCEPT-CARD.md. Use when adding or rewriting a single concept inside a module session.
---

# New concept card

Read `docs/CONCEPT-CARD.md` (template and skeleton) and `docs/GLOSSARY.md` before writing. Use `DESIGN.md` for components. Start from meaning and a real or physical picture; never open with a bare formula. Nothing is too simple to explain.

## Steps
1. **Confirm the concept** in `docs/CURRICULUM.md` and `data/course.json` (id, anchor, size full or compact, minutes). The article id is the course.json `anchor` (for example `concept-vectors`).
2. **Maths code and tests first.** Any number shown (worked example, widget output, stepper) is computed by code in `assets/js/*-math.mjs` and covered by `tests/`. No hand-typed results.
3. **Write the article** with exactly these sections, in this order, using `data-stage`:
   `meaning`, `picture`, `real-life`, `worked-example`, `why-when`, `how-to-arrive`, `in-an-llm`.
   - `real-life`: three to five everyday scenarios, a recognition rule, and a `.spot-it` exercise.
   - `picture`: a widget with the drawing on top and controls below (see DESIGN.md); keyboard-operable and labelled; describe the diagram in text or `aria-label`.
   - `how-to-arrive`: a guided "reinvent it" sequence with predict-then-reveal, tagged with one `.badge`: Derived, Motivated, Convention or Design choice.
   - `in-an-llm`: state the link precisely from publicly documented work and say what is simplified. If the link is only conceptual, say so. Never claim insider knowledge of any company's systems.
   - Full cards end with a `details.teach-it` panel; every card ends with a `<footer>` citing MML chapter numbers (no copied text or figures).
4. **Glossary.** Mark every technical term and symbol with `data-term` / `data-sym`; add missing entries to `data/glossary.json` (plain-language and mathematical definitions).
5. **Course data.** Set the concept's status in `data/course.json` to built only when the card is complete.
6. **Check the card**, not the whole site: `node --test tests/*.test.mjs`, `node tools/check-glossary.mjs`, `node tools/check-claims.mjs`, then `node tools/ui-verify.mjs --pages <module id> --checks structure,glossary-ids,hscroll,overlap`. Fix and re-run. The full verify belongs to the end of the module session.

## Do not
- Skip a stage, or merge two stages into one.
- Use red for wrong answers (amber "not quite").
- Autoplay anything; one animation at a time; respect reduced motion.
