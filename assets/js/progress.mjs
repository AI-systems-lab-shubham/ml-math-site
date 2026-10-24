// Learner progress, kept in localStorage under one key. Never throws: the site must
// work when storage is empty, blocked or corrupted.
import { chain, builtConcepts, findModule } from "./course.mjs";

export const STORAGE_KEY = "mlmath:progress:v1";
const VERSION = 1;

const emptyState = () => ({ v: VERSION, concepts: {}, last: null, open: {}, quiz: {} });
const isIso = (s) => typeof s === "string" && !Number.isNaN(Date.parse(s));
const isPlain = (o) => o !== null && typeof o === "object" && !Array.isArray(o);

// Returns a clean state object, or null if `raw` has the wrong shape.
export function validateState(raw) {
  if (!isPlain(raw) || raw.v !== VERSION || !isPlain(raw.concepts)) return null;
  const out = emptyState();
  for (const [id, rec] of Object.entries(raw.concepts)) {
    if (!isPlain(rec) || !isIso(rec.visited)) return null;
    if (rec.done !== null && !isIso(rec.done)) return null;
    out.concepts[id] = { visited: rec.visited, done: rec.done };
  }
  if (raw.last != null) {
    if (!isPlain(raw.last) || typeof raw.last.id !== "string" || !isIso(raw.last.at)) return null;
    out.last = { id: raw.last.id, at: raw.last.at };
  }
  if (isPlain(raw.open)) for (const [k, v] of Object.entries(raw.open)) if (v === true) out.open[k] = true;
  if (isPlain(raw.quiz)) out.quiz = raw.quiz;
  return out;
}

function defaultStorage() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

export function createProgress({ course, storage = defaultStorage(), now = () => new Date().toISOString() } = {}) {
  let state = emptyState();
  let recovered = false;   // true when saved data was unreadable and was reset
  let persistent = true;   // false when storage is blocked or full
  const listeners = new Set();

  try {
    const raw = storage?.getItem(STORAGE_KEY) ?? null;
    if (storage == null) persistent = false;
    if (raw !== null) {
      const parsed = validateState(JSON.parse(raw));
      if (parsed) state = parsed; else recovered = true;
    }
  } catch (err) {
    if (err instanceof SyntaxError) recovered = true; else persistent = false;
  }

  const known = (id) => !course || course.modules.some((m) => m.concepts.some((c) => c.id === id));
  const save = () => {
    try { storage.setItem(STORAGE_KEY, JSON.stringify(state)); persistent = true; }
    catch { persistent = false; }
    listeners.forEach((fn) => fn());
  };

  const api = {
    get recovered() { return recovered; },
    get persistent() { return persistent; },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

    status(id) {
      const rec = state.concepts[id];
      return !rec ? "new" : rec.done ? "done" : "visited";
    },

    markVisited(id) {
      if (!known(id)) return false;
      const at = now();
      if (!state.concepts[id]) state.concepts[id] = { visited: at, done: null };
      state.last = { id, at };
      save();
      return true;
    },

    // Explicit only. Calling with done=false undoes it; the concept stays visited.
    setDone(id, done = true) {
      if (!known(id)) return false;
      const at = now();
      const rec = state.concepts[id] ?? (state.concepts[id] = { visited: at, done: null });
      rec.done = done ? at : null;
      if (done) state.last = { id, at };
      save();
      return true;
    },

    // Where "Start / Resume" should go. { id, kind } or null when nothing is available.
    resume() {
      const list = chain(course);
      if (!list.length) return null;
      const lastId = state.last?.id;
      const i = list.findIndex((c) => c.id === lastId);
      if (i < 0) return { id: list[0].id, kind: "start" };
      if (api.status(lastId) !== "done") return { id: lastId, kind: "resume" };
      // last-visited is complete: next not-done concept after it, then any not-done one
      const after = [...list.slice(i + 1), ...list.slice(0, i)].find((c) => api.status(c.id) !== "done");
      return after ? { id: after.id, kind: "next" } : { id: null, kind: "all-done" };
    },

    // Counts built concepts only. percent is a whole number; 0 when nothing is built.
    moduleProgress(moduleId) {
      const mod = findModule(course, moduleId);
      const list = mod ? builtConcepts(mod) : [];
      const total = list.length;
      const done = list.filter((c) => api.status(c.id) === "done").length;
      const visited = list.filter((c) => api.status(c.id) === "visited").length;
      const all = mod ? mod.concepts.length : 0;
      return { total, done, visited, planned: all - total, all, percent: total === 0 ? 0 : Math.round((100 * done) / total) };
    },

    courseProgress() {
      const mods = course.modules.map((m) => api.moduleProgress(m.id));
      const total = mods.reduce((s, p) => s + p.total, 0);
      const done = mods.reduce((s, p) => s + p.done, 0);
      return { total, done, percent: total === 0 ? 0 : Math.round((100 * done) / total) };
    },

    isOpen(key) { return state.open[key] === true; },
    setOpen(key, open) { if (open) state.open[key] = true; else delete state.open[key]; save(); },

    exportJSON() { return JSON.stringify({ app: "mlmath", version: VERSION, progress: state }, null, 2); },

    // Returns { ok: true } or { ok: false, error }. Existing progress is untouched on failure.
    importJSON(text) {
      let data;
      try { data = JSON.parse(text); } catch { return { ok: false, error: "That file is not valid JSON." }; }
      if (!isPlain(data) || data.app !== "mlmath") return { ok: false, error: "That file is not an ML Math progress export." };
      if (data.version !== VERSION) return { ok: false, error: `Unsupported progress version: ${String(data.version)}.` };
      const clean = validateState(data.progress);
      if (!clean) return { ok: false, error: "The progress data in that file is malformed." };
      state = clean;
      recovered = false;
      save();
      return { ok: true };
    },

    reset() { state = emptyState(); save(); },
  };
  return api;
}
