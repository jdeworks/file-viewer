// Global keyboard router for the image editor: Ctrl+Z / Ctrl+Y undo/redo, plus
// arrow-key nudging of a live pixel selection (routed to the editor's onArrow).
//
// One document-level keydown listener (installed once) routes keys to the
// most-recently-active image editor. The shortcut therefore fires no matter where
// focus sits *within* that editor — its range sliders, colour pickers, number
// fields and toolbar buttons all count. The previous per-instance handler bailed
// on ANY focused <input>/<select>, so adjusting the fill-tolerance slider (a
// <input type=range>) and then pressing Ctrl+Z did nothing. Genuine text fields
// (the text-label input, a Monaco editor, any contenteditable) keep their native
// per-character undo. Tracking a single "active" editor also stops two side-by-side
// editors from both undoing on one keystroke.

let active = null;       // { host, isEnabled, doUndo, doRedo }
let installed = false;

// Only true text-entry surfaces, where native per-character undo is the right
// behaviour. range / number / colour / checkbox / select are NOT text entry.
function isTextEntry(t) {
  if (!t) return false;
  if (t.isContentEditable || t.tagName === 'TEXTAREA') return true;
  if (t.tagName === 'INPUT') return /^(|text|search|url|email|tel|password)$/i.test(t.type || '');
  return false;
}

const ARROWS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

function onKey(e) {
  if (!active || !active.host.isConnected) return;
  if (active.isEnabled && !active.isEnabled()) return;     // e.g. ASCII mode is showing
  if (isTextEntry(e.target)) return;                       // let text fields keep arrows + native undo
  // Arrow-key nudge for an active pixel selection (Shift = move just the outline). The
  // editor returns truthy only when it actually consumed the key (a selection exists).
  const arrow = ARROWS[e.key];
  if (arrow && active.onArrow && active.onArrow(arrow[0], arrow[1], e.shiftKey)) { e.preventDefault(); return; }
  if (!(e.ctrlKey || e.metaKey)) return;
  const k = e.key.toLowerCase();
  if (k !== 'z' && k !== 'y') return;
  e.preventDefault();
  if (k === 'y' || (k === 'z' && e.shiftKey)) active.doRedo();
  else active.doUndo();
}

// Register an image editor as the undo/redo target. Returns an unregister fn for
// teardown. The editor reclaims "active" on any pointer interaction inside its
// host, so the last editor the user touched is the one a keystroke reaches.
export function registerUndoKeys(editor) {
  if (!installed) { document.addEventListener('keydown', onKey); installed = true; }
  active = editor;
  const claim = () => { active = editor; };
  editor.host.addEventListener('pointerdown', claim, true);
  return () => {
    editor.host.removeEventListener('pointerdown', claim, true);
    if (active === editor) active = null;
  };
}
