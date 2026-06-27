import { TARGET_MODES } from './towers.js';
import { createCampaign, ensureCampaign } from './run4.js';

export function defaultState(context = {}) {
  const seed = stageSeed(context);
  return {
    version: 1,
    cycles: 240,
    wave: 4,
    // Full-TD fields (engine.js reads/writes these; see stage4 buildplan A3). Enemies are ephemeral
    // (regenerated per wave, never persisted). towerNextId replaces any Math.random id generation.
    integrity: 100,
    maxIntegrity: 100,   // per-map cap (set by run4.resetCombatForMap; integrity regen never exceeds it)
    damageMult: 1,       // Armory "Overclocked Emitters" multiplier (applied by engine.applyDamage)
    waveGroup: 1,
    waveActive: false,
    waveNumber: 1,
    enemies: [],
    towerNextId: 1,
    // The 5-map campaign state machine (run4.js): status, mapIndex, clearedMaps, glory, armory.
    campaign: createCampaign(),
    recursion: {
      pointSetId: `fractal-${seed}`,
      points: generateRecursionPoints(seed),
    },
    towers: [],
    boss: {
      reached: false,
      hp: 300,
      attempts: 0,
      lockHintStep: 0,
      defeated: false,
    },
    log: ['fractal bastion mounted.', 'the path repeats before it explains itself.'],
  };
}

export function normalizeState(state, context = {}) {
  const fresh = defaultState(context);
  const target = state && typeof state === 'object' ? state : {};
  target.version = 1;
  target.cycles = Number.isFinite(target.cycles) ? target.cycles : fresh.cycles;
  target.wave = Number.isFinite(target.wave) ? target.wave : fresh.wave;
  // Full-TD fields, preserved across saves (enemies are never persisted — always reset to []).
  target.integrity = Number.isFinite(target.integrity) ? target.integrity : fresh.integrity;
  target.maxIntegrity = Number.isFinite(target.maxIntegrity) ? target.maxIntegrity : fresh.maxIntegrity;
  target.damageMult = Number.isFinite(target.damageMult) ? target.damageMult : fresh.damageMult;
  target.waveGroup = Number.isFinite(target.waveGroup) ? target.waveGroup : fresh.waveGroup;
  target.waveActive = Boolean(target.waveActive);
  target.waveNumber = Number.isFinite(target.waveNumber) ? target.waveNumber : fresh.waveNumber;
  target.enemies = [];
  target.towerNextId = Number.isFinite(target.towerNextId) ? target.towerNextId : fresh.towerNextId;
  target.recursion = mergePlain(fresh.recursion, target.recursion);
  target.recursion.pointSetId = String(target.recursion.pointSetId || fresh.recursion.pointSetId);
  target.recursion.points = normalizePoints(target.recursion.points, fresh.recursion.points);
  target.towers = Array.isArray(target.towers) ? target.towers.map(normalizeTower).filter(Boolean) : [];
  target.boss = mergePlain(fresh.boss, target.boss);
  ensureCampaign(target); // normalize the campaign state machine (status/mapIndex/clearedMaps/glory/armory)
  target.log = Array.isArray(target.log) ? target.log : [...fresh.log];
  return target;
}

// snapshotWave — a plain, JSON-safe copy of the IN-FLIGHT wave (the only state normalizeState drops
// on reload: enemies + spawn queue + combat clock). Persisted into the run-state 'runwave' slot so a
// mid-wave reload resumes the exact wave instead of soft-losing it. Towers/boss/wave number already
// persist through the normal stageState save; integrity/cycles are mirrored here because they change
// per-tick (between the renderer's throttled saves) so the snapshot is the authoritative in-flight value.
export function snapshotWave(state) {
  return {
    waveNumber: state.waveNumber,
    wavePeak: Number.isFinite(state.wavePeak) ? state.wavePeak : state.waveNumber,
    waveActive: Boolean(state.waveActive),
    waveFailed: Boolean(state.waveFailed),
    integrity: state.integrity,
    cycles: state.cycles,
    enemies: (state.enemies || []).map((enemy) => ({ ...enemy })),
    spawnQueue: [...(state.spawnQueue || [])],
    spawnTimerMs: Number(state.spawnTimerMs) || 0,
    combatClockMs: Number(state.combatClockMs) || 0,
    enemyNextId: Number.isFinite(state.enemyNextId) ? state.enemyNextId : 1,
  };
}

// restoreWave — overwrite ONLY the ephemeral wave fields on `state` from a snapshot (resume entry).
export function restoreWave(state, snap) {
  if (!snap || typeof snap !== 'object') return state;
  if (Number.isFinite(snap.waveNumber)) state.waveNumber = snap.waveNumber;
  state.wavePeak = Number.isFinite(snap.wavePeak) ? snap.wavePeak : state.waveNumber;
  state.waveActive = Boolean(snap.waveActive);
  state.waveFailed = Boolean(snap.waveFailed);
  if (Number.isFinite(snap.integrity)) state.integrity = snap.integrity;
  if (Number.isFinite(snap.cycles)) state.cycles = snap.cycles;
  state.enemies = Array.isArray(snap.enemies) ? snap.enemies.map((enemy) => ({ ...enemy })) : [];
  state.spawnQueue = Array.isArray(snap.spawnQueue) ? [...snap.spawnQueue] : [];
  state.spawnTimerMs = Number(snap.spawnTimerMs) || 0;
  state.combatClockMs = Number(snap.combatClockMs) || 0;
  state.enemyNextId = Number.isFinite(snap.enemyNextId) ? snap.enemyNextId : 1;
  return state;
}

export function generateRecursionPoints(seed) {
  let value = hashSeed(seed);
  const points = [];
  const lanes = [
    { minX: 7, maxX: 14, minY: 8, maxY: 13 },
    { minX: 18, maxX: 25, minY: 16, maxY: 22 },
    { minX: 27, maxX: 34, minY: 25, maxY: 31 },
  ];
  for (let index = 0; index < lanes.length; index += 1) {
    value = lcg(value);
    const lane = lanes[index];
    const x = lane.minX + (value % (lane.maxX - lane.minX + 1));
    value = lcg(value);
    const y = lane.minY + (value % (lane.maxY - lane.minY + 1));
    points.push({ id: `R${index + 1}`, x, y, radius: 2 });
  }
  return points;
}

function normalizePoints(points, fallback) {
  if (!Array.isArray(points) || !points.length) return fallback.map((point) => ({ ...point }));
  return points.map((point, index) => ({
    id: String(point.id || `R${index + 1}`),
    x: clampInt(point.x, 0, 39),
    y: clampInt(point.y, 0, 39),
    radius: clampInt(point.radius || 2, 1, 5),
  }));
}

function normalizeTower(tower) {
  if (!tower || typeof tower !== 'object') return null;
  const x = clampInt(tower.x, 0, 39);
  const y = clampInt(tower.y, 0, 39);
  const type = String(tower.type || 'pulse_node');
  // Deterministic id from the tower's cell + type (no Math.random) — one tower per cell.
  return {
    id: String(tower.id || `tower-${type}-${x}-${y}`),
    type,
    x,
    y,
    level: clampInt(tower.level || 1, 1, 3),
    targetMode: TARGET_MODES.includes(tower.targetMode) ? tower.targetMode : 'first',
    fork: tower.fork ? String(tower.fork) : null, // chosen tier-3 fork (irrevocable; persisted)
    abilityReady: tower.abilityReady !== false,
    abilityUsed: Boolean(tower.abilityUsed),
  };
}

// Deterministic stage seed: an explicit context.seed (tests/replays) or a FIXED default. Never the
// wall clock — the recursion puzzle must be the same every session so the file-tree un-cheat is real.
function stageSeed(context) {
  return String(context.seed || 'fractal-bastion').replace(/\W/g, '').slice(-8) || 'stage4';
}

function hashSeed(seed) {
  let hash = 2166136261;
  for (const ch of String(seed)) {
    hash ^= ch.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function lcg(value) {
  return (Math.imul(value, 1664525) + 1013904223) >>> 0;
}

function clampInt(value, min, max) {
  const number = Math.trunc(Number(value));
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}

function mergePlain(base, override) {
  return { ...base, ...(override && typeof override === 'object' ? override : {}) };
}
