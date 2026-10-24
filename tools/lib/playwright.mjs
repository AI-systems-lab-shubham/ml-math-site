// Shared helpers for browser checks: find Playwright (nothing is installed here) and serve the site locally.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export async function loadPlaywright() {
  for (const name of ["playwright", "playwright-core"]) {
    try { return await import(name); } catch { /* try the next */ }
  }
  try {
    // Fall back to the copy bundled with the globally installed @playwright/cli.
    const globalRoot = execFileSync("npm", ["root", "-g"], { encoding: "utf8" }).trim();
    const req = createRequire(path.join(globalRoot, "@playwright/cli/package.json"));
    return req("playwright");
  } catch {
    return null;
  }
}

// Loads Playwright or exits 1 with a loud message: a skipped browser check is not a pass.
export async function requirePlaywright(what) {
  const pw = await loadPlaywright();
  if (!pw?.chromium) {
    console.error("\n########################################################");
    console.error(`# SKIPPED: ${what} did NOT run.`);
    console.error("# Playwright is not importable from Node here.");
    console.error("# This is not a pass. Exiting with status 1.");
    console.error("########################################################\n");
    process.exit(1);
  }
  return pw;
}

const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".ttf": "font/ttf", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".txt": "text/plain" };

// Serves `dir` (default: the repo) on a random local port. Returns { base, close }.
export async function serveStatic(dir = siteRoot) {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (p.endsWith("/")) p += "index.html";
    const file = path.join(dir, p);
    if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404, { "content-type": "text/plain" }).end("not found"); return; }
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { base: `http://127.0.0.1:${server.address().port}/`, close: () => new Promise((r) => server.close(r)) };
}
