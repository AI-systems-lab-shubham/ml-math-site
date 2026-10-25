// Content-preservation check for the split: the text of the new concept pages, in order, must equal the text of
// the old long module page, apart from the hero parts that moved on purpose (see HOWTO in tools/split-modules.mjs).
import { textOf, firstDiff } from "./html-text.mjs";
import { parseOld, splitDotted, HOWTO } from "../split-modules.mjs";

const article = (html) => html?.match(/<article class="concept-card"[\s\S]*?<\/article>/)?.[0] ?? "";
const calloutOf = (html) => html.match(/<div class="callout">[\s\S]*?<\/div>/)?.[0] ?? null;

// oldHtml: the old module page. conceptHtmls: the new concept pages in course order. overviewHtml: the new overview.
// homeHtml and hintJs (assets/js/first-hint.js): where the two how-to sentences now live. Returns a list of problems (empty = preserved).
export function comparePreservation({ oldHtml, conceptHtmls, overviewHtml, homeHtml, hintJs }) {
  const problems = [];
  const old = parseOld(oldHtml);
  if (conceptHtmls.length !== old.articles.length) {
    problems.push(`expected ${old.articles.length} concept pages, found ${conceptHtmls.length}`);
  }

  // 1. The concept cards, in order. A callout that moved into a card is taken out before comparing.
  const stripCallout = (a) => a.replace(/<div class="callout">[\s\S]*?<\/div>/, "");
  const want = old.articles.map((a) => textOf(a.html)).join(" ¶ ");
  const got = conceptHtmls.map((h) => textOf(stripCallout(article(h)))).join(" ¶ ");
  const d = firstDiff(want, got);
  if (d) problems.push(`concept text: ${d}`);

  // 2. The callout, if the old page had one, sits on the first concept page and nowhere else.
  const callouts = conceptHtmls.map((h) => calloutOf(article(h)));
  if (old.callout) {
    const dc = firstDiff(textOf(old.callout), callouts[0] ? textOf(callouts[0]) : "");
    if (dc) problems.push(`callout on the first concept page: ${dc}`);
  }
  callouts.forEach((c, i) => { if (c && (i > 0 || !old.callout)) problems.push(`concept page ${i + 1} has a callout that was not on the old page`); });

  // 3. Overview: the lede (and the remainder of the old paragraph) stay; the how-to text and the tools note are gone.
  const ov = textOf(overviewHtml.match(/<main[\s\S]*<\/main>/)?.[0] ?? "");
  if (!ov.includes(textOf(old.lede))) problems.push("overview is missing the lede");
  const leftover = splitDotted(old.dotted);
  if (leftover && !ov.includes(textOf(leftover))) problems.push("overview is missing the rest of the old intro paragraph");
  if (ov.includes(HOWTO.terms) || ov.includes(HOWTO.note) || ov.includes(HOWTO.oldNote)) problems.push("overview still carries the how-to text");

  // 4. The moved sentences exist in their new places.
  if (old.dotted.startsWith(HOWTO.terms) && old.note === HOWTO.oldNote) {
    const home = textOf(homeHtml);
    for (const [s, where] of [[home, "home page"], [textOf(hintJs), "first-visit hint"]]) {
      if (!s.includes(HOWTO.terms)) problems.push(`${where} is missing the dotted-underline sentence`);
      if (!s.includes(HOWTO.note)) problems.push(`${where} is missing the Expand/Collapse note`);
    }
  } else problems.push("old page's how-to text changed; update HOWTO");
  return problems;
}
