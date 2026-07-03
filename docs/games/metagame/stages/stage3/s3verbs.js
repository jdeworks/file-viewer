// Stage 3 touch verb toggle — the fix for the BROKEN touch state (mark / colour-B / lock were
// right-/alt-/keyboard-only). A single-select bar (Fill A / Fill B / Mark / Lock) using the shared
// touch component lets a plain TAP on a cell express every verb. Desktop keeps mouse/keyboard paths
// (the bar is display:none off-touch); a plain left-tap on touch applies the selected verb.

import { createTouchControls } from "../../touch-controls.js";
import { FILLED, COLOR_B } from "./nonogram.js";

export const S3_VERBS = ["fillA", "fillB", "mark", "lock"];

// Pure mapping from a selected verb to the cell op. `lock:true` routes to lockUnderCursor; otherwise
// {mark,color} feed the SAME applyCell()/setCell() path a click or keypress uses, so rules are identical.
export function verbToCell(verb) {
  if (verb === "lock") return { lock: true };
  if (verb === "mark") return { mark: true, color: FILLED };
  if (verb === "fillB") return { mark: false, color: COLOR_B };
  return { mark: false, color: FILLED }; // fillA (default)
}

// The keyboard shortcut each verb maps to (UX audit #5 — the verb bar is the primary teacher, so the
// key lives ON the button as a small kbd hint, hidden on coarse pointers via CSS).
const VERB_KEY = { fillA: "space", fillB: "G", mark: "X", lock: "L" };

export function createVerbBar({ onSelect } = {}) {
  const bar = createTouchControls({
    className: "s3-verbs",
    ariaLabel: "verb",
    toggle: true,
    onAction: onSelect,
    buttons: [
      { id: "fillA", label: "Fill A", ariaLabel: "fill colour A (space)" },
      { id: "fillB", label: "Fill B", ariaLabel: "fill colour B (g)" },
      { id: "mark", label: "Mark", ariaLabel: "mark empty (x)" },
      { id: "lock", label: "Lock", ariaLabel: "lock volatile cell (l)" },
    ],
  });
  // Attach a kbd hint to each verb button (shown on fine pointers, hidden on coarse — see styles.css).
  for (const [id, key] of Object.entries(VERB_KEY)) {
    const btn = bar.el.querySelector(`[data-touch="${id}"]`);
    if (!btn) continue;
    const kbd = document.createElement("kbd");
    kbd.className = "s3-verb-key";
    kbd.textContent = key;
    btn.append(kbd);
  }
  return bar;
}
