// status.js — Stage 4 Fractal Bastion: the per-enemy status-effect layer. Pure, deterministic
// (everything decays by the dt the engine passes — no RNG, no wall clock).
//
// Effects live on `enemy.status` (a plain object keyed by effect). The engine applies them in TWO
// places: movement (slow / chill→freeze / stun stop the enemy) and combat (burn DoT, shred lowers
// armor, mark raises damage taken). `slowImmune` enemies shrug off the movement-impairing effects
// (slow / chill / freeze) but still burn, shred, mark, and — deliberately — stun.
//
//   slow   {factor, ms}   multiplicative speed cut (0.5 = half speed); strongest wins
//   chill  {stacks, ms}   accumulates; at FREEZE_THRESHOLD it converts to a full freeze; also
//                         slows proportionally while building up
//   freeze {ms}           full stop
//   stun   {ms}           full stop (also lands on slow-immune enemies)
//   burn   {dps, ms}      thermal damage-over-time (routed through resolveDamage as 'thermal')
//   shred  {armor, ms}    flat armor reduction; strongest wins
//   mark   {bonus, ms}    +fraction damage taken (0.3 = +30%); strongest wins

import { resolveDamage } from './damage.js';

export const FREEZE_THRESHOLD = 100; // chill stacks needed to freeze
const MOVEMENT_EFFECTS = new Set(['slow', 'chill', 'freeze']); // ignored by slowImmune enemies

// Apply (or refresh) a status on an enemy. Returns true if it took hold. `slowImmune` blocks the
// movement-impairing effects only. Stacking rules: durations refresh to the longest; magnitudes take
// the strongest; chill accumulates and auto-converts to freeze.
export function applyStatus(enemy, kind, payload = {}) {
  if (!enemy) return false;
  if (enemy.slowImmune && MOVEMENT_EFFECTS.has(kind)) return false;
  const s = enemy.status || (enemy.status = {});
  const ms = Math.max(0, Number(payload.ms) || 0);
  switch (kind) {
    case 'slow': {
      const factor = clamp01(payload.factor != null ? payload.factor : 0.5);
      const cur = s.slow;
      s.slow = { factor: cur ? Math.min(cur.factor, factor) : factor, ms: Math.max(cur?.ms || 0, ms) };
      return true;
    }
    case 'chill': {
      const cur = s.chill || { stacks: 0, ms: 0 };
      cur.stacks += Math.max(0, Number(payload.stacks) || 0);
      cur.ms = Math.max(cur.ms, ms);
      s.chill = cur;
      if (cur.stacks >= FREEZE_THRESHOLD) { delete s.chill; applyStatus(enemy, 'freeze', { ms: Math.max(ms, 1200) }); }
      return true;
    }
    case 'freeze':
    case 'stun': {
      const cur = s[kind];
      s[kind] = { ms: Math.max(cur?.ms || 0, ms) };
      return true;
    }
    case 'burn': {
      const dps = Math.max(0, Number(payload.dps) || 0);
      const cur = s.burn;
      s.burn = { dps: Math.max(cur?.dps || 0, dps), ms: Math.max(cur?.ms || 0, ms) };
      return true;
    }
    case 'shred': {
      const armor = clamp01(payload.armor || 0);
      const cur = s.shred;
      s.shred = { armor: Math.max(cur?.armor || 0, armor), ms: Math.max(cur?.ms || 0, ms) };
      return true;
    }
    case 'mark': {
      const bonus = Math.max(0, Number(payload.bonus) || 0);
      const cur = s.mark;
      s.mark = { bonus: Math.max(cur?.bonus || 0, bonus), ms: Math.max(cur?.ms || 0, ms) };
      return true;
    }
    default: return false;
  }
}

// Decay every effect by dt and apply burn damage-over-time. Mutates enemy (hp via resolveDamage). The
// engine reaps enemies whose hp hits 0 after this. Pure: damage scales with dt only.
export function tickStatus(state, enemy, dt) {
  const s = enemy?.status;
  if (!s) return;
  const ms = Math.max(0, Number(dt) || 0);
  if (s.burn) resolveDamage(enemy, s.burn.dps * (ms / 1000), 'thermal');
  for (const key of Object.keys(s)) {
    s[key].ms -= ms;
    if (s[key].ms <= 0) delete s[key];
  }
}

// Movement multiplier: 0 when frozen/stunned, else the slow factor combined with the proportional
// chill slow. 1 = unimpeded.
export function statusSpeedFactor(enemy) {
  const s = enemy?.status;
  if (!s) return 1;
  if (s.freeze || s.stun) return 0;
  let factor = 1;
  if (s.slow) factor *= s.slow.factor;
  if (s.chill) factor *= 1 - 0.4 * Math.min(1, s.chill.stacks / FREEZE_THRESHOLD);
  return factor;
}

// Live armor after shred (never below 0).
export function effectiveArmor(enemy) {
  const base = enemy?.armor || 0;
  const shred = enemy?.status?.shred?.armor || 0;
  return Math.max(0, base - shred);
}

// Damage-taken multiplier from `mark` (1 = unmarked).
export function damageTakenMult(enemy) {
  return 1 + (enemy?.status?.mark?.bonus || 0);
}

// Apply a tower's on-hit status payload(s) to an enemy. `onHit` is an array of {kind, ...payload}.
export function applyOnHit(enemy, def) {
  const onHit = def?.onHit;
  if (!Array.isArray(onHit)) return;
  for (const eff of onHit) if (eff && eff.kind) applyStatus(enemy, eff.kind, eff);
}

function clamp01(v) { const n = Number(v) || 0; return n < 0 ? 0 : n > 1 ? 1 : n; }
