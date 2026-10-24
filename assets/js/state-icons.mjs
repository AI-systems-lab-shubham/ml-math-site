// The four progress states as icons. Each has its own shape as well as its own colour:
// empty circle, half-filled circle, filled circle with a tick, open arc with an arrowhead.
// Pure strings, so tests can import it without a DOM.
import { STATUS_LABEL } from "./progress.mjs";

const base = '<svg class="state-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">';

const SHAPES = {
  "not-started": '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/>',
  "in-progress": '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
  complete: '<circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M7 12.5l3.2 3.2L17 8.8" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
  revisit: '<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8M21 3v5h-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
};

export const stateIcon = (status) => `${base}${SHAPES[status] ?? SHAPES["not-started"]}</svg>`;
export const stateLabel = (status) => STATUS_LABEL[status] ?? STATUS_LABEL["not-started"];
// Accessible name of the outline's status button. It does not repeat the concept title (the row supplies it).
export const statusButtonName = (status) => `Status: ${stateLabel(status)}. Change status.`;
