import { bellMessages } from "./messages.js";

export function defaultState() {
  return {
    version: 1,
    addresses: 0,
    evidence: {
      eliminated: ["B", "C", "D", "E"],
      contradicted: [],
      selectedEntity: null
    },
    boss: {
      reached: false,
      unlocked: false,
      defeated: false,
      attempts: 0,
      lockHintStep: 0
    },
    log: [
      bellMessages.start,
      "Six dossiers claim one name: CORE_ENTITY_001."
    ],
    meta: {
      firstClearComplete: false
    }
  };
}

export function normalizeState(state) {
  const fresh = defaultState();
  const target = state && typeof state === "object" ? state : {};
  target.version = 1;
  target.addresses = Number.isFinite(Number(target.addresses)) ? Number(target.addresses) : fresh.addresses;
  target.evidence = mergePlain(fresh.evidence, target.evidence);
  target.evidence.eliminated = Array.isArray(target.evidence.eliminated) ? target.evidence.eliminated : fresh.evidence.eliminated;
  target.evidence.contradicted = Array.isArray(target.evidence.contradicted) ? target.evidence.contradicted : fresh.evidence.contradicted;
  target.boss = mergePlain(fresh.boss, target.boss);
  target.log = Array.isArray(target.log) ? target.log : fresh.log;
  target.meta = mergePlain(fresh.meta, target.meta);
  return target;
}

function mergePlain(base, override) {
  return { ...base, ...(override && typeof override === "object" ? override : {}) };
}
