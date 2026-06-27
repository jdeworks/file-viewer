// status.test.mjs — Stage 4 status-effect layer (slow/chill→freeze/stun/burn/shred/mark) + engine wiring.
import assert from 'node:assert/strict';
import {
  applyStatus, tickStatus, statusSpeedFactor, effectiveArmor, damageTakenMult, applyOnHit,
  FREEZE_THRESHOLD,
} from '../status.js';
import { buildPath } from '../lsystem.js';
import { startWave, tick } from '../engine.js';

// ── slow: factor cuts speed; strongest (lowest factor) wins ─────────────────────────────────────
{
  const e = {};
  applyStatus(e, 'slow', { factor: 0.6, ms: 1000 });
  assert.equal(statusSpeedFactor(e), 0.6, 'slow applies its factor');
  applyStatus(e, 'slow', { factor: 0.3, ms: 1000 });
  assert.equal(statusSpeedFactor(e), 0.3, 'stronger slow overrides');
}

// ── chill accumulates and converts to a full freeze at the threshold ────────────────────────────
{
  const e = {};
  applyStatus(e, 'chill', { stacks: FREEZE_THRESHOLD - 10, ms: 2000 });
  assert.ok(statusSpeedFactor(e) < 1 && statusSpeedFactor(e) > 0, 'partial chill slows but does not stop');
  applyStatus(e, 'chill', { stacks: 20, ms: 2000 });
  assert.ok(e.status.freeze, 'chill over threshold becomes freeze');
  assert.equal(statusSpeedFactor(e), 0, 'frozen = full stop');
}

// ── stun stops the enemy and lands even on slow-immune enemies ──────────────────────────────────
{
  const e = { slowImmune: true };
  assert.equal(applyStatus(e, 'slow', { factor: 0.5, ms: 500 }), false, 'slow-immune shrugs off slow');
  assert.equal(applyStatus(e, 'stun', { ms: 500 }), true, 'slow-immune still gets stunned');
  assert.equal(statusSpeedFactor(e), 0, 'stun stops it');
}

// ── burn deals thermal DoT scaled by dt; durations decay and expire ─────────────────────────────
{
  const e = { hp: 100 };
  applyStatus(e, 'burn', { dps: 20, ms: 1000 });
  tickStatus(null, e, 500);
  assert.equal(e.hp, 90, 'burn dealt 20dps × 0.5s = 10');
  tickStatus(null, e, 600);
  assert.ok(!e.status.burn, 'burn expired after its duration');
}

// ── shred lowers live armor; mark raises damage taken ───────────────────────────────────────────
{
  const e = { armor: 0.5 };
  applyStatus(e, 'shred', { armor: 0.3, ms: 1000 });
  assert.equal(Number(effectiveArmor(e).toFixed(2)), 0.2, 'shred drops armor 0.5→0.2');
  applyStatus(e, 'mark', { bonus: 0.25, ms: 1000 });
  assert.equal(damageTakenMult(e), 1.25, 'mark = +25% damage taken');
}

// ── applyOnHit drives a tower's onHit payload ───────────────────────────────────────────────────
{
  const e = { hp: 50 };
  applyOnHit(e, { onHit: [{ kind: 'burn', dps: 5, ms: 2000 }, { kind: 'slow', factor: 0.7, ms: 1000 }] });
  assert.ok(e.status.burn && e.status.slow, 'onHit applied both effects');
}

// ── engine wiring: the attractor field now slows via the status layer (generalized) ─────────────
{
  const path = buildPath('alpha', 1);
  // Place an attractor on the enemy's tile so it is always in range.
  const tile = path.tiles[2];
  const slow = { cycles: 0, integrity: 100, recursion: { pointSetId: 'x' }, log: [],
    towers: [{ id: 'a', type: 'attractor_field', x: tile.x, y: tile.y, level: 1 }],
    enemies: [], waveActive: true, combatClockMs: 0, enemyNextId: 1 };
  const fast = JSON.parse(JSON.stringify(slow)); fast.towers = [];
  const mkEnemy = () => ({ id: 'e', type: 'recursion', hp: 50, maxHp: 50, x: tile.x, y: tile.y, pathIndex: 2, speed: 2, armor: 0 });
  slow.enemies = [mkEnemy()]; fast.enemies = [mkEnemy()];
  for (let i = 0; i < 5; i++) { tick(slow, 200, path.tiles); tick(fast, 200, path.tiles); }
  assert.ok(slow.enemies[0].pathIndex < fast.enemies[0].pathIndex, 'attractor field slows the enemy via status');
}

console.log('stage4 status tests passed');
