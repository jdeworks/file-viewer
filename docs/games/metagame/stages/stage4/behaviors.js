// behaviors.js — Stage 4 Fractal Bastion: deterministic per-enemy ACTIVE behaviors (no RNG, time
// driven by combatClockMs / dt). Keeps engine.js lean. Three kinds:
//   • behaviorPass  — self-regeneration + healer-node aura healing (countered by burn DoT / focus).
//   • isTargetable  — flicker_ghost phases OUT (untargetable) on a fixed cadence.
//   • burrowArmor   — burrower gains heavy armor while burrowed (down), 0 while surfaced.

import { ENEMY_TYPES } from './enemies.js';

const defOf = (e) => ENEMY_TYPES[e?.type] || {};

// Apply heal-over-time effects for one tick. Regenerators heal themselves; healer_nodes heal nearby
// allies. Never exceeds maxHp; dead enemies (hp<=0, reaped after) are skipped.
export function behaviorPass(state, dt) {
  const secs = (Number(dt) || 0) / 1000;
  if (secs <= 0) return;
  const enemies = state.enemies || [];
  for (const e of enemies) {
    if (e.hp <= 0) continue;
    const d = defOf(e);
    if (d.regen) e.hp = Math.min(e.maxHp, e.hp + d.regen * secs);
  }
  for (const healer of enemies) {
    const d = defOf(healer);
    if (!d.heal || healer.hp <= 0) continue;
    for (const e of enemies) {
      if (e === healer || e.hp <= 0) continue;
      if (dist(healer, e) <= d.heal.radius) e.hp = Math.min(e.maxHp, e.hp + d.heal.amount * secs);
    }
  }
}

// Can a tower target this enemy right now? flicker_ghost is only targetable during its on-window.
export function isTargetable(enemy, now) {
  const f = defOf(enemy).flicker;
  if (!f) return true;
  const period = f.onMs + f.offMs;
  return period <= 0 ? true : (now % period) < f.onMs;
}

// Extra armor a burrower has right now (heavy while burrowed/down, 0 while surfaced/up).
export function burrowArmor(enemy, now) {
  const b = defOf(enemy).burrow;
  if (!b) return 0;
  const period = b.upMs + b.downMs;
  if (period <= 0) return 0;
  return (now % period) >= b.upMs ? b.armor : 0; // up-window first, then down (armored)
}

function dist(a, b) {
  return Math.hypot((a.x || 0) - (b.x || 0), (a.y || 0) - (b.y || 0));
}
