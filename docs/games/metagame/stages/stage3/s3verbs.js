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

export function createVerbBar({ onSelect } = {}) {
  return createTouchControls({
    className: "s3-verbs",
    ariaLabel: "tap verb",
    toggle: true,
    onAction: onSelect,
    buttons: [
      { id: "fillA", label: "Fill A", ariaLabel: "tap to fill colour A" },
      { id: "fillB", label: "Fill B", ariaLabel: "tap to fill colour B" },
      { id: "mark", label: "Mark", ariaLabel: "tap to mark empty" },
      { id: "lock", label: "Lock", ariaLabel: "tap to lock volatile cell" },
    ],
  });
}
