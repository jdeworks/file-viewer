// lsystem.test.mjs — Stage 4 path generator: determinism, bounds, depth, recurve.
import assert from "node:assert/strict";
import { buildPath, waveGroupDepth, pathTileIndex } from "../lsystem.js";

// ── wave-group depth mapping ────────────────────────────────────────────────────────────────────
assert.equal(waveGroupDepth(1), 1, "wave 1 → depth 1");
assert.equal(waveGroupDepth(10), 1, "wave 10 → depth 1");
assert.equal(waveGroupDepth(11), 2, "wave 11 → depth 2");
assert.equal(waveGroupDepth(20), 2, "wave 20 → depth 2");
assert.equal(waveGroupDepth(21), 3, "wave 21 → depth 3");
assert.equal(waveGroupDepth(31), 3, "wave 31 → depth 3");

// ── determinism + structure ─────────────────────────────────────────────────────────────────────
{
  const a = buildPath("alpha", 1);
  const b = buildPath("alpha", 1);
  assert.deepEqual(a.tiles, b.tiles, "same seed/depth ⇒ identical path");
  assert.notDeepEqual(a.entry, a.exit, "entry and exit are distinct");
  assert.ok(a.tiles.length >= 4, "depth-1 path has a handful of tiles");
  for (const t of a.tiles) {
    assert.ok(t.x >= 0 && t.x <= 39 && t.y >= 0 && t.y <= 39, `tile ${t.x},${t.y} in bounds`);
  }
}

// ── depth 3 produces recurve zones (the fold-back double-damage tiles) ────────────────────────────
{
  const deep = buildPath("alpha", 3);
  assert.ok(deep.recurveTiles.size > 0, "depth-3 path has recurve tiles");
  assert.ok(deep.tiles.some((t) => t.recurve), "recurve tiles are flagged on the traversable list");
  assert.ok(deep.tiles.length > buildPath("alpha", 1).tiles.length, "deeper path is longer");
}

// ── pathTileIndex maps cells to their first index ─────────────────────────────────────────────────
{
  const { tiles } = buildPath("alpha", 2);
  const index = pathTileIndex(tiles);
  assert.equal(index.get(`${tiles[0].x},${tiles[0].y}`), 0, "entry maps to index 0");
  assert.equal(index.size <= tiles.length, true, "index has no more entries than tiles");
}

console.log("stage4 lsystem tests passed");
