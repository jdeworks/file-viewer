import { bellMessages } from "./messages.js";

export function defaultState() {
  return {
    version: 3,
    addresses: 0,
    substage: 1,                  // 1 scan · 2 dup · 3 timeline · 4 chain · 5 accuse(case2) · 6 boss
    evidence: {
      eliminated: [],             // populated incrementally as entities are flagged / accused
      contradicted: [],
      selectedEntity: null,
      flags: {},                  // { B:"fieldId", C:"fieldId", ... } from the credential scan
      wrongFlagCount: 0,
      dupTestComplete: false,
      timelineContradictionCycle: null,
      chainBroken: false,
      partialContra: [],          // e.g. ["F.GPSInfo"]
      // Case 2 (Duplicate Roster) — the rule-of-three accusation.
      case2Seeded: false,         // entity/field clue cards minted onto the board
      case2Solved: false,         // the correct triad confirmed
      case2Attempts: 0,           // complete-but-wrong accusations
      case2HintStep: 0            // accusation hint ladder
    },
    // Evidence board / detective notebook — initialised once here (the lazy per-stage seed).
    board: { cards: [], links: [], established: [] },
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
  const incoming = state && typeof state === "object" ? state : {};
  // Pre-Case-2 saves (version < 3) used a 5-substage shape where 5 meant BOSS; the substage numbers
  // are now incompatible (5 = accusation, 6 = boss). Don't migrate — reset clean.
  if (Number(incoming.version) < 3) return fresh;
  const target = incoming;
  target.version = 3;
  target.addresses = Number.isFinite(Number(target.addresses)) ? Number(target.addresses) : fresh.addresses;
  target.substage = clampSubstage(target.substage, fresh.substage);
  target.evidence = mergePlain(fresh.evidence, target.evidence);
  target.evidence.eliminated = Array.isArray(target.evidence.eliminated) ? target.evidence.eliminated : [];
  target.evidence.contradicted = Array.isArray(target.evidence.contradicted) ? target.evidence.contradicted : [];
  target.evidence.flags = target.evidence.flags && typeof target.evidence.flags === "object" ? target.evidence.flags : {};
  target.evidence.partialContra = Array.isArray(target.evidence.partialContra) ? target.evidence.partialContra : [];
  target.boss = mergePlain(fresh.boss, target.boss);
  target.board = normalizeBoard(fresh.board, target.board);
  target.log = Array.isArray(target.log) ? target.log : fresh.log;
  target.meta = mergePlain(fresh.meta, target.meta);
  return target;
}

function normalizeBoard(base, override) {
  const b = mergePlain(base, override);
  b.cards = Array.isArray(b.cards) ? b.cards : [];
  b.links = Array.isArray(b.links) ? b.links : [];
  b.established = Array.isArray(b.established) ? b.established : [];
  return b;
}

function clampSubstage(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 && n <= 6 ? Math.floor(n) : fallback;
}

function mergePlain(base, override) {
  return { ...base, ...(override && typeof override === "object" ? override : {}) };
}
