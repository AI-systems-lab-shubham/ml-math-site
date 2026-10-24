// Classic script, loaded in <head>: applies the saved rail state before first paint so the rail does not flash.
// Same key as UI_KEY in shell.mjs. Storage may be blocked or empty; then the rail simply starts shown.
try {
  if (JSON.parse(localStorage.getItem("mlmath:ui:v1")).railHidden === true) document.documentElement.classList.add("rail-collapsed");
} catch (e) { /* no saved state */ }
