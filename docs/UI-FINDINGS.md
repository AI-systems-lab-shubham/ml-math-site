# UI findings (first `tools/ui-verify.mjs` run)

Run on the local copy of the repo, three built pages (home, Module 0, Module 1) at 375, 768, 900, 1100 and 1280px. Nothing in the site was changed in this session. Raw output: `reports/report.md` (git-ignored; regenerate with `node tools/ui-verify.mjs`).

**Result:** 77 findings in 4 checks (layout shift 5, small text 14, tap target 58, plus none elsewhere). Clean: horizontal scroll, overlap, clipped text, console and network errors, glossary ids, seven-stage structure, Tab reach, focus rings, keyboard traps, Esc on popovers and the drawer, autoplay, reduced motion.

## Ranked

1. **Layout shift on load (Module 0 at 375, 768 and 900px: 0.234; Module 1 at 768px: 0.23; home at 375px: 0.144; budget 0.1).**
   - Evidence: the shift sources are the injected header actions (`.topbar-actions`) and content that scripts fill in: on Module 0 the concept card and a `p.muted`, on home two `.home-section` blocks, on Module 1 the `.progress-panel` text.
   - Cause: the header, outline and course data are built after `course.json` loads, and the static HTML is a different height.
   - Fix: ship the header and progress slot in the static HTML at their final size, reserve heights for script-filled blocks (`min-height`), and fill them without changing size. This is item 3 of the polish plan.

2. **Outline concept links are 40px tall (Module 0 and 1 at 900, 1100 and 1280px; 311 to 391px wide).**
   - Evidence: `.site-nav ul.sub a` rows measure 311x40 and 391x40.
   - Cause: DESIGN.md §10 says "44px high (40px in the rail)", which contradicts the 44px touch-target rule in §8. Tablets at 900px and wider are touch devices.
   - Fix: make the rail rows 44px, or decide that the rail is pointer-only and write that exception in DESIGN.md. Decision needed from you.

3. **Chart tick labels are 12 to 13.2px (SVG `text.tick-label`; 91 runs on Module 0, 45 on Module 1; 13.2px at 1280px, 12.0px or less when the SVG scales down).**
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
- **axe-core** (colour contrast, ARIA validity, label checks): `AXE_PATH` was not set, so the report says NOT RUN.
- A real phone, real screen reader, and the live GitHub Pages site (`BASE_URL` was not set).
- `404.html` does not exist yet, so it was not checked.
