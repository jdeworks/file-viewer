// s4dev.test.mjs — Unit tests for Stage 4 dev-menu cheat mutations.
// Each cheat function is pure (state-in, mutate) and DOM-free, so these run under node --test.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { defaultState } from '../state.js';
import { ensureCampaign, allMapsCleared, selectMap } from '../run4.js';
import { devGiveGlory, devSkipWave, devSkipToBoss, devGodCore } from '../s4dev.js';
import { MAPS } from '../maps.js';

// ── devGiveGlory ─────────────────────────────────────────────────────────────────────────────────

test('devGiveGlory: adds 500 glory to a fresh state', () => {
  const s = defaultState();
  ensureCampaign(s);
  assert.equal(s.campaign.glory, 0, 'starts at 0');
  const result = devGiveGlory(s);
  assert.equal(s.campaign.glory, 500, 'glory is 500 after one call');
  assert.equal(result.glory, 500, 'return value mirrors state');
});

test('devGiveGlory: stacks on existing glory', () => {
  const s = defaultState();
  ensureCampaign(s);
  s.campaign.glory = 200;
  devGiveGlory(s);
  assert.equal(s.campaign.glory, 700, 'stacks on prior glory');
});

test('devGiveGlory: custom amount', () => {
  const s = defaultState();
  ensureCampaign(s);
  devGiveGlory(s, 1000);
  assert.equal(s.campaign.glory, 1000);
});

// ── devSkipWave ──────────────────────────────────────────────────────────────────────────────────

test('devSkipWave: clears in-flight wave state', () => {
  const s = defaultState();
  selectMap(s, 0);               // enter map 0 → status = 'combat', waveNumber = 1
  s.waveActive = true;
  s.enemies = [{ id: 'e1' }];
  s.spawnQueue = ['recursion'];
  devSkipWave(s);
  assert.equal(s.waveActive, false, 'wave deactivated');
  assert.deepEqual(s.enemies, [], 'enemies cleared');
  assert.deepEqual(s.spawnQueue, [], 'spawn queue cleared');
});

test('devSkipWave: advances waveNumber on non-final wave (map 0 has 5 waves)', () => {
  const s = defaultState();
  selectMap(s, 0);               // waveNumber = 1, map 0 has 5 waves
  devSkipWave(s);
  assert.equal(s.waveNumber, 2, 'wave advances from 1 to 2');
  assert.equal(s.campaign.status, 'combat', 'still in combat after non-final wave');
});

test('devSkipWave: awards glory on skip', () => {
  const s = defaultState();
  selectMap(s, 0);
  devSkipWave(s);
  assert.ok(s.campaign.glory > 0, 'glory is awarded for the skipped wave');
});

test('devSkipWave: routes to armory after the final wave of a map', () => {
  const s = defaultState();
  selectMap(s, 0);
  const finalWave = MAPS[0].waveCount;
  s.waveNumber = finalWave;      // put us at the last wave
  devSkipWave(s);
  assert.equal(s.campaign.status, 'armory', 'final wave skip routes to armory');
  assert.ok(s.campaign.clearedMaps.includes(0), 'map 0 marked cleared');
});

// ── devSkipToBoss ────────────────────────────────────────────────────────────────────────────────

test('devSkipToBoss: clears all maps and enters the boss arena', () => {
  const s = defaultState();
  assert.ok(!allMapsCleared(s), 'not all cleared at start');
  const result = devSkipToBoss(s);
  assert.ok(result.ok, 'seatAtBoss succeeds');
  assert.ok(allMapsCleared(s), 'all maps now cleared');
  assert.equal(s.campaign.status, 'boss', 'campaign status is boss');
});

test('devSkipToBoss: does not mark the boss as defeated', () => {
  const s = defaultState();
  devSkipToBoss(s);
  assert.equal(s.boss?.defeated, false, 'boss is not defeated — un-cheat still applies');
});

test('devSkipToBoss: grants placement cycles for the boss arena', () => {
  const s = defaultState();
  devSkipToBoss(s);
  assert.ok(s.cycles >= 600, 'boss arena cycles are granted');
});

// ── devGodCore ───────────────────────────────────────────────────────────────────────────────────

test('devGodCore: sets integrity and maxIntegrity to 99999', () => {
  const s = defaultState();
  selectMap(s, 0);               // gives realistic starting integrity
  assert.ok(s.integrity < 200, 'starts at a normal value');
  const result = devGodCore(s);
  assert.equal(s.integrity, 99999);
  assert.equal(s.maxIntegrity, 99999);
  assert.equal(result.integrity, 99999);
});

test('devGodCore: subsequent engine drain does not reach 0', () => {
  const s = defaultState();
  devGodCore(s);
  // Simulate the engine's drain formula: integrity - drain (enemy integrityDrain is at most ~10)
  s.integrity = Math.max(0, s.integrity - 10);
  assert.ok(s.integrity > 0, 'integrity still positive after a typical enemy drain');
});

// ── idempotency / safety ─────────────────────────────────────────────────────────────────────────

test('devSkipWave is safe when called outside of combat (state.campaign.status = map-select)', () => {
  const s = defaultState();
  ensureCampaign(s);
  // No active combat — just verifying it doesn't throw.
  assert.doesNotThrow(() => devSkipWave(s));
});

test('devSkipToBoss is idempotent (calling twice stays at boss arena)', () => {
  const s = defaultState();
  devSkipToBoss(s);
  assert.equal(s.campaign.status, 'boss');
  // Second call: all maps already cleared, seatAtBoss calls enterBoss again (ok is false because
  // bossUnlocked checks !boss.defeated, which is still true — safe to call again).
  assert.doesNotThrow(() => devSkipToBoss(s));
});

console.log('stage4 s4dev (dev-menu cheats) tests passed');
