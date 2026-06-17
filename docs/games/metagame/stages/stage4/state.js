export function defaultState(context = {}) {
  const seed = stageSeed(context);
  return {
    version: 1,
    cycles: 240,
    wave: 4,
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
  target.recursion = mergePlain(fresh.recursion, target.recursion);
  target.recursion.pointSetId = String(target.recursion.pointSetId || fresh.recursion.pointSetId);
  target.recursion.points = normalizePoints(target.recursion.points, fresh.recursion.points);
  target.towers = Array.isArray(target.towers) ? target.towers.map(normalizeTower).filter(Boolean) : [];
  target.boss = mergePlain(fresh.boss, target.boss);
  target.log = Array.isArray(target.log) ? target.log : [...fresh.log];
  return target;
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
  return {
    id: String(tower.id || `tower-${Math.random().toString(16).slice(2)}`),
    type: String(tower.type || 'pulse_node'),
    x: clampInt(tower.x, 0, 39),
    y: clampInt(tower.y, 0, 39),
  };
}

function stageSeed(context) {
  return String(context.seed || context.now || Date.now()).replace(/\W/g, '').slice(-8) || 'stage4';
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
