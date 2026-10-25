// Splits the old one-page-per-module files into one page per concept plus a module overview page.
// The source is the last commit that still had the long module pages (SOURCE_REV), read with `git show`
// (local only), so the tool gives the same output every time. Usage: node tools/split-modules.mjs [--check]
//   (no flag) writes the pages; --check only reports whether the files on disk match what would be written.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, posix } from "node:path";

export const SOURCE_REV = "fbf615d";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// The two sentences that used to sit in a module's hero now live on the home page and in the first-visit hint.
// The second one is reworded because its old setting ("on this page", next to the buttons) is gone.
export const HOWTO = {
  terms: "Terms with a dotted underline are a tap or hover away from a plain-language and a mathematical definition.",
  oldNote: "Opens or closes every Teach it panel and symbol list on this page. Answer reveals stay closed.",
  note: "Expand all and Collapse all open or close every Teach it panel and symbol list on a page. Answer reveals stay closed.",
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const rel = (fromDir, toPath) => { const r = posix.relative(fromDir.replace(/\/$/, ""), toPath.replace(/\/$/, "")); return r ? `${r}/` : "./"; };
const up = (dir) => dir.replace(/\/$/, "").split("/").map(() => "..").join("/") + "/";
const modNum = (course, m) => course.modules.indexOf(m);
const slugOf = (c) => c.path.split("/").filter(Boolean).pop();

export function readOld(rev, path) {
  return execFileSync("git", ["show", `${rev}:${path}`], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

// Pulls the parts of an old module page apart.
export function parseOld(html) {
  const head = html.slice(0, html.indexOf("</head>"));
  const hero = html.slice(html.indexOf('<div class="column page-hero">'), html.indexOf('<p class="column module-progress'));
  const one = (re, what) => { const m = hero.match(re); if (!m) throw new Error(`old page: ${what} not found`); return m[1]; };
  const lede = one(/<p class="lede">([\s\S]*?)<\/p>/, "lede");
  const dotted = one(/<\/p>\s*<p>(Terms with[\s\S]*?)<\/p>/, "dotted-underline paragraph");
  const note = one(/<span class="page-tools-note muted">([\s\S]*?)<\/span>/, "page-tools note");
  const eyebrow = one(/<p class="eyebrow">([\s\S]*?)<\/p>/, "eyebrow");
  const callout = hero.match(/<div class="callout">[\s\S]*?<\/div>/)?.[0] ?? null;
  const articles = [...html.matchAll(/<article class="concept-card" id="([^"]+)"[^>]*>[\s\S]*?<\/article>/g)].map((m) => ({ id: m[1], html: m[0] }));
  return { head, lede, dotted, note, eyebrow, callout, articles };
}

// "Terms with …definition. Systems of equations … next part." -> the how-to sentence and what is left.
export function splitDotted(dotted) {
  if (!dotted.startsWith(HOWTO.terms)) throw new Error("dotted-underline paragraph changed; update HOWTO");
  return dotted.slice(HOWTO.terms.length).trim();
}

const headerHtml = (toRoot, withTerms) => `<header class="topbar" id="site-header">
  <button class="button-secondary button-small outline-toggle" type="button" data-nav-toggle aria-controls="site-nav" aria-expanded="false" aria-label="Show outline"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M4 6h16M4 12h10M4 18h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span class="outline-toggle-text">Outline</span></button>
  <a class="brand" translate="no" href="${toRoot}index.html">ML Math</a>
  <div class="topbar-actions">
    <a class="topbar-progress" href="${toRoot}index.html#syllabus" data-course-progress aria-label="Course progress"><svg class="ring" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" fill="none" stroke="var(--rule)" stroke-width="3"/></svg><span class="topbar-progress-text">– of – complete</span></a>${withTerms ? `
      <button class="button-secondary button-small" type="button" data-highlight-toggle aria-label="Highlight all terms" aria-pressed="false"><span class="long">Highlight all terms</span><span class="short">Terms</span></button>` : ""}
  </div>
</header>
<noscript><p class="notice">This course uses JavaScript for its widgets, outline and progress. The text still reads without it. <a href="${toRoot}index.html">Course home</a></p></noscript>`;

// The no-script outline: module links go to overviews, concept links to concept pages; planned items are plain text.
function navHtml(course, here, conceptId) {
  const dir = here;
  const items = course.modules.map((m, i) => {
    const label = `${i} · ${esc(m.title)}`;
    if (m.status !== "built") return `    <li><span class="soon">${label}</span></li>`;
    const cur = m.path === dir.replace(/[^/]+\/$/, "") || m.path === dir;
    const open = cur ? m.concepts.filter((c) => c.status === "built") : null;
    const modCur = m.path === dir ? ' aria-current="page"' : "";
    const sub = open ? `\n      <ul class="sub">\n${open.map((c) => `        <li><a href="${rel(dir, c.path)}"${c.id === conceptId ? ' aria-current="page"' : ""}>${esc(c.title)}</a></li>`).join("\n")}\n      </ul>\n    ` : "";
    return `    <li>${open ? "\n      " : ""}<a href="${rel(dir, m.path)}"${modCur}>${label}</a>${sub}</li>`;
  }).join("\n");
  return `<nav class="site-nav" id="site-nav" aria-label="Course outline">
  <h2>Modules</h2>
  <ol>
${items}
  </ol>
</nav>`;
}

function headFor(oldHead, { toRoot, title, description, moduleId, conceptId = null, script, katex }) {
  let h = oldHead.replace(/"\.\.\/\.\.\//g, `"${toRoot}`);
  h = h.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);
  h = h.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(description)}">`);
  h = h.replace(/<meta name="site-root" content="[^"]*">/, `<meta name="site-root" content="${toRoot}">`);
  if (conceptId) h = h.replace(/(<meta name="module-id" content="[^"]*">)/, `$1\n  <meta name="concept-id" content="${conceptId}">`);
  h = h.replace(/<script type="module" src="[^"]*"><\/script>/, `<script type="module" src="${toRoot}assets/js/${script}"></script>`);
  if (!katex) {
    h = h.replace(/\s*<link rel="stylesheet" href="[^"]*katex\.min\.css">/, "").replace(/\s*<script src="[^"]*katex\.min\.js"><\/script>/, "").replace(/\s*<link rel="stylesheet" href="[^"]*widget-reserve\.css">/, "");
  }
  return h + "</head>";
}

const TOC = `  <nav class="page-toc" id="page-toc" aria-label="On this page" data-page-toc>
    <button class="page-toc-toggle" type="button" aria-expanded="false" aria-controls="page-toc-panel"><span class="page-toc-label">On this page</span><span class="page-toc-current" data-toc-current></span><span class="chev" aria-hidden="true"></span></button>
    <div class="page-toc-panel" id="page-toc-panel" data-toc-panel><p class="page-toc-title">On this page</p></div>
  </nav>`;

// Cross-card links inside an article: rewritten to the concept's own page. Returned in `changes` for the report.
export function rewriteLinks(articleHtml, course, fromConceptPath) {
  const changes = [];
  const byAnchor = new Map(course.modules.flatMap((m) => m.concepts).map((c) => [c.anchor, c]));
  const out = articleHtml.replace(/href="((?:\.\.\/[^"#]*?|)(?:index\.html)?)#(concept-[a-z0-9-]+)"/g, (whole, _p, anchor) => {
    const target = byAnchor.get(anchor);
    if (!target) return whole;
    const to = rel(fromConceptPath, target.path);
    changes.push({ from: whole, to: `href="${to}"`, target });
    return `href="${to}"`;
  });
  return { html: out, changes };
}

export function buildPages(course, readSource = (p) => readOld(SOURCE_REV, p)) {
  const files = new Map();
  const links = [];
  for (const m of course.modules.filter((x) => x.status === "built")) {
    const old = parseOld(readSource(`${m.path}index.html`));
    const num = modNum(course, m);
    const built = m.concepts.filter((c) => c.status === "built");
    if (old.articles.length !== built.length) throw new Error(`${m.id}: ${old.articles.length} articles but ${built.length} built concepts`);
    const leftover = splitDotted(old.dotted);
    const modTitle = `Module ${num}: ${m.title}`;

    built.forEach((c, i) => {
      if (old.articles[i].id !== c.anchor) throw new Error(`${c.id}: article ${i} is ${old.articles[i].id}, expected ${c.anchor}`);
      const dir = c.path, toRoot = up(dir);
      let { html: art, changes } = rewriteLinks(old.articles[i].html, course, dir);
      for (const ch of changes) links.push({ page: dir, ...ch });
      art = art.replace(/(<header>[\s\S]*?)<h2>([\s\S]*?)<\/h2>/, "$1<h1>$2</h1>");
      if (i === 0 && old.callout) art = art.replace(/(<\/header>)/, `$1\n\n    ${old.callout}`);
      const description = (art.match(/<header>[\s\S]*?<p class="muted">([\s\S]*?)<\/p>/)?.[1] ?? m.summary).replace(/<[^>]+>/g, "");
      const page = `${headFor(old.head, { toRoot, title: `${c.title} - ${m.title} - ML Math`, description, moduleId: m.id, conceptId: c.id, script: old.head.match(/assets\/js\/([a-z]+\.mjs)"/)[1], katex: true })}
<body>
<a class="skip-link" href="#main">Skip to content</a>
${headerHtml(toRoot, true)}

<div class="layout">
${navHtml(course, dir, c.id)}

<main id="main">
${TOC}

  <div class="column page-hero">
    <nav class="breadcrumb" aria-label="Breadcrumb"><ol>
      <li><a href="${toRoot}index.html">Course</a></li>
      <li><a href="${rel(dir, m.path)}">${esc(modTitle)}</a></li>
      <li><span aria-current="page">${esc(c.title)}</span></li></ol></nav>
    <div class="page-tools" data-page-tools>
      <button class="button-secondary button-small" type="button" data-expand-all>Expand all</button>
      <button class="button-secondary button-small" type="button" data-collapse-all>Collapse all</button>
      <p class="page-tools-status" role="status" data-tools-status></p>
    </div>
  </div>

  ${art}
</main>
</div>
<footer class="site-footer" id="site-footer"></footer>
</body>
</html>
`;
      files.set(`${dir}index.html`, page);
    });

    // Overview: title, lede, time, outcomes, the primary button and the list of built concepts. Nothing else.
    const dir = m.path, toRoot = up(dir);
    const first = built[0];
    const eyebrow = old.eyebrow;
    const overview = `${headFor(old.head, { toRoot, title: `${modTitle} - ML Math`, description: m.summary, moduleId: m.id, script: "overview.mjs", katex: false })}
<body>
<a class="skip-link" href="#main">Skip to content</a>
${headerHtml(toRoot, false)}

<div class="layout">
${navHtml(course, dir, null)}

<main id="main">
  <div class="column page-hero overview">
    <nav class="breadcrumb" aria-label="Breadcrumb"><ol>
      <li><a href="${toRoot}index.html">Course</a></li>
      <li><span aria-current="page">${esc(modTitle)}</span></li></ol></nav>
    <p class="eyebrow">${eyebrow}</p>
    <h1>${esc(m.title)}</h1>
    <p class="lede">${old.lede}</p>${leftover ? `\n    <p class="muted">${leftover}</p>` : ""}
    <p class="overview-meta">About ${m.minutes} min · ${built.length} concepts</p>
    <h2>By the end of this module you’ll be able to…</h2>
    <ul class="overview-outcomes">
${m.outcomes.map((o) => `      <li>${esc(o)}</li>`).join("\n")}
    </ul>
    <p class="module-progress muted" data-module-progress aria-live="polite"></p>
    <p class="overview-action"><a class="button" href="${rel(dir, first.path)}" data-overview-action>Start</a></p>
    <h2>Concepts</h2>
    <ol class="overview-list">
${built.map((c) => `      <li><a href="${rel(dir, c.path)}" data-cid="${c.id}"><span class="ov-state" data-ov-state="${c.id}" aria-hidden="true"></span><span class="ov-title">${esc(c.title)}</span><span class="ov-min muted">${c.minutes} min</span></a></li>`).join("\n")}
    </ol>
  </div>
</main>
</div>
<footer class="site-footer" id="site-footer"></footer>
</body>
</html>
`;
    files.set(`${dir}index.html`, overview);
  }
  return { files, links };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const course = JSON.parse(readFileSync(join(root, "data/course.json"), "utf8"));
  const { files, links } = buildPages(course);
  const order = new Map(course.modules.flatMap((m) => m.concepts).map((c, i) => [c.id, i]));
  const where = (p) => course.modules.flatMap((m) => m.concepts).find((c) => c.path === p);
  console.log(`cross-card links rewritten: ${links.length}`);
  for (const l of links) {
    const src = where(l.page);
    const dir = order.get(l.target.id) < order.get(src.id) ? "backward" : "FORWARD";
    console.log(`  ${l.page}: ${l.from} -> ${l.to} (${dir}: ${src.title} -> ${l.target.title})`);
    if (dir === "FORWARD") { console.error("a cross-card link points forward"); process.exit(1); }
  }
  let stale = 0;
  for (const [path, content] of files) {
    const abs = join(root, path);
    if (process.argv.includes("--check")) { if (!existsSync(abs) || readFileSync(abs, "utf8") !== content) { console.error(`out of date: ${path}`); stale++; } continue; }
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  }
  if (stale) process.exit(1);
  console.log(process.argv.includes("--check") ? "pages match the split" : `wrote ${files.size} pages`);
}
