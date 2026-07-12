// economy.test.mjs — Stage 4 REAL, cost-respecting winnability (playtest fix 2026-07-11; extended
// to the FULL campaign 2026-07-12).
//
// tests/winnable.test.mjs proves the COMBAT MATH can clear hard waves given an already-maxed board —
// its fortify() helper injects a full army directly into state.towers and only THEN zeroes cycles, so
// it never actually checks whether a player could have AFFORDED to build that board. This file closes
// that gap: it drives the REAL cost-checking API (placeTower/upgradeTower, both of which reject a
// purchase the player can't afford) through EVERY map of the campaign with a deliberately simple,
// greedy bot — the bar is "a normal player can win", not "an optimal player can barely win".
//   • maps 0–1 (trash-only enemy pools): cheap pulse_node spam, the original single-type strategy.
//   • maps 2–4 (armor/shield/elite pools): a rotating MIX — thermal (anti-armor burn), long_recursor
//     (anti-elite null sniper), null_spike (armor+shield bypass), glyph_mortar (global anti-guardian,
//     targeting STRONGEST), chain_resonator (arc vs shields/swarms) — plus level upgrades with any
//     leftover cycles, since levels now grant damage (forks.js levelDamageMult).
// See maps.js's startCycles comments for the two per-map rebalances this test locked in.
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

// A simple, greedy, cost-respecting defense: rank buildable cells by how much ROAD they cover
// (folded L-system paths pass near themselves, so choke cells cover 2–3 stretches at once — the
// obvious placement any player learns in their first tower-defense hour), then buy down that list
// rotating through `types` (falling back to the cheap pulse_node when the rotated pick is too
// expensive), and finally sink leftovers into level upgrades. Every purchase goes through the REAL
// placeTower/upgradeTower APIs, which reject anything the player can't afford.
function buildDefense(state, tiles, types) {
  const path = allPathCells(tiles);
  const seen = new Set();
  const candidates = [];
  for (let i = 0; i < path.length; i += 1) {
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const c = { x: path[i].x + ox, y: path[i].y + oy };
      if (c.x < 0 || c.y < 0 || c.x >= 40 || c.y >= 40) continue;
      if (path.some((pc) => pc.x === c.x && pc.y === c.y)) continue; // never build ON the road
      const key = `${c.x},${c.y}`;
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push(c);
    }
  }
  for (const c of candidates) {
    c.score = path.reduce((s, pc) => s + (Math.hypot(pc.x - c.x, pc.y - c.y) <= 3 ? 1 : 0), 0);
  }
  candidates.sort((a, b) => b.score - a.score);
  let n = state.towers.length; // rotate the mix across the whole map, not per call
  for (const c of candidates) {
    if (state.towers.some((tw) => tw.x === c.x && tw.y === c.y)) continue;
    const type = types[n % types.length];
    // The mortar hunts the fattest threat on the board (guardians); everything else keeps its default.
    let r = placeTower(state, { x: c.x, y: c.y, type, targetMode: type === 'glyph_mortar' ? 'strongest' : undefined });
    if (!r.ok && r.reason === 'cycles' && type !== 'pulse_node') {
      r = placeTower(state, { x: c.x, y: c.y, type: 'pulse_node' }); // fall back to the cheap workhorse
    }
    if (!r.ok && r.reason === 'cycles') break; // genuinely out of cycles — stop buying, not just skip
    if (r.ok) n += 1;
  }
  // Leftover cycles buy levels — levels grant real damage now (L2 ×1.25, L3 ×1.5), so this is what
  // a normal player does once the good cells are taken.
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

function playMap(mapIndex, types) {
  const state = defaultState({ seed: 'economy-test' });
  state.campaign.mapIndex = mapIndex;
  const map = mapByIndex(mapIndex);
  state.cycles = map.startCycles;
  state.integrity = map.startIntegrity;
  state.maxIntegrity = map.startIntegrity;
  for (let w = 1; w <= map.waveCount; w += 1) {
    const depth = mapPathDepth(map.depth, w);
    const tiles = buildPath(mapPathSeed(state.recursion.pointSetId, mapIndex), depth).tiles;
    buildDefense(state, tiles, types);
    playWave(state, w, tiles);
    if (state.integrity <= 0) return { cleared: false, failedAtWave: w, state };
  }
  return { cleared: true, failedAtWave: null, state };
}

// Maps 0–1 field only trash (no armor/shield until map 2 — wavegen.js UNLOCKS), so the original
// single-type strategy stands; maps 2–4 need the diversified mix a real player would buy.
const PULSE_ONLY = ['pulse_node'];
const MIX = ['pulse_node', 'thermal_loop', 'long_recursor', 'null_spike', 'glyph_mortar', 'chain_resonator'];

// ── the tutorial map (Outer Shell) — every player's FIRST experience — clears with real margin ────
{
  const { cleared, failedAtWave, state } = playMap(0, PULSE_ONLY);
  assert.ok(cleared, `Outer Shell should clear with a real, cost-respecting simple defense (failed at wave ${failedAtWave})`);
  const marginPct = Math.round((100 * state.integrity) / state.maxIntegrity);
  assert.ok(marginPct >= 30, `Outer Shell should clear with a real margin (not razor-thin), got ${marginPct}% integrity remaining`);
}

// ── EVERY later map full-clears under real cost constraints (the whole campaign is affordable) ────
for (const [m, types] of [[1, PULSE_ONLY], [2, MIX], [3, MIX], [4, MIX]]) {
  const map = mapByIndex(m);
  const { cleared, failedAtWave, state } = playMap(m, types);
  assert.ok(cleared, `${map.name} should full-clear with a cost-respecting ${types === MIX ? 'diversified' : 'simple'} defense (failed at wave ${failedAtWave}, integrity ${state.integrity})`);
  assert.ok(state.integrity > 0, `${map.name}: core survives the full map (integrity ${state.integrity}/${state.maxIntegrity})`);
}

console.log('stage4 economy tests passed');
