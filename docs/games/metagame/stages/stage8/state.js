import { NODES } from "./nodes.js";
import { bellMessages } from "./messages.js";

// state.js — Stage 8 Entropy Field survival sim state.
//
// The field boots FRESH at cycle 1 with every node at full health and NO pre-seeded debris/States.
// (The old build booted a pre-seeded cycle-14 stub which, combined with a thin gate, let the player
// "archive twice → Heat Death → win". That stub is gone; the boss is now triple-gated + a real burn.)
// normalizeState migrates any old/malformed sub-state forward to a fresh field, preserving only a
// completed clear so a returning winner is never reset into a new fight. snapshotRun/restoreRun are
// pure (de)serializers used by the run-state retrofit to resume an in-progress sim across reloads.

export const STATE_VERSION = 2;

export function freshNodes() {
  return NODES.map((n) => ({ id: n.id, health: 100, cascadeStress: 0 }));
}

export function defaultState() {
  return {
    version: STATE_VERSION,
    cycle: 1,
    nodes: freshNodes(),
    states: 0,
    totalStatesEarned: 0,
    salvageTotal: 0,
    selectedDebrisId: "",
    externalImportBonusCycles: 0,
    stabilizers: 0,
    repairUnits: 6,
    repairAllocations: {},
    stabilized: {},
    highLoad: {},
    entropy: 0,
    heat: 0,
    heatRate: 0,
    debris: [],
    archive: [],
    pendingEvent: null,
    activeEvent: null,
    eventSeq: 0,
    warningCheckpoint: null,
    log: [bellMessages.start],
    boss: {
      reached: false,
      defeated: false,
      attempts: 0,
      lockHintStep: 0,
      firstFailureRewound: false,
      burn: null
    },
    meta: {
      firstClearComplete: false,
      btsAvailable: false
    }
  };
}

// normalizeState — return a valid stage-8 state. Old/malformed input (version < current, e.g. the
// retired cycle-14 stub) is rebuilt FRESH; a recorded clear (boss.defeated) is carried forward so a
// returning winner stays cleared. A current-version state is validated/clamped field by field.
export function normalizeState(state) {
  const incoming = state && typeof state === "object" ? state : {};
  if (Number(incoming.version) !== STATE_VERSION) {
    const fresh = defaultState();
    if (incoming.boss && incoming.boss.defeated) {
      fresh.boss = { ...fresh.boss, defeated: true, reached: true };
      fresh.meta = { ...fresh.meta, firstClearComplete: true, btsAvailable: true };
    }
    return fresh;
  }
  const fresh = defaultState();
  const target = incoming;
  target.version = STATE_VERSION;
  target.cycle = posInt(target.cycle, fresh.cycle);
  target.nodes = Array.isArray(target.nodes) && target.nodes.length === fresh.nodes.length
    ? target.nodes.map((n, i) => ({
        id: n?.id || fresh.nodes[i].id,
        health: clampHealth(n?.health),
        cascadeStress: Number.isFinite(Number(n?.cascadeStress)) ? Number(n.cascadeStress) : 0
      }))
    : fresh.nodes;
  target.states = num(target.states, fresh.states);
  target.totalStatesEarned = num(target.totalStatesEarned, fresh.totalStatesEarned);
  target.salvageTotal = num(target.salvageTotal, fresh.salvageTotal);
  target.selectedDebrisId = typeof target.selectedDebrisId === "string" ? target.selectedDebrisId : "";
  target.externalImportBonusCycles = num(target.externalImportBonusCycles, 0);
  target.stabilizers = Math.max(0, num(target.stabilizers, 0));
  target.repairUnits = num(target.repairUnits, fresh.repairUnits);
  target.repairAllocations = plain(target.repairAllocations);
  target.stabilized = plain(target.stabilized);
  target.highLoad = plain(target.highLoad);
  target.entropy = num(target.entropy, 0);
  target.heat = Math.max(0, Math.min(100, num(target.heat, 0)));
  target.heatRate = num(target.heatRate, 0);
  target.debris = Array.isArray(target.debris) ? target.debris : [];
  target.archive = Array.isArray(target.archive) ? target.archive : [];
  target.pendingEvent = target.pendingEvent && typeof target.pendingEvent === "object" ? target.pendingEvent : null;
  target.activeEvent = target.activeEvent && typeof target.activeEvent === "object" ? target.activeEvent : null;
  target.eventSeq = num(target.eventSeq, 0);
  target.warningCheckpoint = target.warningCheckpoint || null;
  target.log = Array.isArray(target.log) ? target.log : fresh.log;
  target.boss = { ...fresh.boss, ...(target.boss && typeof target.boss === "object" ? target.boss : {}) };
  target.meta = { ...fresh.meta, ...(target.meta && typeof target.meta === "object" ? target.meta : {}) };
  return target;
}

// snapshotRun — a plain, JSON-safe copy of the live sim (for the run-state 'runsim' checkpoint slot).
export function snapshotRun(state) {
  return {
    version: STATE_VERSION,
    cycle: state.cycle,
    nodes: (state.nodes || []).map((n) => ({ id: n.id, health: n.health, cascadeStress: n.cascadeStress || 0 })),
    states: state.states,
    totalStatesEarned: state.totalStatesEarned,
    salvageTotal: state.salvageTotal,
    selectedDebrisId: state.selectedDebrisId,
    externalImportBonusCycles: state.externalImportBonusCycles || 0,
    stabilizers: state.stabilizers || 0,
    repairUnits: state.repairUnits,
    repairAllocations: { ...(state.repairAllocations || {}) },
    stabilized: { ...(state.stabilized || {}) },
    highLoad: { ...(state.highLoad || {}) },
    entropy: state.entropy || 0,
    heat: state.heat || 0,
    heatRate: state.heatRate || 0,
    debris: (state.debris || []).map((d) => ({ ...d })),
    archive: (state.archive || []).map((a) => ({ ...a })),
    pendingEvent: state.pendingEvent ? { ...state.pendingEvent } : null,
    activeEvent: state.activeEvent ? { ...state.activeEvent } : null,
    eventSeq: state.eventSeq || 0,
    warningCheckpoint: state.warningCheckpoint || null,
    log: [...(state.log || [])],
    boss: { ...state.boss },
    meta: { ...state.meta }
  };
}

// restoreRun — mutate `state` to equal a normalized snapshot (resume entry point). Returns `state`.
export function restoreRun(state, snap) {
  const norm = normalizeState({ ...(snap || {}), version: STATE_VERSION });
  Object.assign(state, norm);
  return state;
}

function clampHealth(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 100;
  return Math.max(0, Math.min(100, n));
}

function num(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function posInt(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 1 ? Math.trunc(n) : fallback;
}

function plain(v) {
  return v && typeof v === "object" && !Array.isArray(v) ? v : {};
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
