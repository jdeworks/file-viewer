// reshape.test.mjs — Stage 4: the per-wave-group L-system path RESHAPE (Round-4 primary fix) plus the
// secondary combat-UI helpers (progressive unlock, sell preview, tower-on-moved-path handling, tower-id
// round-trip). Proves the signature mechanic is now LIVE: the path differs across wave groups, and a
// tower caught on the reshaped road is refunded (towers never move — research intent).
import assert from 'node:assert/strict';
import { buildPath, mapPathDepth } from '../lsystem.js';
import { MAPS, mapPathSeed } from '../maps.js';
import {
  availableTowers, refundTowersOnPath, sellValue, reshapesAfter, preWaveHint,
} from '../combat-helpers.js';
import { placeTower } from '../boss.js';
import { sellTower } from '../upgrades.js';
import { defaultState, normalizeState } from '../state.js';
import { TOWER_TYPES } from '../towers.js';

// ── mapPathDepth: depth-1 maps never reshape; deeper maps fold at the group boundaries, capped ──────
assert.equal(mapPathDepth(1, 1), 1);
assert.equal(mapPathDepth(1, 99), 1, 'a depth-1 map stays depth 1 forever (onboarding stays stable)');
assert.equal(mapPathDepth(2, 10), 1, 'wave 10 is still the shallow group');
assert.equal(mapPathDepth(2, 11), 2, 'a depth-2 map folds to depth 2 at wave 11');
assert.equal(mapPathDepth(2, 45), 2, 'a depth-2 map is capped at depth 2');
assert.equal(mapPathDepth(3, 20), 2);
assert.equal(mapPathDepth(3, 21), 3, 'a depth-3 map folds to depth 3 at wave 21');

// ── the path ACTUALLY reshapes across wave groups (the Round-3 CRITICAL gap, now wired) ─────────────
{
  const seed = mapPathSeed('fractal-test', 2); // map index 2 = fractal-atrium, depth 2
  assert.equal(MAPS[2].depth, 2, 'map 2 is a depth-2 map');
  const early = buildPath(seed, mapPathDepth(MAPS[2].depth, 5));  // wave 5  → depth 1
  const late = buildPath(seed, mapPathDepth(MAPS[2].depth, 15));  // wave 15 → depth 2
  assert.notDeepEqual(early.tiles, late.tiles, 'path tiles differ across the wave-group boundary');
  assert.ok(late.tiles.length > early.tiles.length, 'the deeper fold is a longer path');
}

// ── a depth-3 map reshapes TWICE (depth 1 → 2 → 3) ─────────────────────────────────────────────────
{
  const seed = mapPathSeed('x', 4); // map index 4 = infinite-approach, depth 3
  assert.equal(MAPS[4].depth, 3);
  const d1 = buildPath(seed, mapPathDepth(MAPS[4].depth, 5)).tiles;
  const d2 = buildPath(seed, mapPathDepth(MAPS[4].depth, 15)).tiles;
  const d3 = buildPath(seed, mapPathDepth(MAPS[4].depth, 25)).tiles;
  assert.notDeepEqual(d1, d2, 'first fold (wave 11) changes the path');
  assert.notDeepEqual(d2, d3, 'second fold (wave 21) changes the path again');
  assert.ok(d3.some((t) => t.recurve), 'the deepest fold introduces recurve (double-damage) tiles');
}

// ── tower-on-moved-path is handled: refunded (full invested) + removed; off-path towers stay PUT ────
{
  const state = defaultState({ seed: 'alpha' });
  state.cycles = 2000;
  const newPath = buildPath('alpha', 2);
  const onTile = newPath.tiles[3];
  placeTower(state, { x: onTile.x, y: onTile.y, type: 'pulse_node' }); // will be caught by the fold
  placeTower(state, { x: 39, y: 39, type: 'pulse_node' });             // corner — always off the path (bounds 2..37)
  const towersBefore = state.towers.length;
  const cyclesBefore = state.cycles;
  const { count, refund } = refundTowersOnPath(state, newPath.tiles);
  assert.equal(count, 1, 'exactly the tower on the new road is displaced');
  assert.equal(state.towers.length, towersBefore - 1, 'displaced tower removed');
  assert.equal(refund, TOWER_TYPES.pulse_node.cost, 'full invested cost refunded (forced displacement, no haircut)');
  assert.equal(state.cycles, cyclesBefore + refund, 'cycles credited the refund');
  assert.ok(!state.towers.some((t) => t.x === onTile.x && t.y === onTile.y), 'no tower remains on the path');
  assert.ok(state.towers.some((t) => t.x === 39 && t.y === 39), 'an off-path tower is left where it stands (towers never move)');
}

// ── progressive tower unlock by campaign map (no wave-1 wall of 14) ─────────────────────────────────
{
  const all = Object.keys(TOWER_TYPES);
  const m0 = availableTowers(all, 0);
  assert.ok(m0.includes('pulse_node') && m0.includes('cycle_extractor'), 'starter towers on map 0');
  assert.ok(!m0.includes('long_recursor') && !m0.includes('glyph_mortar'), 'late towers locked on map 0');
  assert.ok(availableTowers(all, 1).length > m0.length, 'map 1 unlocks more towers');
  assert.equal(availableTowers(all, 4).length, all.length, 'all 14 towers unlocked by the final map');
}

// ── sell preview == real refund (REPAIR verb), and the tower id survives a normalize round-trip ─────
{
  const state = defaultState({ seed: 'alpha' });
  state.cycles = 2000;
  const r = placeTower(state, { x: 12, y: 9, type: 'scatter_array' });
  assert.equal(r.ok, true);
  const preview = sellValue(r.tower);
  // Issue 5: placeTower's id matches state.normalizeTower's scheme, so a persisted tower stays sellable.
  const reloaded = normalizeState({ ...state }, { seed: 'alpha' });
  assert.equal(reloaded.towers[0].id, r.tower.id, 'placeTower id survives a save/normalize round-trip');
  const before = reloaded.cycles;
  const sold = sellTower(reloaded, r.tower.id);
  assert.equal(sold.ok, true, 'a persisted tower can still be sold by its id');
  assert.equal(sold.refund, preview, 'sell preview equals the actual refund');
  assert.equal(reloaded.cycles, before + preview);
}

// ── ANTICIPATE telegraph: the hint warns when the path reshapes after the wave you're about to start ─
assert.equal(reshapesAfter(2, 10), true, 'wave 10 on a depth-2 map: the path reshapes after it');
assert.equal(reshapesAfter(2, 11), false, 'no further reshape once at full depth');
assert.equal(reshapesAfter(0, 4), false, 'a depth-1 map never reshapes');
assert.match(preWaveHint(2, 10), /reshapes after this wave/, 'the pre-wave hint telegraphs the fold');
assert.match(preWaveHint(0, 1), /incoming/, 'the pre-wave hint lists the incoming wave');

console.log('stage4 reshape tests passed');
