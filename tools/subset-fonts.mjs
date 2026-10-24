// Subsets the vendored fonts to the characters the site uses and writes WOFF2 files into vendor/fonts/.
// Usage: FONTTOOLS_VENV=/path/to/venv node tools/subset-fonts.mjs <source-dir>
//   <source-dir> holds the full TTFs (the originals were Fraunces-SemiBold, Inter-Regular/Medium/SemiBold,
//   JetBrainsMono-Regular/Medium; upstream releases listed in docs/FONTS.md). The subset is committed; the TTFs are not.
//
// Tooling used (throwaway venv, nothing installed globally):
//   python3 -m venv $VENV && $VENV/bin/pip install fonttools brotli
//   fonttools 4.67.0, MIT licence (provides pyftsubset); brotli 1.2.1, MIT licence (WOFF2 compression).
//
// Choices, each checked against the fonts and the CSS:
//   - hinting is kept (pyftsubset keeps it unless --no-hinting is given);
//   - --name-IDs='*' and --name-languages='*' keep the whole name table (copyright, licence text and URL; the default
//     would drop IDs 7 to 14);
//   - layout features are listed explicitly. The site's CSS asks for font-variant-numeric: tabular-nums (feature tnum;
//     only Inter has it) and sets no font-feature-settings, font-variant-ligatures or font-variant-caps, so the browser
//     defaults apply: calt, ccmp, clig, kern, liga, locl, mark, mkmk, rclt, rlig (rvrn for Fraunces). Features the
//     site never uses (frac, numr, dnom, pnum) are dropped.
//   - none of the three OFL licences declares a Reserved Font Name, so subsetting and renaming are not restricted.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { siteRoot } from "./lib/playwright.mjs";
import { subsetChars } from "./lib/font-chars.mjs";
import { woff2Codepoints } from "./lib/woff2.mjs";

const venv = process.env.FONTTOOLS_VENV;
const srcDir = process.argv[2];
if (!venv || !srcDir) { console.error("Usage: FONTTOOLS_VENV=<venv> node tools/subset-fonts.mjs <dir with the source TTFs>"); process.exit(1); }

const DEFAULT = "calt,ccmp,clig,kern,liga,locl,mark,mkmk,rclt,rlig";
const FEATURES = {
  Fraunces: `${DEFAULT},rvrn`,
  Inter: `${DEFAULT},tnum`,
  JetBrainsMono: DEFAULT,
};
const out = path.join(siteRoot, "vendor/fonts");
const chars = [...subsetChars()].sort((a, b) => a - b);
const unicodes = path.join(srcDir, "subset-unicodes.txt");
fs.writeFileSync(unicodes, chars.map((c) => `U+${c.toString(16).toUpperCase().padStart(4, "0")}`).join("\n") + "\n");

const py = (code) => execFileSync(path.join(venv, "bin/python3"), ["-I", "-c", code], { encoding: "utf8" }).trim();
const versions = { fonttools: py("import importlib.metadata as m;print(m.version('fonttools'))"), brotli: py("import importlib.metadata as m;print(m.version('brotli'))") };

const coverage = { fonttools: versions.fonttools, brotli: versions.brotli, requested: chars.length, fonts: {} };
for (const file of fs.readdirSync(srcDir).filter((f) => f.endsWith(".ttf")).sort()) {
  const family = file.split("-")[0];
  const features = FEATURES[family];
  if (!features) throw new Error(`no feature list for ${family}`);
  const dest = path.join(out, file.replace(/\.ttf$/, ".woff2"));
  execFileSync(path.join(venv, "bin/pyftsubset"), [
    path.join(srcDir, file), `--unicodes-file=${unicodes}`, "--flavor=woff2", `--layout-features=${features}`,
    "--name-IDs=*", "--name-languages=*", "--notdef-outline", `--output-file=${dest}`,
  ], { stdio: "inherit" });
  const kept = woff2Codepoints(dest);
  // A requested character the subset lacks was not in the source font either.
  const sourceLacks = chars.filter((c) => !kept.has(c));
  coverage.fonts[path.basename(dest)] = { bytesBefore: fs.statSync(path.join(srcDir, file)).size, bytesAfter: fs.statSync(dest).size, glyphs: kept.size, sourceLacks };
  console.log(`${file}: ${fs.statSync(path.join(srcDir, file)).size} -> ${fs.statSync(dest).size} bytes, ${kept.size} characters, ${sourceLacks.length} requested characters not in the source font`);
}
fs.writeFileSync(path.join(out, "coverage.json"), JSON.stringify(coverage, null, 1) + "\n");
