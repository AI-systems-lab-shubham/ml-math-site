// Pure helper for the saved interface preferences (mlmath:ui:v1). Old versions of the site also saved which outline
// modules were open (`outlineOpen`); that is no longer used, so it is dropped whenever the preferences are read.
export function cleanUi(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return {};
  const { outlineOpen, ...rest } = value;
  return rest;
}
