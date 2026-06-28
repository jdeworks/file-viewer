import { NODES, NODE_BY_ID, freshSectorNodes } from "./nodes.js";
import { bellMessages } from "./messages.js";
import { defaultTechBonuses, recomputeTechBonuses } from "./tech.js";
import { defaultStructureBonuses, recomputeStructureBonuses } from "./structures.js";
import { prestigeMultFor } from "./prestige.js";

// state.js — Stage 8 Entropy Field survival sim state.
//
// The field boots FRESH at cycle 1 with every node at full health and NO pre-seeded debris/States.
// (The old build booted a pre-seeded cycle-14 stub which, combined with a thin gate, let the player
// "archive twice → Heat Death → win". That stub is gone; the boss is now triple-gated + a real burn.)
// normalizeState migrates any old/malformed sub-state forward to a fresh field, preserving only a
// completed clear so a returning winner is never reset into a new fight. snapshotRun/restoreRun are
// pure (de)serializers used by the run-state retrofit to resume an in-progress sim across reloads.

export const STATE_VERSION = 3;

// The field boots with ONLY the core sector online (14 nodes). alpha/beta/gamma append on storm wins.
export function freshNodes() {
  return freshSectorNodes("core");
}

export function defaultState() {
  return {
    version: STATE_VERSION,
    cycle: 1,
    act: 1,
    onlineSectors: ["core"],
    stormsSurvived: 0,
    announcedStorms: [],
    pendingStorm: null,
    activeStorm: null,
    nodes: freshNodes(),
    states: 0,
    totalStatesEarned: 0,
    salvageTotal: 0,
    scrap: 0,
    scrapTotal: 0,
    insight: 0,
    insightTotal: 0,
    insightRate: 0,
    tech: {},
    structures: {},
    manualArchiveDone: false,
    prestigeMult: 1,
    ...defaultTechBonuses(),
    ...defaultStructureBonuses(),
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
      btsAvailable: false,
      cores: 0,
      collapseLevel: 0
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
    // permanent prestige progress survives a version bump (Cores are meta-progression)
    const inMeta = incoming.meta && typeof incoming.meta === "object" ? incoming.meta : {};
    fresh.meta.cores = Math.max(0, num(inMeta.cores, 0));
    fresh.meta.collapseLevel = Math.max(0, num(inMeta.collapseLevel, 0));
    fresh.prestigeMult = prestigeMultFor(fresh.meta.cores);
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
  // Node array is now variable-length (the network grows across acts): keep every entry whose id is a
  // known node; fall back to the fresh core sector only if nothing valid survived.
  const validNodes = Array.isArray(target.nodes)
    ? target.nodes.filter((n) => n && NODE_BY_ID.has(n.id)).map((n) => ({
        id: n.id,
        health: clampHealth(n.health),
        cascadeStress: Number.isFinite(Number(n.cascadeStress)) ? Number(n.cascadeStress) : 0
      }))
    : [];
  target.nodes = validNodes.length ? validNodes : fresh.nodes;
  target.act = posInt(target.act, fresh.act);
  target.onlineSectors = Array.isArray(target.onlineSectors) && target.onlineSectors.length
    ? target.onlineSectors.filter((s) => typeof s === "string")
    : fresh.onlineSectors;
  if (!target.onlineSectors.includes("core")) target.onlineSectors.unshift("core");
  target.stormsSurvived = Math.max(0, num(target.stormsSurvived, 0));
  target.announcedStorms = Array.isArray(target.announcedStorms)
    ? target.announcedStorms.filter((s) => typeof s === "string")
    : [];
  target.pendingStorm = target.pendingStorm && typeof target.pendingStorm === "object" ? target.pendingStorm : null;
  target.activeStorm = target.activeStorm && typeof target.activeStorm === "object" ? target.activeStorm : null;
  target.states = num(target.states, fresh.states);
  target.totalStatesEarned = num(target.totalStatesEarned, fresh.totalStatesEarned);
  target.salvageTotal = num(target.salvageTotal, fresh.salvageTotal);
  target.scrap = Math.max(0, num(target.scrap, 0));
  target.scrapTotal = Math.max(0, num(target.scrapTotal, 0));
  target.insight = Math.max(0, num(target.insight, 0));
  target.insightTotal = Math.max(0, num(target.insightTotal, 0));
  target.insightRate = num(target.insightRate, 0);
  target.tech = plain(target.tech);
  target.structures = plain(target.structures);
  target.manualArchiveDone = Boolean(target.manualArchiveDone);
  recomputeTechBonuses(target);      // rebuild tech bonus fields from the purchased set (source of truth)
  recomputeStructureBonuses(target); // rebuild struct bonus fields from the built set
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
  target.meta.cores = Math.max(0, num(target.meta.cores, 0));
  target.meta.collapseLevel = Math.max(0, num(target.meta.collapseLevel, 0));
  target.prestigeMult = prestigeMultFor(target.meta.cores);
  return target;
}

// snapshotRun — a plain, JSON-safe copy of the live sim (for the run-state 'runsim' checkpoint slot).
export function snapshotRun(state) {
  return {
    version: STATE_VERSION,
    cycle: state.cycle,
    act: state.act || 1,
    onlineSectors: [...(state.onlineSectors || ["core"])],
    stormsSurvived: state.stormsSurvived || 0,
    announcedStorms: [...(state.announcedStorms || [])],
    pendingStorm: state.pendingStorm ? { ...state.pendingStorm } : null,
    activeStorm: state.activeStorm ? { ...state.activeStorm } : null,
    nodes: (state.nodes || []).map((n) => ({ id: n.id, health: n.health, cascadeStress: n.cascadeStress || 0 })),
    states: state.states,
    totalStatesEarned: state.totalStatesEarned,
    salvageTotal: state.salvageTotal,
    scrap: state.scrap || 0,
    scrapTotal: state.scrapTotal || 0,
    insight: state.insight || 0,
    insightTotal: state.insightTotal || 0,
    insightRate: state.insightRate || 0,
    tech: { ...(state.tech || {}) },
    structures: { ...(state.structures || {}) },
    manualArchiveDone: Boolean(state.manualArchiveDone),
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
