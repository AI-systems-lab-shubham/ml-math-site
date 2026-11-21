// E2E: the questions drawn from data/checks/<concept-id>.json work in the browser.
//  - Predict: the right number gives a green "Yes", a wrong one gives an amber "Not quite" that states the answer; Hint toggles;
//  - Spot it: the correct choice gives "That's it", any other gives "Not quite" with its own reason;
//  - reveal: the reasoning is hidden until the details element is opened;
//  - Explain it back: the model answer stays hidden until something is written, then shows;
//  - no console errors, and no slot is left empty or showing the "could not be loaded" message.
// Run: node tests/e2e/checks.mjs [--pages m03-svd,...]   (Playwright needed; prints SKIPPED and exits 1 otherwise)
import { readFileSync, readdirSync } from "node:fs";
import { requirePlaywright, serveStatic, siteRoot } from "../../tools/lib/playwright.mjs";
import { answers } from "../../assets/js/check-answers.mjs";
import { resolveAnswer } from "../../assets/js/checks-core.mjs";

const pw = await requirePlaywright("checks e2e");
const { base, close } = await serveStatic();
const browser = await pw.chromium.launch();
const course = JSON.parse(readFileSync(`${siteRoot}/data/course.json`, "utf8"));
const only = process.argv.includes("--pages") ? process.argv[process.argv.indexOf("--pages") + 1].split(",") : null;
let failures = 0, checks = 0;
const check = (ok, label) => { checks++; if (!ok) { failures++; console.error(`FAIL  ${label}`); } };

const files = readdirSync(`${siteRoot}/data/checks`).filter((f) => f.endsWith(".json"));
for (const f of files) {
  const id = f.replace(/\.json$/, "");
  if (only && !only.includes(id)) continue;
  const data = JSON.parse(readFileSync(`${siteRoot}/data/checks/${f}`, "utf8"));
  const concept = course.modules.flatMap((m) => m.concepts).find((c) => c.id === id);
  for (const width of [375, 1280]) {
    const page = await (await browser.newContext({ viewport: { width, height: 900 } })).newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    await page.goto(base + concept.path, { waitUntil: "networkidle" });
    await page.waitForSelector("[data-checks] > *", { state: "attached" });
    const at = `${id} @${width}`;
    check(await page.locator("[data-checks]").evaluateAll((els) => els.every((e) => e.children.length > 0 && !/could not be loaded/.test(e.textContent))), `${at}: every slot is filled`);

    for (const it of data.items.filter((i) => i.slot === "predict")) {
      const box = page.locator(`[data-predict="${it.id}"]`);
      const input = box.locator("input"), feedback = box.locator(".feedback");
      const right = resolveAnswer(it, answers);
      check(await box.locator("label").count() === 1 && await input.getAttribute("id") !== null, `${at} ${it.id}: the input has a label`);
      await box.locator("[data-check]").click();
      check(/Commit to a guess/.test(await feedback.innerText()), `${at} ${it.id}: an empty answer asks for a guess`);
      await input.fill(String(right + 1));
      await box.locator("[data-check]").click();
      check(await feedback.evaluate((e) => e.classList.contains("try")) && (await feedback.innerText()).includes("Not quite"), `${at} ${it.id}: a wrong answer is amber "Not quite"`);
      await input.fill(String(right));
      await box.locator("[data-check]").click();
      check(await feedback.evaluate((e) => e.classList.contains("ok")) && /Yes/.test(await feedback.innerText()), `${at} ${it.id}: the right answer (${right}) says Yes`);
      check(!/\{answer\}/.test(await feedback.innerText()), `${at} ${it.id}: the explanation has no unfilled token`);
      const hint = box.locator(".hint-text");
      check(await hint.isHidden(), `${at} ${it.id}: hint starts hidden`);
      await box.locator("[data-hint]").click();
      check(await hint.isVisible(), `${at} ${it.id}: Hint shows the hint`);
    }
    for (const it of data.items.filter((i) => i.slot === "spot")) {
      const box = page.locator(".spot-it", { hasText: it.prompt.slice(0, 40) });
      check(await box.count() === 1, `${at} ${it.id}: one Spot it block`);
      for (const [j, c] of it.choices.entries()) {
        await box.locator("input[type=radio]").nth(j).check();
        const fb = box.locator(".feedback");
        check(await fb.evaluate((e, cls) => e.classList.contains(cls), c.correct ? "ok" : "try") && (await fb.innerText()).includes(c.why), `${at} ${it.id}: choice ${j + 1} gives ${c.correct ? "ok" : "amber"} with its reason`);
      }
    }
    for (const it of data.items.filter((i) => i.slot === "reveal")) {
      const d = page.locator("details.reveal", { hasText: it.reasoning.slice(0, 30) });
      check(await d.count() === 1 && !(await d.evaluate((e) => e.open)), `${at} ${it.id}: reveal starts closed`);
      await d.locator("summary").click();
      check(await d.evaluate((e) => e.open) && await d.locator("p").isVisible(), `${at} ${it.id}: opening it shows the reasoning`);
    }
    for (const it of data.items.filter((i) => i.slot === "explain")) {
      const box = page.locator(".explain-back", { hasText: it.prompt.slice(0, 30) });
      const model = box.locator(".model-answer");
      check(await model.isHidden(), `${at} ${it.id}: model answer starts hidden`);
      await box.locator("[data-reveal]").click();
      check(await model.isHidden(), `${at} ${it.id}: an empty attempt does not reveal the model answer`);
      await box.locator("textarea").fill("my attempt");
      await box.locator("[data-reveal]").click();
      check(await model.isVisible(), `${at} ${it.id}: after writing, the model answer shows`);
    }
    check(errors.length === 0, `${at}: no console errors (${errors.join("; ")})`);
    await page.context().close();
  }
}
await browser.close(); close();
console.log(`checks e2e: ${checks - failures}/${checks} passed over ${files.length} concept file(s)`);
process.exit(failures ? 1 : 0);
