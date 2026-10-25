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
| `--line-strong` | `#7D7565` | input and control borders (must be at least 3:1 against its background) | 4.05:1 on bone, 4.30:1 on paper (computed) |

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
- Desktop (900px and up): persistent left rail (`--rail-w`: `clamp(260px, 24vw, 340px)`) with the course outline, on every page including the home page. The content column is at least 640px wide while the rail shows (at 900px: 260px rail, 640px content). One **Outline** button in the header works at every width: an icon plus the text "Outline" from 900px, icon only below, always at least 44px square. It carries `aria-expanded`, and its accessible name switches between **Hide outline** and **Show outline**. On wide screens it shows or hides the rail (content reflows and centres in the full width, the hidden rail leaves the tab order, focus stays on the button) and the choice is saved in `localStorage` under `mlmath:ui:v1`, separate from progress. Below 900px it opens and closes the drawer (Esc closes it and returns focus to the button). The header, with this button, ships in each page's static HTML at its final size, so nothing moves when scripts run.
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
- Breakpoints: 480, 768, 900px.
- Touch targets at least 44px. Visible 3px burgundy focus ring on everything focusable.
- **One exception, pointer-only:** the outline rail's concept rows (and the module switcher's rows) are 40px high when the screen is 900px or wider *and* the primary pointer is fine (`(min-width: 900px) and (hover: hover) and (pointer: fine)`). Every touch device, and the phone drawer, gets 44px. `tools/ui-verify.mjs` applies the same rule and also checks the 44px rows with a touch context at 900 and above.
- Everything operable by keyboard. Popovers use proper roles; Esc closes them; focus returns to the trigger.
- Wide tables and equations scroll inside their own container. The page body never scrolls sideways.
- Every diagram has a text description or `aria-label` summarising what it shows.

## 9. Do and don't
**Do:** one idea per section, plenty of whitespace, labels next to the things they describe, consistent colours per concept across the whole site, one primary action per screen (one filled button; everything else is a secondary button or a plain link).
**Don't:** squash controls against diagrams, use red for wrong answers, rely on colour alone, autoplay, stack more than one animation, put long text in all caps, use decorative motion.

## 10. Course shell and learning components (added in Session A; see `docs/LEARNING-UX.md`)
Contrast ratios below were computed with the WCAG 2 formula against `--paper` (the rail and cards).

**Progress states** (icon shape *and* colour *and* text, never colour alone). Contrast is computed against `--paper` with the WCAG 2 formula and must be at least 3:1 for icons (`tests/state-icons.test.mjs` enforces it).
| State | Icon (own silhouette) | Colour | On paper | Name |
|---|---|---|---|---|
| Not started | empty ring | `--muted` | 7.10:1 | "Not started" |
| In progress | ring with the right half filled | `--c-blue` | 6.15:1 | "In progress" |
| Complete | filled disc with a tick | `--ok` | 6.01:1 | "Complete" |
| Revisit | open arc with an arrowhead (a "go round again" arrow) | `--try` | 5.57:1 | "Revisit" |

- **Meaning:** Opening a card promotes only Not started to In progress (heading in the top 30% of the viewport, or in view about 2 seconds). Complete and Revisit are set by the learner only, from the outline menu or the lesson control, and either can be changed to any state. **Revisit does not count toward complete** ("n of 14 complete" counts Complete only).
- **Progress ring**: 24px, 3px stroke. Track `--rule` (decorative; the "n of m" text carries the meaning), arc `--ok`, starting at 12 o'clock. Always paired with text such as "3 of 10".

**Accordion and chevron** (native `<details>`/`<summary>`)
- Summary row at least 44px high, hover tint `rgba(20,33,61,.06)`, 3px burgundy focus ring. No browser marker.
- Chevron is a 10px corner drawn with borders in the text colour, pointing right when closed and down when open (a 90° turn, 180ms ease-out; none under reduced motion).
- Open state is remembered per module. In print, every section opens.

**Outline rows** (left rail from 900px, drawer below)
- Under the "Course outline" heading, a **legend** lists the four states with their icons: Not started, In progress, Complete, Revisit.
- Module row: chevron, module number (JetBrains Mono, burgundy; read as "Module n:" by screen readers), title (Inter 600), ring and "n of m" below the title. Planned modules are numbered too.
- The **current module is open and the others are collapsed**. A learner's own opening of another module is remembered on `mlmath:ui:v1` (`outlineOpen`), never in the progress store; the current module always opens on load. The current concept is scrolled into view inside the outline (the outline scrolls, not the page).
- Concept row: **44px high in the phone drawer and on touch devices, 40px in the rail for a fine pointer on a screen 900px or wider** (the exception in section 8), status button, then the title link (wraps to two lines when the rail is narrow). Hover tint `rgba(20,33,61,.06)`.
- **Status button**: its own `<button>` beside the link, never inside it; the full row height and 44px wide (40px for the fine-pointer exception). Accessible name "Status: In progress. Change status." (it does not repeat the concept title; `aria-describedby` points at the row's link so a screen reader still says which concept). `aria-haspopup="menu"`, `aria-expanded`. Only rows of the open module are rendered, so only they are in the tab order.
- **Status menu** (one shared element): `role="menu"` of four `menuitemradio` items, 44px each, with the current one checked. Opens on click, Enter, Space, ArrowDown or ArrowUp; arrows wrap, Home and End jump, Enter or Space chooses and focus returns to the button; Esc closes and returns focus; Tab closes it and focus carries on to the row's link. It also closes when its row is removed, its module collapses, the outline scrolls or the window resizes. Panel style as the popover (`--paper`, 1px `--line-strong`, 12px radius, popover shadow). A 150ms fade, **none under reduced motion**.
- **Current**: tint `rgba(122,31,61,.08)`, 3px burgundy bar on the left, weight 600, `aria-current="page"` (navy text 13.14:1 on the tint).
- **Disabled / planned**: `--muted` text, `cursor: not-allowed`, no link, plus a "Coming soon" pill (1px `--line-strong` border, 999px radius). Planned modules sit in the outline as plain rows, not dead links.

**Key takeaways box**: `--paper` fill, 1px `--line-strong` border, 4px `--burgundy` left border, 12px radius, 16px / 24px padding. Title Inter 600 at 1.0625rem. Three or four short lines.
**Outcomes box** ("By the end of this card you’ll be able to…"): `--info-tint` fill, 4px `--c-blue` left border, same radius and padding.

**Lesson end**: a **status control** (`<fieldset>` with the legend "Your progress on this card") of four radio options laid out as pills with the state icon and name (2 per row on a phone, 44px high). Arrow keys move the choice and each move is a change. Below it sits the card's **one primary action**, a filled burgundy pill: **Mark complete and continue** (sets Complete and goes to the next concept; focus lands on the next card's heading, which is cleared of the sticky bars). On a concept that is already Complete it reads **Continue to <next title>** and only navigates; on the last available concept it reads **Mark complete**, and it is hidden when that concept is already Complete. A polite status line says what happened ("Marked complete.") with an **Undo** secondary button. The control is built eagerly, never inside a lazy widget placeholder. **Previous** and **Up next** are white 12px-radius cards with a small label and the concept title (and minutes for Up next).

**One primary action per screen**: on a lesson page the only filled button is Mark complete and continue (`tools/ui-verify.mjs` steps down every page and flags more than one filled button in view). Check my answer, Next step and Next entry, Back, Hint, Show a model answer and the rest are **secondary buttons**: transparent with a 1px `--burgundy` border, burgundy text, a hover tint `rgba(122,31,61,.08)` and a 3px focus ring, at least 44px high. A pressed toggle (Highlight all terms) fills as a state, not as an action.

**Toast** (undo after Mark complete and continue): fixed at the bottom centre, `--paper` fill, 1px `--line-strong` border, 12px radius, popover shadow. The message is announced through an always-present polite live region (`role="status"`), the toast never takes focus, it stays 12 seconds (never under 10), the countdown stops while the pointer or keyboard focus is on it, and Esc or Dismiss closes it. **Undo** restores the previous status only if the concept has not been changed since (here or in another tab); otherwise it says so. When the next concept is on another page the pending undo travels in `sessionStorage` (`mlmath:continue:v1`) and is forgotten after about 60 seconds or once shown.

**On this page** (both module pages): a `<nav aria-label="On this page">` listing the current card's seven stages and Teach it, with the current one marked `aria-current="location"` (scrollspy). From **1200px** it sits **beside the content**: a second grid column 208px wide, sticky, centred together with the content so there is no empty gap (the content column stays at least 640px with the rail shown). Below 1200px it is a **sticky bar** (45px, under the 61px header) showing the current card and stage; a button opens the list (Esc closes and returns focus; choosing an item closes it). The bar slides away while reading down and returns on any scroll up or when it holds focus; a jump (link, hash) never hides it. **Two sticky bars** make 106px, so every element has `scroll-margin-top: var(--sticky-total)` (the bars plus 16px); the bars, the outline and popups are exempt so focusing them does not scroll the page.

**Module switcher** (first thing in the "On this page" panel, beside the content from 1200px and in the opened bar below it): a secondary button named "Module › Card" (for example "Foundations › Equations") with a chevron, `aria-expanded` and `aria-controls`. It opens **inline** (no floating popup) to a list of every module from `course.json`, scrolling inside itself when long (`max-height: min(60vh, 420px)`). Each module row is a **link** to its first built concept plus, as a sibling and never inside the link, a 44px chevron **toggle** (`aria-expanded`, `aria-controls`, named "Concepts in <module>") that shows or hides its concepts. The current module starts open with its current concept `aria-current="true"`; the others start collapsed. A module with no built concepts, or a planned one, is a plain row with a "Coming soon" pill and no link. Status icons are display-only (`aria-hidden`; the status is in screen-reader text). Rows are 44px, and 40px for a fine pointer from 900px (the section 8 exception). Esc closes the switcher and returns focus to its button (the next Esc closes the bar list); Tab is never trapped. Choosing a concept or module navigates, and the panel then shows that card's stages.

**Page tools**: under the module introduction, **Expand all** and **Collapse all** (secondary buttons) open or close every Teach it panel and symbol list on the page and say how many in a polite status line. The open state is remembered on `mlmath:ui:v1` under `sectionsOpen`, and only the learner's own toggles are saved. Answer reveals (`details.reveal`) are answer gates: Expand all skips them and they are never remembered. A link to an anchor inside a closed section opens it, and opening any section mounts the lazy widgets inside it. In print everything opens and the navigation is hidden.

**Notice bar**: `--try-tint` fill with a 1px `--try` bottom border, used for storage problems ("could not be read", "storage is blocked") and for progress saved by a newer version of the site (kept untouched, with a Reload button). Never red.

**Home progress**: under the Start / Resume button, "n of 14 complete" (Complete only). A **To revisit (m)** section lists Revisit concepts in course order as 44px rows with the revisit icon, the module name and minutes, with a one-line empty state.

**Dialog and search styles** (to be built in Session C)
- Panel: `--paper` fill, 1px `--line-strong` border, 12px radius, the popover shadow `0 8px 24px rgba(20,33,61,.14)`, width `min(640px, 100vw - 32px)`, placed in the upper third. Backdrop `rgba(20,33,61,.4)`.
- Input: 44px high, 8px radius, label or `aria-label`, placeholder ending in "…". Results: group labels in 0.875rem `--muted`, rows 44px high, active row uses the outline "current" style.
- Focus is trapped inside; Esc closes; focus returns to the opener; `overscroll-behavior: contain`. At most a 150ms fade, none under reduced motion.

**Header**: height 61px (`--topbar-h`), holding the Outline toggle (section 4), the brand link (44px high), overall progress (ring and "n of m complete", text hidden below 768px, link at least 44px wide) and the Highlight terms toggle (shortened to "Terms" below 480px). Shipped in the static HTML of every page.

**Symbols in equations**: KaTeX draws symbols in an `aria-hidden` layer, so they are pointer-only (hover or tap opens the popover; no tab stop, no role). Under each display equation that has symbols sits a collapsed `<details>` "Symbols in this equation" listing each symbol as a real button that opens the same popover; symbols inside inline maths are listed under their paragraph ("Symbols in this paragraph"). **When the paragraph just before an equation also has symbols, the two lists become one disclosure, "Symbols", placed after the equation** (paragraph symbols first), so a paragraph-and-equation pair carries one 44px row, not two. Equations without symbols get no list. A display equation that scrolls sideways becomes a focusable region (`tabindex="0"`, `role="region"`, a unique `aria-label` such as "Equation 3, scrolls sideways"); one that fits is plain content.

**Landmarks**: one breadcrumb per page (in the module hero). The outcomes and takeaways boxes are plain headed blocks, not landmarks. Each per-card pager is named with its concept ("Previous and next concept for Equations").

**Drawing text**: 14.5px in the drawing's own units, scaled up by `--ts` when the drawing is squeezed, so rendered text is never under 14px.

## Prompt for Claude Code
"Build this page following DESIGN.md. Use the tokens exactly. Check screenshots at 375, 768 and 1280px for overlap before calling it done."
