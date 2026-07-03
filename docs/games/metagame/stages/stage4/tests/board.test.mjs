// board.test.mjs — Stage 4 ASCII board renderer.
import assert from "node:assert/strict";
import { buildPath } from "../lsystem.js";
import { boardText, boardHTML } from "../board.js";

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

// boardHTML (colour-classed spans) must render the SAME 40×40 grid: stripping tags + decoding entities
// yields byte-identical text to boardText, so <pre> layout + char counts + the DOM-Range tap mapping
// are unchanged (only colour is added).
function plainOf(html) {
  return html.replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
}
const html = boardHTML(state, path.tiles);
const htmlPlain = plainOf(html);
assert.equal(htmlPlain, text, "boardHTML text content equals boardText exactly");
const hrows = htmlPlain.split("\n");
assert.equal(hrows.length, 40, "boardHTML has 40 rows");
assert.ok(hrows.every((r) => r.length === 40), "every boardHTML row is 40 chars");
assert.ok(html.includes('class="s4c-path"') || html.includes("s4c-recurve"), "path cells carry a colour class");
assert.ok(/s4c-t-(kinetic|support)/.test(html), "tower cell carries a damage-type class");
assert.ok(/s4c-e[123]/.test(html), "enemy cell carries a red-family shade class");

// Overlay (placement/selection/hit) adds classes but never changes the text.
const withOverlay = boardHTML(state, path.tiles, { rings: new Set(["0,0"]), foot: { x: 1, y: 1 }, footValid: false, hits: new Set(["2,2"]) });
assert.equal(plainOf(withOverlay), text, "overlay does not alter the rendered characters");
assert.ok(withOverlay.includes("s4c-range") && withOverlay.includes("s4c-foot-bad") && withOverlay.includes("s4c-hit"), "overlay classes applied");

console.log("stage4 board tests passed");
