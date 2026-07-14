// Shared app-shell state + tiny DOM/UI primitives. Extracted from app.js (which is the orchestrator)
// so feature modules can import the SAME `state` object and helpers without importing app.js back —
// avoiding a circular dependency. app.js and every extracted module import from here.

export const $ = (id) => document.getElementById(id);
export const isMobile = () => window.matchMedia('(max-width: 760px)').matches;

export const state = {
  intake: null,
  type: null,
  settingsModel: null,   // WP03 settings model for the active type
  rawview: null,         // WP13 RawView controller (owns original+current models, 4 modes)
  preview: null,         // iframe controller
  binaryEdit: null,      // preview-owned edited bytes for binary formats that support saving
  rawMode: 'current',    // original | current | diff | movediff
  mode: 'split',         // desktop view mode: raw | split | preview
  tab: 'raw',            // mobile active tab
  syncing: false,
  treeApi: null,         // folder tree controller (setActive)
  htmlAllowScripts: false,
  htmlAsked: false,
  htmlRemotePresetAllowed: null, // preset id confirmed for this file; reset on every intake
  renderFolderPath: null,        // target path while a folder file is rendering (before commit)
  known: null,           // matched known-file enhancement (Layer 3), or null
  forceBase: false,      // user toggled "show the plain view" -> bypass the enhancement
  folderEdits: new Map(),    // path -> edited text for files opened from a loaded folder
  folderMoves: new Map(),    // original path -> current path for virtual folder reordering
  currentFolderPath: null,   // path of the currently-open folder file (null for single files)
  sessionIntakes: new Map(), // filename -> intake for individually-opened files (session history)
  sessionEdits: new Map(),   // filename -> edited text for individually-opened session files
  sessionTree: false,        // true when the sidebar is showing the session history tree
  archiveTree: false,        // true when the sidebar is showing entries from an opened archive
  archiveOpenNode: null,     // path -> open a lazily extracted archive entry through the tree
  sidebarRoots: null,        // combined removable sidebar roots for opened files/folders/archives
  activeSidebarRootId: null, // currently active root in the combined sidebar
};

// Transient toast. Lives here (not app.js) because many extracted modules surface errors via it.
export function toast(msg, ms = 2600) {
  const t = $('toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (t.hidden = true), ms);
}

// Overlay-local Monaco rawviews (side-by-side panes + compare diff) register here so a live editor
// settings change reaches them too — the primary editor is updated via state.rawview separately.
// Controllers add themselves on create and remove themselves on dispose. (settings audit 2026-07-13)
export const activeRawviews = new Set();

// Shared pure helpers used across the shell + extracted modules. themeIsDark reads the current
// theme off the root element (applyTheme, which stays in app.js, writes it).
export const themeIsDark = () => document.documentElement.dataset.theme === 'dark';
export const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const formatBytes = (n) => { if (n < 1024) return n + ' B'; if (n < 1048576) return (n / 1024).toFixed(1) + ' KB'; return (n / 1048576).toFixed(2) + ' MB'; };
export const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
