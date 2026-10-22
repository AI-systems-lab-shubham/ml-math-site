# Glossary system

One source of truth: `data/glossary.json`. Pages reference terms by id. A term has the same definition everywhere.

## Entry schema
```json
{
  "id": "dot-product",
  "term": "dot product",
  "aliases": ["inner product (for vectors)", "scalar product"],
  "kind": "math",
  "plain": "A single number that says how much two arrows point the same way: large when they align, zero when they are perpendicular.",
  "math": "\\mathbf{a}\\cdot\\mathbf{b}=\\sum_i a_i b_i=\\|\\mathbf{a}\\|\\|\\mathbf{b}\\|\\cos\\theta",
  "llm": "Attention scores are dot products between query and key vectors.",
  "learnMore": "modules/02-analytic-geometry/#concept-dot-product",
  "uses": ["vector", "angle"],
  "looseUse": null
}
```
- `kind`: `math`, `ml` or `llm`.
- `plain`: one or two sentences, no jargon, with an everyday picture where one exists.
- `math`: the precise definition as LaTeX (KaTeX). Omit only for terms with no formal definition.
- `llm`: one line, only where it is true. Omit otherwise.
- `uses`: the other glossary ids that appear in this entry's text.
- `looseUse`: for terms the field uses loosely ("attention", "understanding", "reasoning"), a sentence saying so. Otherwise null.

## Authoring rules
- **No circular definitions.** Walking `uses` must never return to the starting term. `tools/check-glossary.mjs` fails the build if it does.
- A definition may only use terms taught in earlier modules (or in Module 0) or terms it links through `uses`.
- Every id referenced in a page exists in the glossary. Every glossary entry is referenced somewhere, or is flagged as a stub.
- Write each module's entries while writing the module. Expect roughly 300 to 400 entries across the site.

## Markup
```html
<span class="term" data-term="dot-product">dot product</span>
<span class="sym" data-sym="theta">θ</span>   <!-- symbol inside an equation -->
```
A small script (`assets/js/glossary.js`) reads `data/glossary.json`, renders the popover and handles symbols. No framework.

## Highlighting
- Default: highlight the **first use of each term in every section**, plus **every use inside formulas**.
- Each page has a **Highlight all terms** toggle at the top. The setting is remembered in `localStorage` (try/catch).
- Style: dotted burgundy underline. Nothing else changes about the text.

## Popover behaviour
Follows WCAG 1.4.13 (content on hover or focus must be dismissible, hoverable and persistent).
- **Desktop:** opens after about 250ms on hover or on keyboard focus. Stays open while the pointer is over the term or the popover. Esc closes it and returns focus to the term.
- **Touch:** tap to open, tap outside to close. Hover does not exist on phones.
- **Placement:** above or below depending on space. Never covers its own trigger. Max width about 360px.
- **Contents:** plain-language meaning, mathematical definition, optional "In an LLM" line, "Learn more" link.
- **Chained terms:** technical words inside a definition are also terms. Selecting one stacks a new popover with a Back arrow, so a learner can follow a definition down to its basics.
- The glossary engine links matching terms from an entry's `uses` list inline in its plain-language and LLM definitions; it also presents the full `uses` list as a fallback.
- **Accessibility:** the trigger is focusable (`tabindex="0"`), the popover has `role="dialog"` with a label, and the content is readable by screen readers.

## Symbols in equations
Each symbol in a displayed formula can carry `data-sym`. Hover or tap shows what it is (for θ: the angle between the two arrows). Its colour matches the part of the diagram it refers to (Norman's mapping principle).

For symbols in authored KaTeX expressions, wrap the symbol with KaTeX's `\htmlData{sym=id}{...}` command. The renderer trusts only this data-attribute extension and makes the marked symbol keyboard-operable.

## Check script (`tools/check-glossary.mjs`)
Fails if: an id is missing, a definition is circular, a `uses` id does not exist, `plain` is empty, or a `math` string fails to render in KaTeX.
