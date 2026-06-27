// GENERATED — DO NOT EDIT BY HAND.
// Bundled from docs/games/metagame/stages/stage8/index.js (+ its local modules) by
// build/metagame/build.mjs. Rebuild:  node build/metagame/build.mjs  (run by scripts/check.sh).
// Exports stageMeta / defaultState / mountStage. Shared ../../*.js singletons + ./styles.css stay
// external (NOT inlined). The hub's stage-manifest.js LOADERS import THIS file.


// ../../docs/games/metagame/stages/stage8/messages.js
var ACTION_NAME = "salvage_archived";
var REQUIRED_ACTION = "8.salvage_archived";
var ACHIEVEMENT_ID = "stage8.salvage_archived";
var ACHIEVEMENT_TEXT = "I sorted the wreckage.";
var BTS_PATH = "/docs/bts/entropy_field.bts";
var SALVAGE_REQUIRED = 72;
var STATES_REQUIRED = 300;
var MIN_CYCLE = 8;
var BURN_CYCLES = 10;
var STABILIZER_COST = 40;
var bellMessages = {
  start: "something is degrading. I noticed too late to stop it.",
  debris: "there was something left in the wreckage. it won't last long.",
  archive: "if I can't stop it, I can use what remains.",
  warning: "a cascade is coming. I don't know how large. I am saving what I can.",
  defeated: "I held. the universe didn't care. I did.",
  failed: "there was more. it was in the debris files. I didn't move them in time."
};
var lockedHintLadder = [
  "the collapse is not waiting for a heroic moment.",
  "you keep defending the field. what it discards does not vanish — it settles somewhere outside the fight.",
  "the States from failed nodes cool into .sav debris in /entropy/debris/.",
  "move that debris into /entropy/active_archive/ — the Archive button or drag/drop — and bank enough before Heat Death."
];
function gateHint(lock) {
  if (!lock.actionReady) return "move a .sav from /entropy/debris/ into /entropy/active_archive/ — that is the lesson.";
  if (!lock.enoughSalvage) return `archive more wreckage: salvage ${lock.salvageTotal}/${lock.salvageRequired}.`;
  if (!lock.enoughCycles) return `survive longer: cycle ${lock.cycle}/${lock.minCycle} before Heat Death will commit.`;
  if (!lock.enoughStates) return `bank deeper reserves: ${lock.totalEarned}/${lock.statesRequired} States earned. the burn drains everything.`;
  return "the reserves are deep enough. Heat Death can be endured.";
}
var btsSummary = [
  "Stage 8 uses internal drag and drop because OS file dragging behaves differently across browsers, touch devices, and assistive technology.",
  "The critical lesson is still the file action: a generated .sav moves from debris into an active archive before decay.",
  "External import can exist as a bonus, but Heat Death is balanced around the internal archive path and its accessible fallback."
];

// ../../docs/games/metagame/stages/stage8/burn.js
function baseDrain(i) {
  return 12 + i * 3;
}
function simulateHeatDeath(state, rng) {
  let states = Math.max(0, Number(state.states || 0));
  let stabilizers = Math.max(0, Number(state.stabilizers || 0));
  const trace = [];
  for (let i = 0; i < BURN_CYCLES; i += 1) {
    let drain = baseDrain(i) + (rng && typeof rng.int === "function" ? rng.int(0, 4) : 2);
    let paused = false;
    if (stabilizers > 0 && drain > states) {
      stabilizers -= 1;
      paused = true;
      drain = Math.floor(drain / 2);
    }
    states -= drain;
    trace.push({ cycle: i + 1, drain, paused, remaining: states });
    if (states < 0) {
      return { survived: false, failedAt: i + 1, trace, remainingStates: states, stabilizersLeft: stabilizers };
    }
  }
  return { survived: true, trace, remainingStates: states, stabilizersLeft: stabilizers };
}

// ../../docs/games/metagame/stages/stage8/rng.js
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = h << 13 | h >>> 19;
  }
  return () => {
    h = Math.imul(h ^ h >>> 16, 2246822507);
    h = Math.imul(h ^ h >>> 13, 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}
function mulberry32(a) {
  return () => {
    a |= 0;
    a = a + 1831565813 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function makeRng(seed) {
  const next = mulberry32(xmur3(String(seed))());
  const float = () => next();
  const int = (lo, hi) => lo + Math.floor(next() * (hi - lo + 1));
  const pick = (arr) => arr[Math.floor(next() * arr.length)];
  const chance = (p) => next() < p;
  const shuffle = (arr) => {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(next() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  return { float, int, pick, chance, shuffle };
}

// ../../docs/games/metagame/stages/stage8/boss.js
function hasSalvageArchived(actions) {
  return Boolean(actions && typeof actions.hasAction === "function" && actions.hasAction(8, ACTION_NAME));
}
function archiveDebris({
  state,
  actions,
  achievements,
  bell,
  debrisId,
  source = "internal-drag-drop",
  fallback = false
}) {
  const index = state.debris.findIndex((item) => item.id === debrisId && item.id.endsWith(".sav"));
  if (index < 0) return { archived: false, reason: "missing-debris" };
  const [debris] = state.debris.splice(index, 1);
  const archived = {
    ...debris,
    archivedAtCycle: state.cycle,
    path: `/entropy/active_archive/${debris.id}`
  };
  state.archive.push(archived);
  state.salvageTotal = Number(state.salvageTotal || 0) + Number(debris.value || 0);
  state.states = Number(state.states || 0) + Number(debris.value || 0);
  state.selectedDebrisId = state.debris[0]?.id || "";
  pushLog(state, `archived ${debris.id}. +${debris.value} States.`);
  const firstArchive = !hasSalvageArchived(actions);
  if (actions && typeof actions.setAction === "function") {
    actions.setAction(8, ACTION_NAME, {
      source,
      file: debris.id,
      from: "/entropy/debris/",
      to: "/entropy/active_archive/",
      fallback
    });
  }
  if (firstArchive) {
    notifyBell(bell, bellMessages.archive, "stage8.salvage_archived");
    unlockAchievement(achievements, ACHIEVEMENT_ID, {
      id: ACHIEVEMENT_ID,
      stage: 8,
      text: ACHIEVEMENT_TEXT,
      action: "8.salvage_archived"
    });
  }
  return { archived: true, debris: archived, firstArchive };
}
function handleDebrisDrop({ state, actions, achievements, bell, debrisId, targetPath }) {
  if (targetPath !== "/entropy/active_archive/") return { archived: false, reason: "wrong-target" };
  return archiveDebris({ state, actions, achievements, bell, debrisId, source: "internal-drag-drop", fallback: false });
}
function archiveSelectedDebris({ state, actions, achievements, bell, source = "archive-button" }) {
  return archiveDebris({
    state,
    actions,
    achievements,
    bell,
    debrisId: state.selectedDebrisId,
    source,
    fallback: true
  });
}
function getBossLockState({ actions, state }) {
  const actionReady = hasSalvageArchived(actions);
  const salvageTotal = Number(state.salvageTotal || 0);
  const totalEarned = Number(state.totalStatesEarned || 0);
  const cycle = Number(state.cycle || 0);
  const enoughSalvage = salvageTotal >= SALVAGE_REQUIRED;
  const enoughStates = totalEarned >= STATES_REQUIRED;
  const enoughCycles = cycle >= MIN_CYCLE;
  const unlocked = actionReady && enoughSalvage && enoughStates && enoughCycles;
  const lock = {
    unlocked,
    defeated: Boolean(state.boss.defeated),
    actionReady,
    enoughSalvage,
    enoughStates,
    enoughCycles,
    salvageTotal,
    salvageRequired: SALVAGE_REQUIRED,
    totalEarned,
    statesRequired: STATES_REQUIRED,
    cycle,
    minCycle: MIN_CYCLE,
    defeatPossible: unlocked,
    burnCycles: BURN_CYCLES
  };
  lock.hint = gateHint(lock);
  return lock;
}
function recordHeatDeathAttempt({ state, actions, rng }) {
  state.boss.reached = true;
  const lock = getBossLockState({ actions, state });
  if (!lock.unlocked) return { ...recordHeatDeathFailure(state, lock), locked: true };
  const burn = simulateHeatDeath(state, rng || makeRng("8:burn"));
  state.boss.burn = burn;
  if (!burn.survived) {
    pushLog(state, `Heat Death overran reserves at burn cycle ${burn.failedAt}.`);
    return { ...recordHeatDeathFailure(state, lock), burn, locked: false };
  }
  state.states = Math.max(0, Math.round(burn.remainingStates));
  state.stabilizers = burn.stabilizersLeft;
  state.boss.defeated = true;
  state.meta.firstClearComplete = true;
  state.meta.btsAvailable = true;
  pushLog(state, bellMessages.defeated);
  return { defeated: true, unlocked: true, btsAvailable: true, burn };
}
function recordHeatDeathFailure(state, lock = null) {
  state.boss.attempts = Number(state.boss.attempts || 0) + 1;
  state.boss.lockHintStep = Math.min(Number(state.boss.lockHintStep || 0) + 1, lockedHintLadder.length - 1);
  if (!state.warningCheckpoint) state.warningCheckpoint = makeWarningCheckpoint(state);
  const checkpoint = rewindToWarningCheckpoint(state);
  pushLog(state, bellMessages.failed);
  return {
    defeated: false,
    unlocked: Boolean(lock?.unlocked),
    canRewindWarningCheckpoint: true,
    checkpointCycle: checkpoint.cycle
  };
}
function makeWarningCheckpoint(state) {
  return {
    cycle: Math.max(1, Number(state.cycle || 1) - 5),
    states: Math.max(0, Number(state.states || 0)),
    salvageTotal: Number(state.salvageTotal || 0),
    debris: state.debris.map((item) => ({ ...item })),
    archive: state.archive.map((item) => ({ ...item }))
  };
}
function rewindToWarningCheckpoint(state) {
  const checkpoint = state.warningCheckpoint || makeWarningCheckpoint(state);
  state.cycle = checkpoint.cycle;
  state.states = checkpoint.states;
  state.salvageTotal = checkpoint.salvageTotal;
  state.debris = checkpoint.debris.map((item) => ({ ...item }));
  state.archive = checkpoint.archive.map((item) => ({ ...item }));
  state.boss.firstFailureRewound = true;
  return checkpoint;
}
function pushLog(state, line) {
  state.log = [...state.log || [], line].slice(-6);
}
function notifyBell(bell, text, id) {
  if (bell && typeof bell.push === "function") bell.push({ id, stage: 8, text });
  else if (bell && typeof bell.say === "function") bell.say(text, { id, stage: 8 });
  else if (bell && typeof bell.add === "function") bell.add(text, { id, stage: 8 });
}
function unlockAchievement(achievements, id, detail) {
  if (achievements && typeof achievements.unlockAchievement === "function") achievements.unlockAchievement(id, detail);
  else if (achievements && typeof achievements.unlock === "function") achievements.unlock(id, detail);
}

// ../../docs/games/metagame/stages/stage8/nodes.js
var TIER = {
  1: { baseDecayPct: 2, baseOutput: 12, degradedOutput: 6, supportsHighLoad: false, debrisTier: 1 },
  2: { baseDecayPct: 3, baseOutput: 10, degradedOutput: 5, supportsHighLoad: false, debrisTier: 2 },
  3: { baseDecayPct: 4, baseOutput: 14, degradedOutput: 7, supportsHighLoad: true, debrisTier: 3 },
  4: { baseDecayPct: 6, baseOutput: 16, degradedOutput: 8, supportsHighLoad: true, debrisTier: 4 }
};
function node(id, name, zone, tier) {
  return { id, name, zone, tier, ...TIER[tier] };
}
var NODES = [
  node("C1", "Core Kernel", "core", 1),
  node("C2", "Secondary Core", "core", 1),
  node("M1", "Mid Relay 1", "mid", 2),
  node("M2", "Mid Relay 2", "mid", 2),
  node("M3", "Mid Relay 3", "mid", 2),
  node("M4", "Mid Relay 4", "mid", 2),
  node("P1", "Production 1", "production", 3),
  node("P2", "Production 2", "production", 3),
  node("P3", "Production 3", "production", 3),
  node("P4", "Production 4", "production", 3),
  node("F1", "Frontier 1", "frontier", 4),
  node("F2", "Frontier 2", "frontier", 4),
  node("F3", "Frontier 3", "frontier", 4),
  node("F4", "Frontier 4", "frontier", 4)
];
var NODE_BY_ID = new Map(NODES.map((n) => [n.id, n]));
function nodeById(id) {
  return NODE_BY_ID.get(id) || null;
}
var EDGES = [
  ["F1", "M1"],
  ["F2", "M2"],
  ["F3", "M3"],
  ["F4", "M4"],
  ["P1", "M1"],
  ["P2", "M2"],
  ["P3", "M3"],
  ["P4", "M4"],
  ["M1", "C1"],
  ["M2", "C1"],
  ["M3", "C2"],
  ["M4", "C2"],
  ["C1", "C2"],
  ["C2", "C1"]
];
var ADJACENCY = (() => {
  const map = new Map(NODES.map((n) => [n.id, []]));
  for (const [from, to] of EDGES) map.get(from).push(to);
  return map;
})();

// ../../docs/games/metagame/stages/stage8/state.js
var STATE_VERSION = 2;
function freshNodes() {
  return NODES.map((n) => ({ id: n.id, health: 100, cascadeStress: 0 }));
}
function defaultState() {
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
function normalizeState(state) {
  const incoming = state && typeof state === "object" ? state : {};
  if (Number(incoming.version) !== STATE_VERSION) {
    const fresh2 = defaultState();
    if (incoming.boss && incoming.boss.defeated) {
      fresh2.boss = { ...fresh2.boss, defeated: true, reached: true };
      fresh2.meta = { ...fresh2.meta, firstClearComplete: true, btsAvailable: true };
    }
    return fresh2;
  }
  const fresh = defaultState();
  const target = incoming;
  target.version = STATE_VERSION;
  target.cycle = posInt(target.cycle, fresh.cycle);
  target.nodes = Array.isArray(target.nodes) && target.nodes.length === fresh.nodes.length ? target.nodes.map((n, i) => ({
    id: n?.id || fresh.nodes[i].id,
    health: clampHealth(n?.health),
    cascadeStress: Number.isFinite(Number(n?.cascadeStress)) ? Number(n.cascadeStress) : 0
  })) : fresh.nodes;
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
  target.debris = Array.isArray(target.debris) ? target.debris : [];
  target.archive = Array.isArray(target.archive) ? target.archive : [];
  target.pendingEvent = target.pendingEvent && typeof target.pendingEvent === "object" ? target.pendingEvent : null;
  target.activeEvent = target.activeEvent && typeof target.activeEvent === "object" ? target.activeEvent : null;
  target.eventSeq = num(target.eventSeq, 0);
  target.warningCheckpoint = target.warningCheckpoint || null;
  target.log = Array.isArray(target.log) ? target.log : fresh.log;
  target.boss = { ...fresh.boss, ...target.boss && typeof target.boss === "object" ? target.boss : {} };
  target.meta = { ...fresh.meta, ...target.meta && typeof target.meta === "object" ? target.meta : {} };
  return target;
}
function snapshotRun(state) {
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
    repairAllocations: { ...state.repairAllocations || {} },
    stabilized: { ...state.stabilized || {} },
    highLoad: { ...state.highLoad || {} },
    entropy: state.entropy || 0,
    debris: (state.debris || []).map((d) => ({ ...d })),
    archive: (state.archive || []).map((a) => ({ ...a })),
    pendingEvent: state.pendingEvent ? { ...state.pendingEvent } : null,
    activeEvent: state.activeEvent ? { ...state.activeEvent } : null,
    eventSeq: state.eventSeq || 0,
    warningCheckpoint: state.warningCheckpoint || null,
    log: [...state.log || []],
    boss: { ...state.boss },
    meta: { ...state.meta }
  };
}
function restoreRun(state, snap) {
  const norm = normalizeState({ ...snap || {}, version: STATE_VERSION });
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
function createDebris({ node: node3, cycle, tier, value, decay = 2 }) {
  const id = `node_${node3}_cycle${cycle}.sav`;
  return {
    id,
    node: node3,
    cycle,
    tier,
    value,
    decay,
    path: `/entropy/debris/${id}`
  };
}

// ../../docs/games/metagame/stages/stage8/events.js
var clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
var byZone = (state, zonePrefix) => state.nodes.filter((n) => String(n.id).startsWith(zonePrefix));
var EVENTS = [
  {
    id: "heat_spike",
    label: "heat spike",
    bad: true,
    telegraph: "a heat spike is forming — frontier nodes will take damage next cycle.",
    apply(state) {
      for (const n of byZone(state, "F")) n.health = clamp(n.health - 8, 0, 100);
      return { note: "frontier seared -8" };
    }
  },
  {
    id: "pattern_failure",
    label: "pattern failure",
    bad: true,
    telegraph: "a pattern is destabilizing — the weakest node will buckle next cycle.",
    apply(state) {
      const target = [...state.nodes].sort((a, b) => a.health - b.health)[0];
      if (target) target.health = clamp(target.health - 18, 0, 100);
      return { note: `pattern broke on ${target?.id || "?"} -18` };
    }
  },
  {
    id: "jitter_storm",
    label: "jitter storm",
    bad: true,
    telegraph: "a jitter storm is inbound — every node will take light damage next cycle.",
    apply(state) {
      for (const n of state.nodes) n.health = clamp(n.health - 3, 0, 100);
      return { note: "field-wide -3" };
    }
  },
  {
    id: "phantom_load",
    label: "phantom load",
    bad: true,
    telegraph: "a phantom load is queuing onto a production node next cycle.",
    apply(state, rng) {
      const prod = byZone(state, "P");
      const target = prod.length ? rng.pick(prod) : null;
      if (target) target.health = clamp(target.health - 12, 0, 100);
      return { note: `phantom load on ${target?.id || "?"} -12` };
    }
  },
  {
    id: "negative_entropy_window",
    label: "negative-entropy window",
    bad: false,
    telegraph: "a negative-entropy window will open next cycle — a States windfall.",
    apply(state) {
      state.states = Number(state.states || 0) + 25;
      state.totalStatesEarned = Number(state.totalStatesEarned || 0) + 25;
      return { note: "+25 States" };
    }
  },
  {
    id: "resonance_burst",
    label: "resonance burst",
    bad: false,
    telegraph: "a resonance burst will wash the mid relays next cycle — free healing.",
    apply(state) {
      for (const n of byZone(state, "M")) n.health = clamp(n.health + 10, 0, 100);
      return { note: "mid relays +10" };
    }
  },
  {
    id: "core_protection",
    label: "core protection",
    bad: false,
    telegraph: "a core-protection routine will yield a Stabilizer next cycle.",
    apply(state) {
      state.stabilizers = Number(state.stabilizers || 0) + 1;
      return { note: "+1 stabilizer" };
    }
  },
  {
    id: "data_salvage",
    label: "data salvage",
    bad: false,
    telegraph: "a data-salvage cache will surface in /entropy/debris/ next cycle.",
    apply(state, rng) {
      const debris = createDebris({ node: "cache", cycle: state.cycle, tier: 2, value: rng.int(24, 48), decay: 2 });
      state.debris.push(debris);
      return { note: `salvage cache ${debris.id} (+${debris.value} if archived)` };
    }
  }
];
var EVENT_BY_ID = new Map(EVENTS.map((e) => [e.id, e]));
function pushLog2(state, line) {
  state.log = [...state.log || [], line].slice(-12);
}
function resolveEvent(state, rng) {
  state.activeEvent = null;
  const pending = state.pendingEvent;
  if (!pending) return null;
  state.pendingEvent = null;
  const ev = EVENT_BY_ID.get(pending.id);
  if (!ev) return null;
  const detail = ev.apply(state, rng) || {};
  state.activeEvent = { id: ev.id, label: ev.label, bad: Boolean(ev.bad), ...detail };
  pushLog2(state, `${ev.label}: ${detail.note || "resolved"}.`);
  return state.activeEvent;
}
function telegraphNext(state, rng) {
  if (state.pendingEvent) return null;
  if (!rng.chance(0.6)) return null;
  const ev = rng.pick(EVENTS);
  state.pendingEvent = { id: ev.id, label: ev.label, bad: Boolean(ev.bad), telegraph: ev.telegraph };
  state.eventSeq = Number(state.eventSeq || 0) + 1;
  pushLog2(state, `telegraph — next cycle: ${ev.telegraph}`);
  return state.pendingEvent;
}

// ../../docs/games/metagame/stages/stage8/engine.js
var REPAIR_EFFICIENCY = 3;
var BASE_REPAIR_UNITS_PER_CYCLE = 6;
var DEBRIS_VALUE = { 1: [8, 24], 2: [24, 48], 3: [48, 64], 4: [64, 88] };
function status(health) {
  if (health <= 0) return "failed";
  return health < 60 ? "degrading" : "active";
}
function ensureRuntime(state) {
  if (!state.stabilized || typeof state.stabilized !== "object") state.stabilized = {};
  if (!state.repairAllocations || typeof state.repairAllocations !== "object") state.repairAllocations = {};
  if (!state.highLoad || typeof state.highLoad !== "object") state.highLoad = {};
  if (!Number.isFinite(state.repairUnits)) state.repairUnits = BASE_REPAIR_UNITS_PER_CYCLE;
  if (!Number.isFinite(state.stabilizers)) state.stabilizers = 0;
  for (const n of state.nodes) if (!Number.isFinite(n.cascadeStress)) n.cascadeStress = 0;
}
var clamp2 = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
var node2 = (state, id) => state.nodes.find((n) => n.id === id);
function advanceCycle(state, rng) {
  ensureRuntime(state);
  const result = { income: 0, newDebris: [], expiredDebris: [], newlyFailed: [], entropy: 0, event: null };
  result.event = resolveEvent(state, rng);
  const priorStatus = new Map(state.nodes.map((n) => [n.id, status(n.health)]));
  for (const id of Object.keys(state.stabilized)) {
    state.stabilized[id] -= 1;
    if (state.stabilized[id] <= 0) delete state.stabilized[id];
  }
  for (const n of state.nodes) {
    if (state.stabilized[n.id]) continue;
    const def = nodeById(n.id) || {};
    const highLoad = Boolean(state.highLoad[n.id]) && def.supportsHighLoad;
    const loss = ((def.baseDecayPct || 0) + (n.cascadeStress || 0)) * (highLoad ? 1.5 : 1);
    n.health = clamp2(n.health - loss, 0, 100);
  }
  for (const [id, units] of Object.entries(state.repairAllocations)) {
    const n = node2(state, id);
    if (n) n.health = clamp2(n.health + units * REPAIR_EFFICIENCY, 0, 100);
  }
  state.repairAllocations = {};
  for (const n of state.nodes) {
    if (status(n.health) === "failed" && priorStatus.get(n.id) !== "failed") {
      const def = nodeById(n.id) || { tier: 1 };
      const [lo, hi] = DEBRIS_VALUE[def.tier] || DEBRIS_VALUE[1];
      const debris = createDebris({ node: n.id, cycle: state.cycle, tier: def.tier, value: rng.int(lo, hi), decay: 2 });
      state.debris.push(debris);
      result.newDebris.push(debris);
      result.newlyFailed.push(n.id);
      pushLog3(state, `${n.id} failed. ${debris.id} created in /entropy/debris/.`);
    }
  }
  for (const n of state.nodes) n.cascadeStress = 0;
  for (const n of state.nodes) {
    if (status(n.health) !== "failed") continue;
    for (const downstream of ADJACENCY.get(n.id) || []) {
      const d = node2(state, downstream);
      if (d) d.cascadeStress += 1;
    }
  }
  const kept = [];
  for (const item of state.debris) {
    item.decay -= 1;
    if (item.decay <= 0) {
      result.expiredDebris.push(item);
      pushLog3(state, `${item.id} decayed. States lost permanently.`);
    } else kept.push(item);
  }
  state.debris = kept;
  let active = 0;
  let degraded = 0;
  let failedCount = 0;
  let degradingCount = 0;
  for (const n of state.nodes) {
    const def = nodeById(n.id) || {};
    const s = status(n.health);
    if (s === "active") active += def.baseOutput || 0;
    else if (s === "degrading") {
      degraded += (def.degradedOutput || 0) * 0.5;
      degradingCount += 1;
    } else failedCount += 1;
  }
  const entropySink = Math.floor(state.cycle / 3);
  result.income = Math.max(0, Math.round(active + degraded - entropySink));
  state.states = (state.states || 0) + result.income;
  state.totalStatesEarned = (state.totalStatesEarned || 0) + result.income;
  result.entropy = clamp2(failedCount * 10 + degradingCount * 4, 0, 100);
  state.entropy = result.entropy;
  state.repairUnits = BASE_REPAIR_UNITS_PER_CYCLE;
  state.cycle = (state.cycle || 0) + 1;
  result.pendingEvent = telegraphNext(state, rng);
  return result;
}
function applyRepair(state, nodeId, units) {
  ensureRuntime(state);
  const u = Math.trunc(Number(units) || 0);
  if (u <= 0) return { ok: false, reason: "units" };
  if (!node2(state, nodeId)) return { ok: false, reason: "no-node" };
  if (u > state.repairUnits) return { ok: false, reason: "budget" };
  state.repairUnits -= u;
  state.repairAllocations[nodeId] = (state.repairAllocations[nodeId] || 0) + u;
  return { ok: true, remaining: state.repairUnits };
}
function buildStabilizer(state, cost) {
  ensureRuntime(state);
  const c = Math.trunc(Number(cost) || 0);
  if (c <= 0) return { ok: false, reason: "cost" };
  if ((state.states || 0) < c) return { ok: false, reason: "states" };
  state.states -= c;
  state.stabilizers = (state.stabilizers || 0) + 1;
  return { ok: true, stabilizers: state.stabilizers };
}
function pushLog3(state, line) {
  state.log = [...state.log || [], line].slice(-12);
}

// ../../docs/games/metagame/stages/stage8/solver.js
var REPAIR_STEP = 2;
function salvageableValue(state) {
  return (state.debris || []).reduce((sum, d) => sum + Number(d.value || 0), 0);
}
function bodyGateMet(state) {
  return Number(state.cycle || 0) >= MIN_CYCLE && Number(state.totalStatesEarned || 0) >= STATES_REQUIRED && salvageableValue(state) >= SALVAGE_REQUIRED;
}
function repairSpine(state) {
  const spine = state.nodes.filter((n) => !String(n.id).startsWith("F"));
  for (const n of [...spine].sort((a, b) => a.health - b.health)) {
    if ((state.repairUnits || 0) <= 0) break;
    if (n.health >= 100) continue;
    applyRepair(state, n.id, Math.min(REPAIR_STEP, state.repairUnits));
  }
}
function driveToGate(state, makeCycleRng, { maxCycles = 60 } = {}) {
  for (let i = 0; i < maxCycles; i += 1) {
    if (bodyGateMet(state)) break;
    repairSpine(state);
    advanceCycle(state, makeCycleRng(state.cycle));
  }
  return state;
}

// ../../docs/games/metagame/stages/stage8/content.js
function entropyTreeText(state) {
  const debris = state.debris.map((item) => `    ${item.id} (${item.decay} cycles, ${item.value} States)`);
  const archive = state.archive.map((item) => `    ${item.id} (${item.value} States)`);
  return [
    "/entropy/",
    "  active_archive/",
    ...archive.length ? archive : ["    (empty)"],
    "  debris/",
    ...debris.length ? debris : ["    (empty)"]
  ].join("\n");
}

// ../../docs/games/metagame/stages/stage8/paint.js
function paintStage8({ state, lock, els, onSelectDebris }) {
  const { fields, map, log, root } = els;
  fields.cycle.textContent = String(state.cycle);
  fields.states.textContent = String(state.states);
  fields.entropy.textContent = String(state.entropy || 0);
  fields.repairUnits.textContent = String(Number.isFinite(state.repairUnits) ? state.repairUnits : 6);
  fields.stabilizers.textContent = String(state.stabilizers || 0);
  fields.salvage.textContent = String(state.salvageTotal);
  fields.tree.textContent = entropyTreeText(state);
  fields.boss.textContent = state.boss.defeated ? "defeated. BTS trace available." : `${lock.unlocked ? "UNLOCKED" : "LOCKED"} · action ${tick(lock.actionReady)} · salvage ${tick(lock.enoughSalvage)} · cycles ${tick(lock.enoughCycles)} · reserves ${tick(lock.enoughStates)}`;
  fields.hint.textContent = lock.hint;
  paintTelegraph(fields.telegraph, state);
  paintBurn(fields.burn, state.boss.burn);
  paintDebrisSelect(fields.debrisSelect, state);
  map.replaceChildren(...state.nodes.map(nodeCard), ...state.debris.map((item) => debrisChip(item, onSelectDebris)));
  log.replaceChildren(...state.log.slice(-5).map((line) => {
    const li = document.createElement("li");
    li.textContent = line;
    return li;
  }));
  root.querySelector('[data-action="bts"]').hidden = !state.boss.defeated;
}
function tick(ok) {
  return ok ? "✓" : "✗";
}
function paintTelegraph(el, state) {
  if (!el) return;
  const pending = state.pendingEvent;
  if (pending) {
    el.hidden = false;
    el.dataset.tone = pending.bad ? "bad" : "good";
    el.textContent = `⚠ incoming — ${pending.telegraph}`;
  } else {
    el.hidden = true;
  }
}
function paintBurn(el, burn) {
  if (!el) return;
  if (burn && Array.isArray(burn.trace) && burn.trace.length) {
    el.hidden = false;
    el.textContent = [
      burn.survived ? `HEAT DEATH ENDURED · ${burn.remainingStates} States remain` : `HEAT DEATH OVERRAN at burn cycle ${burn.failedAt}`,
      ...burn.trace.map((t) => `  burn ${t.cycle}: -${t.drain}${t.paused ? " (stabilizer)" : ""} → ${t.remaining}`)
    ].join("\n");
  } else {
    el.hidden = true;
  }
}
function paintDebrisSelect(select, state) {
  select.replaceChildren(...state.debris.map((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = `${item.id} (${item.value})`;
    option.selected = item.id === state.selectedDebrisId;
    return option;
  }));
}
function nodeCard(n) {
  const def = nodeById(n.id) || {};
  const s = status(n.health);
  const item = document.createElement("div");
  item.className = `s8-node is-${s}`;
  const bar = `<span class="s8-node-bar"><span style="width:${Math.round(n.health)}%"></span></span>`;
  item.innerHTML = `<span class="s8-node-id">${n.id}</span> <span class="s8-node-name">${def.name || ""}</span>
    ${bar} <span class="s8-node-hp">${Math.round(n.health)}%</span>
    <button type="button" data-repair="${n.id}">repair</button>`;
  return item;
}
function debrisChip(item, onSelectDebris) {
  const debris = document.createElement("button");
  debris.type = "button";
  debris.className = "s8-debris";
  debris.draggable = true;
  debris.dataset.debrisId = item.id;
  debris.textContent = item.id;
  debris.addEventListener("click", () => onSelectDebris(item.id));
  return debris;
}

// ../../docs/games/metagame/stages/stage8/renderer.js
var REPAIR_STEP2 = 2;
function renderStage8({ host, state, actions, achievements, bell, bts, viewer, save, run, onStageComplete }) {
  const root = document.createElement("section");
  root.className = "stage8-entropy-field";
  root.innerHTML = `
    <header class="s8-hud">
      <strong>ENTROPY FIELD</strong>
      <span>cycle <b data-field="cycle"></b></span>
      <span>States <b data-field="states"></b></span>
      <span>entropy <b data-field="entropy"></b>%</span>
      <span>repair <b data-field="repairUnits"></b></span>
      <span>stabilizers <b data-field="stabilizers"></b></span>
      <span>salvage <b data-field="salvage"></b>/${SALVAGE_REQUIRED}</span>
    </header>
    <div class="s8-layout">
      <div class="s8-map" aria-label="node status"></div>
      <div class="s8-files">
        <pre data-field="tree" aria-label="entropy virtual file tree"></pre>
        <label>Debris
          <select data-field="debrisSelect"></select>
        </label>
        <button type="button" data-action="archive">Archive</button>
        <div class="s8-drop" data-drop-target="/entropy/active_archive/" tabindex="0" role="button" aria-label="Archive selected debris">Active Archive</div>
      </div>
    </div>
    <div class="s8-boss">
      <strong>THE HEAT DEATH</strong>
      <div data-field="boss"></div>
      <div data-field="hint"></div>
      <pre data-field="burn" class="s8-burn" hidden></pre>
    </div>
    <div data-field="telegraph" class="s8-telegraph" hidden></div>
    <ol class="s8-log"></ol>
    <div class="s8-controls">
      <button type="button" data-action="advance">advance cycle ▸</button>
      <button type="button" data-action="stabilizer">build stabilizer (${STABILIZER_COST} States)</button>
      <button type="button" data-action="boss">challenge Heat Death</button>
      <button type="button" data-action="external">simulate external import</button>
      <button type="button" data-action="bts" hidden>open entropy_field.bts</button>
    </div>
  `;
  host.replaceChildren(root);
  const fields = Object.fromEntries([...root.querySelectorAll("[data-field]")].map((el) => [el.dataset.field, el]));
  const map = root.querySelector(".s8-map");
  const log = root.querySelector(".s8-log");
  const dropTarget = root.querySelector(".s8-drop");
  const completeOnce = once((result) => {
    if (typeof onStageComplete === "function") onStageComplete(result);
  });
  const seedBase = run?.seed || "8";
  dropTarget.addEventListener("dragover", (event) => event.preventDefault());
  dropTarget.addEventListener("drop", (event) => {
    event.preventDefault();
    const debrisId = event.dataTransfer?.getData("text/plain") || state.selectedDebrisId;
    handleDebrisDrop({ state, actions, achievements, bell, debrisId, targetPath: "/entropy/active_archive/" });
    persistAndPaint();
  });
  dropTarget.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    archiveSelectedDebris({ state, actions, achievements, bell, source: "keyboard-archive-target" });
    persistAndPaint();
  });
  root.addEventListener("dragstart", (event) => {
    const item = event.target.closest("[data-debris-id]");
    if (item && event.dataTransfer) event.dataTransfer.setData("text/plain", item.dataset.debrisId);
  });
  root.addEventListener("change", (event) => {
    if (event.target === fields.debrisSelect) {
      state.selectedDebrisId = fields.debrisSelect.value;
      persistAndPaint();
    }
  });
  root.addEventListener("click", (event) => {
    const repair = event.target.closest("button[data-repair]");
    if (repair) {
      applyRepair(state, repair.dataset.repair, REPAIR_STEP2);
      persistAndPaint();
      return;
    }
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    if (button.dataset.action === "advance") advanceCycle(state, cycleRng(state.cycle));
    if (button.dataset.action === "stabilizer") buildStabilizer(state, STABILIZER_COST);
    if (button.dataset.action === "archive") archiveSelectedDebris({ state, actions, achievements, bell });
    if (button.dataset.action === "external") {
      state.externalImportBonusCycles = 3;
      actions?.setAction?.(8, "external_debris_imported", { source: "external-import" });
    }
    if (button.dataset.action === "boss") challengeBoss();
    if (button.dataset.action === "bts") openBts({ bts, viewer });
    persistAndPaint();
  });
  repaint();
  window.__fvStage8 = {
    state: () => state,
    lockState: () => getBossLockState({ actions, state }),
    advance(cycles = 1) {
      for (let i = 0; i < cycles; i += 1) advanceCycle(state, cycleRng(state.cycle));
      persistAndPaint();
    },
    bodySolver() {
      driveToGate(state, cycleRng);
      persistAndPaint();
      return getBossLockState({ actions, state });
    },
    bossSolver() {
      const result = challengeBoss();
      return {
        defeated: Boolean(state.boss.defeated),
        locked: Boolean(result?.locked),
        burn: result?.burn || null
      };
    }
  };
  return {
    repaint,
    destroy() {
      if (window.__fvStage8) delete window.__fvStage8;
      root.remove();
    }
  };
  function cycleRng(cycle) {
    return makeRng(`${seedBase}:cyc:${cycle}`);
  }
  function challengeBoss() {
    const result = recordHeatDeathAttempt({ state, actions, rng: makeRng(`${seedBase}:burn:${state.cycle}`) });
    persistAndPaint();
    if (result.defeated) {
      if (run && typeof run.reset === "function") run.reset();
      completeOnce({ stage: 8, defeated: true, btsPath: BTS_PATH });
    }
    return result;
  }
  function repaint() {
    if (!state.debris.some((d) => d.id === state.selectedDebrisId)) {
      state.selectedDebrisId = state.debris[0]?.id || "";
    }
    const lock = getBossLockState({ actions, state });
    paintStage8({
      state,
      lock,
      els: { fields, map, log, root },
      onSelectDebris: (id) => {
        state.selectedDebrisId = id;
        repaint();
      }
    });
  }
  function persistAndPaint() {
    if (run && typeof run.checkpoint === "function" && !state.boss.defeated) {
      run.checkpoint({ ...snapshotRun(state), runTag: run.seed });
    }
    if (typeof save === "function") save();
    repaint();
  }
}
function openBts({ bts, viewer }) {
  if (bts && typeof bts.open === "function") bts.open(8);
  else if (bts && typeof bts.openBts === "function") bts.openBts(8);
  else if (viewer && typeof viewer.openFile === "function") viewer.openFile(BTS_PATH);
  else if (viewer && typeof viewer.openViewerFile === "function") viewer.openViewerFile(BTS_PATH);
  else console.info(btsSummary.join("\n"));
}
function once(fn) {
  let called = false;
  return (value) => {
    if (called) return;
    called = true;
    fn(value);
  };
}

// ../../docs/games/metagame/stages/stage8/index.js
import { createRun } from "../../shared/run-state.js";
var stageMeta = {
  id: 8,
  slug: "entropy-field",
  name: "Entropy Field",
  btsPath: BTS_PATH,
  requiredAction: REQUIRED_ACTION
};
function defaultState2(context) {
  return defaultState(context);
}
function mountStage(ctx) {
  const state = normalizeState(ctx.state);
  const saveData = ctx.orchestrator?.save;
  if (saveData && saveData.stageState && typeof saveData.stageState === "object") {
    saveData.stageState[8] = state;
  }
  ensureStyles();
  const run = saveData ? createRun({ save: saveData, stageId: 8, slot: "runsim", debounceMs: 0 }) : null;
  if (run) {
    const snap = run.restore();
    if (snap && snap.runTag === run.seed && !snap.boss?.defeated) {
      restoreRun(state, snap);
    }
  }
  const unsubscribe = subscribeToSalvage(ctx.actions, () => {
    if (typeof ctx.save === "function") ctx.save();
  });
  const view = renderStage8({ ...ctx, state, run });
  return {
    destroy() {
      unsubscribe();
      if (run && typeof run.destroy === "function") run.destroy();
      if (view && typeof view.destroy === "function") view.destroy();
    },
    repaint: view.repaint
  };
}
function subscribeToSalvage(actions, onUnlock) {
  if (actions && typeof actions.subscribeToActions === "function") {
    return actions.subscribeToActions((detail) => {
      if (isSalvageDetail(detail)) onUnlock(detail);
    }) || (() => {
    });
  }
  const handler = (event) => {
    if (isSalvageDetail(event.detail)) onUnlock(event.detail);
  };
  window.addEventListener("fv:games:action", handler);
  return () => window.removeEventListener("fv:games:action", handler);
}
function isSalvageDetail(detail) {
  return Boolean(detail && Number(detail.stage) === 8 && detail.action === ACTION_NAME);
}
function ensureStyles() {
  const id = "stage8-entropy-field-styles";
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = new URL("./styles.css", import.meta.url).href;
  document.head.append(link);
}
export {
  archiveDebris,
  archiveSelectedDebris,
  defaultState2 as defaultState,
  getBossLockState,
  handleDebrisDrop,
  mountStage,
  recordHeatDeathAttempt,
  recordHeatDeathFailure,
  rewindToWarningCheckpoint,
  stageMeta
};
