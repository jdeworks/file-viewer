// engine.test.mjs — Stage 4 tick loop: firing/kills, leaks, fractal split, wave completion.
import assert from "node:assert/strict";
import { buildPath } from "../lsystem.js";
import { startWave, tick, resolveDeath, waveComplete } from "../engine.js";
import { ENEMY_TYPES } from "../enemies.js";

function mkState(towers = []) {
  return { cycles: 0, integrity: 100, towers, enemies: [], log: [], recursion: { pointSetId: "x" }, towerNextId: 1, enemyNextId: 1 };
}

// ── a tower in range kills an enemy and awards Cycles; integrity untouched ─────────────────────────
{
  const path = buildPath("alpha", 2);
  const tile = path.tiles[3];
  const state = mkState([{ id: "t1", type: "pulse_node", x: tile.x, y: tile.y, level: 1 }]);
  state.waveActive = true;
  // A stationary enemy on the tower's tile — stays in range so the kill is deterministic.
  state.enemies = [{ id: "e1", type: "recursion", hp: 50, maxHp: 50, x: tile.x, y: tile.y, pathIndex: 3, speed: 0, armor: 0 }];
  for (let i = 0; i < 24 && state.enemies.length; i++) tick(state, 250, path.tiles);
  assert.equal(state.enemies.length, 0, "the tower kills the enemy");
  assert.equal(state.cycles, ENEMY_TYPES.recursion.reward, "killing awards reward Cycles");
  assert.equal(state.integrity, 100, "integrity untouched (enemy died, never exited)");
}

// ── an unblocked enemy reaches the exit and drains integrity ───────────────────────────────────────
{
  const path = buildPath("alpha", 1);
  const state = mkState([]);
  state.waveActive = true;
  state.enemies = [{ id: "e1", type: "recursion", hp: 50, maxHp: 50, pathIndex: 0, speed: 5, armor: 0, x: path.tiles[0].x, y: path.tiles[0].y }];
  for (let i = 0; i < 100 && state.enemies.length; i++) tick(state, 200, path.tiles);
  assert.equal(state.enemies.length, 0, "the enemy reached the exit and left");
  assert.ok(state.integrity < 100, "integrity drained at the core");
}

// ── a fractal host splits into two recursion enemies on death ──────────────────────────────────────
{
  const path = buildPath("alpha", 1);
  const state = mkState([]);
  resolveDeath(state, { id: "h1", type: "fractal_host", hp: 0, pathIndex: 2 }, path.tiles);
  assert.equal(state.enemies.length, 2, "fractal host spawns 2 on death");
  assert.ok(state.enemies.every((e) => e.type === "recursion"), "the spawns are recursion enemies");
  assert.equal(state.cycles, ENEMY_TYPES.fractal_host.reward, "host death awards its reward");
}

// ── startWave queues the composition; waveComplete fires once drained + pays extractors ────────────
{
  const path = buildPath("alpha", 1);
  const state = mkState([{ id: "x1", type: "cycle_extractor", x: 0, y: 0, level: 1 }]);
  startWave(state, 1, path.tiles);
  assert.equal(state.waveActive, true, "wave is active after startWave");
  assert.equal(state.spawnQueue.length, 6, "wave 1 queues 6 enemies");
  assert.equal(waveComplete(state), false, "not complete while spawns remain");
  let guard = 0;
  while (state.waveActive && guard++ < 3000) { tick(state, 200, path.tiles); if (waveComplete(state)) break; }
  assert.equal(state.waveActive, false, "wave completes once all enemies are gone");
  assert.equal(state.cycles, 25, "the cycle extractor pays 25 on wave complete");
}

console.log("stage4 engine tests passed");
