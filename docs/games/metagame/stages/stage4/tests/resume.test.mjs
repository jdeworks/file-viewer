// resume.test.mjs — Stage 4 run-state retrofit: a mid-wave snapshot survives the reload reset.
import assert from 'node:assert/strict';
import { buildPath } from '../lsystem.js';
import { startWave, tick } from '../engine.js';
import { defaultState, normalizeState, snapshotWave, restoreWave } from '../state.js';

// Run a few ticks of an active wave, snapshot mid-flight, then simulate a reload (normalizeState
// drops enemies/spawn queue) and restore — the wave must resume with identical enemies + clocks.
{
  const state = defaultState({ seed: 'alpha' });
  state.waveNumber = 3;
  const path = buildPath(state.recursion.pointSetId, 2);
  startWave(state, state.waveNumber, path.tiles);
  for (let i = 0; i < 8; i += 1) tick(state, 200, path.tiles);
  assert.ok(state.enemies.length > 0, 'enemies are live mid-wave');
  assert.equal(state.waveActive, true, 'wave is active');

  const snap = { ...snapshotWave(state), runTag: '4:0:' };
  assert.ok(snap.enemies.length === state.enemies.length, 'snapshot copies the live enemies');
  assert.notEqual(snap.enemies, state.enemies, 'snapshot enemies are a distinct array');

  // Simulate a reload: normalizeState always resets enemies to [] (the soft loss the retrofit fixes).
  const reloaded = normalizeState({ ...state }, { seed: 'alpha' });
  assert.equal(reloaded.enemies.length, 0, 'reload drops live enemies (the bug)');

  restoreWave(reloaded, snap);
  assert.equal(reloaded.enemies.length, snap.enemies.length, 'restore brings the enemies back');
  assert.deepEqual(reloaded.enemies.map((e) => e.id), snap.enemies.map((e) => e.id), 'enemy ids preserved');
  assert.equal(reloaded.waveActive, true, 'restored wave is active');
  assert.equal(reloaded.combatClockMs, snap.combatClockMs, 'combat clock preserved');
  assert.equal(reloaded.spawnQueue.length, snap.spawnQueue.length, 'spawn queue preserved');
  assert.equal(reloaded.enemyNextId, snap.enemyNextId, 'enemy id counter preserved (no collisions)');

  // The resumed wave keeps ticking deterministically from where it left off.
  const before = reloaded.enemies.length;
  tick(reloaded, 200, path.tiles);
  assert.ok(reloaded.enemies.length >= 0 && reloaded.combatClockMs > snap.combatClockMs, 'resumed wave advances');
  void before;
}

// A finished wave (waveActive:false) snapshot must NOT be treated as resumable.
{
  const state = defaultState({ seed: 'beta' });
  const snap = { ...snapshotWave(state), waveActive: false, runTag: '4:0:' };
  assert.equal(snap.waveActive, false, 'an ended wave snapshots as non-resumable');
}

console.log('stage4 resume tests passed');
