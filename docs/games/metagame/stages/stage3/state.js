const DEFAULT_PIECES = ['<sec', 'ret', 'key>'];

export function defaultState(context = {}) {
  const seed = String(context.seed || context.now || Date.now()).replace(/\D/g, '').slice(-4) || '2470';
  return {
    version: 1,
    registers: 0,
    retained: 0,
    solvedFragments: [],
    memoryPair: {
      runId: `mem-${seed}`,
      pieces: [...DEFAULT_PIECES],
      key: DEFAULT_PIECES.join(''),
    },
    boss: {
      reached: false,
      attempts: 0,
      lockHintStep: 0,
      unlocked: false,
      defeated: false,
    },
    log: ['memory grid mounted.', 'columns missing from current log.'],
  };
}

export function normalizeState(state, context = {}) {
  const fresh = defaultState(context);
  const target = state && typeof state === 'object' ? state : {};
  target.version = 1;
  target.registers = Number.isFinite(target.registers) ? target.registers : fresh.registers;
  target.retained = Number.isFinite(target.retained) ? target.retained : fresh.retained;
  target.solvedFragments = Array.isArray(target.solvedFragments) ? target.solvedFragments : [];
  target.memoryPair = mergePlain(fresh.memoryPair, target.memoryPair);
  target.memoryPair.pieces = Array.isArray(target.memoryPair.pieces) && target.memoryPair.pieces.length
    ? target.memoryPair.pieces.map(String)
    : [...fresh.memoryPair.pieces];
  target.memoryPair.key = String(target.memoryPair.key || target.memoryPair.pieces.join(''));
  target.boss = mergePlain(fresh.boss, target.boss);
  target.log = Array.isArray(target.log) ? target.log : [...fresh.log];
  return target;
}

function mergePlain(base, override) {
  return { ...base, ...(override && typeof override === 'object' ? override : {}) };
}
