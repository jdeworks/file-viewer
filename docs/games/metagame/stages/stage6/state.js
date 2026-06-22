import { bellMessages } from "./messages.js";

// Stage 6 save shape (v2 — full Protocol Codex roguelite):
//   meta  — persists across runs (prestige economy + the codex/boss gate flags).
//   boss  — The Refused Connection negotiation state (boss.js owns the mechanics).
//   run   — the active run.js state machine, or null between runs. Combat itself is
//           transient (held in the renderer, never persisted): a reload mid-fight
//           re-instantiates the encounter from the run's node.
//   ui    — top-level screen: "hub" | "run" | "boss".
const VERSION = 2;

export function defaultState() {
  return {
    version: VERSION,
    meta: {
      banked: 0,            // handshakes banked toward prestige (Protocol Version)
      protocolVersion: 0,   // prestige tier
      runsStarted: 0,
      runsCleared: 0,
      bestAct: 0,
      firstClearComplete: false
    },
    handshakes: 0,          // legacy mirror the boss reward writes to
    boss: {
      reached: false,
      unlocked: false,
      defeated: false,
      phase: 1,
      hp: 60,
      attempts: 0,
      lockHintStep: 0,
      turn: { firstCard: null, playedAck: false, signalDamageThisTurn: 0 }
    },
    run: null,
    ui: { screen: "hub" },
    log: [
      bellMessages.start,
      "The Refused Connection waits behind a formal silence."
    ]
  };
}

export function normalizeState(state) {
  const fresh = defaultState();
  const target = state && typeof state === "object" ? state : {};
  target.version = VERSION;
  target.meta = mergePlain(fresh.meta, target.meta);
  target.handshakes = num(target.handshakes, fresh.handshakes);
  target.boss = mergePlain(fresh.boss, target.boss);
  target.boss.turn = mergePlain(fresh.boss.turn, target.boss.turn);
  target.run = target.run && typeof target.run === "object" ? target.run : null;
  target.ui = mergePlain(fresh.ui, target.ui);
  if (!["hub", "run", "boss"].includes(target.ui.screen)) target.ui.screen = "hub";
  target.log = Array.isArray(target.log) ? target.log : fresh.log;
  delete target.deck; // stale v1 key
  return target;
}

function mergePlain(base, override) {
  return { ...base, ...(override && typeof override === "object" ? override : {}) };
}

function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
