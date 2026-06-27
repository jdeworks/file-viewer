// Shared HTML-escaping helpers for the stage 10 renderer modules. Kept in one tiny module so the
// stepper / final / confront renderers can each import them without re-declaring (and without a
// renderer.js ⇄ sub-renderer import cycle).
export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[char]);
}

export function escapeAttr(value) {
  return escapeHtml(value);
}
