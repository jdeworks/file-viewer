import { bellMessages } from './messages.js';
import { TARGET_PRESETS, toPreset, TOWER_TYPES } from './towers.js';

export function getBossLockState({ state }) {
  const boss = state?.boss || {};
  const coverage = getTowerCoverage(state);
  return {
    defeated: Boolean(boss.defeated),
    coveredPoints: coverage.covered.length,
    totalPoints: coverage.total,
    vulnerability: 'visible',
    defeatPossible: coverage.covered.length > 0,
    hint: coverage.covered.length > 0 ? bellMessages.covered : bellMessages.needsCoverage,
  };
}

export function placeTower(state, { x, y, type = 'pulse_node', targetMode }) {
  const def = TOWER_TYPES[type];
  if (!def) return { ok: false, reason: 'type' };
  const cost = def.cost || 0; // was hard-coded to scatter/80 — now reads the real per-tower cost
  if (Number(state.cycles || 0) < cost) return { ok: false, reason: 'cycles' };
  // Collapse the requested mode (or the tower's default target) onto one of the 3 presets.
  const mode = toPreset(targetMode || def.defaultTarget || 'first');
  const tx = Math.trunc(Number(x));
  const ty = Math.trunc(Number(y));
  if (!Number.isFinite(tx) || !Number.isFinite(ty)) return { ok: false, reason: 'position' };
  const tower = {
    // Position+type id, IDENTICAL to state.normalizeTower's scheme, so a tower's id survives a
    // save/reload round-trip and upgrade/sell lookups never break (Round-3 Issue 5). One tower per cell.
    id: `tower-${type}-${tx}-${ty}`,
    type,
    x: tx,
    y: ty,
    targetMode: mode,
  };
  state.cycles -= cost;
  state.towers.push(tower);
  const coverage = getTowerCoverage(state);
  pushLog(state, `${type} placed at ${tower.x},${tower.y}. ${coverage.covered.length}/${coverage.total} recursion points covered.`);
  return { ok: true, tower, coverage };
}

// Advance a placed tower's targeting priority to the next PRESET (roster / popover click). Migrates the
// tower's current mode onto a preset first, then steps to the next of the 3 (FIRST → STRONG → CYCLE →).
// Returns the new mode (a preset key). Engine selectTarget is untouched — the stored value stays a valid
// comparator key, so the reduced surface never changes how a tower actually fires.
export function cycleTowerTarget(state, id) {
  const tower = (state?.towers || []).find((t) => t.id === id);
  if (!tower) return null;
  const i = TARGET_PRESETS.indexOf(toPreset(tower.targetMode || 'first'));
  tower.targetMode = TARGET_PRESETS[(i + 1) % TARGET_PRESETS.length];
  pushLog(state, `${tower.type} now targets ${tower.targetMode.toUpperCase()}.`);
  return tower.targetMode;
}

export function getTowerCoverage(state) {
  const points = state?.recursion?.points || [];
  const towers = state?.towers || [];
  const covered = points.filter((point) => towers.some((tower) => distance(tower, point) <= Number(point.radius || 2)));
  return {
    total: points.length,
    covered,
    uncovered: points.filter((point) => !covered.includes(point)),
  };
}

export function fightInfiniteLoop({ state }) {
  const lock = getBossLockState({ state });
  state.boss.reached = true;
  state.boss.attempts = Number(state.boss.attempts || 0) + 1;
  if (!lock.coveredPoints) {
    pushLog(state, 'no strike lands — nothing placed touches a recursion point yet.');
    return { defeated: false, locked: false, damage: 0 };
  }
  const damage = lock.coveredPoints * 100;
  state.boss.hp = Math.max(0, Number(state.boss.hp || 300) - damage);
  if (state.boss.hp === 0) {
    state.boss.defeated = true;
    pushLog(state, bellMessages.defeated);
  } else {
    pushLog(state, `recursion damage landed: ${damage}.`);
  }
  return { defeated: state.boss.defeated, locked: false, damage };
}

export function pushLog(state, line) {
  state.log = [...(state.log || []), line].slice(-8);
}

function distance(a, b) {
  return Math.hypot(Number(a.x) - Number(b.x), Number(a.y) - Number(b.y));
}
