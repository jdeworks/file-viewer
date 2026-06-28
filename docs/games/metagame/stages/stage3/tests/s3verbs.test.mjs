// s3verbs.test.mjs — Stage 3 touch verb toggle: a plain tap applies the currently-selected verb. Pure
// (no DOM): verbToCell() is the mapping the renderer's tapCell() uses, and it feeds the SAME setCell()
// path a mouse click / keypress uses — so this proves "selected verb → applied to the tapped cell".
import assert from "node:assert/strict";
import { createBoard, setCell } from "../board.js";
import { verbToCell, S3_VERBS } from "../s3verbs.js";
import { FILLED, COLOR_B, EMPTY } from "../nonogram.js";

function freshBoard() {
  const solution = [[FILLED, EMPTY], [EMPTY, FILLED]];
  return createBoard({ width: 2, height: 2, solution, rowClues: [[1], [1]], colClues: [[1], [1]] });
}

// ── the bar offers exactly the four verbs, and each maps to the right cell op ─────────────────────
{
  assert.deepEqual(S3_VERBS, ["fillA", "fillB", "mark", "lock"]);
  assert.deepEqual(verbToCell("fillA"), { mark: false, color: FILLED });
  assert.deepEqual(verbToCell("fillB"), { mark: false, color: COLOR_B });
  assert.deepEqual(verbToCell("mark"), { mark: true, color: FILLED });
  assert.deepEqual(verbToCell("lock"), { lock: true });
}

// ── tapping a cell applies the SELECTED verb (Fill A / Fill B / Mark) ─────────────────────────────
{
  const b = freshBoard();
  const op = verbToCell("mark"); // "Mark" selected → tap (0,1)
  setCell(b, 0, 1, op.mark, op.color);
  assert.equal(b.marks[1][0], EMPTY, "tap with Mark selected marks the cell empty (✕)");
}
{
  const b = freshBoard();
  const op = verbToCell("fillA"); // "Fill A" selected → tap (0,0)
  setCell(b, 0, 0, op.mark, op.color);
  assert.equal(b.marks[0][0], FILLED, "tap with Fill A selected fills colour A");
}
{
  const b = freshBoard();
  const op = verbToCell("fillB"); // "Fill B" selected → tap (1,0)
  setCell(b, 1, 0, op.mark, op.color);
  assert.equal(b.marks[0][1], COLOR_B, "tap with Fill B selected fills colour B");
}

// ── Lock routes away from setCell (the renderer sends it to lockUnderCursor) ──────────────────────
{
  assert.equal(verbToCell("lock").lock, true, "Lock verb is flagged for the lock path, not a fill");
}
