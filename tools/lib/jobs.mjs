// How many things run at once (pages in ui-verify and measure-widgets, test files in node --test).
// Default 2 keeps a shared or small machine responsive; MLMATH_JOBS overrides it.
export function defaultJobs() {
  const n = Number.parseInt(process.env.MLMATH_JOBS ?? "", 10);
  return Number.isInteger(n) && n >= 1 ? n : 2;
}

// A Playwright TimeoutError in a step's output usually means the machine was too busy, not that the page is wrong.
// The step still fails; this only changes the label.
export const isTimeout = (out) => /\bTimeoutError\b/.test(out);
