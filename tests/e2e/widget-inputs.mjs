// E2E: every number field in the Module 1 widgets rejects non-integers, non-numbers and out-of-range values
// with a polite message, never passes them on, never throws, and puts the last good value back on leaving.
// Fields that accept decimals on purpose (none are number boxes today: shear k and the rotation angle are sliders)
// would opt out with integer:false in numberField and are skipped here.
// Run: node tests/e2e/widget-inputs.mjs   (Playwright needed; prints SKIPPED and exits 1 otherwise)
import { readFileSync } from "node:fs";
import { requirePlaywright, serveStatic, siteRoot } from "../../tools/lib/playwright.mjs";

const pw = await requirePlaywright("widget inputs e2e");
const { base, close } = await serveStatic();
let failures = 0, checks = 0;
const check = (ok, label) => { checks++; if (!ok) { failures++; console.error(`FAIL  ${label}`); } };
const browser = await pw.chromium.launch();
const course = JSON.parse(readFileSync(`${siteRoot}/data/course.json`, "utf8"));
const m1 = course.modules.find((m) => m.id === "m01");
const only = process.argv.includes("--pages") ? process.argv[process.argv.indexOf("--pages") + 1].split(",") : null;
const PAGES = m1.concepts.filter((c) => c.status === "built" && (!only || only.includes(c.id))).map((c) => [c.id, c.path]);

// Typed with real key presses, because a number box refuses most text before it reaches the page.
const BAD = [
  ["a decimal", async (page, input) => input.evaluate((el) => { el.value = "1.5"; el.dispatchEvent(new Event("input", { bubbles: true })); })],
  ["the letter e", async (page) => page.keyboard.type("e")],
  ["a lone minus", async (page) => page.keyboard.type("-")],
  ["empty", async (page) => page.keyboard.press("Backspace")],
  ["out of range", async (page, input) => input.evaluate((el) => { el.value = "99999"; el.dispatchEvent(new Event("input", { bubbles: true })); })],
];

let fieldsSeen = 0;
// 375px too: on phones the Systems number boxes sit under a closed "Edit numbers" disclosure, which must be reachable by keyboard.
const SIZES = [[1280, 900], [375, 812]];
for (const [width, height] of SIZES) for (const [name, url] of PAGES) {
  const page = await (await browser.newContext({ viewport: { width, height } })).newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(base + url, { waitUntil: "domcontentloaded" });
  await page.emulateMedia({ media: "print" }); // print media mounts every widget
  await page.waitForFunction(() => [...document.querySelectorAll("[data-widget]")].every((h) => h.dataset.lazy === "mounted"), null, { timeout: 5000 }).catch(() => {});
  await page.emulateMedia({ media: "screen" });
  await page.waitForTimeout(300); // the breakpoint listener re-syncs the "Edit numbers" disclosure after print media ends
  const count = await page.locator('input[type="number"]:not([data-predict] input)').count();
  for (let i = 0; i < count; i++) try {
    const input = page.locator('input[type="number"]:not([data-predict] input)').nth(i);
    const label = `${name}@${width} field ${i + 1}`;
    const msgId = await input.evaluate((el) => el.id + "-msg");
    const hasMsg = await page.locator(`#${msgId}`).count();
    check(hasMsg === 1, `${label}: no message element (not built with numberField)`);
    if (!hasMsg) continue;
    fieldsSeen++;
    if (!(await input.isVisible())) {
      const summary = input.locator("xpath=ancestor::details[1]/summary").filter({ hasText: "Edit numbers" });
      check((await summary.count()) === 1, `${label} at ${width}px: hidden, and no "Edit numbers" disclosure to open`);
      await summary.focus();
      check(await summary.evaluate((el) => document.activeElement === el), `${label} at ${width}px: "Edit numbers" is not focusable`);
      await page.keyboard.press("Enter");
      check(await input.isVisible(), `${label} at ${width}px: Enter on "Edit numbers" did not reveal the field`);
    }
    await input.scrollIntoViewIfNeeded();
    const good = await input.inputValue();
    for (const [what, act] of BAD) {
      await input.click();
      await page.keyboard.press("ControlOrMeta+A");
      await act(page, input);
      const state = await input.evaluate((el) => ({ invalid: el.getAttribute("aria-invalid"), described: el.getAttribute("aria-describedby"), msg: document.getElementById(el.id + "-msg").textContent }));
      check(state.invalid === "true" && state.described === msgId, `${label}, ${what}: not marked invalid`);
      check(/^(Please|Whole numbers)/.test(state.msg) && state.msg.length < 90, `${label}, ${what}: unclear message "${state.msg}"`);
      await page.keyboard.press("Tab"); // leave the box
      check((await input.inputValue()) === good, `${label}, ${what}: did not restore ${good}`);
    }
    await input.click();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.type(good);
    check((await page.locator(`#${msgId}`).textContent()) === "", `${label}: message not cleared by a valid entry`);
    check((await input.getAttribute("aria-invalid")) === null, `${label}: still marked invalid after a valid entry`);
  } catch (e) { check(false, `${name}@${width} field ${i + 1}: ${String(e.message).split("\n")[0]}`); }
  // Predict boxes: the answer is graded, so a non-number or a decimal must get a polite message, not a verdict.
  const predictBox = page.locator("[data-predict] input");
  for (let i = 0; i < await predictBox.count(); i++) {
    const host = page.locator("[data-predict]").nth(i);
    const box = host.locator("input");
    for (const [what, type, want] of [["a letter e", "e", /not a number/], ["a decimal", "1.5", /Whole numbers only/]]) {
      await box.scrollIntoViewIfNeeded();
      await box.click();
      await page.keyboard.press("ControlOrMeta+A");
      await page.keyboard.type(type);
      await host.locator("[data-check]").click();
      const text = (await host.locator(".feedback").textContent()) ?? "";
      check(want.test(text) && !/answer is/.test(text), `${name} predict ${i + 1}, ${what}: expected a polite message, got "${text}"`);
    }
  }
  check(errors.length === 0, `${name}@${width}: errors thrown: ${errors.join(" | ")}`);
  await page.context().close();
}
check(fieldsSeen > 0, "no number fields were found at all");
await browser.close();
close();
console.log(`${checks} checks, ${fieldsSeen} number fields, ${failures} failures`);
process.exit(failures ? 1 : 0);
