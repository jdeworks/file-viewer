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
  if (!lock.enoughStorms) return `weather the Cascade Storms first: ${lock.stormsSurvived}/${lock.stormsRequired} survived. the field must grow before it can end.`;
  if (!lock.actionReady) return "move a .sav from /entropy/debris/ into /entropy/active_archive/ — that is the lesson.";
  if (!lock.enoughSalvage) return `archive more wreckage: salvage ${lock.salvageTotal}/${lock.salvageRequired}.`;
  if (!lock.enoughCycles) return `survive longer: cycle ${lock.cycle}/${lock.minCycle} before Heat Death will commit.`;
  if (!lock.enoughStates) return `earn more total States: ${lock.totalEarned}/${lock.statesRequired} LIFETIME earned (this gate counts every State ever earned, not your current balance).`;
  if (Number(lock.inHandStates) < Number(lock.burnEstimate)) {
    return `gate open — but Heat Death burns your CURRENT balance (${lock.inHandStates} in hand vs ~${lock.burnEstimate} needed), not lifetime earnings. bank more before you commit.`;
  }
  return `reserves are deep enough (${lock.inHandStates} in hand vs ~${lock.burnEstimate} burn). Heat Death can be endured.`;
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
function estimateBurnTotal() {
  let total = 0;
  for (let i = 0; i < BURN_CYCLES; i += 1) total += baseDrain(i) + 2;
  return total;
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

// ../../docs/games/metagame/stages/stage8/nodes.js
var TIER = {
  1: { baseDecayPct: 2, baseOutput: 12, degradedOutput: 6, supportsHighLoad: false, debrisTier: 1 },
  2: { baseDecayPct: 3, baseOutput: 10, degradedOutput: 5, supportsHighLoad: false, debrisTier: 2 },
  3: { baseDecayPct: 4, baseOutput: 14, degradedOutput: 7, supportsHighLoad: true, debrisTier: 3 },
  4: { baseDecayPct: 6, baseOutput: 16, degradedOutput: 8, supportsHighLoad: true, debrisTier: 4 }
};
var ZONE_OVERRIDE = {
  research: { baseDecayPct: 3, baseOutput: 4, degradedOutput: 2, supportsHighLoad: false, debrisTier: 2 },
  coolant: { baseDecayPct: 3, baseOutput: 3, degradedOutput: 1, supportsHighLoad: false, debrisTier: 2, coolantVent: 5 }
};
function node(id, name, zone, tier, sector, extra = {}) {
  const base = ZONE_OVERRIDE[zone] || TIER[tier];
  return { id, name, zone, tier, sector, ...base, ...extra };
}
var NODES = [
  // ── CORE sector (online from cycle 1) ────────────────────────────────────────────────────────────
  node("C1", "Core Kernel", "core", 1, "core", { noCascade: true }),
  node("C2", "Secondary Core", "core", 1, "core", { noCascade: true }),
  node("M1", "Mid Relay 1", "mid", 2, "core"),
  node("M2", "Mid Relay 2", "mid", 2, "core"),
  node("M3", "Mid Relay 3", "mid", 2, "core"),
  node("M4", "Mid Relay 4", "mid", 2, "core"),
  node("P1", "Production 1", "production", 3, "core"),
  node("P2", "Production 2", "production", 3, "core"),
  node("P3", "Production 3", "production", 3, "core"),
  node("P4", "Production 4", "production", 3, "core"),
  node("F1", "Frontier 1", "frontier", 4, "core"),
  node("F2", "Frontier 2", "frontier", 4, "core"),
  node("F3", "Frontier 3", "frontier", 4, "core"),
  node("F4", "Frontier 4", "frontier", 4, "core"),
  // ── ALPHA sector (unlocked by surviving Storm α) — +8 → 22 ───────────────────────────────────────
  node("M5", "Mid Relay 5", "mid", 2, "alpha"),
  node("M6", "Mid Relay 6", "mid", 2, "alpha"),
  node("P5", "Production 5", "production", 3, "alpha"),
  node("P6", "Production 6", "production", 3, "alpha"),
  node("F5", "Frontier 5", "frontier", 4, "alpha"),
  node("F6", "Frontier 6", "frontier", 4, "alpha"),
  node("R1", "Research Lab α", "research", 3, "alpha"),
  node("K1", "Coolant Loop α", "coolant", 2, "alpha"),
  // ── BETA sector (unlocked by surviving Storm β) — +6 → 28 ────────────────────────────────────────
  node("P7", "Production 7", "production", 3, "beta"),
  node("P8", "Production 8", "production", 3, "beta"),
  node("F7", "Frontier 7", "frontier", 4, "beta"),
  node("F8", "Frontier 8", "frontier", 4, "beta"),
  node("R2", "Research Lab β", "research", 3, "beta"),
  node("K2", "Coolant Loop β", "coolant", 2, "beta"),
  // ── GAMMA sector (unlocked by surviving Storm γ) — +6 → 34 ───────────────────────────────────────
  node("P9", "Production 9", "production", 3, "gamma"),
  node("F9", "Frontier 9", "frontier", 4, "gamma"),
  node("F10", "Frontier 10", "frontier", 4, "gamma"),
  node("F11", "Frontier 11", "frontier", 4, "gamma"),
  node("R3", "Research Lab γ", "research", 3, "gamma"),
  node("K3", "Coolant Loop γ", "coolant", 2, "gamma")
];
var NODE_BY_ID = new Map(NODES.map((n) => [n.id, n]));
function nodeById(id) {
  return NODE_BY_ID.get(id) || null;
}
function nodesForSector(sector) {
  return NODES.filter((n) => n.sector === sector);
}
function freshSectorNodes(sector) {
  return nodesForSector(sector).map((n) => ({ id: n.id, health: 100, cascadeStress: 0 }));
}
var EDGES = [
  // core sector
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
  ["C2", "C1"],
  // alpha
  ["F5", "M5"],
  ["F6", "M6"],
  ["P5", "M5"],
  ["P6", "M6"],
  ["R1", "M5"],
  ["K1", "M6"],
  ["M5", "C1"],
  ["M6", "C2"],
  // beta (routes through alpha relays)
  ["F7", "M5"],
  ["F8", "M6"],
  ["P7", "M5"],
  ["P8", "M6"],
  ["R2", "M5"],
  ["K2", "M6"],
  // gamma
  ["F9", "M5"],
  ["F10", "M6"],
  ["F11", "M5"],
  ["P9", "M6"],
  ["R3", "M5"],
  ["K3", "M6"]
];
var ADJACENCY = (() => {
  const map = new Map(NODES.map((n) => [n.id, []]));
  for (const [from, to] of EDGES) map.get(from).push(to);
  return map;
})();

// ../../docs/games/metagame/stages/stage8/resources.js
var ZONE_INSIGHT = { core: 0.6, production: 0.45, research: 1.4, mid: 0, frontier: 0, coolant: 0 };
function scrapYield(debris) {
  const tier = Math.max(1, Number(debris?.tier || 1));
  const value = Math.max(0, Number(debris?.value || 0));
  return tier * 2 + Math.floor(value / 8);
}
function insightIncome(state, statusOf, isOnline = () => true) {
  let income = 0;
  for (const n of state.nodes) {
    if (!isOnline(n)) continue;
    const s = statusOf(n.health);
    if (s === "failed") continue;
    const def = nodeById(n.id) || {};
    const base = ZONE_INSIGHT[def.zone] || 0;
    income += s === "degrading" ? base * 0.5 : base;
  }
  return round2(income);
}
function earnScrap(state, amount) {
  const n = Math.max(0, Math.floor(Number(amount) || 0));
  state.scrap = Math.max(0, Number(state.scrap || 0)) + n;
  state.scrapTotal = Number(state.scrapTotal || 0) + n;
  return state.scrap;
}
function earnInsight(state, amount) {
  const n = Math.max(0, Number(amount) || 0);
  state.insight = Math.max(0, Number(state.insight || 0)) + n;
  state.insightTotal = Number(state.insightTotal || 0) + n;
  return state.insight;
}
function round2(v) {
  return Math.round(v * 100) / 100;
}

// ../../docs/games/metagame/stages/stage8/storms.js
var clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
var zoneOf = (id) => (nodeById(id) || {}).zone;
var isCore = (id) => zoneOf(id) === "core" && /^C/.test(id);
var STORM_DAMAGE = {
  alpha: { frontier: 7, production: 4, mid: 3, research: 4, coolant: 3, core: 2, spikes: 1, spike: 10 },
  beta: { frontier: 9, production: 5, mid: 4, research: 5, coolant: 4, core: 2, spikes: 2, spike: 12 },
  gamma: { frontier: 11, production: 6, mid: 5, research: 6, coolant: 5, core: 3, spikes: 3, spike: 14 }
};
var STORMS = [
  {
    id: "alpha",
    label: "Cascade Storm α",
    sector: "alpha",
    duration: 3,
    insightBonus: 15,
    requires: { minCycle: 8, minStates: 220 },
    telegraph: "Cascade Storm α is forming. Brace: 3 cycles of frontier failure. Survive to bring Sector α online."
  },
  {
    id: "beta",
    label: "Cascade Storm β",
    sector: "beta",
    duration: 4,
    insightBonus: 25,
    requires: { minCycle: 16, minStates: 520 },
    telegraph: "Cascade Storm β is forming. Brace: 4 cycles, the relays buckle. Survive to bring Sector β online."
  },
  {
    id: "gamma",
    label: "Cascade Storm γ",
    sector: "gamma",
    duration: 5,
    insightBonus: 40,
    requires: { minCycle: 24, minStates: 900 },
    telegraph: "Cascade Storm γ is forming. Brace: 5 cycles, field-wide. Survive to bring Sector γ online — then the Heat Death."
  }
];
var STORM_BY_ID = new Map(STORMS.map((s) => [s.id, s]));
var TOTAL_STORMS = STORMS.length;
function stormForAct(state) {
  const idx = Math.max(0, Number(state.act || 1) - 1);
  return STORMS[idx] || null;
}
function stormAvailable(state) {
  const storm = stormForAct(state);
  if (!storm) return { ok: false, reason: "all-survived" };
  if ((state.onlineSectors || []).includes(storm.sector)) return { ok: false, reason: "already-online" };
  if (state.activeStorm) return { ok: false, reason: "in-storm" };
  const cycleOk = Number(state.cycle || 0) >= storm.requires.minCycle;
  const statesOk = Number(state.totalStatesEarned || 0) >= storm.requires.minStates;
  if (!cycleOk || !statesOk) {
    return { ok: false, reason: "body", storm, cycleOk, statesOk };
  }
  return { ok: true, storm };
}
function announceStorm(state) {
  const avail = stormAvailable(state);
  if (!avail.ok) return null;
  const storm = avail.storm;
  if (!Array.isArray(state.announcedStorms)) state.announcedStorms = [];
  if (state.announcedStorms.includes(storm.id)) return null;
  state.announcedStorms.push(storm.id);
  pushLog(state, `▣ NEW PHASE — ${storm.telegraph}`);
  return storm;
}
function braceStorm(state) {
  const avail = stormAvailable(state);
  if (!avail.ok) return { ok: false, reason: avail.reason };
  const storm = avail.storm;
  state.activeStorm = { id: storm.id, sector: storm.sector, label: storm.label, cyclesLeft: storm.duration, duration: storm.duration };
  state.pendingStorm = null;
  pushLog(state, `${storm.label} — bracing. ${storm.duration} cycles.`);
  return { ok: true, storm };
}
function bringSectorOnline(state, sector) {
  if (!(state.onlineSectors || []).includes(sector)) state.onlineSectors.push(sector);
  const have = new Set(state.nodes.map((n) => n.id));
  for (const n of freshSectorNodes(sector)) if (!have.has(n.id)) state.nodes.push(n);
}
function tickStorm(state, rng) {
  const active = state.activeStorm;
  if (!active) return null;
  const dmg = STORM_DAMAGE[active.id] || STORM_DAMAGE.alpha;
  for (const n of state.nodes) {
    const z = zoneOf(n.id);
    const d = dmg[z] || 0;
    if (d) n.health = clamp(n.health - d, 0, 100);
  }
  for (let i = 0; i < (dmg.spikes || 0); i += 1) {
    const target = rng && typeof rng.pick === "function" ? rng.pick(state.nodes) : state.nodes[0];
    if (target) target.health = clamp(target.health - (dmg.spike || 8), 0, 100);
  }
  active.cyclesLeft -= 1;
  pushLog(state, `${active.label}: storm cycle, ${active.cyclesLeft} left.`);
  if (active.cyclesLeft > 0) return { id: active.id, resolved: false, cyclesLeft: active.cyclesLeft };
  return resolveStorm(state);
}
function resolveStorm(state) {
  const active = state.activeStorm;
  state.activeStorm = null;
  const coresAlive = state.nodes.filter((n) => isCore(n.id)).every((n) => n.health > 0);
  const storm = STORM_BY_ID.get(active.id);
  if (!coresAlive) {
    pushLog(state, `${active.label} broke through — a core fell. Recover and brace again.`);
    return { id: active.id, resolved: true, survived: false };
  }
  bringSectorOnline(state, active.sector);
  state.stormsSurvived = Number(state.stormsSurvived || 0) + 1;
  state.act = Number(state.act || 1) + 1;
  const bonus = storm ? storm.insightBonus : 0;
  if (bonus) earnInsight(state, bonus);
  pushLog(state, `${active.label} ENDURED. Sector ${active.sector} online. +${bonus} Insight.`);
  return { id: active.id, resolved: true, survived: true, sector: active.sector, insightBonus: bonus };
}
function pushLog(state, line) {
  state.log = [...state.log || [], line].slice(-12);
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
  const scrap = Math.round(scrapYield(debris) * Math.max(1, Number(state.scrapMult || 1))) + Math.max(0, Number(state.structScrapBonus || 0));
  earnScrap(state, scrap);
  state.manualArchiveDone = true;
  state.selectedDebrisId = state.debris[0]?.id || "";
  pushLog2(state, `archived ${debris.id}. +${debris.value} States, +${scrap} Scrap.`);
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
  const stormsSurvived = Number(state.stormsSurvived || 0);
  const enoughStorms = stormsSurvived >= TOTAL_STORMS;
  const unlocked = enoughStorms && actionReady && enoughSalvage && enoughStates && enoughCycles;
  const lock = {
    unlocked,
    defeated: Boolean(state.boss.defeated),
    actionReady,
    enoughSalvage,
    enoughStates,
    enoughCycles,
    enoughStorms,
    stormsSurvived,
    stormsRequired: TOTAL_STORMS,
    salvageTotal,
    salvageRequired: SALVAGE_REQUIRED,
    totalEarned,
    statesRequired: STATES_REQUIRED,
    inHandStates: Number(state.states || 0),
    // current balance the burn actually drains
    burnEstimate: estimateBurnTotal(),
    // representative burn cost (for the readout only)
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
    pushLog2(state, `Heat Death overran reserves at burn cycle ${burn.failedAt}.`);
    return { ...recordHeatDeathFailure(state, lock), burn, locked: false };
  }
  state.states = Math.max(0, Math.round(burn.remainingStates));
  state.stabilizers = burn.stabilizersLeft;
  state.boss.defeated = true;
  state.meta.firstClearComplete = true;
  state.meta.btsAvailable = true;
  pushLog2(state, bellMessages.defeated);
  return { defeated: true, unlocked: true, btsAvailable: true, burn };
}
function recordHeatDeathFailure(state, lock = null) {
  state.boss.attempts = Number(state.boss.attempts || 0) + 1;
  state.boss.lockHintStep = Math.min(Number(state.boss.lockHintStep || 0) + 1, lockedHintLadder.length - 1);
  if (!state.warningCheckpoint) state.warningCheckpoint = makeWarningCheckpoint(state);
  const checkpoint = rewindToWarningCheckpoint(state);
  pushLog2(state, bellMessages.failed);
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
function pushLog2(state, line) {
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

// ../../docs/games/metagame/stages/stage8/tech.js
var TECHS = [
  // ── REPAIR branch ────────────────────────────────────────────────────────────────────────────────
  {
    id: "rep1",
    branch: "repair",
    label: "Repair Drones Mk I",
    desc: "+3 repair units / cycle.",
    insight: 18,
    scrap: 12,
    requires: null,
    apply: (b) => {
      b.repairBudgetBonus += 3;
    }
  },
  {
    id: "rep2",
    branch: "repair",
    label: "Efficient Welds",
    desc: "+2 health restored per repair unit.",
    insight: 40,
    scrap: 30,
    requires: "rep1",
    apply: (b) => {
      b.repairEfficiencyBonus += 2;
    }
  },
  {
    id: "rep3",
    branch: "repair",
    label: "Auto-Repair Drone",
    desc: "Automation: repairs the weakest spine node each cycle.",
    insight: 85,
    scrap: 60,
    requires: "rep2",
    apply: (b) => {
      b.autoRepair = true;
    }
  },
  // ── THERMAL branch ───────────────────────────────────────────────────────────────────────────────
  {
    id: "thm1",
    branch: "thermal",
    label: "Heat Sinks",
    desc: "+5 passive heat venting / cycle.",
    insight: 18,
    scrap: 12,
    requires: null,
    apply: (b) => {
      b.heatVentBonus += 5;
    }
  },
  {
    id: "thm2",
    branch: "thermal",
    label: "Thermal Throttle",
    desc: "+12 heat before it amplifies decay.",
    insight: 40,
    scrap: 28,
    requires: "thm1",
    apply: (b) => {
      b.thermalThresholdBonus += 12;
    }
  },
  {
    id: "thm3",
    branch: "thermal",
    label: "Cryo Loop",
    desc: "+8 more passive heat venting / cycle.",
    insight: 80,
    scrap: 55,
    requires: "thm2",
    apply: (b) => {
      b.heatVentBonus += 8;
    }
  },
  // ── SALVAGE branch ───────────────────────────────────────────────────────────────────────────────
  {
    id: "sal1",
    branch: "salvage",
    label: "Refinery Optics",
    desc: "+50% Scrap from archived debris.",
    insight: 20,
    scrap: 10,
    requires: null,
    apply: (b) => {
      b.scrapMult += 0.5;
    }
  },
  {
    id: "sal2",
    branch: "salvage",
    label: "Deep Salvage",
    desc: "Debris survives +1 cycle before decaying.",
    insight: 42,
    scrap: 30,
    requires: "sal1",
    apply: (b) => {
      b.debrisDecayBonus += 1;
    }
  },
  {
    id: "sal3",
    branch: "salvage",
    label: "Cold Storage",
    desc: "Automation: auto-archives a debris file each cycle (after you have archived by hand).",
    insight: 95,
    scrap: 80,
    requires: "sal2",
    needsManualArchive: true,
    apply: (b) => {
      b.coldStorage = true;
    }
  },
  // ── TOPOLOGY branch ──────────────────────────────────────────────────────────────────────────────
  {
    id: "top1",
    branch: "topology",
    label: "Reinforced Relays",
    desc: "-1 base decay on every node.",
    insight: 22,
    scrap: 14,
    requires: null,
    apply: (b) => {
      b.decayReduction += 1;
    }
  },
  {
    id: "top2",
    branch: "topology",
    label: "Load Balancer",
    desc: "Cascade stress propagates at half strength.",
    insight: 45,
    scrap: 32,
    requires: "top1",
    apply: (b) => {
      b.cascadeStressMult = Math.min(b.cascadeStressMult, 0.5);
    }
  },
  {
    id: "top3",
    branch: "topology",
    label: "Redundant Cores",
    desc: "Core anchors regenerate +3 health / cycle.",
    insight: 90,
    scrap: 65,
    requires: "top2",
    apply: (b) => {
      b.coreRegen += 3;
    }
  }
];
var TECH_BY_ID = new Map(TECHS.map((t) => [t.id, t]));
function defaultTechBonuses() {
  return {
    repairBudgetBonus: 0,
    repairEfficiencyBonus: 0,
    heatVentBonus: 0,
    thermalThresholdBonus: 0,
    decayReduction: 0,
    cascadeStressMult: 1,
    coreRegen: 0,
    scrapMult: 1,
    debrisDecayBonus: 0,
    autoRepair: false,
    coldStorage: false
  };
}
function isPurchased(state, id) {
  return Boolean(state.tech && state.tech[id]);
}
function buyBlockReason(state, id) {
  const tech = TECH_BY_ID.get(id);
  if (!tech) return "unknown";
  if (isPurchased(state, id)) return "owned";
  if (tech.requires && !isPurchased(state, tech.requires)) return "requires";
  if (tech.needsManualArchive && !state.manualArchiveDone) return "needs-archive";
  if (Number(state.insight || 0) < tech.insight) return "insight";
  if (Number(state.scrap || 0) < tech.scrap) return "scrap";
  return null;
}
function canBuyTech(state, id) {
  return buyBlockReason(state, id) === null;
}
function buyTech(state, id) {
  const reason = buyBlockReason(state, id);
  if (reason) return { ok: false, reason };
  const tech = TECH_BY_ID.get(id);
  if (!state.tech || typeof state.tech !== "object") state.tech = {};
  state.insight = Number(state.insight || 0) - tech.insight;
  state.scrap = Number(state.scrap || 0) - tech.scrap;
  state.tech[id] = true;
  recomputeTechBonuses(state);
  pushLog3(state, `tech: ${tech.label} online.`);
  return { ok: true };
}
function recomputeTechBonuses(state) {
  const b = defaultTechBonuses();
  for (const tech of TECHS) if (isPurchased(state, tech.id)) tech.apply(b);
  Object.assign(state, b);
  return b;
}
function techStatus(state) {
  return TECHS.map((t) => ({
    id: t.id,
    branch: t.branch,
    label: t.label,
    desc: t.desc,
    insight: t.insight,
    scrap: t.scrap,
    requires: t.requires,
    owned: isPurchased(state, t.id),
    reason: buyBlockReason(state, t.id),
    canBuy: canBuyTech(state, t.id)
  }));
}
function pushLog3(state, line) {
  state.log = [...state.log || [], line].slice(-12);
}

// ../../docs/games/metagame/stages/stage8/structures.js
var STRUCTURES = [
  {
    id: "heatSink",
    label: "Heat Sink",
    desc: "+4 passive heat venting.",
    scrap: 20,
    costScale: 1.6,
    max: 5,
    field: "structHeatVent",
    per: 4
  },
  {
    id: "buffer",
    label: "Buffer Capacitor",
    desc: "+2 repair units / cycle.",
    scrap: 24,
    costScale: 1.6,
    max: 5,
    field: "structRepairBonus",
    per: 2
  },
  {
    id: "refinery",
    label: "Scrap Refinery",
    desc: "+2 Scrap per archived file.",
    scrap: 18,
    costScale: 1.6,
    max: 5,
    field: "structScrapBonus",
    per: 2
  },
  {
    id: "drone",
    label: "Auto-Repair Drone",
    desc: "Automation: heals a weak node each cycle.",
    scrap: 40,
    costScale: 1.8,
    max: 3,
    field: "autoRepairUnits",
    per: 1,
    requiresTech: "rep3"
  },
  {
    id: "coldStorage",
    label: "Cold Storage Bay",
    desc: "Automation: auto-archives a debris file each cycle.",
    scrap: 60,
    costScale: 1.8,
    max: 2,
    field: "coldStorageRate",
    per: 1,
    requiresTech: "sal3",
    needsManualArchive: true
  }
];
var STRUCT_BY_ID = new Map(STRUCTURES.map((s) => [s.id, s]));
function defaultStructureBonuses() {
  return { structHeatVent: 0, structRepairBonus: 0, structScrapBonus: 0, autoRepairUnits: 0, coldStorageRate: 0 };
}
function levelOf(state, id) {
  return Math.max(0, Math.floor(Number(state.structures && state.structures[id]) || 0));
}
function costOf(state, id) {
  const def = STRUCT_BY_ID.get(id);
  if (!def) return Infinity;
  return Math.round(def.scrap * Math.pow(def.costScale, levelOf(state, id)));
}
function buildBlockReason(state, id) {
  const def = STRUCT_BY_ID.get(id);
  if (!def) return "unknown";
  if (levelOf(state, id) >= def.max) return "max";
  if (def.requiresTech && !isPurchased(state, def.requiresTech)) return "requires-tech";
  if (def.needsManualArchive && !state.manualArchiveDone) return "needs-archive";
  if (Number(state.scrap || 0) < costOf(state, id)) return "scrap";
  return null;
}
function canBuildStructure(state, id) {
  return buildBlockReason(state, id) === null;
}
function buildStructure(state, id) {
  const reason = buildBlockReason(state, id);
  if (reason) return { ok: false, reason };
  const cost = costOf(state, id);
  if (!state.structures || typeof state.structures !== "object") state.structures = {};
  state.scrap = Number(state.scrap || 0) - cost;
  state.structures[id] = levelOf(state, id) + 1;
  recomputeStructureBonuses(state);
  const def = STRUCT_BY_ID.get(id);
  pushLog4(state, `built ${def.label} (lvl ${state.structures[id]}).`);
  return { ok: true };
}
function recomputeStructureBonuses(state) {
  const b = defaultStructureBonuses();
  for (const def of STRUCTURES) b[def.field] += def.per * levelOf(state, def.id);
  Object.assign(state, b);
  return b;
}
function structureStatus(state) {
  return STRUCTURES.map((def) => ({
    id: def.id,
    label: def.label,
    desc: def.desc,
    level: levelOf(state, def.id),
    max: def.max,
    cost: costOf(state, def.id),
    reason: buildBlockReason(state, def.id),
    canBuild: canBuildStructure(state, def.id)
  }));
}
function pushLog4(state, line) {
  state.log = [...state.log || [], line].slice(-12);
}

// ../../docs/games/metagame/stages/stage8/prestige.js
var CORE_PER_STATES = 400;
var MULT_PER_CORE = 0.08;
function prestigeMultFor(cores) {
  return 1 + MULT_PER_CORE * Math.max(0, Math.floor(Number(cores) || 0));
}
function coresPreview(state) {
  const fromStates = Math.floor(Number(state.totalStatesEarned || 0) / CORE_PER_STATES);
  const fromStorms = Number(state.stormsSurvived || 0);
  return Math.max(0, fromStates + fromStorms);
}
function prestigeAvailable(state) {
  if (!state.meta || !state.meta.firstClearComplete) return { ok: false, reason: "not-cleared" };
  const cores = coresPreview(state);
  if (cores < 1) return { ok: false, reason: "too-shallow", cores };
  return { ok: true, cores };
}
function microstateCollapse(state) {
  const avail = prestigeAvailable(state);
  if (!avail.ok) return { ok: false, reason: avail.reason };
  const meta = state.meta || {};
  const totalCores = Number(meta.cores || 0) + avail.cores;
  const collapseLevel = Number(meta.collapseLevel || 0) + 1;
  resetField(state, { cores: totalCores, collapseLevel });
  return { ok: true, coresAwarded: avail.cores, totalCores, collapseLevel, mult: state.prestigeMult };
}
function resetField(state, carry) {
  const cores = Math.max(0, Math.floor(Number(carry.cores) || 0));
  state.cycle = 1;
  state.act = 1;
  state.onlineSectors = ["core"];
  state.stormsSurvived = 0;
  state.pendingStorm = null;
  state.activeStorm = null;
  state.nodes = freshSectorNodes("core");
  state.states = 0;
  state.totalStatesEarned = 0;
  state.salvageTotal = 0;
  state.scrap = 0;
  state.insight = 0;
  state.insightRate = 0;
  state.heat = 0;
  state.heatRate = 0;
  state.entropy = 0;
  state.repairUnits = 6;
  state.repairAllocations = {};
  state.stabilized = {};
  state.highLoad = {};
  state.stabilizers = 0;
  state.debris = [];
  state.archive = [];
  state.selectedDebrisId = "";
  state.pendingEvent = null;
  state.activeEvent = null;
  state.warningCheckpoint = null;
  state.boss = { reached: false, defeated: false, attempts: 0, lockHintStep: 0, firstFailureRewound: false, burn: null };
  state.meta = { ...state.meta || {}, cores, collapseLevel: carry.collapseLevel };
  state.prestigeMult = prestigeMultFor(cores);
  state.log = [`microstate collapse ${carry.collapseLevel}. ${cores} Cores banked — income ×${state.prestigeMult.toFixed(2)}.`];
}

// ../../docs/games/metagame/stages/stage8/state.js
var STATE_VERSION = 3;
function freshNodes() {
  return freshSectorNodes("core");
}
function defaultState() {
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
function normalizeState(state) {
  const incoming = state && typeof state === "object" ? state : {};
  if (Number(incoming.version) !== STATE_VERSION) {
    const fresh2 = defaultState();
    const inMeta = incoming.meta && typeof incoming.meta === "object" ? incoming.meta : {};
    fresh2.meta.cores = Math.max(0, num(inMeta.cores, 0));
    fresh2.meta.collapseLevel = Math.max(0, num(inMeta.collapseLevel, 0));
    fresh2.prestigeMult = prestigeMultFor(fresh2.meta.cores);
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
  const validNodes = Array.isArray(target.nodes) ? target.nodes.filter((n) => n && NODE_BY_ID.has(n.id)).map((n) => ({
    id: n.id,
    health: clampHealth(n.health),
    cascadeStress: Number.isFinite(Number(n.cascadeStress)) ? Number(n.cascadeStress) : 0
  })) : [];
  target.nodes = validNodes.length ? validNodes : fresh.nodes;
  target.act = posInt(target.act, fresh.act);
  target.onlineSectors = Array.isArray(target.onlineSectors) && target.onlineSectors.length ? target.onlineSectors.filter((s) => typeof s === "string") : fresh.onlineSectors;
  if (!target.onlineSectors.includes("core")) target.onlineSectors.unshift("core");
  target.stormsSurvived = Math.max(0, num(target.stormsSurvived, 0));
  target.announcedStorms = Array.isArray(target.announcedStorms) ? target.announcedStorms.filter((s) => typeof s === "string") : [];
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
  recomputeTechBonuses(target);
  recomputeStructureBonuses(target);
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
  target.boss = { ...fresh.boss, ...target.boss && typeof target.boss === "object" ? target.boss : {} };
  target.meta = { ...fresh.meta, ...target.meta && typeof target.meta === "object" ? target.meta : {} };
  target.meta.cores = Math.max(0, num(target.meta.cores, 0));
  target.meta.collapseLevel = Math.max(0, num(target.meta.collapseLevel, 0));
  target.prestigeMult = prestigeMultFor(target.meta.cores);
  return target;
}
function snapshotRun(state) {
  return {
    version: STATE_VERSION,
    cycle: state.cycle,
    act: state.act || 1,
    onlineSectors: [...state.onlineSectors || ["core"]],
    stormsSurvived: state.stormsSurvived || 0,
    announcedStorms: [...state.announcedStorms || []],
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
    tech: { ...state.tech || {} },
    structures: { ...state.structures || {} },
    manualArchiveDone: Boolean(state.manualArchiveDone),
    selectedDebrisId: state.selectedDebrisId,
    externalImportBonusCycles: state.externalImportBonusCycles || 0,
    stabilizers: state.stabilizers || 0,
    repairUnits: state.repairUnits,
    repairAllocations: { ...state.repairAllocations || {} },
    stabilized: { ...state.stabilized || {} },
    highLoad: { ...state.highLoad || {} },
    entropy: state.entropy || 0,
    heat: state.heat || 0,
    heatRate: state.heatRate || 0,
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
var clamp2 = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
var byZone = (state, zonePrefix) => state.nodes.filter((n) => String(n.id).startsWith(zonePrefix));
var EVENTS = [
  {
    id: "heat_spike",
    label: "heat spike",
    bad: true,
    telegraph: "a heat spike is forming — frontier nodes will take damage next cycle.",
    apply(state) {
      for (const n of byZone(state, "F")) n.health = clamp2(n.health - 8, 0, 100);
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
      if (target) target.health = clamp2(target.health - 18, 0, 100);
      return { note: `pattern broke on ${target?.id || "?"} -18` };
    }
  },
  {
    id: "jitter_storm",
    label: "jitter storm",
    bad: true,
    telegraph: "a jitter storm is inbound — every node will take light damage next cycle.",
    apply(state) {
      for (const n of state.nodes) n.health = clamp2(n.health - 3, 0, 100);
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
      if (target) target.health = clamp2(target.health - 12, 0, 100);
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
      for (const n of byZone(state, "M")) n.health = clamp2(n.health + 10, 0, 100);
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
function pushLog5(state, line) {
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
  pushLog5(state, `${ev.label}: ${detail.note || "resolved"}.`);
  return state.activeEvent;
}
function telegraphNext(state, rng) {
  if (state.pendingEvent) return null;
  if (!rng.chance(0.6)) return null;
  const ev = rng.pick(EVENTS);
  state.pendingEvent = { id: ev.id, label: ev.label, bad: Boolean(ev.bad), telegraph: ev.telegraph };
  state.eventSeq = Number(state.eventSeq || 0) + 1;
  pushLog5(state, `telegraph — next cycle: ${ev.telegraph}`);
  return state.pendingEvent;
}

// ../../docs/games/metagame/stages/stage8/heat.js
var HEAT_CAP = 100;
var THERMAL_THRESHOLD = 55;
var BASE_VENT = 9;
var TIER_HEAT = { 1: 1, 2: 1.5, 3: 2.5, 4: 3.5 };
function ventFromStructures(state) {
  return Math.max(0, Number(state.heatVentBonus || 0)) + Math.max(0, Number(state.structHeatVent || 0));
}
function ventFromCoolantNodes(state, statusOf, isOnline = () => true) {
  let vent = 0;
  for (const n of state.nodes) {
    if (!isOnline(n)) continue;
    const def = nodeById(n.id) || {};
    if (def.zone !== "coolant") continue;
    const s = statusOf(n.health);
    if (s === "failed") continue;
    vent += (def.coolantVent || 0) * (s === "degrading" ? 0.5 : 1);
  }
  return vent;
}
function heatGeneration(state, statusOf, isOnline = () => true) {
  let gen = 0;
  for (const n of state.nodes) {
    if (!isOnline(n)) continue;
    const s = statusOf(n.health);
    if (s === "failed") continue;
    const def = nodeById(n.id) || {};
    let h = TIER_HEAT[def.tier] || 1;
    if (state.highLoad && state.highLoad[n.id] && def.supportsHighLoad) h *= 2;
    if (s === "degrading") h *= 0.5;
    gen += h;
  }
  return gen;
}
function computeHeatDelta(state, statusOf, isOnline) {
  const gen = heatGeneration(state, statusOf, isOnline);
  const vent = BASE_VENT + ventFromStructures(state) + ventFromCoolantNodes(state, statusOf, isOnline);
  return { gen: round1(gen), vent: round1(vent), delta: round1(gen - vent) };
}
function thermalDecayBonus(heat, threshold = THERMAL_THRESHOLD) {
  const t = Math.min(HEAT_CAP - 1, Number(threshold) || THERMAL_THRESHOLD);
  const over = Math.max(0, Number(heat || 0) - t);
  return over / (HEAT_CAP - t) * 3;
}
function thermalEntropy(heat, threshold = THERMAL_THRESHOLD) {
  const t = Number(threshold) || THERMAL_THRESHOLD;
  return Math.max(0, Number(heat || 0) - t) / 2;
}
function clampHeat(v) {
  return Math.max(0, Math.min(HEAT_CAP, Number(v) || 0));
}
function round1(v) {
  return Math.round(v * 10) / 10;
}

// ../../docs/games/metagame/stages/stage8/automation.js
var AUTO_HEAL = 6;
function runAutomation(state) {
  const detail = { repaired: [], archived: [] };
  autoRepair(state, detail);
  autoArchive(state, detail);
  return detail;
}
function autoRepair(state, detail) {
  const units = Math.max(0, Math.floor(Number(state.autoRepairUnits || 0)));
  if (!units) return;
  const candidates = state.nodes.filter((n) => n.health > 0 && n.health < 100 && !isCore2(n.id)).sort((a, b) => a.health - b.health || (a.id < b.id ? -1 : 1));
  for (let i = 0; i < units && i < candidates.length; i += 1) {
    const n = candidates[i];
    n.health = Math.min(100, n.health + AUTO_HEAL);
    detail.repaired.push(n.id);
  }
}
function autoArchive(state, detail) {
  const rate2 = Math.max(0, Math.floor(Number(state.coldStorageRate || 0)));
  if (!rate2 || !Array.isArray(state.debris) || !state.debris.length) return;
  const order = [...state.debris].sort((a, b) => a.cycle - b.cycle || (a.id < b.id ? -1 : 1));
  const scrapBonus = Math.max(0, Number(state.structScrapBonus || 0));
  const scrapMult = Math.max(1, Number(state.scrapMult || 1));
  for (let i = 0; i < rate2 && i < order.length; i += 1) {
    const debris = order[i];
    const idx = state.debris.findIndex((d) => d.id === debris.id);
    if (idx < 0) continue;
    state.debris.splice(idx, 1);
    const archived = { ...debris, archivedAtCycle: state.cycle, path: `/entropy/active_archive/${debris.id}`, auto: true };
    state.archive = [...state.archive || [], archived];
    state.salvageTotal = Number(state.salvageTotal || 0) + Number(debris.value || 0);
    state.states = Number(state.states || 0) + Number(debris.value || 0);
    earnScrap(state, Math.round(scrapYield(debris) * scrapMult) + scrapBonus);
    detail.archived.push(debris.id);
  }
  if (detail.archived.length) pushLog6(state, `Cold Storage auto-archived ${detail.archived.length} file(s).`);
}
var isCore2 = (id) => (nodeById(id) || {}).noCascade === true;
function pushLog6(state, line) {
  state.log = [...state.log || [], line].slice(-12);
}

// ../../docs/games/metagame/stages/stage8/engine.js
var REPAIR_EFFICIENCY = 3;
var BASE_REPAIR_UNITS_PER_CYCLE = 6;
var REPAIR_PER_SECTOR = 3;
function repairBudget(state) {
  const sectors = Math.max(1, (state.onlineSectors || ["core"]).length);
  return BASE_REPAIR_UNITS_PER_CYCLE + REPAIR_PER_SECTOR * (sectors - 1) + Math.max(0, Number(state.repairBudgetBonus || 0)) + Math.max(0, Number(state.structRepairBonus || 0));
}
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
  if (!Number.isFinite(state.heat)) state.heat = 0;
  if (!Number.isFinite(state.heatRate)) state.heatRate = 0;
  if (!Number.isFinite(state.cascadeStressMult)) state.cascadeStressMult = 1;
  if (!Number.isFinite(state.prestigeMult)) state.prestigeMult = 1;
  for (const k of ["repairEfficiencyBonus", "decayReduction", "coreRegen", "thermalThresholdBonus", "debrisDecayBonus", "scrapMult"]) {
    if (!Number.isFinite(state[k])) state[k] = k === "scrapMult" ? 1 : 0;
  }
  for (const n of state.nodes) if (!Number.isFinite(n.cascadeStress)) n.cascadeStress = 0;
}
var clamp3 = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
var node2 = (state, id) => state.nodes.find((n) => n.id === id);
function advanceCycle(state, rng) {
  ensureRuntime(state);
  const result = { income: 0, newDebris: [], expiredDebris: [], newlyFailed: [], entropy: 0, event: null };
  result.event = resolveEvent(state, rng);
  const priorStatus = new Map(state.nodes.map((n) => [n.id, status(n.health)]));
  result.storm = tickStorm(state, rng);
  result.automation = runAutomation(state);
  for (const id of Object.keys(state.stabilized)) {
    state.stabilized[id] -= 1;
    if (state.stabilized[id] <= 0) delete state.stabilized[id];
  }
  const threshold = THERMAL_THRESHOLD + (state.thermalThresholdBonus || 0);
  const thermalBonus = thermalDecayBonus(state.heat, threshold);
  const decayReduction = Math.max(0, Number(state.decayReduction || 0));
  for (const n of state.nodes) {
    if (state.stabilized[n.id]) continue;
    const def = nodeById(n.id) || {};
    const highLoad = Boolean(state.highLoad[n.id]) && def.supportsHighLoad;
    const baseDecay = Math.max(0, (def.baseDecayPct || 0) - decayReduction);
    const loss = (baseDecay + (n.cascadeStress || 0)) * (highLoad ? 1.5 : 1) + thermalBonus;
    n.health = clamp3(n.health - loss, 0, 100);
  }
  const efficiency = REPAIR_EFFICIENCY + Math.max(0, Number(state.repairEfficiencyBonus || 0));
  for (const [id, units] of Object.entries(state.repairAllocations)) {
    const n = node2(state, id);
    if (n) n.health = clamp3(n.health + units * efficiency, 0, 100);
  }
  state.repairAllocations = {};
  const coreRegen = Math.max(0, Number(state.coreRegen || 0));
  if (coreRegen) for (const n of state.nodes) {
    const def = nodeById(n.id) || {};
    if (def.noCascade && n.health > 0) n.health = clamp3(n.health + coreRegen, 0, 100);
  }
  result.threshold = applyEntropyThresholds(state, rng);
  for (const n of state.nodes) {
    if (status(n.health) === "failed" && priorStatus.get(n.id) !== "failed") {
      const def = nodeById(n.id) || { tier: 1 };
      const [lo, hi] = DEBRIS_VALUE[def.tier] || DEBRIS_VALUE[1];
      const debris = createDebris({ node: n.id, cycle: state.cycle, tier: def.tier, value: rng.int(lo, hi), decay: 2 + Math.max(0, Number(state.debrisDecayBonus || 0)) });
      state.debris.push(debris);
      result.newDebris.push(debris);
      result.newlyFailed.push(n.id);
      pushLog7(state, `${n.id} failed. ${debris.id} created in /entropy/debris/.`);
    }
  }
  for (const n of state.nodes) n.cascadeStress = 0;
  const cascadeStep = Number.isFinite(state.cascadeStressMult) ? state.cascadeStressMult : 1;
  for (const n of state.nodes) {
    if (status(n.health) !== "failed") continue;
    for (const downstream of ADJACENCY.get(n.id) || []) {
      const ddef = nodeById(downstream) || {};
      if (ddef.noCascade) continue;
      const d = node2(state, downstream);
      if (d) d.cascadeStress += cascadeStep;
    }
  }
  const kept = [];
  for (const item of state.debris) {
    item.decay -= 1;
    if (item.decay <= 0) {
      result.expiredDebris.push(item);
      pushLog7(state, `${item.id} decayed. States lost permanently.`);
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
    const hlMult = state.highLoad[n.id] && def.supportsHighLoad ? 1.5 : 1;
    if (s === "active") active += (def.baseOutput || 0) * hlMult;
    else if (s === "degrading") {
      degraded += (def.degradedOutput || 0) * 0.5 * hlMult;
      degradingCount += 1;
    } else failedCount += 1;
  }
  const entropySink = Math.floor(state.cycle / 3);
  const prestigeMult = Math.max(1, Number(state.prestigeMult || 1));
  result.income = Math.max(0, Math.round((active + degraded - entropySink) * prestigeMult));
  state.states = (state.states || 0) + result.income;
  state.totalStatesEarned = (state.totalStatesEarned || 0) + result.income;
  const insight = insightIncome(state, status) * prestigeMult;
  earnInsight(state, insight);
  state.insightRate = insight;
  result.insight = insight;
  const heat = computeHeatDelta(state, status);
  state.heat = clampHeat(state.heat + heat.delta);
  state.heatRate = heat.delta;
  result.heat = state.heat;
  result.heatRate = heat.delta;
  result.entropy = clamp3(failedCount * 10 + degradingCount * 4 + thermalEntropy(state.heat, threshold), 0, 100);
  state.entropy = result.entropy;
  state.repairUnits = repairBudget(state);
  state.cycle = (state.cycle || 0) + 1;
  result.pendingEvent = telegraphNext(state, rng);
  result.announcedStorm = announceStorm(state);
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
function applyStabilizer(state, nodeId) {
  ensureRuntime(state);
  if ((state.stabilizers || 0) < 1) return { ok: false, reason: "inventory" };
  if (!node2(state, nodeId)) return { ok: false, reason: "no-node" };
  state.stabilizers -= 1;
  state.stabilized[nodeId] = 2;
  return { ok: true };
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
var ENTROPY_THRESHOLD_CYCLE = 23;
var PATTERN_FAILURE_AT = 60;
var TOTAL_CASCADE_AT = 80;
function applyEntropyThresholds(state, rng) {
  if ((state.cycle || 0) < ENTROPY_THRESHOLD_CYCLE) return null;
  const entropy = Number(state.entropy || 0);
  if (entropy >= TOTAL_CASCADE_AT) return triggerTotalCascade(state);
  if (entropy >= PATTERN_FAILURE_AT) return triggerPatternFailure(state, rng);
  return null;
}
function triggerPatternFailure(state, rng) {
  const mids = state.nodes.filter((n) => (nodeById(n.id) || {}).zone === "mid" && status(n.health) !== "failed");
  const picks = rng.shuffle(mids).slice(0, 2);
  for (const n of picks) n.health = clamp3(n.health - 15, 0, 100);
  if (picks.length) pushLog7(state, `Pattern Failure (entropy ${Math.round(Number(state.entropy || 0))}%): ${picks.map((n) => n.id).join(", ")} −15.`);
  return { kind: "pattern_failure", nodes: picks.map((n) => n.id) };
}
function triggerTotalCascade(state) {
  const degrading = state.nodes.filter((n) => status(n.health) === "degrading");
  for (const n of degrading) n.health = clamp3(n.health - 30, 0, 100);
  if (degrading.length) pushLog7(state, `TOTAL CASCADE (entropy ${Math.round(Number(state.entropy || 0))}%): ${degrading.length} degrading node(s) −30.`);
  return { kind: "total_cascade", nodes: degrading.map((n) => n.id) };
}
function toggleHighLoad(state, nodeId) {
  ensureRuntime(state);
  const def = nodeById(nodeId);
  if (!def || !def.supportsHighLoad) return { ok: false, reason: "unsupported" };
  state.highLoad[nodeId] = !state.highLoad[nodeId];
  return { ok: true, highLoad: Boolean(state.highLoad[nodeId]) };
}
function pushLog7(state, line) {
  state.log = [...state.log || [], line].slice(-12);
}

// ../../docs/games/metagame/stages/stage8/solver.js
var REPAIR_STEP = 2;
var isFrontier = (id) => String(id).startsWith("F");
var isCore3 = (id) => /^C/.test(String(id));
function salvageableValue(state) {
  return (state.debris || []).reduce((sum, d) => sum + Number(d.value || 0), 0);
}
function bodyGateMet(state) {
  return Number(state.cycle || 0) >= MIN_CYCLE && Number(state.totalStatesEarned || 0) >= STATES_REQUIRED && salvageableValue(state) >= SALVAGE_REQUIRED;
}
function runGateMet(state) {
  return bodyGateMet(state) && Number(state.stormsSurvived || 0) >= TOTAL_STORMS;
}
function repairSpine(state) {
  const spine = state.nodes.filter((n) => !isFrontier(n.id));
  spine.sort((a, b) => isCore3(b.id) - isCore3(a.id) || a.health - b.health);
  for (const n of spine) {
    if ((state.repairUnits || 0) <= 0) break;
    if (n.health >= 100) continue;
    applyRepair(state, n.id, Math.min(REPAIR_STEP, state.repairUnits));
  }
}
function driveToGate(state, makeCycleRng, { maxCycles = 260 } = {}) {
  for (let i = 0; i < maxCycles; i += 1) {
    if (runGateMet(state)) break;
    if (stormAvailable(state).ok) braceStorm(state);
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
function paintStage8({ state, lock, storm, els, onSelectDebris }) {
  const { fields, map, log, root } = els;
  if (fields.act) fields.act.textContent = String(state.act || 1);
  if (fields.storms) fields.storms.textContent = String(state.stormsSurvived || 0);
  fields.cycle.textContent = String(state.cycle);
  fields.states.textContent = String(state.states);
  const entropy = Math.round(state.entropy || 0);
  fields.entropy.textContent = String(entropy);
  root.style.setProperty("--entropy-level", (entropy / 100).toFixed(2));
  root.dataset.entropy = entropy >= 80 ? "critical" : entropy >= 60 ? "high" : entropy >= 35 ? "mid" : "low";
  if (fields.stress) {
    const totalStress = state.nodes.reduce((sum, n) => sum + (Number(n.cascadeStress) || 0), 0);
    fields.stress.textContent = String(totalStress);
  }
  if (fields.heat) fields.heat.textContent = `${Math.round(state.heat || 0)}/100`;
  if (fields.heatRate) fields.heatRate.textContent = rate(state.heatRate);
  fields.repairUnits.textContent = String(Number.isFinite(state.repairUnits) ? state.repairUnits : 6);
  fields.stabilizers.textContent = String(state.stabilizers || 0);
  if (fields.scrap) fields.scrap.textContent = String(Math.floor(state.scrap || 0));
  if (fields.insight) fields.insight.textContent = String(Math.floor(state.insight || 0));
  if (fields.insightRate) fields.insightRate.textContent = rate(state.insightRate);
  fields.salvage.textContent = String(state.salvageTotal);
  paintPrestige(fields, root, state);
  fields.tree.textContent = entropyTreeText(state);
  fields.boss.textContent = state.boss.defeated ? "defeated. BTS trace available." : `${lock.unlocked ? "UNLOCKED" : "LOCKED"} · storms ${tick(lock.enoughStorms)} · action ${tick(lock.actionReady)} · salvage ${tick(lock.enoughSalvage)} · cycles ${tick(lock.enoughCycles)} · lifetime-States ${tick(lock.enoughStates)}`;
  fields.hint.textContent = lock.hint;
  paintTelegraph(fields.telegraph, state);
  paintStorm(root, state, storm);
  paintBurn(fields.burn, state.boss.burn);
  paintDebrisSelect(fields.debrisSelect, state);
  map.replaceChildren(...state.nodes.map((n) => nodeCard(n, state)), ...state.debris.map((item) => debrisChip(item, onSelectDebris)));
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
function rate(v) {
  const n = Math.round((Number(v) || 0) * 10) / 10;
  if (!n) return "";
  return n > 0 ? `(+${n})` : `(${n})`;
}
function paintPrestige(fields, root, state) {
  const cores = Number(state.meta?.cores || 0);
  const mult = Number(state.prestigeMult || 1);
  const cleared = Boolean(state.meta?.firstClearComplete);
  if (fields.coresWrap) fields.coresWrap.hidden = !cleared;
  if (cleared && fields.cores) fields.cores.textContent = String(cores);
  if (cleared && fields.prestigeMult) fields.prestigeMult.textContent = mult > 1 ? `(×${mult.toFixed(2)})` : "";
  const btn = root.querySelector('[data-action="collapse"]');
  if (!btn) return;
  if (cleared) {
    const preview = Math.floor(Number(state.totalStatesEarned || 0) / 400) + Number(state.stormsSurvived || 0);
    btn.hidden = false;
    btn.disabled = preview < 1;
    btn.textContent = `collapse to Microstate (+${preview} Cores)`;
  } else {
    btn.hidden = true;
  }
}
function paintStorm(root, state, storm) {
  const btn = root.querySelector('[data-action="storm"]');
  if (!btn) return;
  const active = state.activeStorm;
  if (active) {
    btn.hidden = true;
  } else if (storm && storm.ok) {
    btn.hidden = false;
    btn.textContent = `brace for ${storm.storm.label} ▸`;
  } else {
    btn.hidden = true;
  }
}
function paintTelegraph(el, state) {
  if (!el) return;
  if (state.activeStorm) {
    el.hidden = false;
    el.dataset.tone = "bad";
    el.textContent = `⛆ ${state.activeStorm.label} — ${state.activeStorm.cyclesLeft} cycle(s) left. hold the cores.`;
    return;
  }
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
function nodeCard(n, state) {
  const def = nodeById(n.id) || {};
  const s = status(n.health);
  const hl = Boolean(state.highLoad?.[n.id]) && def.supportsHighLoad;
  const frozen = Number(state.stabilized?.[n.id] || 0);
  const stress = Number(n.cascadeStress) || 0;
  const item = document.createElement("div");
  const classes = [`s8-node`, `is-${s}`];
  if (hl) classes.push("is-high-load");
  if (frozen) classes.push("is-stabilized");
  if (stress > 0) classes.push("is-stressed");
  item.className = classes.join(" ");
  const bar = `<span class="s8-node-bar"><span style="width:${Math.round(n.health)}%"></span></span>`;
  const stressTag = stress > 0 ? ` <span class="s8-node-stress" title="cascade stress from failed neighbours: +${stress}/cycle extra decay">⚠+${stress}</span>` : "";
  const frozenTag = frozen ? ` <span class="s8-node-frozen" title="stabilized — decay frozen">❄${frozen}</span>` : "";
  const hlBtn = def.supportsHighLoad ? `<button type="button" data-high-load="${n.id}" class="s8-node-hl${hl ? " is-on" : ""}" aria-pressed="${hl}" title="High-Load: +50% output, +50% decay">HL${hl ? "✓" : ""}</button>` : "";
  const showFreeze = (state.cycle || 0) >= 6;
  const canFreeze = showFreeze && (state.stabilizers || 0) > 0 && !frozen;
  const freezeBtn = showFreeze ? `<button type="button" data-stabilize-node="${n.id}"${canFreeze ? "" : " disabled"} title="Freeze decay for 2 cycles (spends 1 stabilizer)">freeze</button>` : "";
  item.innerHTML = `<span class="s8-node-id">${n.id}</span> <span class="s8-node-name">${def.name || ""}</span>${stressTag}${frozenTag}
    ${bar} <span class="s8-node-hp">${Math.round(n.health)}%</span>
    <span class="s8-node-actions">${hlBtn}${freezeBtn}<button type="button" data-repair="${n.id}">repair</button></span>`;
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

// ../../docs/games/metagame/stages/stage8/techpanel.js
var BRANCH_LABEL = { repair: "REPAIR", thermal: "THERMAL", salvage: "SALVAGE", topology: "TOPOLOGY" };
var REASON_HINT = {
  requires: "needs prerequisite",
  "needs-archive": "archive by hand first",
  insight: "more Insight",
  scrap: "more Scrap"
};
function paintTech(el, state) {
  if (!el) return;
  const techs = techStatus(state);
  const branches = ["repair", "thermal", "salvage", "topology"];
  el.replaceChildren(...branches.map((branch) => {
    const col = document.createElement("div");
    col.className = "s8-tech-branch";
    const head = document.createElement("h4");
    head.textContent = BRANCH_LABEL[branch] || branch;
    col.append(head);
    for (const t of techs.filter((x) => x.branch === branch)) col.append(techRow(t));
    return col;
  }));
}
var STRUCT_REASON = {
  max: "at max",
  "requires-tech": "research it first",
  "needs-archive": "archive by hand first",
  scrap: "more Scrap"
};
function paintStructures(el, state) {
  if (!el) return;
  el.replaceChildren(...structureStatus(state).map((s) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "s8-tech-item";
    btn.dataset.struct = s.id;
    if (s.level > 0) btn.classList.add("is-owned");
    btn.disabled = !s.canBuild;
    const at = s.level >= s.max ? "MAX" : `${s.cost}⛭`;
    const blocked = !s.canBuild && s.level < s.max && s.reason ? ` · ${STRUCT_REASON[s.reason] || s.reason}` : "";
    btn.innerHTML = `<span class="s8-tech-name">${s.label} <small>lvl ${s.level}/${s.max}</small></span><span class="s8-tech-cost">${at}${blocked}</span><span class="s8-tech-desc">${s.desc}</span>`;
    return btn;
  }));
}
function techRow(t) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "s8-tech-item";
  btn.dataset.tech = t.id;
  if (t.owned) btn.classList.add("is-owned");
  btn.disabled = t.owned || !t.canBuy;
  const status2 = t.owned ? "✓ owned" : `${t.insight}◈ ${t.scrap}⛭`;
  const blocked = !t.owned && !t.canBuy && t.reason ? ` · ${REASON_HINT[t.reason] || t.reason}` : "";
  btn.innerHTML = `<span class="s8-tech-name">${t.label}</span><span class="s8-tech-cost">${status2}${blocked}</span><span class="s8-tech-desc">${t.desc}</span>`;
  return btn;
}

// ../../docs/games/metagame/stages/stage8/renderer.js
var REPAIR_STEP2 = 2;
function renderStage8({ host, state, actions, achievements, bell, bts, viewer, save, run, onStageComplete }) {
  const root = document.createElement("section");
  root.className = "stage8-entropy-field";
  root.innerHTML = `
    <header class="s8-hud">
      <strong>ENTROPY FIELD</strong>
      <span>act <b data-field="act"></b>/3</span>
      <span>storms <b data-field="storms"></b>/3</span>
      <span>cycle <b data-field="cycle"></b></span>
      <span>States <b data-field="states"></b></span>
      <span>entropy <b data-field="entropy"></b>%</span>
      <span>stress <b data-field="stress"></b></span>
      <span>heat <b data-field="heat"></b> <i data-field="heatRate" class="s8-rate"></i></span>
      <span>repair <b data-field="repairUnits"></b></span>
      <span>stabilizers <b data-field="stabilizers"></b></span>
      <span>scrap <b data-field="scrap"></b></span>
      <span>insight <b data-field="insight"></b> <i data-field="insightRate" class="s8-rate"></i></span>
      <span>salvage <b data-field="salvage"></b>/${SALVAGE_REQUIRED}</span>
      <span data-field="coresWrap" hidden>cores <b data-field="cores"></b> <i data-field="prestigeMult" class="s8-rate"></i></span>
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
    <details class="s8-tech-panel">
      <summary>TECH TREE — spend Insight ◈ + Scrap ⛭</summary>
      <div class="s8-tech" data-field="tech"></div>
    </details>
    <details class="s8-tech-panel">
      <summary>STRUCTURES — build with Scrap ⛭</summary>
      <div class="s8-tech" data-field="struct"></div>
    </details>
    <ol class="s8-log"></ol>
    <div class="s8-controls">
      <button type="button" data-action="advance">advance cycle ▸</button>
      <button type="button" data-action="storm" hidden>brace for Cascade Storm</button>
      <button type="button" data-action="stabilizer">build stabilizer (${STABILIZER_COST} States)</button>
      <button type="button" data-action="boss">challenge Heat Death</button>
      <button type="button" data-action="external">simulate external import</button>
      <button type="button" data-action="bts" hidden>open entropy_field.bts</button>
      <button type="button" data-action="collapse" hidden>collapse to Microstate</button>
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
    const highLoad = event.target.closest("button[data-high-load]");
    if (highLoad) {
      toggleHighLoad(state, highLoad.dataset.highLoad);
      persistAndPaint();
      return;
    }
    const freeze = event.target.closest("button[data-stabilize-node]");
    if (freeze) {
      applyStabilizer(state, freeze.dataset.stabilizeNode);
      persistAndPaint();
      return;
    }
    const tech = event.target.closest("button[data-tech]");
    if (tech) {
      buyTech(state, tech.dataset.tech);
      persistAndPaint();
      return;
    }
    const struct = event.target.closest("button[data-struct]");
    if (struct) {
      buildStructure(state, struct.dataset.struct);
      persistAndPaint();
      return;
    }
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    if (button.dataset.action === "advance") advanceCycle(state, cycleRng(state.cycle));
    if (button.dataset.action === "storm") braceStorm(state);
    if (button.dataset.action === "stabilizer") buildStabilizer(state, STABILIZER_COST);
    if (button.dataset.action === "archive") archiveSelectedDebris({ state, actions, achievements, bell });
    if (button.dataset.action === "external") {
      state.externalImportBonusCycles = 3;
      actions?.setAction?.(8, "external_debris_imported", { source: "external-import" });
    }
    if (button.dataset.action === "boss") challengeBoss();
    if (button.dataset.action === "collapse") {
      if (microstateCollapse(state).ok && run?.reset) run.reset();
    }
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
    stormState: () => ({ available: stormAvailable(state), active: state.activeStorm, survived: state.stormsSurvived || 0, act: state.act || 1 }),
    techStatus: () => techStatus(state),
    buyTech(id) {
      const r = buyTech(state, id);
      persistAndPaint();
      return r;
    },
    structureStatus: () => structureStatus(state),
    buildStructure(id) {
      const r = buildStructure(state, id);
      persistAndPaint();
      return r;
    },
    prestigeState: () => ({ available: prestigeAvailable(state), cores: state.meta.cores || 0, mult: state.prestigeMult || 1, preview: coresPreview(state) }),
    collapse() {
      const r = microstateCollapse(state);
      if (r.ok && run?.reset) run.reset();
      persistAndPaint();
      return r;
    },
    brace() {
      const r = braceStorm(state);
      persistAndPaint();
      return r;
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
      storm: stormAvailable(state),
      els: { fields, map, log, root },
      onSelectDebris: (id) => {
        state.selectedDebrisId = id;
        repaint();
      }
    });
    paintTech(fields.tech, state);
    paintStructures(fields.struct, state);
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
