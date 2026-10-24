// E2E for 404.html: GitHub Pages serves it at any depth, so the home link must be worked out from location.
//   on a *.github.io host the base is /<first path segment>/, anywhere else it is /;
//   the page needs no other file (inline CSS), one <main>, an underlined link with text, and no failed requests.
// Run: node tests/e2e/404.mjs   (Playwright needed; prints SKIPPED and exits 1 otherwise)
import fs from "node:fs";
import path from "node:path";
import { requirePlaywright, siteRoot } from "../../tools/lib/playwright.mjs";

const pw = await requirePlaywright("404 e2e");
const body = fs.readFileSync(path.join(siteRoot, "404.html"), "utf8");
let failures = 0, checks = 0;
const check = (ok, label) => { checks++; if (!ok) { failures++; console.error(`FAIL  ${label}`); } };
const browser = await pw.chromium.launch();
const CASES = [
  ["https://someone.github.io/ml-math-site/nope", "/ml-math-site/"],
  ["https://someone.github.io/ml-math-site/modules/99/deep/er", "/ml-math-site/"],
  ["https://someone.github.io/ml-math-site/404.html", "/ml-math-site/"],
  ["https://math.example.org/modules/99/", "/"],
  ["http://localhost:8080/anything/at/all", "/"],
];
for (const [url, expected] of CASES) {
  const page = await (await browser.newContext({ viewport: { width: 375, height: 700 } })).newPage();
  const requests = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.route("**/*", (route) => route.request().url() === url ? route.fulfill({ status: 404, contentType: "text/html", body }) : route.fulfill({ status: 404, body: "" }));
  await page.goto(url);
  const r = await page.evaluate(() => {
    const a = document.getElementById("home-link");
    return { href: new URL(a.href).pathname, text: a.textContent.trim(), underline: getComputedStyle(a).textDecorationLine, mains: document.querySelectorAll("main").length, lang: document.documentElement.lang,
      links: [...document.querySelectorAll("a")].filter((x) => !x.textContent.trim()).length, hscroll: document.documentElement.scrollWidth > document.documentElement.clientWidth };
  });
  check(r.href === expected, `${url}: home link is ${r.href}, expected ${expected}`);
  check(r.text.length > 0 && r.links === 0, `${url}: every link needs visible text`);
  check(r.underline.includes("underline"), `${url}: the link is not underlined`);
  check(r.mains === 1 && r.lang === "en", `${url}: needs one <main> and lang="en"`);
  check(!r.hscroll, `${url}: sideways scroll at 375px`);
  check(requests.every((u) => u === url || u.startsWith("data:")), `${url}: loaded other files: ${requests.filter((u) => u !== url).join(", ")}`);
}
await browser.close();
console.log(failures ? `${failures} of ${checks} checks failed` : `404 e2e: ${checks} checks passed`);
process.exit(failures ? 1 : 0);
