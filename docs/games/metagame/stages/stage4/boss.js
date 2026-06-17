import {
  ACHIEVEMENT_ID,
  ACHIEVEMENT_TEXT,
  ACTION_NAME,
  bellMessages,
  lockedHintLadder,
  RECURSION_BLUEPRINT_PATH,
} from './messages.js';
import { isRecursionBlueprintPath } from './content.js';

export function hasRecursionBlueprint(actions) {
  return Boolean(actions && typeof actions.hasAction === 'function' && actions.hasAction(4, ACTION_NAME));
}

export function getBossLockState({ actions, state }) {
  const unlocked = hasRecursionBlueprint(actions);
  const boss = state?.boss || {};
  const coverage = getTowerCoverage(state);
  const hintIndex = Math.min(Math.max(Number(boss.lockHintStep || 0), 0), lockedHintLadder.length - 1);
  return {
    unlocked,
    defeated: Boolean(boss.defeated),
    coveredPoints: coverage.covered.length,
    totalPoints: coverage.total,
    vulnerability: unlocked ? 'mapped' : 'unread',
    defeatPossible: unlocked && coverage.covered.length > 0,
    hint: unlocked ? bellMessages.unlock : lockedHintLadder[hintIndex],
  };
}

export function applyRecursionBlueprintOpen({ state, actions, achievements, bell, path }) {
  if (!isRecursionBlueprintPath(path)) return false;
  actions?.setAction?.(4, ACTION_NAME, {
    source: 'file-tree',
    file: 'recursion_points.json',
    path: '/stage4/towers/upgrades/tier3_blueprints/recursion_points.json',
    pointSetId: state.recursion.pointSetId,
  });
  achievements?.unlockAchievement?.(ACHIEVEMENT_ID, {
    stage: 4,
    title: ACHIEVEMENT_TEXT,
    action: '4.recursion_blueprint_read',
    pointSetId: state.recursion.pointSetId,
  });
  notifyBell(bell, 'stage4.recursion_blueprint_read', bellMessages.unlock);
  pushLog(state, bellMessages.unlock);
  return true;
}

export function placeTower(state, { x, y, type = 'pulse_node' }) {
  const cost = type === 'scatter_array' ? 150 : 80;
  if (Number(state.cycles || 0) < cost) return { ok: false, reason: 'cycles' };
  const tower = {
    id: `tower-${state.towers.length + 1}`,
    type,
    x: Math.trunc(Number(x)),
    y: Math.trunc(Number(y)),
  };
  if (!Number.isFinite(tower.x) || !Number.isFinite(tower.y)) return { ok: false, reason: 'position' };
  state.cycles -= cost;
  state.towers.push(tower);
  const coverage = getTowerCoverage(state);
  pushLog(state, `${type} placed at ${tower.x},${tower.y}. ${coverage.covered.length}/${coverage.total} recursion points covered.`);
  return { ok: true, tower, coverage };
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

export function fightInfiniteLoop({ state, actions }) {
  const lock = getBossLockState({ actions, state });
  state.boss.reached = true;
  state.boss.attempts = Number(state.boss.attempts || 0) + 1;
  if (!lock.unlocked) {
    state.boss.lockHintStep = Math.min(Number(state.boss.lockHintStep || 0) + 1, lockedHintLadder.length - 1);
    pushLog(state, 'the loop regenerates before damage resolves.');
    return { defeated: false, locked: true, damage: 0 };
  }
  if (!lock.coveredPoints) {
    pushLog(state, 'the blueprint is read, but no tower touches a recursion point.');
    return { defeated: false, locked: false, damage: 0 };
  }
  const damage = lock.coveredPoints * 120;
  state.boss.hp = Math.max(0, Number(state.boss.hp || 300) - damage);
  if (state.boss.hp === 0) {
    state.boss.defeated = true;
    pushLog(state, bellMessages.defeated);
  } else {
    pushLog(state, `recursion damage landed: ${damage}.`);
  }
  return { defeated: state.boss.defeated, locked: false, damage };
}

export function openRecursionBlueprintInViewer({ state, viewer, actions, achievements, bell }) {
  applyRecursionBlueprintOpen({ state, actions, achievements, bell, path: RECURSION_BLUEPRINT_PATH });
}

export function pushLog(state, line) {
  state.log = [...(state.log || []), line].slice(-8);
}

function distance(a, b) {
  return Math.hypot(Number(a.x) - Number(b.x), Number(a.y) - Number(b.y));
}

function notifyBell(bell, id, text) {
  if (bell && typeof bell.showBell === 'function') bell.showBell(id, text, { stage: 4 });
  else if (bell && typeof bell.push === 'function') bell.push({ id, stage: 4, text });
}
