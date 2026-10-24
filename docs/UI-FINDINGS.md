# UI findings (first `tools/ui-verify.mjs` run)

Run on the local copy of the repo, three built pages (home, Module 0, Module 1) at 375, 768, 900, 1100 and 1280px. Nothing in the site was changed in this session. Raw output: `reports/report.md` (git-ignored; regenerate with `node tools/ui-verify.mjs`).

**Result (first run, without axe):** 77 findings in 3 checks (layout shift 5, small text 14, tap target 58). **With axe-core 4.10.2 (second run, below): 132 findings, of which axe 55.** Clean: horizontal scroll, overlap, clipped text, console and network errors, glossary ids, seven-stage structure, Tab reach, focus rings, keyboard traps, Esc on popovers and the drawer, autoplay, reduced motion.

## Ranked

1. **Layout shift on load (Module 0 at 375, 768 and 900px: 0.234; Module 1 at 768px: 0.23; home at 375px: 0.144; budget 0.1).**
   - Evidence: the shift sources are the injected header actions (`.topbar-actions`) and content that scripts fill in: on Module 0 the concept card and a `p.muted`, on home two `.home-section` blocks, on Module 1 the `.progress-panel` text.
   - Cause: the header, outline and course data are built after `course.json` loads, and the static HTML is a different height.
   - Fix: ship the header and progress slot in the static HTML at their final size, reserve heights for script-filled blocks (`min-height`), and fill them without changing size. This is item 3 of the polish plan.

2. **Outline concept links are 40px tall (Module 0 and 1 at 900, 1100 and 1280px; 311 to 391px wide).**
   - Evidence: `.site-nav ul.sub a` rows measure 311x40 and 391x40.
   - Cause: DESIGN.md §10 says "44px high (40px in the rail)", which contradicts the 44px touch-target rule in §8. Tablets at 900px and wider are touch devices.
   - Fix: make the rail rows 44px, or decide that the rail is pointer-only and write that exception in DESIGN.md. Decision needed from you.

3. **Chart tick labels are 12 to 13.2px (SVG `text.tick-label`; 91 runs on Module 0, 45 on Module 1; 13.2px at 1280px, 12.0px at 375px as the SVG scales down; Module 1 also has `text.label` below 14px at 900 and 1100px).**
   - Evidence: measured at rendered size (font-size times the SVG scale).
   - Cause: `svg .tick-label { font-size: calc(12px * var(--ts, 1)) }` in site.css, against DESIGN.md "Nothing below 0.875rem".
   - Fix: raise the base to 14px and let `--ts` scale from there, or enlarge the viewBox text. Check axis crowding in the widgets afterwards.

4. **Brand link "ML Math" is 82x32px on every page and width.** Evidence: `a.brand`. Fix: `min-height: 44px; display: inline-flex; align-items: center` (its click area is the header text).

5. **Course-progress link is 40x44px at 375px.** Evidence: `a.topbar-progress` shows only the ring below 768px. Fix: `min-width: 44px`.

## Not found, with the limits of the check
- Overlap is measured between interactive elements at rest. It does not cover the open drawer, an open popover, or widgets in a changed state (sliders moved, stepper advanced).
- "Layout shift" is measured on load plus 600ms. Shifts caused by later interaction are not measured.
- Tap-target and overlap allow-lists (inline links, KaTeX symbols, fixed or sticky elements) are listed at the foot of each report. KaTeX symbols are exempt, so the 9 to 26px symbol hotspots in formulas are not reported, although they are small touch targets. That is a judgement call worth reviewing.

## Not run
- A real phone, real screen reader, and the live GitHub Pages site (`BASE_URL` was not set).
- `404.html` does not exist yet, so it was not checked.

## Grouped by selector (all non-axe findings; count = findings across pages and widths)

**layout-shift** (selector is the page load: the shift sources are listed in item 1 above)

| Selector | Count | Pages | Widths |
|---|---|---|---|
| `page load` | 5 | home, m00, m01 | 375, 768, 900 |

**small-text**

| Selector | Count | Pages | Widths |
|---|---|---|---|
| `text.tick-label` | 12 | m00, m01 | 375, 768, 900, 1100, 1280 |
| `text.label` | 2 | m01 | 900, 1100 |

**tap-target** (the three rows are items 2, 4 and 5 above)

| Selector | Count | Pages | Widths |
|---|---|---|---|
| `nav#site-nav a` | 40 | m00, m01 | 900, 1100, 1280 |
| `a.brand` | 15 | home, m00, m01 | 375, 768, 900, 1100, 1280 |
| `a.topbar-progress` | 3 | home, m00, m01 | 375 |

## axe-core results (axe-core 4.10.2, MPL-2.0, run from `/tmp/axe` via `AXE_PATH`; WCAG 2 A/AA, 2.1 AA and best-practice rules; run on home, Module 0 and Module 1 at 375 and 1280px)

55 nodes across 3 rules. No colour-contrast, label, name or role violations were reported, which is a useful pass: axe covers contrast, which the custom checks do not. axe does not test everything: it finds roughly a third of WCAG issues automatically, so a pass is not a full accessibility audit.

### Ranked

**A1. `aria-hidden-focus` (serious): 44 nodes, 22 distinct selectors, Module 0 and Module 1.** Focusable glossary symbols (`[data-sym]`, `tabindex=0`) sit inside KaTeX's `.katex-html[aria-hidden="true"]`. Keyboard users can focus them but screen readers skip the hidden subtree, so a symbol popover is reachable by keyboard yet silent for screen-reader users. Fix: make the hotspot outside the aria-hidden subtree (wrap the whole `.katex` in the focusable element with an `aria-label` of the symbol's name), or drop `aria-hidden` on the visible layer and hide the MathML copy instead.

| Selector | Count | Page | Widths |
|---|---|---|---|
| `span[data-tex="\\htmlData{sym=x}{x}"] > .katex > .katex-html[aria-hidden="true"]` | 2 | m00 | 375, 1280 |
| `span[data-tex="\\htmlData{sym=y}{y}"] > .katex > .katex-html[aria-hidden="true"]` | 2 | m00 | 375, 1280 |
| `#concept-equations > section[data-stage="meaning"] > .math-display > .katex-display > .katex > .katex-html[…` | 2 | m00 | 375, 1280 |
| `#concept-functions > section[data-stage="meaning"] > .math-display > .katex-display > .katex > .katex-html[…` | 2 | m00 | 375, 1280 |
| `#concept-slope > section[data-stage="meaning"] > .math-display > .katex-display > .katex > .katex-html[aria…` | 2 | m00 | 375, 1280 |
| `span[data-tex="\\htmlData{sym=a}{a}"] > .katex > .katex-html[aria-hidden="true"]` | 2 | m00 | 375, 1280 |
| `span[data-tex="\\htmlData{sym=r}{r}"] > .katex > .katex-html[aria-hidden="true"]` | 2 | m00 | 375, 1280 |
| `span[data-tex="\\htmlData{sym=n}{n}"] > .katex > .katex-html[aria-hidden="true"]` | 2 | m00 | 375, 1280 |
| `#concept-exponents > section[data-stage="meaning"] > .math-display:nth-child(6) > .katex-display > .katex >…` | 2 | m00 | 375, 1280 |
| `#concept-logarithms > section[data-stage="meaning"] > p:nth-child(3) > .math:nth-child(2) > .katex > .katex…` | 2 | m00 | 375, 1280 |
| `span[data-tex="\\htmlData{sym=bs}{b}"] > .katex > .katex-html[aria-hidden="true"]` | 2 | m00 | 375, 1280 |
| `span[data-tex="\\htmlData{sym=k}{k}"] > .katex > .katex-html[aria-hidden="true"]` | 2 | m00 | 375, 1280 |
| `#concept-sigma > section[data-stage="meaning"] > p:nth-child(3) > .math:nth-child(2) > .katex > .katex-html…` | 2 | m00 | 375, 1280 |
| `#concept-sigma > section[data-stage="meaning"] > p:nth-child(3) > .math:nth-child(3) > .katex > .katex-html…` | 2 | m00 | 375, 1280 |
| `#concept-sigma > section[data-stage="meaning"] > .math-display > .katex-display > .katex > .katex-html[aria…` | 2 | m00 | 375, 1280 |
| `span[data-tex="\\htmlData{sym=theta}{\\theta}"] > .katex > .katex-html[aria-hidden="true"]` | 2 | m00 | 375, 1280 |
| `span[data-tex="\\htmlData{sym=cos}{\\cos\\theta}"] > .katex > .katex-html[aria-hidden="true"]` | 2 | m00 | 375, 1280 |
| `span[data-tex="\\htmlData{sym=sin}{\\sin\\theta}"] > .katex > .katex-html[aria-hidden="true"]` | 2 | m00 | 375, 1280 |
| `#concept-vectors > section[data-stage="meaning"] > .math-display > .katex-display > .katex > .katex-html[ar…` | 2 | m01 | 375, 1280 |
| `#concept-combine > section[data-stage="meaning"] > .math-display > .katex-display > .katex > .katex-html[ar…` | 2 | m01 | 375, 1280 |
| `#concept-matrices > section[data-stage="meaning"] > .math-display > .katex-display > .katex > .katex-html[a…` | 2 | m01 | 375, 1280 |
| `#concept-matmul > section[data-stage="meaning"] > .math-display > .katex-display > .katex > .katex-html[ari…` | 2 | m01 | 375, 1280 |

**A2. `scrollable-region-focusable` (serious): 3 nodes, 3 selectors, 375px only.** The `.math-display` inside stepper bodies scrolls sideways on a phone but cannot be reached with the keyboard. Fix: add `tabindex="0"`, `role="region"` and an `aria-label` ("Equation, scrolls sideways") to scrollable `.math-display` blocks.

| Selector | Count | Page | Widths |
|---|---|---|---|
| `div[data-stepper="logarithms"] > .stepper-body[aria-live="polite"] > .math-display` | 1 | m00 | 375 |
| `div[data-stepper="notation"] > .stepper-body[aria-live="polite"] > .math-display` | 1 | m00 | 375 |
| `div[data-stepper="combine"] > .stepper-body[aria-live="polite"] > .math-display` | 1 | m01 | 375 |

**A3. `landmark-unique` (moderate): 8 nodes, 4 selectors, Module 0.** The landmarks in a concept card (breadcrumb nav, outcomes and takeaways asides, pager nav) share names with the page's other landmarks of the same kind, as axe reports. If each card repeats them, a screen reader's landmark list shows identical entries. Fix: put the concept title into each label (for example "Breadcrumb: Variables and expressions"). Axe reported only the first card's landmarks; I did not check whether the other cards repeat the pattern.

| Selector | Count | Page | Widths |
|---|---|---|---|
| `#concept-variables > header > .breadcrumb[aria-label="Breadcrumb"]` | 2 | m00 | 375, 1280 |
| `aside[aria-labelledby="out-concept-variables"]` | 2 | m00 | 375, 1280 |
| `aside[aria-labelledby="key-concept-variables"]` | 2 | m00 | 375, 1280 |
| `#concept-variables > .pager[aria-label="Previous and next concept"]` | 2 | m00 | 375, 1280 |

### Notes
- axe lists the same selector at 375 and 1280px as separate nodes, hence the counts of 2.
- Selectors for KaTeX symbols are long; truncated with "…" above. Full text is in `reports/report.md` (regenerate with `AXE_PATH=/tmp/axe/node_modules/axe-core/axe.min.js node tools/ui-verify.mjs`).

## Polish session, part 1 (outline and findings): before and after

Same pages, widths and checks as above; `AXE_PATH` set. **Before: 132 findings. After: 0** (`node tools/ui-verify.mjs`). Two checks were added, both at 0: `landmark-unique` (every landmark on the page, so every card, not only the first) and `rail-content` (content column at least 640px while the rail shows).

| Group (selector) | Before | After | Fix |
|---|---|---|---|
| layout-shift `page load` | 5 | 0 | Header with Outline toggle, brand and progress ships in the static HTML; empty progress text and widget/stepper placeholders reserve their height; home outcomes in the static HTML match `course.json`; Inter SemiBold preloaded on all three pages (a late SemiBold swap in a callout caused the Module 1 shift) |
| small-text `text.tick-label` | 12 | 0 | 14.5px base in drawing units; `--ts` now uses the tighter axis (width or height) of the `meet` scale |
| small-text `text.label` | 2 | 0 | same |
| tap-target `nav#site-nav a` | 40 | 0 | 44px rows by default; 40px only for a fine pointer at 900px and up (DESIGN.md section 8); touch context checked at 900 and 1100 |
| tap-target `a.brand` | 15 | 0 | 44px high, inline-flex |
| tap-target `a.topbar-progress` | 3 | 0 | `min-width: 44px` |
| axe A1 `aria-hidden-focus` (22 selectors) | 44 | 0 | KaTeX symbols pointer-only; "Symbols in this equation" list of real buttons |
| axe A2 `scrollable-region-focusable` | 3 | 0 | scrolling `.math-display` gets tabindex, region role and a unique label |
| axe A3 `landmark-unique` (4 selectors) | 8 | 0 | one breadcrumb per page; outcomes and takeaways are plain blocks; pager names include the concept title |
| **Total** | **132** | **0** | |

Notes
- The popover used to stay open over the next focus stop when Tab moved from a term to a non-term (the new summary rows exposed this as a "covered when focused" finding); it now closes on focus moving to anything that is not a term, symbol or the popover.
- Widget and stepper space is reserved with CSS measured for the first widget of each module (`--widget-chrome` on `<main>`). This is interim: the lazy-mount API (next session) replaces it with a per-widget reserve.
- Still not run: a real phone, a real screen reader, the live Pages site.

## Polish session P2: before and after

`node tools/ui-verify.mjs` with axe-core 4.10.2 at 375, 768, 900 and 1280px (now on home, Module 0, Module 1 and 404.html; a new `meta` check covers title, description, lang, favicon, one main, links with text). **Before: 0 findings. After: 0.** The 404 page was mutation-tested (no lang, no main, low contrast): 18 findings, so the checks bite. Widgets are mounted before the checks run, so the real widgets are still audited.
