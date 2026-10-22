// localStorage that never throws: the site must work when storage is empty or blocked.
const prefix = "mlmath.";

export function readStore(key, fallback = null) {
  try {
    const raw = localStorage.getItem(prefix + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeStore(key, value) {
  try {
    localStorage.setItem(prefix + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
