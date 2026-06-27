// forks.js — Stage 4 Fractal Bastion: tier-3 branching upgrade FORKS (the Kingdom Rush model).
//
// At level 3 a player picks ONE of two IRREVOCABLE forks per tower (stored on tower.fork). A fork can:
//   • override the L3 ability (abilities.js reads forkAbility)
//   • apply multiplicative stat mods (engine reads towerStat: damage/fireRate/range/aoe/slow/pull/income)
//   • override the on-hit status payload (engine reads effectiveOnHit)
// The choice is data here; chooseFork mutates the tower; ui-combat offers the two buttons at L3.

import { TOWER_TYPES } from './towers.js';

// Two forks per tower. mods values are MULTIPLIERS (1 = unchanged). `onHit` (optional) REPLACES the
// tower's default onHit. `ability` (optional) overrides the L3 ult.
export const FORKS = {
  pulse_node: [
    { id: 'emp_lance', label: 'EMP Lance', desc: '×2 damage; EMP-stun ult', ability: 'emp_burst', mods: { damage: 2 } },
    { id: 'pulse_storm', label: 'Pulse Storm', desc: '×1.8 fire rate, +range; overcharge ult', ability: 'overcharge', mods: { fireRate: 1.8, range: 1.4 } },
  ],
  scatter_array: [
    { id: 'shrapnel_array', label: 'Shrapnel Array', desc: '×1.6 damage, wider splash', ability: 'overcharge', mods: { damage: 1.6, aoe: 1.5 } },
    { id: 'nova_array', label: 'Nova Array', desc: '+damage; EMP-stun the whole splash', ability: 'emp_burst', mods: { damage: 1.3, range: 1.3 } },
  ],
  null_spike: [
    { id: 'void_lance', label: 'Void Lance', desc: '×2 null damage', ability: 'null_wave', mods: { damage: 2 } },
    { id: 'null_battery', label: 'Null Battery', desc: '×2.2 fire rate', ability: 'overcharge', mods: { fireRate: 2.2 } },
  ],
  frost_lattice: [
    { id: 'deep_freeze', label: 'Deep Freeze', desc: 'Chill ramps to freeze far faster', ability: 'emp_burst', onHit: [{ kind: 'chill', stacks: 42, ms: 1800 }] },
    { id: 'glacier_field', label: 'Glacier Field', desc: 'Wide range; chill + hard slow', ability: 'emp_burst', mods: { range: 1.6 }, onHit: [{ kind: 'chill', stacks: 16, ms: 1600 }, { kind: 'slow', factor: 0.5, ms: 1400 }] },
  ],
  thermal_loop: [
    { id: 'pyre_loop', label: 'Pyre Loop', desc: 'Much hotter, longer burn', ability: 'overcharge', onHit: [{ kind: 'burn', dps: 30, ms: 3000 }] },
    { id: 'plasma_loop', label: 'Plasma Loop', desc: '×1.8 hit damage + burn', ability: 'overcharge', mods: { damage: 1.8 }, onHit: [{ kind: 'burn', dps: 12, ms: 2200 }] },
  ],
  chain_resonator: [
    { id: 'arc_cascade', label: 'Arc Cascade', desc: 'Chains to 5 targets', ability: 'emp_burst', mods: { chain: 5 / 3 } },
    { id: 'tesla_coil', label: 'Tesla Coil', desc: '×1.7 damage, +range', ability: 'overcharge', mods: { damage: 1.7, range: 1.4 } },
  ],
  long_recursor: [
    { id: 'siege_recursor', label: 'Siege Recursor', desc: '×1.8 damage (anti-boss)', ability: 'overcharge', mods: { damage: 1.8 } },
    { id: 'rapid_recursor', label: 'Rapid Recursor', desc: '×2.5 fire rate', ability: 'overcharge', mods: { fireRate: 2.5 } },
  ],
  glyph_mortar: [
    { id: 'cluster_mortar', label: 'Cluster Mortar', desc: 'Bigger splash, +fire rate', ability: 'overcharge', mods: { aoe: 1.6, fireRate: 1.5 } },
    { id: 'incendiary_mortar', label: 'Incendiary Mortar', desc: 'Shells leave a burn', ability: 'overcharge', mods: { damage: 1.3 }, onHit: [{ kind: 'burn', dps: 16, ms: 2500 }] },
  ],
  shatter_drill: [
    { id: 'rend_drill', label: 'Rend Drill', desc: 'Strips armor to the bone', ability: 'null_wave', onHit: [{ kind: 'shred', armor: 0.5, ms: 2600 }] },
    { id: 'mark_drill', label: 'Mark Drill', desc: 'Shred + mark for +damage taken', ability: 'null_wave', onHit: [{ kind: 'shred', armor: 0.25, ms: 2200 }, { kind: 'mark', bonus: 0.3, ms: 2200 }] },
  ],
  attractor_field: [
    { id: 'tar_field', label: 'Tar Field', desc: 'Near-total slow', mods: { slow: 1.6 } },
    { id: 'wide_field', label: 'Wide Field', desc: 'Much larger slow radius', mods: { range: 1.8 } },
  ],
  gravity_well: [
    { id: 'singularity', label: 'Singularity', desc: 'Stronger pull (tight cluster)', mods: { pull: 2 } },
    { id: 'event_field', label: 'Event Field', desc: 'Wider slow + pull radius', mods: { range: 1.8 } },
  ],
  resonance_hub: [
    { id: 'overdrive_hub', label: 'Overdrive Hub', desc: 'Bigger adjacency buff', mods: { adjacencyBonus: 1.8 } },
    { id: 'grid_hub', label: 'Grid Hub', desc: 'Buffs a much larger area', mods: { range: 1.6 } },
  ],
  cycle_extractor: [
    { id: 'turbo_extractor', label: 'Turbo Extractor', desc: '×1.8 per-wave income', mods: { incomePerWave: 1.8 } },
    { id: 'burst_extractor', label: 'Burst Extractor', desc: '×1.4 income, smaller footprint', mods: { incomePerWave: 1.4 } },
  ],
  bank_node: [
    { id: 'reserve_bank', label: 'Reserve Bank', desc: '×1.8 per-wave income', mods: { incomePerWave: 1.8 } },
    { id: 'fast_bank', label: 'Fast Bank', desc: '×1.5 income', mods: { incomePerWave: 1.5 } },
  ],
};

// The two fork choices offered for a tower type (empty if none).
export function forksFor(type) {
  return FORKS[type] || [];
}

// The chosen fork definition for a tower (or null when unchosen / unknown).
export function forkDef(tower) {
  if (!tower?.fork) return null;
  return (FORKS[tower.type] || []).find((f) => f.id === tower.fork) || null;
}

// Which ability a tower casts because of its chosen fork (null = use the tower type's default).
export function forkAbility(tower) {
  return forkDef(tower)?.ability || null;
}

// Multiplicative stat modifier from a fork (1 = unmodified).
export function forkStatMult(tower, key) {
  const m = forkDef(tower)?.mods?.[key];
  return Number.isFinite(m) ? m : 1;
}

// A tower's effective numeric stat = base × fork mult. Engine reads damage/fireRate/range/aoe/etc here.
export function towerStat(tower, key) {
  const base = Number(TOWER_TYPES[tower?.type]?.[key]) || 0;
  return base * forkStatMult(tower, key);
}

// The on-hit status payload a tower applies: the fork's override, else the tower's default.
export function effectiveOnHit(tower, def) {
  return forkDef(tower)?.onHit || def?.onHit || null;
}

// Pick a fork for a tower. Irrevocable: rejects if the tower is not L3, the fork is invalid, or a
// fork is already chosen. Mutates tower.fork. Returns {ok, ...} for the UI.
export function chooseFork(state, towerId, forkId) {
  const tower = (state?.towers || []).find((t) => t.id === towerId);
  if (!tower) return { ok: false, reason: 'not-found' };
  if ((tower.level || 1) < 3) return { ok: false, reason: 'not-l3' };
  if (tower.fork) return { ok: false, reason: 'already-forked' };
  const fork = (FORKS[tower.type] || []).find((f) => f.id === forkId);
  if (!fork) return { ok: false, reason: 'invalid-fork' };
  tower.fork = fork.id;
  state.log = [...(state.log || []), `${tower.type} forked → ${fork.label}.`].slice(-12);
  return { ok: true, fork: fork.id };
}
