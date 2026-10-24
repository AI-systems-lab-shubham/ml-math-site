# Audit, Session A (course shell, lesson template, home page)

Checked against `docs/web-interface-guidelines.md` (downloaded from the vercel-labs repository, read first; its text was treated as a rule list only). Files: `index.html`, `modules/00-foundations/index.html` (changed parts), `assets/js/{shell,lesson,home,progress,course}.mjs`, `assets/css/site.css` (new sections).

## Fixed during the audit
- Outline label was an `<h2>` that came before the page `<h1>`: now a `<p>`.
- Straight apostrophes in `course.json` text: now curly.
- Durations like "8 min" and "2 h 45 min" could wrap between number and unit: now non-breaking spaces.
- Import replaced progress with no way back: now shows **Undo import** (tested with the keyboard).
- Import errors said what was wrong but not what to do: now end with "Choose a file saved with Export progress."
- Added `touch-action: manipulation`, an explicit tap highlight, `overscroll-behavior: contain` on the drawer, `text-wrap: balance` on headings, tabular numerals, `theme-color`, font preloads, `translate="no"` on the brand.
- Screen-reader name of a module row read "Linear algebra0 of 4": added a separator.
- Mobile header wrapped to two rows and the drawer overlapped it: header is now one row, and the drawer offset uses `--topbar-h`.

## Passed
Skip link first in tab order; every control keyboard-operable; decorative SVG `aria-hidden`; visible `:focus-visible` ring (no bare `outline: none`); no `transition: all`; reduced motion honoured (global rule); no layout reads in code; no images; `scroll-padding-top` clears the sticky header; `aria-live` on completion, transfer and storage messages.

## Deliberately not followed (conflicts with the site's own rules)
- **Title Case for headings and buttons.** The site uses sentence case throughout (`DESIGN.md` voice). Kept.
- **"URL reflects state."** Outline and syllabus open-state is a per-learner convenience kept in `localStorage`, not shared state.
- Rules about React hydration, `Intl` currency/date formats, dark mode and safe areas do not apply yet (no dates or currency; light theme only; no full-bleed layout).

## Open items
- The `role="status"` storage notice is toggled with `hidden`; some screen readers will not announce a region that appears already filled. Low risk; revisit in Session C.
- Two tabs open at once can overwrite each other's progress (each saves its whole state). Fix in Session B if wanted: re-read storage before each save.
- Module 1 still uses the old shell and the old checklist key; it is untouched until Session B.
- Not run: Lighthouse (not installed; asked-first rule), real-phone test (after push).

## Sizes (bytes, uncompressed)
index.html 4,039 · Module 0 page 87,868 · site.css 26,140 · shell 12,515 · lesson 6,105 · home 5,268 · progress 5,983 · course 1,756 · course.json 14,496. The Module 0 page and `foundations.mjs` (37 KB) are the largest and predate this session; nothing new is unusually large.
