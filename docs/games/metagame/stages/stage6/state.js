import { bellMessages } from "./messages.js";

export function defaultState() {
  return {
    version: 1,
    handshakes: 0,
    deck: ["SYN", "SYN", "ACK", "Signal", "Signal"],
    boss: {
      reached: false,
      unlocked: false,
      defeated: false,
      phase: 1,
      hp: 60,
      attempts: 0,
      lockHintStep: 0,
      turn: {
        firstCard: null,
        playedAck: false,
        signalDamageThisTurn: 0
      }
    },
    log: [
      bellMessages.start,
      "The Refused Connection waits behind a formal silence."
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
  target.handshakes = Number.isFinite(Number(target.handshakes)) ? Number(target.handshakes) : fresh.handshakes;
  target.deck = Array.isArray(target.deck) ? target.deck : fresh.deck;
  target.boss = mergePlain(fresh.boss, target.boss);
  target.boss.turn = mergePlain(fresh.boss.turn, target.boss.turn);
  target.log = Array.isArray(target.log) ? target.log : fresh.log;
  target.meta = mergePlain(fresh.meta, target.meta);
  return target;
}

function mergePlain(base, override) {
  return { ...base, ...(override && typeof override === "object" ? override : {}) };
}
