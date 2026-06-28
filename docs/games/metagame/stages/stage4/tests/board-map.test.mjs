// board-map.test.mjs — Stage 4 tap → cell mapping (the scroll-aware coordinate math).
import assert from "node:assert/strict";
import { cellFromTextRect } from "../combat-board-map.js";

const cols = 40, rows = 40;

// Unscrolled board: text block at (10,20), 320×460 → cellW 8, cellH 11.5.
const rect0 = { left: 10, top: 20, width: 320, height: 460 };
// A tap in the top-left glyph → cell (0,0).
assert.deepEqual(cellFromTextRect({ clientX: 12, clientY: 22, textRect: rect0, cols, rows }), { x: 0, y: 0 });
// A tap near the far edge maps to the last cell, not past it.
assert.deepEqual(cellFromTextRect({ clientX: 10 + 319, clientY: 20 + 459, textRect: rect0, cols, rows }), { x: 39, y: 39 });
// Mid-board.
assert.deepEqual(cellFromTextRect({ clientX: 10 + 8 * 5 + 1, clientY: 20 + 11.5 * 9 + 1, textRect: rect0, cols, rows }), { x: 5, y: 9 });

// SCROLLED board: the user scrolled ~100px down, so the rendered text rect's top is shifted up by 100
// (Range/getBoundingClientRect report the on-screen position). The SAME client Y must now resolve to
// a deeper row — proving the mapping is scroll-aware (the old box-relative math returned the wrong row).
const rectScrolled = { left: 10, top: 20 - 100, width: 320, height: 460 };
const unscrolled = cellFromTextRect({ clientX: 50, clientY: 200, textRect: rect0, cols, rows });
const scrolled = cellFromTextRect({ clientX: 50, clientY: 200, textRect: rectScrolled, cols, rows });
assert.ok(scrolled.y > unscrolled.y, "same tap maps to a deeper row once the board is scrolled");
// Exact: (200 - (-80)) / 11.5 = 24.3 → row 24.
assert.equal(scrolled.y, 24, "scrolled tap resolves to the expected cell");

// Out-of-bounds taps (above / left of the text, or past it) return null.
assert.equal(cellFromTextRect({ clientX: 5, clientY: 22, textRect: rect0, cols, rows }), null, "left of board → null");
assert.equal(cellFromTextRect({ clientX: 12, clientY: 5, textRect: rect0, cols, rows }), null, "above board → null");
assert.equal(cellFromTextRect({ clientX: 10 + 321, clientY: 22, textRect: rect0, cols, rows }), null, "right of board → null");

// Degenerate inputs are safe.
assert.equal(cellFromTextRect({ clientX: 0, clientY: 0, textRect: null, cols, rows }), null, "no rect → null");
assert.equal(cellFromTextRect({ clientX: 12, clientY: 22, textRect: { left: 10, top: 20, width: 0, height: 0 }, cols, rows }), null, "zero-size rect → null");

console.log("stage4 board-map tests passed");
