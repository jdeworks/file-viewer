// board.test.mjs — Stage 4 ASCII board renderer.
import assert from "node:assert/strict";
import { buildPath } from "../lsystem.js";
import { boardText } from "../board.js";

const path = buildPath("alpha", 1);
const state = {
  recursion: { points: [] },
  towers: [{ type: "pulse_node", x: path.tiles[2].x, y: path.tiles[2].y }],
  enemies: [{ type: "recursion", x: path.tiles[1].x, y: path.tiles[1].y }]
};
const text = boardText(state, path.tiles);
const rows = text.split("\n");

// Entry and exit markers are present.
assert.ok(text.includes(">"), "entry marker present");
assert.ok(text.includes("X"), "exit marker present");
// Some path segment glyph rendered.
assert.ok(/[-|+]/.test(text), "path segment glyphs rendered");

// Tower and enemy glyphs land at their grid cells (row = y, col = x), enemy drawn over the path.
assert.equal(rows[path.tiles[2].y][path.tiles[2].x], "P", "tower glyph at its cell");
assert.equal(rows[path.tiles[1].y][path.tiles[1].x], "o", "enemy glyph at its cell");

// Grid is rectangular (every row the same width).
assert.ok(rows.every((r) => r.length === rows[0].length), "all rows equal width");

console.log("stage4 board tests passed");
