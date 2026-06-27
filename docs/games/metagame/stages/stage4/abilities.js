// abilities.js — Stage 4 Fractal Bastion: LEVEL-3 active abilities. Deterministic (cooldowns run off
// state.combatClockMs — no wall clock, no RNG). These were defined in towers.js (TOWER_ABILITIES) but
// never fired; now a tower that reaches level 3 auto-casts its ability whenever it is off cooldown and
// has a valid target. A tier-3 FORK (forks.js) can swap which ability a tower casts (abilityForTower).
//
//   emp_burst   stuns every enemy within `radius` (the crowd-control ult)
//   null_wave   strips armor (full shred) off every enemy in range for `stripMs`
//   overcharge  self-buff: the tower's own damage ×`multiplier` for `durationMs`

import { TOWER_TYPES, TOWER_ABILITIES } from './towers.js';
import { forkAbility } from './forks.js';
import { applyStatus } from './status.js';

// Resolve which ability a tower casts at L3: its fork's override, else the tower type's default.
export function abilityForTower(tower) {
  const def = TOWER_TYPES[tower?.type];
  if (!def) return null;
  return forkAbility(tower) || def.ability || null;
}

// Damage multiplier a tower currently has from an active overcharge (1 = none).
export function overchargeMult(tower, now) {
  return (tower?.overchargeUntilMs || 0) > now ? (tower.overchargeMultiplier || 1) : 1;
}

// Fire every eligible L3 tower's ability. Called once per tick by the engine (after firing). Mutates
// enemies (stun/shred) and towers (cooldown / overcharge window). `dist` is injected by the engine.
export function fireAbilities(state, dist) {
  const now = state.combatClockMs || 0;
  for (const tower of state.towers || []) {
    if ((tower.level || 1) < 3) continue;
    const abilityId = abilityForTower(tower);
    const ability = TOWER_ABILITIES[abilityId];
    if (!ability) continue;
    if (now < (tower.abilityNextMs || 0)) continue; // on cooldown
    const def = TOWER_TYPES[tower.type] || {};
    const cast = castAbility(state, tower, abilityId, ability, def, now, dist);
    if (cast) tower.abilityNextMs = now + ability.cooldownMs;
  }
}

function castAbility(state, tower, id, ability, def, now, dist) {
  if (id === 'emp_burst') {
    const hit = (state.enemies || []).filter((e) => dist(tower, e) <= ability.radius);
    if (!hit.length) return false;
    for (const e of hit) applyStatus(e, 'stun', { ms: ability.stunMs });
    pushLog(state, `${def.glyph || '[?]'} EMP Burst — ${hit.length} stunned.`);
    return true;
  }
  if (id === 'null_wave') {
    const hit = (state.enemies || []).filter((e) => dist(tower, e) <= (def.range || 0) && (e.armor || 0) > 0);
    if (!hit.length) return false;
    for (const e of hit) applyStatus(e, 'shred', { armor: 1, ms: ability.stripMs });
    pushLog(state, `${def.glyph || '[?]'} Null Wave — armor stripped from ${hit.length}.`);
    return true;
  }
  if (id === 'overcharge') {
    const inRange = (state.enemies || []).some((e) => dist(tower, e) <= (def.range || 0));
    if (!inRange) return false;
    tower.overchargeUntilMs = now + ability.durationMs;
    tower.overchargeMultiplier = ability.multiplier;
    pushLog(state, `${def.glyph || '[?]'} Overcharge — damage ×${ability.multiplier}.`);
    return true;
  }
  return false;
}

function pushLog(state, line) {
  state.log = [...(state.log || []), line].slice(-12);
}
