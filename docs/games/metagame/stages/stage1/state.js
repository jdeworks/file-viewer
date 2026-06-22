import { fromNumber, fromStore } from './bignum.js';

export function defaultState(context = {}) {
  const now = Number.isFinite(context.now) ? context.now : Date.now();
  return {
    bits: fromNumber(0),
    totalBits: fromNumber(0),
    owned: {},
    timedStates: {},
    managers: {},
    pullFactors: [],
    milestones: [],
    totalBought: 0,
    buyMult: 1,
    bossSeen: false,
    bossLossCount: 0,
    runStartedAt: now,
    introStages: [],
    claimed: {},
    tabsUnlocked: false,
  };
}

export function normalizeState(state, context = {}) {
  const base = defaultState(context);
  const target = state && typeof state === 'object' ? state : {};
  for (const [key, value] of Object.entries(base)) {
    if (target[key] === undefined) target[key] = value;
  }

  target.bits = typeof target.bits === 'number' ? fromNumber(target.bits) : fromStore(target.bits);
  target.totalBits = typeof target.totalBits === 'number' ? fromNumber(target.totalBits) : fromStore(target.totalBits);
  target.owned = target.owned && typeof target.owned === 'object' ? target.owned : {};
  target.timedStates = target.timedStates && typeof target.timedStates === 'object' ? target.timedStates : {};
  target.managers = target.managers && typeof target.managers === 'object' ? target.managers : {};
  target.pullFactors = Array.isArray(target.pullFactors) ? target.pullFactors : [];
  target.milestones = Array.isArray(target.milestones) ? target.milestones : [];
  target.totalBought = Number.isFinite(target.totalBought) ? target.totalBought : 0;
  target.buyMult = target.buyMult === 'max' || Number.isFinite(target.buyMult) ? target.buyMult : 1;
  target.bossSeen = Boolean(target.bossSeen);
  target.bossLossCount = Number.isFinite(target.bossLossCount) ? target.bossLossCount : 0;
  target.runStartedAt = Number.isFinite(target.runStartedAt) ? target.runStartedAt : base.runStartedAt;
  target.introStages = Array.isArray(target.introStages) ? target.introStages : [];
  target.claimed = target.claimed && typeof target.claimed === 'object' ? target.claimed : {};
  target.tabsUnlocked = Boolean(target.tabsUnlocked);

  if (target.owned['s1-cursor']) {
    target.owned['s1-mult'] = (target.owned['s1-mult'] || 0) + target.owned['s1-cursor'];
    delete target.owned['s1-cursor'];
  }

  delete target.version;
  delete target.stage;
  delete target.defeated;
  delete target.achievements;

  return target;
}
