// preview.test.mjs — Stage 4 placement/selection preview + wave preview (PURE helpers; no engine writes).
import assert from "node:assert/strict";
import { placementPreview, rangeRing, wavePreviewLine, towerRange } from "../combat-helpers.js";
import { buildPath } from "../lsystem.js";

const path = buildPath("alpha", 1);
const onPath = path.tiles[3];

// A tower already on the board makes its cell an occupied (invalid) placement.
const state = { cycles: 1000, towers: [{ id: "t", type: "pulse_node", x: 5, y: 5 }] };

// A clear, affordable, off-path empty cell is VALID and never mutates state.
const before = JSON.stringify(state);
const ok = placementPreview(state, path.tiles, "pulse_node", { x: 20, y: 20 });
assert.equal(ok.valid, true, "clear empty off-path cell is a valid placement");
assert.deepEqual(ok.foot, { x: 20, y: 20 }, "footprint is the target cell");
assert.ok(ok.rings.size > 0, "a range ring is computed for a ranged tower");
assert.equal(JSON.stringify(state), before, "placementPreview does not mutate state");

// Invalid cases surface a reason (occupied / path / bounds / cycles) and valid=false.
assert.equal(placementPreview(state, path.tiles, "pulse_node", { x: 5, y: 5 }).reason, "occupied", "occupied cell invalid");
assert.equal(placementPreview(state, path.tiles, "pulse_node", { x: onPath.x, y: onPath.y }).reason, "path", "on-path cell invalid");
assert.equal(placementPreview(state, path.tiles, "pulse_node", { x: -1, y: 0 }).reason, "bounds", "off-board invalid");
assert.equal(placementPreview({ cycles: 0, towers: [] }, path.tiles, "null_spike", { x: 9, y: 9 }).reason, "cycles", "unaffordable invalid");

// Range ring is symmetric to the engine's Euclidean range; global towers (mortar) draw no ring (noise).
assert.equal(towerRange("glyph_mortar"), Infinity, "global mortar range is Infinity");
assert.equal(rangeRing("glyph_mortar", { x: 20, y: 20 }).size, 0, "global tower draws no ring");
assert.equal(rangeRing("cycle_extractor", { x: 20, y: 20 }).size, 0, "range-0 economy tower draws no ring");
assert.ok(rangeRing("pulse_node", { x: 20, y: 20 }).has("20,23") === true, "range 3 reaches 3 cells away");
assert.ok(rangeRing("pulse_node", { x: 20, y: 20 }).has("20,24") === false, "range 3 stops at 3 cells");

// Wave preview line is a compact, human one-liner (UX audit #6).
const line = wavePreviewLine(0, 1);
assert.ok(typeof line === "string" && line.length > 0 && !line.includes("_"), "wave preview is a clean one-liner");

console.log("stage4 preview tests passed");
