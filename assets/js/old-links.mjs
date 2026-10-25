// Old links from when a module was one long page: modules/NN-slug/#concept-x (and a stage inside it, #concept-x-picture)
// now go to that concept's own page. Each module overview carries the map for its module as JSON.
// resolveOldHash is pure (tested in tests/old-links.test.mjs); the last lines run the redirect in the browser.

// Returns the address to go to (relative to the overview), with the hash kept so the stage still scrolls into place,
// or null when the hash is not an old concept link. A stage id must start with the whole concept id plus "-".
export function resolveOldHash(hash, map) {
  if (typeof hash !== "string" || hash.length < 2 || !map || typeof map !== "object") return null;
  let id;
  try { id = decodeURIComponent(hash.slice(1)); } catch { return null; }
  if (Object.prototype.hasOwnProperty.call(map, id)) return map[id];
  let best = null;
  for (const key of Object.keys(map)) if (id.startsWith(`${key}-`) && (best === null || key.length > best.length)) best = key;
  return best === null ? null : `${map[best]}#${id}`;
}

if (typeof document !== "undefined" && typeof location !== "undefined") {
  const go = () => {
    try {
      const data = document.getElementById("old-links")?.textContent;
      const target = data ? resolveOldHash(location.hash, JSON.parse(data)) : null;
      if (target) location.replace(new URL(target, location.href).href);
    } catch { /* a bad map or blocked navigation: the overview simply stays */ }
  };
  go();
  addEventListener("hashchange", go);   // an old link followed while the overview is already open
}
