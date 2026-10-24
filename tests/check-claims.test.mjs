import test from "node:test";
import assert from "node:assert/strict";
import { lintText } from "../tools/check-claims.mjs";

test("flags insider phrasing", () => {
  assert.equal(lintText("Inside OpenAI, internally at OpenAI they do this.").length, 1);
  assert.equal(lintText("We know that Anthropic uses a secret trick.").length, 1);
});

test("flags a named model with a hard number and no hedge", () => {
  assert.equal(lintText("GPT-4 has 1.8 trillion parameters.").length, 1);
});

test("allows the same claim when hedged, and public work", () => {
  assert.equal(lintText("As an illustration, a model like GPT-4 might have many layers; the real count is not disclosed.").length, 0);
  assert.equal(lintText("GPT-3 has 175 billion parameters (published in the GPT-3 paper).").length, 0);
});
