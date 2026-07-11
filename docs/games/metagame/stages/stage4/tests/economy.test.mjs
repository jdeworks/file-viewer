// economy.test.mjs — Stage 4 REAL, cost-respecting winnability (playtest fix, 2026-07-11).
//
// tests/winnable.test.mjs proves the COMBAT MATH can clear hard waves given an already-maxed board —
// its fortify() helper injects a full army directly into state.towers and only THEN zeroes cycles, so
// it never actually checks whether a player could have AFFORDED to build that board. This file closes
// that gap: it drives the REAL cost-checking API (placeTower/upgradeTower, both of which reject a
// purchase the player can't afford) through an entire map with a deliberately simple, NON-optimal
// single-tower-type strategy — the bar is "a normal player can win", not "an optimal player can
// barely win". See maps.js's startCycles comment for the rebalance this test locks in.
import assert from 'node:assert/strict';
import { buildPath, mapPathDepth } from '../lsystem.js';
import { startWave, tick, waveComplete } from '../engine.js';
import { defaultState } from '../state.js';
import { mapByIndex, mapPathSeed } from '../maps.js';
import { placeTower } from '../boss.js';
import { upgradeTower } from '../upgrades.js';

// buildPath returns only the L-system's CORNER waypoints, not every path cell (board.js interpolates
// the rest for rendering — segmentCells, not exported). A real player sees and can build along the
// WHOLE visible road, so a fair simulation needs the same full cell list, not just the corners.
function allPathCells(tiles) {
  const cells = [];
  for (let i = 0; i < tiles.length - 1; i += 1) {
    const a = tiles[i]; const b = tiles[i + 1];
    const dx = Math.sign(b.x - a.x); const dy = Math.sign(b.y - a.y);
    let x = a.x; let y = a.y;
    while (x !== b.x || y !== b.y) { cells.push({ x, y }); if (x !== b.x) x += dx; if (y !== b.y) y += dy; }
  }
  cells.push(tiles[tiles.length - 1]);
  return cells;
}

// A deliberately simple, non-optimal defense: cheap pulse_node attackers at path-adjacent cells
// (real player would diversify tower types against armor/shields — this bot doesn't), then any
// leftover cycles upgrade existing towers. Every purchase goes through the REAL cost-checking API.
function buildDefense(state, tiles) {
  const path = allPathCells(tiles);
  const seen = new Set();
  const candidates = [];
  for (let i = 0; i < path.length; i += 2) {
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const c = { x: path[i].x + ox, y: path[i].y + oy };
      if (c.x < 0 || c.y < 0 || c.x >= 40 || c.y >= 40) continue;
      const key = `${c.x},${c.y}`;
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push(c);
    }
  }
  for (const c of candidates) {
    if (state.towers.some((tw) => tw.x === c.x && tw.y === c.y)) continue;
    const r = placeTower(state, { x: c.x, y: c.y, type: 'pulse_node' });
    if (!r.ok && r.reason === 'cycles') break; // genuinely out of cycles — stop buying, not just skip
  }
  for (let pass = 0; pass < 3; pass += 1) {
    for (const t of state.towers) if ((t.level || 1) < 3) upgradeTower(state, t.id);
  }
}

function playWave(state, w, tiles) {
  startWave(state, w, tiles);
  let guard = 0;
  while (state.waveActive && guard++ < 20000) {
    tick(state, 200, tiles);
    if (waveComplete(state)) break;
  }
  return state;
}

function playMap(mapIndex) {
  const state = defaultState({ seed: 'economy-test' });
  state.campaign.mapIndex = mapIndex;
  const map = mapByIndex(mapIndex);
  state.cycles = map.startCycles;
  state.integrity = map.startIntegrity;
  state.maxIntegrity = map.startIntegrity;
  for (let w = 1; w <= map.waveCount; w += 1) {
    const depth = mapPathDepth(map.depth, w);
    const tiles = buildPath(mapPathSeed(state.recursion.pointSetId, mapIndex), depth).tiles;
    buildDefense(state, tiles);
    playWave(state, w, tiles);
    if (state.integrity <= 0) return { cleared: false, failedAtWave: w, state };
  }
  return { cleared: true, failedAtWave: null, state };
}

// ── the tutorial map (Outer Shell) — every player's FIRST experience — clears with real margin ────
{
  const { cleared, failedAtWave, state } = playMap(0);
  assert.ok(cleared, `Outer Shell should clear with a real, cost-respecting simple defense (failed at wave ${failedAtWave})`);
  const marginPct = Math.round((100 * state.integrity) / state.maxIntegrity);
  assert.ok(marginPct >= 30, `Outer Shell should clear with a real margin (not razor-thin), got ${marginPct}% integrity remaining`);
}

// ── every map survives at least its first wave under real cost constraints (a basic sanity floor —
// deeper maps expect a player to diversify tower types against armor/shields, which this simple
// single-tower-type bot deliberately doesn't do, so full-campaign clearing isn't asserted past map 0) ──
for (let m = 1; m < 5; m += 1) {
  const map = mapByIndex(m);
  const state = defaultState({ seed: 'economy-test' });
  state.campaign.mapIndex = m;
  state.cycles = map.startCycles;
  state.integrity = map.startIntegrity;
  state.maxIntegrity = map.startIntegrity;
  const tiles = buildPath(mapPathSeed(state.recursion.pointSetId, m), mapPathDepth(map.depth, 1)).tiles;
  buildDefense(state, tiles);
  assert.ok(state.towers.length >= 3, `${map.name}: startCycles should afford at least 3 starter towers, got ${state.towers.length}`);
  playWave(state, 1, tiles);
  assert.ok(state.integrity > 0, `${map.name}: wave 1 alone should not deplete the core (integrity ${state.integrity})`);
}

console.log('stage4 economy tests passed');
