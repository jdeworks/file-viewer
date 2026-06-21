// Pure text-utility transforms shared by the main raw-editor toolbar (rawpane-toolbars.js) and the
// per-pane side-by-side toolbar (sidebyside-toolbar.js). No DOM, no global state — just functions
// over strings/arrays plus the trim-mode localStorage helpers. Keeping these here lets both toolbars
// reuse identical behavior instead of duplicating it.

// ── Trim mode (whitespace-only vs. also drop blank lines), remembered in localStorage ──
export const TRIM_MODE_KEY = 'fv:textutil:trimMode';

export function getTrimMode() {
  try { return localStorage.getItem(TRIM_MODE_KEY) === 'ws+lines' ? 'ws+lines' : 'ws'; }
  catch { return 'ws'; }
}

export function setTrimMode(mode) {
  try { localStorage.setItem(TRIM_MODE_KEY, mode); } catch { /* ignore */ }
}

// Per-line trim by direction. In 'ws+lines' mode, blank lines are dropped after trimming.
const TRIM_DIR = {
  trim: (s) => s.trim(),
  ltrim: (s) => s.replace(/^\s+/, ''),
  rtrim: (s) => s.replace(/\s+$/, ''),
};

// Whole-line transforms: each takes an array of lines and returns the transformed array.
const LINE_TRANSFORMS = {
  sortAsc: (lines) => [...lines].sort((a, b) => a.localeCompare(b)),
  sortDesc: (lines) => [...lines].sort((a, b) => b.localeCompare(a)),
  dedup: (lines) => {
    const seen = new Set();
    return lines.filter((l) => (seen.has(l) ? false : (seen.add(l), true)));
  },
};

// Resolve an action to a lines→lines transform (sort/dedup static; trim variants read the mode).
// `trimMode` defaults to the persisted mode so callers can override it explicitly if desired.
export function lineTransformFor(action, trimMode = getTrimMode()) {
  if (LINE_TRANSFORMS[action]) return LINE_TRANSFORMS[action];
  const dir = TRIM_DIR[action];
  if (!dir) return null;
  const dropBlank = trimMode === 'ws+lines';
  return (lines) => {
    const out = lines.map(dir);
    return dropBlank ? out.filter((l) => l.trim() !== '') : out;
  };
}

// Base64 helpers (UTF-8 safe). Throw on invalid input so callers can toast.
export function b64encode(text) {
  return btoa(unescape(encodeURIComponent(text)));
}
export function b64decode(text) {
  return decodeURIComponent(escape(atob(text)));
}
