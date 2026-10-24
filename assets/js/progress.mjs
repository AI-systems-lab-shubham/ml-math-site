// Learner progress, kept in localStorage under one key. Never throws: the site must
// work when storage is empty, blocked or corrupted.
//
// Each concept has one of four statuses and the time it was set: { status, statusAt }.
// Opening a concept promotes only "not-started" to "in-progress". "complete" and "revisit"
// are set by the learner. Two tabs merge by the latest statusAt per concept.
import { chain, builtConcepts, findModule } from "./course.mjs";

export const STORAGE_KEY = "mlmath:progress:v1";
export const VERSION = 2;            // shape of the data inside the key (v1 had visited/done records)
export const STATUSES = ["not-started", "in-progress", "complete", "revisit"];
export const STATUS_LABEL = { "not-started": "Not started", "in-progress": "In progress", complete: "Complete", revisit: "Revisit" };

const emptyState = () => ({ v: VERSION, concepts: {}, last: null, open: {}, quiz: {} });
const isIso = (s) => typeof s === "string" && !Number.isNaN(Date.parse(s));
const isPlain = (o) => o !== null && typeof o === "object" && !Array.isArray(o);
const ms = (iso) => Date.parse(iso);

// Reads saved data of the current or the previous (v1) shape.
// Returns { state } on success, { newer: true } when the data was written by a later version of the
// site (it must be kept untouched), or null when the shape is wrong.
export function readState(raw) {
  if (!isPlain(raw) || !Number.isInteger(raw.v) || raw.v < 1) return null;
  if (raw.v > VERSION) return { newer: true };
  if (!isPlain(raw.concepts)) return null;
  const out = emptyState();
  for (const [id, rec] of Object.entries(raw.concepts)) {
    if (!isPlain(rec)) return null;
    if (raw.v === 1) {
      // done -> complete (at the time it was done); visited only -> in progress (at the time it was visited)
      if (!isIso(rec.visited)) return null;
      if (rec.done !== null && !isIso(rec.done)) return null;
      out.concepts[id] = rec.done ? { status: "complete", statusAt: rec.done } : { status: "in-progress", statusAt: rec.visited };
    } else {
      if (!STATUSES.includes(rec.status) || !isIso(rec.statusAt)) return null;
      out.concepts[id] = { status: rec.status, statusAt: rec.statusAt };
    }
  }
  if (raw.last != null) {
    if (!isPlain(raw.last) || typeof raw.last.id !== "string" || !isIso(raw.last.at)) return null;
    out.last = { id: raw.last.id, at: raw.last.at };
  }
  if (isPlain(raw.open)) for (const [k, v] of Object.entries(raw.open)) if (v === true) out.open[k] = true;
  if (isPlain(raw.quiz)) out.quiz = raw.quiz;
  return { state: out };
}

// Kept for callers that want a clean state or null.
export const validateState = (raw) => readState(raw)?.state ?? null;

// Per concept the later statusAt wins; a tie goes to `stored`. `last` follows the same rule.
// open and quiz come from `stored`, the copy other tabs also see.
export function mergeStates(local, stored) {
  const out = emptyState();
  for (const id of new Set([...Object.keys(local.concepts), ...Object.keys(stored.concepts)])) {
    const a = local.concepts[id];
    const b = stored.concepts[id];
    out.concepts[id] = !a ? { ...b } : !b ? { ...a } : ms(a.statusAt) > ms(b.statusAt) ? { ...a } : { ...b };
  }
  const l = local.last;
  const s = stored.last;
  out.last = !l ? s : !s ? l : ms(l.at) > ms(s.at) ? l : s;
  out.open = { ...stored.open };
  out.quiz = stored.quiz;
  return out;
}

function defaultStorage() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

export function createProgress({ course, storage = defaultStorage(), now = () => new Date().toISOString(), target = globalThis } = {}) {
  let state = emptyState();
  let recovered = false;   // true when saved data was unreadable and was reset
  let persistent = true;   // false when storage is blocked or full
  let newer = false;       // true when storage holds data from a later version: never written to
  const listeners = new Set();

  // Reads storage and folds it into memory. Never writes.
  const refresh = () => {
    let raw;
    try {
      if (storage == null) { persistent = false; return; }
      raw = storage.getItem(STORAGE_KEY);
    } catch { persistent = false; return; }
    if (raw == null) return;
    let parsed;
    try { parsed = readState(JSON.parse(raw)); } catch { parsed = null; }
    if (!parsed) { recovered = true; return; }
    if (parsed.newer) { newer = true; return; }
    state = mergeStates(state, parsed.state);
  };
  refresh();

  const notify = () => listeners.forEach((fn) => fn());
  const save = () => {
    if (!newer) {
      try { storage.setItem(STORAGE_KEY, JSON.stringify(state)); persistent = true; }
      catch { persistent = false; }
    }
    notify();
  };
  // Every change: re-read storage (another tab may have written), merge, apply, write.
  const change = (fn) => { refresh(); const r = fn(); save(); return r; };

  target?.addEventListener?.("storage", (ev) => {
    if (ev.key !== null && ev.key !== STORAGE_KEY) return;
    refresh();
    notify();
  });

  // Time for a change to one concept. If this browser's clock reads no later than the concept's saved
  // statusAt (the clock was set back), step 1 ms past it, so the learner's newer action still wins a merge.
  const stampFor = (id) => {
    const at = now();
    const prev = state.concepts[id]?.statusAt;
    return prev && ms(at) <= ms(prev) ? new Date(ms(prev) + 1).toISOString() : at;
  };
  const known = (id) => !course || course.modules.some((m) => m.concepts.some((c) => c.id === id));
  const statusOf = (id) => state.concepts[id]?.status ?? "not-started";

  const api = {
    get recovered() { return recovered; },
    get persistent() { return persistent; },
    // True when saved data came from a later version of the site. It is left as it is; reload to update.
    get needsReload() { return newer; },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    status: statusOf,

    // The learner opened the concept. Only not-started becomes in-progress.
    markOpened(id) {
      if (!known(id)) return false;
      return change(() => {
        const at = now();
        if (statusOf(id) === "not-started") state.concepts[id] = { status: "in-progress", statusAt: stampFor(id) };
        state.last = { id, at };
        return true;
      });
    },

    // Explicit, by the learner. Returns { previous } (for undo) or null for an unknown id or status.
    setStatus(id, status) {
      if (!known(id) || !STATUSES.includes(status)) return null;
      return change(() => {
        const at = now();
        const previous = { status: statusOf(id), statusAt: state.concepts[id]?.statusAt ?? null };
        state.concepts[id] = { status, statusAt: stampFor(id) };
        if (status !== "not-started") state.last = { id, at };
        return { previous };
      });
    },

    // Puts back what setStatus returned as `previous`. The restore is a new change with a new statusAt,
    // so it also wins a merge with another tab.
    undo(id, previous) {
      return previous ? api.setStatus(id, previous.status) : null;
    },

    // Where "Start / Resume" should go: { id, kind } with kind start | resume | next | all-done, or null.
    resume() {
      const list = chain(course);
      if (!list.length) return null;
      const inProgress = list.filter((c) => statusOf(c.id) === "in-progress");
      const lastId = state.last?.id;
      if (inProgress.some((c) => c.id === lastId)) return { id: lastId, kind: "resume" };
      if (inProgress.length) {
        const newest = inProgress.reduce((a, b) => (ms(state.concepts[b.id].statusAt) > ms(state.concepts[a.id].statusAt) ? b : a));
        return { id: newest.id, kind: "resume" };
      }
      const i = list.findIndex((c) => c.id === lastId);
      const touched = list.some((c) => statusOf(c.id) !== "not-started");
      const after = [...list.slice(i + 1), ...list.slice(0, Math.max(i, 0))].find((c) => statusOf(c.id) === "not-started");
      if (after) return { id: after.id, kind: touched ? "next" : "start" };
      return { id: null, kind: "all-done" };
    },

    // Built concepts marked "revisit", in course order.
    revisitList() {
      return chain(course).filter((c) => statusOf(c.id) === "revisit");
    },

    // Counts built concepts only. percent is a whole number of complete concepts; revisit never counts as complete.
    moduleProgress(moduleId) {
      const mod = findModule(course, moduleId);
      const list = mod ? builtConcepts(mod) : [];
      const total = list.length;
      const count = (st) => list.filter((c) => statusOf(c.id) === st).length;
      const done = count("complete");
      const all = mod ? mod.concepts.length : 0;
      return { total, done, inProgress: count("in-progress"), revisit: count("revisit"), planned: all - total, all, percent: total === 0 ? 0 : Math.round((100 * done) / total) };
    },

    courseProgress() {
      const mods = course.modules.map((m) => api.moduleProgress(m.id));
      const total = mods.reduce((s, p) => s + p.total, 0);
      const done = mods.reduce((s, p) => s + p.done, 0);
      const revisit = mods.reduce((s, p) => s + p.revisit, 0);
      return { total, done, revisit, percent: total === 0 ? 0 : Math.round((100 * done) / total) };
    },

    isOpen(key) { return state.open[key] === true; },
    setOpen(key, open) { change(() => { if (open) state.open[key] = true; else delete state.open[key]; }); },

    // Always the current format.
    exportJSON() { return JSON.stringify({ app: "mlmath", version: VERSION, progress: state }, null, 2); },

    // Accepts files exported by the previous version (1) and this one (2).
    // Returns { ok: true } or { ok: false, error }. Existing progress is untouched on failure.
    importJSON(text) {
      let data;
      try { data = JSON.parse(text); } catch { return { ok: false, error: "That file is not valid JSON." }; }
      if (!isPlain(data) || data.app !== "mlmath") return { ok: false, error: "That file is not an ML Math progress export." };
      if (data.version > VERSION) return { ok: false, error: "That file was saved by a newer version of the site. Reload this page to update, then try again." };
      if (data.version !== 1 && data.version !== VERSION) return { ok: false, error: `Unsupported progress version: ${String(data.version)}.` };
      if (newer) return { ok: false, error: "Saved progress is from a newer version of the site. Reload this page to update first." };
      const parsed = readState(data.progress);
      if (!parsed?.state || data.progress.v !== data.version) return { ok: false, error: "The progress data in that file is malformed." };
      state = parsed.state;
      recovered = false;
      save();
      return { ok: true };
    },

    // Clears every status. Records stay as "not-started" so another tab's older ones cannot come back in a merge.
    reset() {
      change(() => {
        for (const id of Object.keys(state.concepts)) state.concepts[id] = { status: "not-started", statusAt: stampFor(id) };
        state.last = null;
      });
    },
  };
  return api;
}
