// Board scaler (#1) — the pure cell-size solve: fit the largest cell into the host, clamped, so the
// puzzle is the dominant object; a bigger board yields a smaller cell; the floor/ceiling hold.
import assert from "node:assert/strict";
import { computeCell, MAX_CELL, CLUE_RATIO } from "../s3fit.js";

const dims = (n, clue = 2) => ({ width: n, height: n, maxRow: clue, maxCol: clue });

// Fits the available box: a roomy host on a small board caps at MAX_CELL.
assert.equal(computeCell(2000, 2000, dims(5)), MAX_CELL, "abundant space clamps up to MAX_CELL");

// A tiny host clamps to the floor (fine-pointer default 24; coarse floor 36 passed explicitly).
assert.equal(computeCell(40, 40, dims(12), 24), 24, "cramped host clamps to the fine-pointer floor");
assert.equal(computeCell(40, 40, dims(12), 36), 36, "cramped host clamps to the coarse (touch) floor");

// Larger boards get smaller cells in the same host (monotonic).
{
  const small = computeCell(400, 400, dims(6));
  const big = computeCell(400, 400, dims(12));
  assert(big <= small, "a 12×12 packs into a smaller cell than a 6×6 in the same host");
}

// Solves the width equation: (maxRow*CLUE_RATIO + width) * cell ≈ availW.
{
  const d = dims(10, 3);
  const availW = 600;
  const cell = computeCell(availW, 0, d, 10, 100); // height 0 → width-driven; generous ceiling
  const used = (d.maxRow * CLUE_RATIO + d.width) * cell;
  assert(used <= availW && used > availW - (d.maxRow * CLUE_RATIO + d.width), "cell is the largest integer that fits the width");
}

console.log("stage3 board-fit tests passed");
