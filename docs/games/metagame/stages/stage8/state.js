export function defaultState() {
  return {
    version: 1,
    cycle: 14,
    states: 164,
    totalStatesEarned: 460,
    salvageTotal: 0,
    selectedDebrisId: "node_p1_cycle14.sav",
    externalImportBonusCycles: 0,
    debris: [
      createDebris({ node: "p1", cycle: 14, tier: 1, value: 24, decay: 2 }),
      createDebris({ node: "m2", cycle: 13, tier: 2, value: 48, decay: 1 }),
      createDebris({ node: "f1", cycle: 12, tier: 4, value: 64, decay: 1 })
    ],
    archive: [],
    warningCheckpoint: null,
    log: [
      "node P1 failed. debris file created in /entropy/debris/.",
      "there was something left in the wreckage. it won't last long."
    ],
    boss: {
      reached: false,
      defeated: false,
      attempts: 0,
      lockHintStep: 0,
      firstFailureRewound: false
    },
    meta: {
      firstClearComplete: false,
      btsAvailable: false
    }
  };
}

export function normalizeState(state) {
  const fresh = defaultState();
  const target = state && typeof state === "object" ? state : {};
  target.version = 1;
  target.cycle = Number.isFinite(Number(target.cycle)) ? Number(target.cycle) : fresh.cycle;
  target.states = Number.isFinite(Number(target.states)) ? Number(target.states) : fresh.states;
  target.totalStatesEarned = Number.isFinite(Number(target.totalStatesEarned))
    ? Number(target.totalStatesEarned)
    : fresh.totalStatesEarned;
  target.salvageTotal = Number.isFinite(Number(target.salvageTotal)) ? Number(target.salvageTotal) : fresh.salvageTotal;
  target.selectedDebrisId = target.selectedDebrisId || fresh.selectedDebrisId;
  target.externalImportBonusCycles = Number(target.externalImportBonusCycles || 0);
  target.debris = Array.isArray(target.debris) ? target.debris : fresh.debris;
  target.archive = Array.isArray(target.archive) ? target.archive : fresh.archive;
  target.warningCheckpoint = target.warningCheckpoint || fresh.warningCheckpoint;
  target.log = Array.isArray(target.log) ? target.log : fresh.log;
  target.boss = { ...fresh.boss, ...(target.boss && typeof target.boss === "object" ? target.boss : {}) };
  target.meta = { ...fresh.meta, ...(target.meta && typeof target.meta === "object" ? target.meta : {}) };
  return target;
}

export function createDebris({ node, cycle, tier, value, decay = 2 }) {
  const id = `node_${node}_cycle${cycle}.sav`;
  return {
    id,
    node,
    cycle,
    tier,
    value,
    decay,
    path: `/entropy/debris/${id}`
  };
}
