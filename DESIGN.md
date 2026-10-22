# DESIGN.md: ML Math Site

## 1. Visual theme
A well-made textbook that happens to be interactive. Warm bone paper, navy ink, one burgundy accent. Calm, spacious and legible, with diagrams carrying the colour. Clarity beats decoration (Norman). Original look, not a copy of any brand.

## 2. Colour (light theme is the default)
Contrast ratios were computed against the page background (WCAG 2 formula).

| Token | Hex | Use | Contrast on bone |
|---|---|---|---|
| `--bone` | `#F6F1E7` | page background | n/a |
| `--paper` | `#FBF8F1` | cards, panels | n/a |
| `--navy` | `#14213D` | body text, headings | 14.2:1 |
| `--burgundy` | `#7A1F3D` | links, glossary underline, primary buttons, focus ring | 8.9:1 |
| `--muted` | `#4A5568` | secondary text | 6.7:1 |
| `--rule` | `#D9D0BE` | decorative hairlines only | 1.4:1 (never carries meaning) |
| `--line-strong` | `#7D7565` | input and control borders (must be at least 3:1 against its background; verify) | verify |

**Concept colours** (diagrams and equation symbols; text-safe versions)
`--c-navy #14213D`, `--c-burgundy #7A1F3D`, `--c-teal #166A65` (5.7:1), `--c-blue #2F5F99` (5.8:1), `--c-ochre #8A5A12` (5.3:1). Ochre fills may use `#B7791F`, but never for text.

**Feedback**
- Correct: `--ok #276B4C` (5.7:1) on a pale green tint.
- Not quite: `--try #8A5A12` on a pale amber tint. Never red. A wrong answer is information, not punishment.
- Info: `--c-blue` on a pale blue tint.
- Colour is never the only signal. Pair it with an icon, label, line style or marker shape.

**Dark theme (phase 2, optional)**: bg `#0E1626`, text `#EDE6D8` (14.6:1), accent `#E58FA8` (7.6:1), muted `#A9B2C3` (8.5:1).

## 3. Typography
- Headings: **Fraunces**, weight 600. Body and UI: **Inter**. Formulas in prose, code and live numbers in widgets: **JetBrains Mono**. Maths: KaTeX (vendored fonts).
- Body 18px / 1.65. Reading measure max 68ch.
- Scale (ratio about 1.25): h1 `clamp(2.25rem, 5vw, 3.25rem)` / 1.1, h2 2rem, h3 1.5rem, h4 1.2rem. Nothing below 0.875rem.
- Inter was my pick for readability. Swap it if you prefer a serif body.

## 4. Spacing and layout
- 4px base: 4, 8, 12, 16, 24, 32, 48, 64, 96.
- Sections separated by 64px (48px on mobile). Card padding 24px (16px on mobile).
- Reading column 720px. Widgets and wide figures may use up to 1040px.
- Desktop (1100px and up): collapsible left rail (260px) with the module map. Below that: a top bar with a drawer.
- **Widget panel**: a fixed-aspect drawing area (`aspect-ratio: 16/10`, min-height 280px) with controls *below* it in a grid (`auto-fit, minmax(220px, 1fr)`). Controls never overlay the drawing. Every slider shows its label above and its live value beside it.

## 5. Components
- **Concept card**: seven numbered stages. The meaning, picture and "in an LLM" stages are visible. Derivations and extras sit in `<details>`.
- **Glossary term**: dotted burgundy underline. Popover on hover, focus or tap (spec in `docs/GLOSSARY.md`).
- **Provenance badge**: small pill, Derived (teal), Motivated (blue), Convention (ochre), each with an icon.
- **Predict-then-reveal**: input first, then a Reveal button. Feedback in plain language with a hint option.
- **Worked-example stepper**: Back and Next buttons, one step visible at a time, numbers from tested code.
- **"Teach it" panel**: 60-second script, an everyday analogy, a whiteboard sequence, and three questions learners usually ask.
- **Equation with coloured symbols**: each symbol has a hover or tap definition and matches its colour in the diagram (Norman's mapping).
- **Progress**: a quiet checklist per module saved in `localStorage`. Soft prerequisite signposts, never hard locks.

## 6. Depth
Flat. 1px borders, no card shadows. Only popovers elevate: `0 8px 24px rgba(20,33,61,.14)`. Radius: 12px cards, 8px inputs, 999px pills.

## 7. Motion
- 150 to 250ms ease-out for state changes.
- Animations are started by the learner (Play, Step, slider drag). Nothing autoplays.
- One animation moving at a time on screen.
- `prefers-reduced-motion`: replace animation with step buttons or instant changes.

## 8. Responsive and accessibility
- Breakpoints: 480, 768, 1100px.
- Touch targets at least 44px. Visible 3px burgundy focus ring on everything focusable.
- Everything operable by keyboard. Popovers use proper roles; Esc closes them; focus returns to the trigger.
- Wide tables and equations scroll inside their own container. The page body never scrolls sideways.
- Every diagram has a text description or `aria-label` summarising what it shows.

## 9. Do and don't
**Do:** one idea per section, plenty of whitespace, labels next to the things they describe, consistent colours per concept across the whole site.
**Don't:** squash controls against diagrams, use red for wrong answers, rely on colour alone, autoplay, stack more than one animation, put long text in all caps, use decorative motion.

## Prompt for Claude Code
"Build this page following DESIGN.md. Use the tokens exactly. Check screenshots at 375, 768 and 1280px for overlap before calling it done."
