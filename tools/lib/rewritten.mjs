// Cards whose voice was deliberately rewritten (docs/VOICE.md). The word-for-word freeze against the old long module
// pages and the split tool's output do not apply to them; tests/facts-preserved.test.mjs does instead, and the
// recorded hash below makes any later silent edit fail. Each entry: { anchor, concept, date, note, sha256 } where
// sha256 is of textOf(<article> of the page) (tools/lib/html-text.mjs). To add a card: rewrite it, run
// `node tools/lib/rewritten.mjs --hash <concept-id>`, and add the entry to tests/fixtures/old-pages/manifest.json.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { textOf } from "./html-text.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
export const rewrittenList = () => JSON.parse(readFileSync(join(root, "tests/fixtures/old-pages/manifest.json"), "utf8")).rewritten ?? [];
export const rewrittenAnchors = () => new Set(rewrittenList().map((r) => r.anchor));
export const articleOf = (html) => html?.match(/<article class="concept-card"[\s\S]*?<\/article>/)?.[0] ?? "";
export const articleHash = (html) => createHash("sha256").update(textOf(articleOf(html))).digest("hex");

if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv[2] === "--hash") {
  const course = JSON.parse(readFileSync(join(root, "data/course.json"), "utf8"));
  const c = course.modules.flatMap((m) => m.concepts).find((x) => x.id === process.argv[3]);
  if (!c) { console.error("unknown concept"); process.exit(1); }
  console.log(articleHash(readFileSync(join(root, c.path, "index.html"), "utf8")));
}
