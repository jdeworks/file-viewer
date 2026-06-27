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
    // ── Prestige meta-progression (post-prestige mechanics + Cores) ──────────────────────────────
    prestigeCount: 0,            // depth: how many prestiges performed → which mechanics are unlocked
    cores: 0,                    // permanent cross-run meta-currency (earned on prestige)
    coreUpgrades: {},            // { upgradeId: level } — persist across prestige
    ticks: 0,                    // deterministic game-tick counter (drives the post-prestige mechanics)
    pipelines: {},               // { tierId: true } — wired builders (auto-run for upkeep)
    pipelineProgress: {},        // { tierId: ticksAccumulated } — per-pipeline cycle progress
    flux: { meter: 0, boostMult: 1, boostTicks: 0 },  // burst-meter mechanic
    echo: { active: false, spawnTick: 0, expireTick: 0, lastTick: 0 },  // defrag-echo attention mechanic
    resonanceFound: {},          // { bandId: true } — discovered tier-ratio resonances
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

  // Prestige meta-progression.
  target.prestigeCount = Number.isFinite(target.prestigeCount) ? target.prestigeCount : 0;
  target.cores = Number.isFinite(target.cores) ? target.cores : 0;
  target.coreUpgrades = target.coreUpgrades && typeof target.coreUpgrades === 'object' ? target.coreUpgrades : {};
  target.ticks = Number.isFinite(target.ticks) ? target.ticks : 0;
  target.pipelines = target.pipelines && typeof target.pipelines === 'object' ? target.pipelines : {};
  target.pipelineProgress = target.pipelineProgress && typeof target.pipelineProgress === 'object' ? target.pipelineProgress : {};
  target.flux = target.flux && typeof target.flux === 'object'
    ? { meter: +target.flux.meter || 0, boostMult: +target.flux.boostMult || 1, boostTicks: +target.flux.boostTicks || 0 }
    : { meter: 0, boostMult: 1, boostTicks: 0 };
  target.echo = target.echo && typeof target.echo === 'object'
    ? { active: Boolean(target.echo.active), spawnTick: +target.echo.spawnTick || 0, expireTick: +target.echo.expireTick || 0, lastTick: +target.echo.lastTick || 0 }
    : { active: false, spawnTick: 0, expireTick: 0, lastTick: 0 };
  target.resonanceFound = target.resonanceFound && typeof target.resonanceFound === 'object' ? target.resonanceFound : {};

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
