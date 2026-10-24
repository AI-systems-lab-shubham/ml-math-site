# Fonts

Self-hosted in `vendor/fonts/` as subset WOFF2. All three families are SIL Open Font Licence 1.1 (texts in `licenses/`). None of the three licence files declares a Reserved Font Name (the phrase appears only in the licence's definitions), so subsetting is not restricted by one.

| Family | Files | Source version | Used for | OpenType features kept |
|---|---|---|---|---|
| Fraunces | SemiBold (600) | 1.000 | headings, brand | kern, liga, rvrn |
| Inter | Regular, Medium, SemiBold | 4.001 | body and UI | calt, kern, locl, **tnum** |
| JetBrains Mono | Regular, Medium | 2.211 | code, live numbers | calt, ccmp, locl |

- The CSS asks for `font-variant-numeric: tabular-nums` (feature `tnum`). Only Inter has `tnum`; the rules that use it are on Inter text, and on JetBrains Mono text (already monospaced). Fraunces has no `tnum`, so digits in headings are proportional.
- The CSS sets no `font-feature-settings`, `font-variant-ligatures` or `font-variant-caps`, so browser defaults apply (calt, ccmp, clig, kern, liga, locl, mark, mkmk, rclt, rlig). Those are listed explicitly in the subset command. `frac`, `numr`, `dnom` and `pnum` are dropped because nothing uses them. Add a feature to `FEATURES` in `tools/subset-fonts.mjs` before using it in CSS.
- Hinting is kept. The whole name table is kept (`--name-IDs='*'`), so copyright and licence URL (IDs 0 and 14) survive.
- Characters: everything in the pages, scripts, `course.json` and the glossary, plus Latin, Latin-1, Latin Extended-A, Greek, punctuation, super and subscripts, arrows and the maths operators the course uses (`tools/lib/font-chars.mjs`).
- `vendor/fonts/coverage.json` records, per font, which requested characters the source font lacks.

## Fallbacks
A few characters in ordinary text are in no vendored font. `tools/check-fonts.mjs` names each one and the font the browser falls back to; the allowed ones are listed at the top of that file (the check prints them on every run). Formulas are drawn by KaTeX with its own fonts and are not affected.

## Check and rebuild
- `node tools/check-fonts.mjs` (part of `tools/verify.mjs`): fails if a used character is missing, a preload lacks `type="font/woff2"` or `crossorigin`, `tnum` is missing, or licence metadata was dropped.
- Preloads: only the three above-the-fold files (Inter Regular, Inter SemiBold, Fraunces SemiBold); `crossorigin` is required even for same-origin fonts.
- Rebuild after adding characters: download the full TTFs (Inter 4.001 from github.com/rsms/inter, Fraunces from github.com/undercasetype/Fraunces, JetBrains Mono 2.211 from github.com/JetBrains/JetBrainsMono) into a scratch folder, make a throwaway venv (`python3 -m venv V && V/bin/pip install fonttools brotli`), then `FONTTOOLS_VENV=V node tools/subset-fonts.mjs <folder>`. The subset used fonttools 4.67.0 and brotli 1.2.1 (both MIT).
