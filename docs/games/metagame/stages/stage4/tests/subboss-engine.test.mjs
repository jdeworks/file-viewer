// subboss-engine.test.mjs — Stage 4: the engine spawns a map's sub-boss and fires its telegraphed
// ability, and the Armory damage multiplier flows into combat.
import assert from 'node:assert/strict';
import { buildPath } from '../lsystem.js';
import { startWave, tick } from '../engine.js';
import { defaultState } from '../state.js';
import { selectMap } from '../run4.js';
import { subBossDef } from '../subboss.js';
import { mapPathSeed } from '../maps.js';

// A sub-boss wave queues + spawns the guardian as a distinct tanky enemy.
{
  const state = defaultState({ seed: 'alpha' });
  selectMap(state, 0);
  state.waveNumber = 5; // map 0's guardian wave (shell-warden)
  const path = buildPath(mapPathSeed(state.recursion.pointSetId, 0), 1);
  startWave(state, 5, path.tiles);
  assert.ok(state.spawnQueue.includes('subboss:shell-warden'), 'the guardian is queued');
  // Drain the queue so everything (incl. the guardian) spawns; no towers, so they march.
  let guard = 0;
  while (state.spawnQueue.length && guard++ < 2000) tick(state, 100, path.tiles);
  const sb = state.enemies.find((e) => e.subBoss === 'shell-warden');
  assert.ok(sb, 'the sub-boss entered the field');
  assert.equal(sb.hp, subBossDef('shell-warden').hp, 'sub-boss has its full HP');
}

// The sub-boss fires its ability ONCE when it drops below the trigger fraction (recurse → adds).
{
  const state = defaultState({ seed: 'beta' });
  selectMap(state, 0);
  const path = buildPath(mapPathSeed(state.recursion.pointSetId, 0), 1);
  // A tower sitting on the warden's tile, plus the warden parked in range.
  const tile = path.tiles[4];
  const def = subBossDef('shell-warden');
  state.waveActive = true;
  state.towers = [{ id: 't', type: 'null_spike', x: tile.x, y: tile.y, level: 1, targetMode: 'first', lastFiredMs: -Infinity }];
  state.enemies = [{ id: 'w', type: 'subboss', subBoss: 'shell-warden', hp: def.hp, maxHp: def.hp, x: tile.x, y: tile.y, pathIndex: 4, speed: 0, armor: 0, abilityFired: false }];
  state.combatClockMs = 0;
  let guard = 0;
  while (!state.enemies.find((e) => e.subBoss)?.abilityFired && guard++ < 5000) tick(state, 200, path.tiles);
  const recursed = state.enemies.some((e) => e.type === 'recursion'); // recurse spawned adds
  assert.ok(state.log.some((l) => /RECURSES/.test(l)), 'the recurse ability fired (logged)');
  assert.ok(recursed, 'recurse spawned recursion adds');
}

// Armory damage multiplier increases damage dealt (overclocked emitters).
{
  const path = buildPath('x', 1);
  const tile = path.tiles[3];
  const mk = (mult) => ({
    cycles: 0, integrity: 100, damageMult: mult, towers: [{ id: 't', type: 'pulse_node', x: tile.x, y: tile.y, level: 1, targetMode: 'first', lastFiredMs: -Infinity }],
    enemies: [{ id: 'e', type: 'recursion', hp: 1000, maxHp: 1000, x: tile.x, y: tile.y, pathIndex: 3, speed: 0, armor: 0 }],
    log: [], recursion: { pointSetId: 'x' }, waveActive: true, combatClockMs: 0,
  });
  const a = mk(1); const b = mk(2);
  for (let i = 0; i < 5; i++) { tick(a, 1100, path.tiles); tick(b, 1100, path.tiles); }
  assert.ok(b.enemies[0].hp < a.enemies[0].hp, '2x damage multiplier deals more damage');
}

console.log('stage4 subboss-engine tests passed');
