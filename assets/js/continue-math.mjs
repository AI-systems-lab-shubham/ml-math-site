// Pure helpers for "Mark complete and continue" and its undo toast (tested in tests/continue-math.test.mjs).
import { STATUSES } from "./progress.mjs";

export const PENDING_KEY = "mlmath:continue:v1";   // sessionStorage: an undo that has to survive a page change
export const PENDING_TTL_MS = 60_000;              // such an undo is forgotten after about a minute
export const TOAST_MS = 12_000;                    // time the toast stays, counted only while it is not hovered or focused
export const TOAST_MIN_MS = 10_000;                // never shorter than this

// What the primary button does for a concept: "mark-continue" | "continue" | "mark" | "none".
export function continueMode(status, next) {
  if (next) return status === "complete" ? "continue" : "mark-continue";
  return status === "complete" ? "none" : "mark";
}

export function continueLabel(mode, nextTitle) {
  return { "mark-continue": "Mark complete and continue", continue: `Continue to ${nextTitle}`, mark: "Mark complete", none: "" }[mode];
}

export const makePending = ({ id, title, previous, expectedAt }, nowMs) => ({ id, title, previous: { status: previous.status }, expectedAt, at: nowMs });

// Parses the stored text. Returns the pending undo, or null when it is missing, malformed, unknown or older than the TTL.
export function readPending(raw, nowMs, known = () => true) {
  if (typeof raw !== "string") return null;
  let p;
  try { p = JSON.parse(raw); } catch { return null; }
  if (p === null || typeof p !== "object" || Array.isArray(p)) return null;
  if (typeof p.id !== "string" || typeof p.title !== "string" || typeof p.expectedAt !== "string" || Number.isNaN(Date.parse(p.expectedAt))) return null;
  if (p.previous === null || typeof p.previous !== "object" || !STATUSES.includes(p.previous.status)) return null;
  if (typeof p.at !== "number" || !Number.isFinite(p.at)) return null;
  const age = nowMs - p.at;
  if (age < -5000 || age > PENDING_TTL_MS) return null;
  if (!known(p.id)) return null;
  return { id: p.id, title: p.title, previous: { status: p.previous.status }, expectedAt: p.expectedAt };
}

// Countdown that stops while the learner hovers or focuses the toast. Times are passed in, so tests use a fake clock.
export class ToastTimer {
  constructor(ms = TOAST_MS) { this.left = ms; this.since = null; }
  start(now) { this.since = now; return this; }
  pause(now) { if (this.since !== null) { this.left -= now - this.since; this.since = null; } }
  resume(now) { if (this.since === null) this.since = now; }
  remaining(now) { return this.since === null ? this.left : this.left - (now - this.since); }
  expired(now) { return this.remaining(now) <= 0; }
}
