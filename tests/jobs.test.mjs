import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultJobs, isTimeout } from "../tools/lib/jobs.mjs";

test("defaultJobs is 2 unless MLMATH_JOBS is a positive integer", () => {
  const saved = process.env.MLMATH_JOBS;
  try {
    delete process.env.MLMATH_JOBS; assert.equal(defaultJobs(), 2);
    process.env.MLMATH_JOBS = "5"; assert.equal(defaultJobs(), 5);
    for (const bad of ["0", "-1", "abc", ""]) { process.env.MLMATH_JOBS = bad; assert.equal(defaultJobs(), 2); }
  } finally { if (saved === undefined) delete process.env.MLMATH_JOBS; else process.env.MLMATH_JOBS = saved; }
});

test("isTimeout recognises Playwright TimeoutError only", () => {
  assert.equal(isTimeout("page.goto: TimeoutError: Timeout 30000ms exceeded"), true);
  assert.equal(isTimeout("FAIL overlap on m00-slope"), false);
});
