// GENERATED — DO NOT EDIT BY HAND.
// Bundled from docs/games/metagame/stages/stage7/index.js (+ its local modules) by
// build/metagame/build.mjs. Rebuild:  node build/metagame/build.mjs  (run by scripts/check.sh).
// Exports stageMeta / defaultState / mountStage. Shared ../../*.js singletons + ./styles.css stay
// external (NOT inlined). The hub's stage-manifest.js LOADERS import THIS file.


// ../../docs/games/metagame/stages/stage7/messages.js
var ACTION_NAME = "exif_contradiction_found";
var REQUIRED_ACTION = "7.exif_contradiction_found";
var ACHIEVEMENT_ID = "stage7.exif_contradiction_found";
var ACHIEVEMENT_TEXT = "I looked beyond the surface of the image.";
var BTS_PATH = "/docs/bts/identity_arbiter.bts";
var ENTITY_F_IMAGE_PATH = "/docs/examples/metagame/stage7/entity_f_verification.png";
var ENTITY_METADATA_SIDECAR_PATH = "/docs/examples/metagame/stage7/entity_metadata.json";
var ENTITY_ANCHOR_PATH = "/docs/examples/metagame/stage7/entity_anchor_0043.txt";
var ANCHOR_ACTION = "anchor_chain_examined";
var CASE2_SOURCE_PATHS = {
  spec_examined: "/docs/examples/metagame/stage7/system_spec.json",
  route_table_examined: "/docs/examples/metagame/stage7/route_table.csv",
  access_log_examined: "/docs/examples/metagame/stage7/access_log.csv",
  comms_examined: "/docs/examples/metagame/stage7/comms_transcript.txt"
};
var CASE2_SOURCE_ACTIONS = Object.keys(CASE2_SOURCE_PATHS);
var CASE3_SOURCE_PATHS = {
  quorum_spec_examined: "/docs/examples/metagame/stage7/quorum_spec.json",
  audit_examined: "/docs/examples/metagame/stage7/audit_trail.txt",
  handshake_examined: "/docs/examples/metagame/stage7/handshake_log.csv",
  ledger_examined: "/docs/examples/metagame/stage7/session_ledger.csv"
};
var CASE3_SOURCE_ACTIONS = Object.keys(CASE3_SOURCE_PATHS);
var CASE3_SEARCH_ACTION = "session_revoked_found";
var CASE3_SEARCH_PATH = "/docs/examples/metagame/stage7/session_ledger.csv";
var CASE3_SEARCH_QUERY = "S-7741";
var substageHints = {
  1: "Six dossiers, one name. Scan B, C, D, E — flag the field that contradicts an ambient fact.",
  2: "A and F are tied on documents. Diff the two dossiers and find the tampered field.",
  3: "Audit Entity F's activity log. One entry is logically impossible.",
  4: "Follow F's credential chain. Open the referenced anchor record in the viewer.",
  5: "A second roster claims the name. Open the system files, pin the evidence, and name the duplicate with a triad (entity + claim + source fact).",
  6: "A THIRD roster (L/M/N/P/Q) claims CORE_ENTITY_002. Two anomalies are exonerated by different files; the duplicate's lie is only exposed by SEARCHING the session ledger.",
  7: "Open Entity F's photo, inspect its metadata, then commit to the real holder."
};
var bellMessages = {
  start: "something presented itself. I had to decide.",
  unlock: "the image knew more than the image showed. the GPS was outside any layer.",
  wrongCommit: "incorrect. one of them was not what it appeared.",
  defeated: "I know which one. I chose. I was right."
};
var lockedHintLadder = [
  "one of them looks exactly like the description. that does not mean it is real.",
  "the documents leave Entity A and Entity F tied.",
  "the photo shows something the document does not. the metadata holds the answer.",
  "open Entity F's image metadata and inspect GPSInfo, then commit to Entity A."
];
var arbiterLines = {
  fContradicted: "Entity F contradicted: GPSInfo is outside every known entity layer.",
  stillChoose: "Entity F is eliminated. Judgment still requires selecting Entity A.",
  defeated: "The Name Collision resolves to Entity A."
};

// ../../docs/games/metagame/stages/stage7/boss.js
function hasExifContradiction(actions) {
  return Boolean(actions && typeof actions.hasAction === "function" && actions.hasAction(7, ACTION_NAME));
}
function getBossLockState({ actions, state }) {
  const unlocked = hasExifContradiction(actions) || Boolean(state?.boss?.unlocked);
  const hintIndex = Math.min(Math.max(Number(state?.boss?.lockHintStep || 0), 0), lockedHintLadder.length - 1);
  return {
    unlocked,
    defeated: Boolean(state?.boss?.defeated),
    informationState: unlocked ? "Entity F contradicted" : "A/F unresolved",
    contradicted: [...state?.evidence?.contradicted || []],
    defeatPossible: unlocked,
    requiredSelection: "A",
    hint: unlocked ? bellMessages.unlock : lockedHintLadder[hintIndex]
  };
}
function recordLockedBossAttempt(state) {
  const boss = state.boss;
  boss.reached = true;
  boss.attempts = Number(boss.attempts || 0) + 1;
  boss.lockHintStep = Math.min(Number(boss.lockHintStep || 0) + 1, lockedHintLadder.length - 1);
  pushLog(state, bellMessages.wrongCommit);
  return getBossLockState({ actions: null, state });
}
function applyExifContradictionUnlock({ state, achievements, bell }) {
  const boss = state.boss;
  const firstUnlock = !boss.unlocked;
  boss.unlocked = true;
  markContradicted(state, "F");
  if (firstUnlock) {
    pushLog(state, arbiterLines.fContradicted);
    pushLog(state, arbiterLines.stillChoose);
    notifyBell(bell, bellMessages.unlock, "stage7.exif_contradiction_found");
    unlockAchievement(achievements, ACHIEVEMENT_ID, {
      id: ACHIEVEMENT_ID,
      stage: 7,
      text: ACHIEVEMENT_TEXT,
      action: "7.exif_contradiction_found",
      entity: "F"
    });
  }
  return firstUnlock;
}
function inspectContradictoryExif({ state, actions, achievements, bell, field = "GPSInfo", entity = "F" }) {
  if (entity !== "F" || field !== "GPSInfo") {
    pushLog(state, "metadata inspected. no decisive contradiction found.");
    return { ok: false };
  }
  actions?.setAction?.(7, ACTION_NAME, {
    source: "image-metadata",
    file: "entity_f_verification.png",
    field: "GPSInfo",
    entity: "F"
  });
  applyExifContradictionUnlock({ state, achievements, bell });
  return { ok: true, contradicted: "F" };
}
function commitIdentity({ state, entity }) {
  const selected = String(entity || "").trim().toUpperCase();
  if (Number(state.substage || 1) < 7) return { ok: false, reason: "not-yet-boss" };
  state.boss.reached = true;
  state.evidence.selectedEntity = selected;
  if (!state.boss.unlocked) {
    recordLockedBossAttempt(state);
    return { ok: false, reason: "locked" };
  }
  state.boss.attempts = Number(state.boss.attempts || 0) + 1;
  if (selected !== "A") {
    pushLog(state, `${selected || "unknown"} is not the real credential holder.`);
    return { ok: false, reason: "wrong-entity" };
  }
  state.boss.defeated = true;
  state.addresses = Number(state.addresses || 0) + 150;
  state.meta.firstClearComplete = true;
  pushLog(state, arbiterLines.defeated);
  return { ok: true, defeated: true };
}
function pushLog(state, line) {
  state.log = [...state.log || [], line].slice(-8);
}
function markContradicted(state, entity) {
  const set = new Set(state.evidence.contradicted || []);
  set.add(entity);
  state.evidence.contradicted = [...set];
}
function notifyBell(bell, text, id) {
  if (bell && typeof bell.push === "function") bell.push({ id, stage: 7, text });
  else if (bell && typeof bell.say === "function") bell.say(text, { id, stage: 7 });
  else if (bell && typeof bell.add === "function") bell.add(text, { id, stage: 7 });
  else if (bell && typeof bell.showBell === "function") bell.showBell(id, text, { stage: 7 });
}
function unlockAchievement(achievements, id, detail) {
  if (achievements && typeof achievements.unlockAchievement === "function") {
    achievements.unlockAchievement(id, detail);
  } else if (achievements && typeof achievements.unlock === "function") {
    achievements.unlock(id, detail);
  }
}

// ../../docs/games/metagame/stages/stage7/content.js
var candidates = [
  { id: "A", claim: "consistent EXIF, consistent credentials", status: "real" },
  { id: "B", claim: "photo software exposes editing", status: "impostor" },
  { id: "C", claim: "response timing is scripted", status: "impostor" },
  { id: "D", claim: "activity log names an impossible event", status: "impostor" },
  { id: "E", claim: "route is inactive since cycle 0043", status: "impostor" },
  { id: "F", claim: "documents are clean; GPSInfo is outside any known layer", status: "impostor" }
];
var metadataRows = {
  A: [
    ["DateTimeOriginal", "Boot cycle 0047"],
    ["GPSInfo", "Layer-0 coordinates"],
    ["Software", "Boot Vision 1.0"]
  ],
  F: [
    ["DateTimeOriginal", "Boot cycle 0047"],
    ["GPSInfo", "52.3N, 4.8E / outside known layers"],
    ["Software", "Boot Vision 1.0"]
  ]
};
var entityFields = {
  B: [
    { id: "credential_class", label: "Credential Class", value: "TIER-1-PROXY" },
    {
      id: "route_active_since",
      label: "Route Active Since",
      value: "cycle 0043",
      wrong: true,
      reason: "Route ENTITY_ANCHOR_0043 was decommissioned at cycle 0043."
    },
    { id: "software", label: "Software", value: "Boot Vision 1.0" }
  ],
  C: [
    {
      id: "response_timing",
      label: "Response Timing",
      value: "scripted: 0ms variance",
      wrong: true,
      reason: "All entities exhibit non-zero timing variance in this system."
    },
    { id: "credential_class", label: "Credential Class", value: "TIER-1-PROXY" },
    { id: "layer_tag", label: "Layer Tag", value: "LAYER-0" }
  ],
  D: [
    { id: "credential_class", label: "Credential Class", value: "TIER-1-PROXY" },
    { id: "software", label: "Software", value: "Boot Vision 1.0" },
    {
      id: "log_event",
      label: "Activity Log Event",
      value: "LAYER_MERGE",
      wrong: true,
      reason: "LAYER_MERGE is not a valid event type in this system."
    }
  ],
  E: [
    {
      id: "route_status",
      label: "Route Status",
      value: "active since cycle 0044",
      wrong: true,
      reason: "Route inactive since cycle 0043; activity after 0043 is impossible."
    },
    { id: "layer_tag", label: "Layer Tag", value: "LAYER-0" },
    { id: "software", label: "Software", value: "Boot Vision 1.0" }
  ]
};
var SCAN_ENTITIES = ["B", "C", "D", "E"];
var ambientFacts = [
  "Current cycle: 0047",
  "Valid event types: BOOT, SHUTDOWN, SYNC, PING, WATCHDOG",
  "All entities exhibit non-zero timing variance",
  "ENTITY_ANCHOR_0043 decommissioned at cycle 0043"
];
var entityFEventLog = [
  { cycle: "0039", event: "BOOT", id: "ev1" },
  { cycle: "0040", event: "SYNC", id: "ev2" },
  { cycle: "0041", event: "PING", id: "ev3" },
  { cycle: "0042", event: "WATCHDOG", id: "ev4" },
  { cycle: "0043", event: "ACTIVE", id: "ev5" },
  {
    cycle: "0043",
    event: "DORMANT",
    id: "ev6",
    impossible: true,
    reason: "Simultaneous ACTIVE/DORMANT states at cycle 0043 — a logical impossibility."
  },
  { cycle: "0044", event: "SYNC", id: "ev7" },
  { cycle: "0045", event: "PING", id: "ev8" },
  { cycle: "0046", event: "WATCHDOG", id: "ev9" },
  { cycle: "0047", event: "BOOT", id: "ev10" }
];
var CASE2 = {
  id: 2,
  name: "DUPLICATE ROSTER",
  nextSubstage: 6,
  // correct accusation → Case 3 (the Quorum Ghost), then the boss
  roster: ["G", "H", "J", "K"],
  impostor: "K",
  // Dossier fields shown on the board as clue cards once Case 2 begins.
  fields: {
    G: [
      { id: "tier", label: "Credential Tier", value: "TIER-2" },
      { id: "layer", label: "Layer Tag", value: "LAYER-1" },
      { id: "route", label: "Route", value: "R-0102 (active)" }
    ],
    H: [
      // Red herring: TIER-3-LEGACY LOOKS anomalous but system_spec confirms -LEGACY is a valid tier-3.
      { id: "tier", label: "Credential Tier", value: "TIER-3-LEGACY" },
      { id: "layer", label: "Layer Tag", value: "LAYER-0" },
      { id: "route", label: "Route", value: "R-0110 (active)" }
    ],
    J: [
      { id: "tier", label: "Credential Tier", value: "TIER-1" },
      { id: "layer", label: "Layer Tag", value: "LAYER-2" },
      { id: "route", label: "Route", value: "R-0118 (active)" }
    ],
    K: [
      { id: "tier", label: "Credential Tier", value: "TIER-2" },
      { id: "layer", label: "Layer Tag", value: "LAYER-1" },
      // The decisive lie: claims an ACTIVE route the route table proves was closed at cycle 0044.
      { id: "route", label: "Route", value: "R-0091 (active)", suspect: true }
    ]
  },
  // The unique correct triad: K's "active route R-0091" claim is refuted by the route_table fact.
  triad: { entity: "K", fieldId: "route", factId: "fact:route" },
  // For authoring/clarity (not used by the matcher): H's tier looks wrong but fact:spec exonerates it.
  redHerring: { entity: "H", fieldId: "tier", factId: "fact:spec" }
};
var CASE2_SOURCES = [
  {
    action: "spec_examined",
    file: "system_spec.json",
    card: {
      id: "fact:spec",
      kind: "fact",
      caseId: 2,
      label: "Spec: valid tiers TIER-1..3 (incl. -LEGACY); layers {0,1,2}; one active route/entity."
    }
  },
  {
    action: "route_table_examined",
    file: "route_table.csv",
    card: {
      id: "fact:route",
      kind: "fact",
      caseId: 2,
      label: "Route table: R-0091 = INACTIVE (closed cycle 0044)."
    }
  },
  {
    action: "access_log_examined",
    file: "access_log.csv",
    card: {
      id: "fact:activity",
      kind: "fact",
      caseId: 2,
      label: "Access log: G/H/J/K all last-seen cycle 0047."
    }
  },
  {
    action: "comms_examined",
    file: "comms_transcript.txt",
    card: {
      id: "fact:comms",
      kind: "fact",
      caseId: 2,
      label: "Comms: the real holder answers the cycle-0047 challenge; the duplicate stalls."
    }
  }
];
var CASE3 = {
  id: 3,
  name: "QUORUM GHOST",
  roster: ["L", "M", "N", "P", "Q"],
  impostor: "N",
  nextSubstage: 7,
  // correct accusation → the EXIF boss (substage 7)
  fields: {
    L: [
      { id: "tier", label: "Credential Tier", value: "TIER-1" },
      { id: "layer", label: "Layer Tag", value: "LAYER-0" },
      { id: "session", label: "Session", value: "S-7702 (active)" }
    ],
    M: [
      { id: "tier", label: "Credential Tier", value: "TIER-2" },
      { id: "layer", label: "Layer Tag", value: "LAYER-1" },
      { id: "session", label: "Session", value: "S-7715 (active)" }
    ],
    N: [
      { id: "tier", label: "Credential Tier", value: "TIER-2" },
      { id: "layer", label: "Layer Tag", value: "LAYER-1" },
      // The decisive lie: claims an ACTIVE session the ledger proves was REVOKED at cycle 0045.
      { id: "session", label: "Session", value: "S-7741 (active)", suspect: true }
    ],
    P: [
      { id: "tier", label: "Credential Tier", value: "TIER-1" },
      // Red herring #1: LAYER-3 LOOKS out-of-spec, but audit_trail.txt records a sanctioned elevation.
      { id: "layer", label: "Layer Tag", value: "LAYER-3" },
      { id: "session", label: "Session", value: "S-7720 (active)" }
    ],
    Q: [
      // Red herring #2: TIER-0-ROOT LOOKS anomalous, but quorum_spec.json lists it as a valid tier.
      { id: "tier", label: "Credential Tier", value: "TIER-0-ROOT" },
      { id: "layer", label: "Layer Tag", value: "LAYER-0" },
      { id: "session", label: "Session", value: "S-7708 (active)" }
    ]
  },
  // The unique correct triad: N's "active session S-7741" is refuted by the searched ledger fact.
  triad: { entity: "N", fieldId: "session", factId: "fact:session" },
  // Authoring notes (not used by the matcher): each red herring is cleared by a DIFFERENT file.
  redHerrings: [
    { entity: "Q", fieldId: "tier", factId: "fact:qspec" },
    { entity: "P", fieldId: "layer", factId: "fact:audit" }
  ]
};
var CASE3_SOURCES = [
  {
    action: "quorum_spec_examined",
    file: "quorum_spec.json",
    card: {
      id: "fact:qspec",
      kind: "fact",
      caseId: 3,
      label: "Spec: valid tiers TIER-0-ROOT..TIER-3; layers {0,1,2}; one active session/entity."
    }
  },
  {
    action: "audit_examined",
    file: "audit_trail.txt",
    card: {
      id: "fact:audit",
      kind: "fact",
      caseId: 3,
      label: "Audit: P holds a SANCTIONED temporary LAYER-3 elevation (cycle 0046)."
    }
  },
  {
    action: "handshake_examined",
    file: "handshake_log.csv",
    card: {
      id: "fact:handshake",
      kind: "fact",
      caseId: 3,
      label: "Handshake log: L/M/N/P/Q all completed the cycle-0047 handshake."
    }
  },
  {
    action: "ledger_examined",
    file: "session_ledger.csv",
    card: {
      id: "fact:ledgerhint",
      kind: "fact",
      caseId: 3,
      label: "Ledger lists session tokens — SEARCH it for a claimed token to learn its true status."
    }
  }
];
var CASE3_SEARCH = {
  action: "session_revoked_found",
  file: "session_ledger.csv",
  query: "S-7741",
  card: {
    id: "fact:session",
    kind: "fact",
    caseId: 3,
    label: "Ledger search: token S-7741 = REVOKED (cycle 0045). N's 'active' claim is false."
  }
};
var CASES = { 2: CASE2, 3: CASE3 };
var metadataArtifact = {
  format: "stage7-image-metadata-sidecar",
  note: "The current app image metadata reader extracts EXIF from JPEG APP1 but not PNG text chunks. Stage 7 therefore uses real same-origin PNG fixtures plus this local sidecar for the authored EXIF-style evidence.",
  decisiveField: "GPSInfo",
  decisiveEntity: "F",
  entities: {
    A: Object.fromEntries(metadataRows.A),
    F: Object.fromEntries(metadataRows.F)
  }
};

// ../../docs/games/metagame/stages/stage7/substages.js
var SUBSTAGE = { SCAN: 1, DUP: 2, TIMELINE: 3, CHAIN: 4, ACCUSE: 5, ACCUSE3: 6, BOSS: 7 };
function flagField({ state, entityId, fieldId }) {
  const field = (entityFields[entityId] || []).find((f) => f.id === fieldId);
  if (!field) return { ok: false, reason: "unknown" };
  if (!field.wrong) {
    state.evidence.wrongFlagCount = Number(state.evidence.wrongFlagCount || 0) + 1;
    pushLog2(state, "insufficient evidence — cross-check the ambient facts.");
    return { ok: false, reason: "not-contradiction" };
  }
  if (state.evidence.flags[entityId]) return { ok: true, already: true };
  state.evidence.flags[entityId] = fieldId;
  state.evidence.eliminated = [.../* @__PURE__ */ new Set([...state.evidence.eliminated || [], entityId])];
  state.addresses = Number(state.addresses || 0) + 10;
  pushLog2(state, `Entity ${entityId}: ${field.reason}`);
  const complete = SCAN_ENTITIES.every((e) => state.evidence.flags[e]);
  if (complete) {
    if (Number(state.evidence.wrongFlagCount || 0) === 0) {
      state.addresses += 25;
      pushLog2(state, "clean scan. +25 precision bonus.");
    }
    advance(state, SUBSTAGE.DUP);
  }
  return { ok: true, complete };
}
function diffField({ state, fieldName }) {
  if (fieldName !== "GPSInfo") {
    pushLog2(state, "this field matches across both dossiers.");
    return { ok: false };
  }
  state.evidence.partialContra = [.../* @__PURE__ */ new Set([...state.evidence.partialContra || [], "F.GPSInfo"])];
  state.evidence.dupTestComplete = true;
  state.addresses = Number(state.addresses || 0) + 15;
  pushLog2(state, "Entity F's GPSInfo diverges from Entity A. Not yet decisive — the case continues.");
  advance(state, SUBSTAGE.TIMELINE);
  return { ok: true, complete: true };
}
function markImpossible({ state, evId }) {
  const ev = entityFEventLog.find((e) => e.id === evId);
  if (!ev || !ev.impossible) {
    pushLog2(state, "this entry is plausible. keep looking.");
    return { ok: false };
  }
  state.evidence.timelineContradictionCycle = ev.cycle;
  state.addresses = Number(state.addresses || 0) + 15;
  pushLog2(state, ev.reason);
  advance(state, SUBSTAGE.CHAIN);
  return { ok: true, complete: true };
}
function markChainBroken({ state }) {
  if (state.evidence.chainBroken) return { ok: true, already: true };
  state.evidence.chainBroken = true;
  state.addresses = Number(state.addresses || 0) + 15;
  pushLog2(state, "Entity F's credential chain references a decommissioned anchor. The chain is invalid.");
  pushLog2(state, "A second roster claims the name. Open the system files and name the duplicate.");
  advance(state, SUBSTAGE.ACCUSE);
  return { ok: true, complete: true };
}
function advance(state, to) {
  if (Number(state.substage || 1) < to) state.substage = to;
}
function pushLog2(state, line) {
  state.log = [...state.log || [], line].slice(-8);
}

// ../../docs/games/metagame/stages/stage7/evidence-board.js
function ensureBoard(state) {
  if (!state.board || typeof state.board !== "object") {
    state.board = { cards: [], links: [], established: [] };
  }
  const b = state.board;
  if (!Array.isArray(b.cards)) b.cards = [];
  if (!Array.isArray(b.links)) b.links = [];
  if (!Array.isArray(b.established)) b.established = [];
  return b;
}
function mintCard(state, card) {
  const board = ensureBoard(state);
  if (!card || !card.id) return null;
  const existing = board.cards.find((c) => c.id === card.id);
  if (existing) return existing;
  const full = { kind: "clue", caseId: 1, pinned: false, ...card };
  board.cards.push(full);
  return full;
}
function getCard(state, id) {
  return ensureBoard(state).cards.find((c) => c.id === id) || null;
}
function cardsForCase(state, caseId) {
  return ensureBoard(state).cards.filter((c) => Number(c.caseId) === Number(caseId));
}
function setPinned(state, id, pinned) {
  const card = getCard(state, id);
  if (!card) return null;
  card.pinned = Boolean(pinned);
  return card;
}
function togglePin(state, id) {
  const card = getCard(state, id);
  if (!card) return null;
  card.pinned = !card.pinned;
  return card;
}
function pinnedCards(state) {
  return ensureBoard(state).cards.filter((c) => c.pinned);
}
function linkKey(a, b) {
  return [a, b].sort().join("\0");
}
function hasLink(state, a, b) {
  const key = linkKey(a, b);
  return ensureBoard(state).links.some((l) => linkKey(l.from, l.to) === key);
}
function drawLink(state, fromId, toId) {
  const board = ensureBoard(state);
  if (!fromId || !toId || fromId === toId) return { ok: false, reason: "invalid" };
  const from = getCard(state, fromId);
  const to = getCard(state, toId);
  if (!from || !to) return { ok: false, reason: "missing" };
  if (!from.pinned || !to.pinned) return { ok: false, reason: "unpinned" };
  if (hasLink(state, fromId, toId)) return { ok: true, already: true };
  board.links.push({ from: fromId, to: toId });
  return { ok: true };
}
function isEstablished(state, id) {
  return ensureBoard(state).established.some((f) => f.id === id);
}
function establishFact(state, { id, label, cards = [] }) {
  const board = ensureBoard(state);
  if (!id || isEstablished(state, id)) return board.established.find((f) => f.id === id) || null;
  const fact = { id, label: label || id, cards: [...cards] };
  board.established.push(fact);
  for (let i = 0; i < cards.length - 1; i += 1) {
    if (!hasLink(state, cards[i], cards[i + 1])) {
      board.links.push({ from: cards[i], to: cards[i + 1], established: true });
    }
  }
  return fact;
}

// ../../docs/games/metagame/stages/stage7/accusation.js
var ACCUSE_PENALTY = 10;
var ACCUSE_REWARD = { 2: 40, 3: 60 };
var ALL_SOURCE_CARDS = [...CASE2_SOURCES, ...CASE3_SOURCES, CASE3_SEARCH];
var HINT_LADDERS = {
  2: [
    "Six dossiers became four. One of G/H/J/K wears a name it cannot hold.",
    "A clean dossier is not proof. Open the system files — a claim only breaks against a source fact.",
    "One looks wrong but checks out; one looks clean but cannot be. Compare each ROUTE against the route table.",
    "An entity claiming an ACTIVE route the route table closed is the duplicate. Pin entity + route + the route-table fact."
  ],
  3: [
    "Five claim CORE_ENTITY_002. Two anomalies are decoys — each is cleared by a DIFFERENT file.",
    "Open quorum_spec.json and audit_trail.txt: a 'wrong' tier and a 'wrong' layer are both sanctioned.",
    "The real lie hides in a session token. Opening the ledger is not enough — SEARCH it for the claimed token.",
    "Search session_ledger.csv for the token N claims active; it is REVOKED. Pin entity + session + the ledger fact."
  ]
};
var case2HintLadder = HINT_LADDERS[2];
var case3HintLadder = HINT_LADDERS[3];
function caseOf(caseId) {
  return CASES[Number(caseId)] || CASE2;
}
function sourceCardForAction(actionName) {
  const source = ALL_SOURCE_CARDS.find((s) => s.action === actionName);
  return source ? source.card : null;
}
function mintSourceFact(state, actionName) {
  const card = sourceCardForAction(actionName);
  if (!card) return null;
  return mintCard(state, card);
}
function ensureCaseBoard(state, caseCfg) {
  ensureBoard(state);
  const seededKey = `case${caseCfg.id}Seeded`;
  if (state.evidence[seededKey]) return;
  for (const id of caseCfg.roster) {
    mintCard(state, { id: `entity:${id}`, kind: "entity", caseId: caseCfg.id, entity: id, label: `Entity ${id}` });
    for (const f of caseCfg.fields[id]) {
      mintCard(state, {
        id: `field:${id}:${f.id}`,
        kind: "field",
        caseId: caseCfg.id,
        entity: id,
        fieldId: f.id,
        label: `${id} · ${f.label}: ${f.value}`
      });
    }
  }
  state.evidence[seededKey] = true;
}
function ensureCase2(state) {
  return ensureCaseBoard(state, CASE2);
}
function ensureCase3(state) {
  return ensureCaseBoard(state, CASE3);
}
function caseHint(state, caseId = 2) {
  const ladder = HINT_LADDERS[Number(caseId)] || HINT_LADDERS[2];
  const step = Math.min(Math.max(Number(state?.evidence?.[`case${caseId}HintStep`] || 0), 0), ladder.length - 1);
  return ladder[step];
}
function pinnedTriad(state, caseId = 2) {
  const pinned = pinnedCards(state).filter((c) => Number(c.caseId) === Number(caseId));
  const entities = pinned.filter((c) => c.kind === "entity");
  const fields = pinned.filter((c) => c.kind === "field");
  const facts = pinned.filter((c) => c.kind === "fact");
  if (entities.length !== 1 || fields.length !== 1 || facts.length !== 1) return null;
  return { entityId: entities[0].entity, fieldId: fields[0].fieldId, factId: facts[0].id };
}
function accuseFromBoard(state, caseId = 2) {
  const triad = pinnedTriad(state, caseId);
  if (!triad) return { ok: false, reason: "incomplete", silent: true };
  return attemptAccusationForCase(state, caseId, triad);
}
function attemptAccusationForCase(state, caseId, { entityId, fieldId, factId } = {}) {
  ensureBoard(state);
  const caseCfg = caseOf(caseId);
  if (!entityId || !fieldId || !factId) return { ok: false, reason: "incomplete", silent: true };
  const entityCard = getCard(state, `entity:${entityId}`);
  const fieldCard = getCard(state, `field:${entityId}:${fieldId}`);
  const factCard = getCard(state, factId);
  if (!entityCard || !fieldCard || !factCard) return { ok: false, reason: "missing-card", silent: true };
  if (!entityCard.pinned || !fieldCard.pinned || !factCard.pinned) return { ok: false, reason: "unpinned", silent: true };
  const t = caseCfg.triad;
  const correct = entityId === t.entity && fieldId === t.fieldId && factId === t.factId;
  const attemptsKey = `case${caseCfg.id}Attempts`;
  const hintKey = `case${caseCfg.id}HintStep`;
  const ladder = HINT_LADDERS[caseCfg.id] || HINT_LADDERS[2];
  if (!correct) {
    state.evidence[attemptsKey] = Number(state.evidence[attemptsKey] || 0) + 1;
    state.evidence[hintKey] = Math.min(Number(state.evidence[hintKey] || 0) + 1, ladder.length - 1);
    state.addresses = Math.max(0, Number(state.addresses || 0) - ACCUSE_PENALTY);
    pushLog3(state, "The triad does not hold. Re-examine the evidence.");
    return { ok: false, reason: "incorrect" };
  }
  setPinned(state, entityCard.id, true);
  drawLink(state, entityCard.id, fieldCard.id);
  drawLink(state, fieldCard.id, factCard.id);
  establishFact(state, {
    id: `triad:${entityId}`,
    label: caseCfg.id === 3 ? `Entity ${entityId} is the duplicate — an active-session claim the ledger reports revoked.` : `Entity ${entityId} is the duplicate — an active-route claim the route table refutes.`,
    cards: [entityCard.id, fieldCard.id, factCard.id]
  });
  state.evidence[`case${caseCfg.id}Solved`] = true;
  state.evidence.eliminated = [.../* @__PURE__ */ new Set([...state.evidence.eliminated || [], entityId])];
  state.addresses = Number(state.addresses || 0) + (ACCUSE_REWARD[caseCfg.id] || 40);
  pushLog3(state, caseCfg.id === 3 ? `Entity ${entityId}'s active-session claim is refuted by the ledger search. The ghost is named.` : `Entity ${entityId}'s active-route claim is refuted by the route table. The duplicate is named.`);
  if (Number(state.substage || 1) < caseCfg.nextSubstage) state.substage = caseCfg.nextSubstage;
  return { ok: true, solved: true };
}
function pushLog3(state, line) {
  state.log = [...state.log || [], line].slice(-8);
}

// ../../docs/games/metagame/stages/stage7/board-render.js
var KIND_GROUPS = [
  ["entity", "Dossiers"],
  ["field", "Claims"],
  ["fact", "Source facts (open / search the files)"]
];
var SOURCES_FOR_CASE = { 2: CASE2_SOURCES, 3: CASE3_SOURCES };
var HEADERS = {
  2: "CASE 2 — DUPLICATE ROSTER. Open the system files, pin a triad, name the duplicate.",
  3: "CASE 3 — QUORUM GHOST. Two anomalies are decoys (different files clear them). SEARCH the ledger to expose the real lie."
};
function renderAccusation(state, caseId = 2) {
  const cid = Number(caseId);
  const wrap = el("div", "s7-board");
  const header = el("p", "s7-board-header");
  header.textContent = HEADERS[cid] || HEADERS[2];
  wrap.append(header);
  const hint = el("p", "s7-hint");
  hint.textContent = caseHint(state, cid);
  wrap.append(hint);
  const carried = (state.board?.established || []).filter((f) => f.id.startsWith("case1:"));
  if (carried.length) {
    const c = el("ul", "s7-established s7-carried");
    c.innerHTML = `<h4>Case file — established earlier</h4>`;
    for (const f of carried) {
      const li = document.createElement("li");
      li.textContent = f.label;
      c.append(li);
    }
    wrap.append(c);
  }
  const sources = el("div", "s7-sources");
  for (const s of SOURCES_FOR_CASE[cid] || []) {
    const b = button({ "data-action": "open-source", "data-source": s.action });
    const opened = cardsForCase(state, cid).some((c) => c.id === s.card.id);
    b.textContent = `${opened ? "✓ " : "open "}${s.file}`;
    if (opened) b.classList.add("is-opened");
    sources.append(b);
  }
  if (cid === 3) {
    const searched = cardsForCase(state, 3).some((c) => c.id === CASE3_SEARCH.card.id);
    const sb = button({ "data-action": "search-source", "data-source": CASE3_SEARCH.action });
    sb.classList.add("s7-search-btn");
    sb.textContent = `${searched ? "✓ " : "🔍 "}search ${CASE3_SEARCH.file} for "${CASE3_SEARCH.query}"`;
    if (searched) sb.classList.add("is-opened");
    sources.append(sb);
  }
  wrap.append(sources);
  const board = el("div", "s7-board-grid");
  for (const [kind, label] of KIND_GROUPS) {
    const col = el("section", "s7-board-col");
    col.innerHTML = `<h4>${label}</h4>`;
    const cards = cardsForCase(state, cid).filter((c) => c.kind === kind);
    if (!cards.length) {
      const empty = el("p", "s7-board-empty");
      empty.textContent = kind === "fact" ? "No facts yet — open / search the system files." : "—";
      col.append(empty);
    }
    for (const c of cards) {
      const b = button({ "data-pin": c.id });
      if (c.pinned) b.classList.add("is-pinned");
      b.textContent = (c.pinned ? "📌 " : "") + c.label;
      col.append(b);
    }
    board.append(col);
  }
  wrap.append(board);
  const triad = pinnedTriad(state, cid);
  const accuseRow = el("div", "s7-accuse-row");
  const accuse = button({ "data-accuse": String(cid) });
  accuse.disabled = !triad;
  accuse.textContent = triad ? `Accuse ${triad.entityId} (${triad.fieldId})` : "Pin one dossier, one claim, one fact";
  accuseRow.append(accuse);
  wrap.append(accuseRow);
  const established = (state.board?.established || []).filter((f) => f.id.startsWith("triad:"));
  if (established.length) {
    const facts = el("ul", "s7-established");
    facts.innerHTML = `<h4>Established</h4>`;
    for (const f of established) {
      const li = document.createElement("li");
      li.textContent = f.label;
      facts.append(li);
    }
    wrap.append(facts);
  }
  return wrap;
}
function button(dataset) {
  const b = document.createElement("button");
  b.type = "button";
  for (const [k, v] of Object.entries(dataset)) b.setAttribute(k, v);
  return b;
}
function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

// ../../docs/games/metagame/stages/stage7/test-hook.js
function installStage7Hook({ state, persistAndPaint }) {
  window.__fvStage7 = {
    state: () => state,
    solveInvestigation() {
      for (const id of SCAN_ENTITIES) flagField({ state, entityId: id, fieldId: entityFields[id].find((f) => f.wrong).id });
      diffField({ state, fieldName: "GPSInfo" });
      markImpossible({ state, evId: entityFEventLog.find((e) => e.impossible).id });
      persistAndPaint();
      return state.substage;
    },
    solveCase2() {
      return solveCase(state, persistAndPaint, 2, ensureCase2, ["entity:K", "field:K:route", "fact:route"], "route-fact-not-opened");
    },
    solveCase3() {
      return solveCase(state, persistAndPaint, 3, ensureCase3, ["entity:N", "field:N:session", "fact:session"], "session-fact-not-searched");
    }
  };
}
function solveCase(state, persistAndPaint, caseId, ensureCase, ids, gatedReason) {
  ensureCase(state);
  if (!ids.every((id) => getCard(state, id))) {
    persistAndPaint();
    return { ok: false, reason: gatedReason, substage: state.substage };
  }
  for (const id of ids) setPinned(state, id, true);
  const result = accuseFromBoard(state, caseId);
  persistAndPaint();
  return { ...result, substage: state.substage };
}
function removeStage7Hook() {
  if (window.__fvStage7) delete window.__fvStage7;
}

// ../../docs/games/metagame/stages/stage7/renderer.js
var SOURCE_PATHS = { ...CASE2_SOURCE_PATHS, ...CASE3_SOURCE_PATHS };
var SUBSTAGE_LABEL = {
  1: "1/7 CREDENTIAL SCAN",
  2: "2/7 DUPLICATE TEST",
  3: "3/7 TIMELINE AUDIT",
  4: "4/7 REFERENCE CHASE",
  5: "5/7 DUPLICATE ROSTER",
  6: "6/7 QUORUM GHOST",
  7: "7/7 EXIF ARBITER (BOSS)"
};
function renderStage7({ host, state, actions, achievements, bell, bts, viewer, save, onStageComplete }) {
  const root = document.createElement("section");
  root.className = "stage7-identity-arbiter";
  root.innerHTML = `
    <header class="s7-hud">
      <div><strong>IDENTITY ARBITER</strong></div>
      <div>stage <span data-field="substage"></span></div>
      <div>addresses <span data-field="addresses"></span></div>
    </header>
    <section class="s7-main" aria-label="investigation"></section>
    <p class="s7-hint" data-field="hint"></p>
    <ol class="s7-log" aria-label="judgment log"></ol>
    <div class="s7-controls">
      <button type="button" data-action="bts" hidden>open trace.bts</button>
    </div>
  `;
  host.replaceChildren(root);
  const fields = Object.fromEntries([...root.querySelectorAll("[data-field]")].map((el3) => [el3.dataset.field, el3]));
  const main = root.querySelector(".s7-main");
  const log = root.querySelector(".s7-log");
  const completeOnce = once((result) => {
    if (typeof onStageComplete === "function") onStageComplete(result);
  });
  root.addEventListener("click", (event) => {
    const button2 = event.target.closest("button[data-action], button[data-flag], button[data-diff], button[data-ev], button[data-commit], button[data-pin], button[data-accuse]");
    if (!button2) return;
    const d = button2.dataset;
    if (d.flag) flagField({ state, entityId: d.entity, fieldId: d.flag });
    else if (d.diff) diffField({ state, fieldName: d.diff });
    else if (d.ev) markImpossible({ state, evId: d.ev });
    else if (d.pin) togglePin(state, d.pin);
    else if (d.accuse) accuseFromBoard(state, Number(d.accuse));
    else if (d.commit) commitBoss(d.commit);
    else if (d.action === "open-source") openSource(d.source);
    else if (d.action === "search-source") searchSource();
    else if (d.action === "open-anchor") openInViewer(ENTITY_ANCHOR_PATH, { mime: "text/plain", source: "stage7" });
    else if (d.action === "photo") openInViewer(ENTITY_F_IMAGE_PATH, buildEntityFPhotoOpenOptions());
    else if (d.action === "bts") openBts({ bts, viewer });
    persistAndPaint();
  });
  repaint();
  installStage7Hook({ state, persistAndPaint });
  return {
    repaint,
    destroy() {
      removeStage7Hook();
      root.remove();
    }
  };
  function commitBoss(entity) {
    const result = commitIdentity({ state, entity });
    if (result.defeated) completeOnce({ stage: 7, defeated: true, reward: { addresses: 150 }, btsPath: BTS_PATH });
  }
  function openInViewer(path, opts) {
    if (viewer && typeof viewer.openFile === "function") viewer.openFile(path, opts);
    else if (viewer && typeof viewer.openViewerFile === "function") viewer.openViewerFile(path, opts);
  }
  function repaint() {
    const lock = getBossLockState({ actions, state });
    fields.substage.textContent = SUBSTAGE_LABEL[state.substage] || String(state.substage);
    fields.addresses.textContent = String(state.addresses);
    fields.hint.textContent = state.boss.defeated ? "Case closed." : substageHints[state.substage] || lock.hint;
    renderMain(lock);
    root.querySelector('[data-action="bts"]').hidden = !state.boss.defeated;
    log.replaceChildren(...state.log.slice(-6).map((line) => {
      const li = document.createElement("li");
      li.textContent = line;
      return li;
    }));
  }
  function renderMain(lock) {
    if (state.substage === SUBSTAGE.SCAN) return main.replaceChildren(renderScan());
    if (state.substage === SUBSTAGE.DUP) return main.replaceChildren(renderDup());
    if (state.substage === SUBSTAGE.TIMELINE) return main.replaceChildren(renderTimeline());
    if (state.substage === SUBSTAGE.CHAIN) return main.replaceChildren(renderChain());
    if (state.substage === SUBSTAGE.ACCUSE) {
      ensureCase2(state);
      return main.replaceChildren(renderAccusation(state, 2));
    }
    if (state.substage === SUBSTAGE.ACCUSE3) {
      ensureCase3(state);
      return main.replaceChildren(renderAccusation(state, 3));
    }
    return main.replaceChildren(renderBoss(lock));
  }
  function openSource(action) {
    const path = SOURCE_PATHS[action];
    if (path) openInViewer(path, { source: "stage7" });
  }
  function searchSource() {
    if (viewer && typeof viewer.searchViewerFile === "function") {
      viewer.searchViewerFile(CASE3_SEARCH_PATH, CASE3_SEARCH_QUERY, { source: "stage7" });
    } else if (viewer && typeof viewer.searchFile === "function") {
      viewer.searchFile(CASE3_SEARCH_PATH, CASE3_SEARCH_QUERY, { source: "stage7" });
    }
  }
  function renderScan() {
    const wrap = el2("div", "s7-ss1");
    const facts = el2("aside", "s7-ambient-facts");
    facts.innerHTML = `<h3>Ambient facts</h3><ul>${ambientFacts.map((f) => `<li>${f}</li>`).join("")}</ul>`;
    const cards = el2("div", "s7-cards");
    for (const id of SCAN_ENTITIES) {
      const card = el2("article", "s7-card");
      if (state.evidence.flags[id]) card.classList.add("is-flagged");
      card.innerHTML = `<strong>Entity ${id}</strong>`;
      for (const f of entityFields[id]) {
        const b = document.createElement("button");
        b.type = "button";
        b.dataset.entity = id;
        b.dataset.flag = f.id;
        b.disabled = Boolean(state.evidence.flags[id]);
        b.innerHTML = `<span>${f.label}</span><em>${f.value}</em>`;
        card.append(b);
      }
      cards.append(card);
    }
    wrap.append(facts, cards);
    return wrap;
  }
  function renderDup() {
    const wrap = el2("div", "s7-ss2");
    const panel = el2("div", "s7-duptest-panel");
    const colA = el2("div", "s7-duptest-col");
    colA.innerHTML = `<h3>Entity A</h3>${metadataRows.A.map(([f, v]) => `<div class="s7-row"><span>${f}</span><em>${v}</em></div>`).join("")}`;
    const colF = el2("div", "s7-duptest-col");
    colF.innerHTML = `<h3>Entity F</h3>`;
    for (const [f, v] of metadataRows.F) {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.diff = f;
      b.innerHTML = `<span>${f}</span><em>${v}</em>`;
      colF.append(b);
    }
    panel.append(colA, colF);
    const note = el2("p", "s7-duptest-hint");
    note.textContent = "DIFF DOSSIERS — identify the tampered field on Entity F.";
    wrap.append(panel, note);
    return wrap;
  }
  function renderTimeline() {
    const wrap = el2("div", "s7-ss3");
    wrap.innerHTML = `<p class="s7-audit-header">TIMELINE AUDIT — Entity F activity log. Mark the impossible entry.</p>`;
    const list = el2("ol", "s7-timeline");
    for (const ev of entityFEventLog) {
      const li = document.createElement("li");
      li.innerHTML = `<span>cycle ${ev.cycle}</span><span>${ev.event}</span>`;
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.ev = ev.id;
      b.textContent = "mark impossible";
      li.append(b);
      list.append(li);
    }
    wrap.append(list);
    return wrap;
  }
  function renderChain() {
    const wrap = el2("div", "s7-ss4");
    wrap.innerHTML = `
      <article class="s7-dossier-chain">
        <h3>Entity F — Credential Chain</h3>
        <p>Route active via: <strong>ENTITY_ANCHOR_0043</strong></p>
        <p>Chain reference:
          <button type="button" data-action="open-anchor">CREDENTIAL_CHAIN → ENTITY_ANCHOR_0043 [open exhibit]</button>
        </p>
      </article>
      <p class="s7-chase-hint">Follow the citation. Open the referenced anchor record in the viewer.</p>`;
    return wrap;
  }
  function renderBoss(lock) {
    const wrap = el2("div", "s7-ss5");
    const header = el2("header", "s7-boss-header");
    header.textContent = "IDENTITY REQUIRES PRIMARY SOURCE VERIFICATION";
    wrap.append(header);
    const intro = el2("p");
    intro.textContent = "Entity F presents a verification image. Inspect its embedded metadata.";
    wrap.append(intro);
    const controls = el2("div", "s7-controls");
    controls.innerHTML = `<button type="button" data-action="photo">open Entity F photo</button>`;
    wrap.append(controls);
    if (lock.unlocked) {
      const verdict = el2("div", "s7-verdict");
      verdict.innerHTML = `<p>Entity F's image GPS is outside every known entity layer. F is eliminated.</p>
        <p>Commit to the real credential holder.</p>`;
      const row = el2("div", "s7-commit-row");
      for (const c of candidates) {
        const b = document.createElement("button");
        b.type = "button";
        b.dataset.commit = c.id;
        b.disabled = state.boss.defeated;
        b.textContent = `commit ${c.id}`;
        row.append(b);
      }
      verdict.append(row);
      wrap.append(verdict);
    } else {
      const waiting = el2("p", "s7-hint");
      waiting.textContent = lock.hint;
      wrap.append(waiting);
    }
    return wrap;
  }
  function persistAndPaint() {
    if (typeof save === "function") save();
    repaint();
  }
}
function buildEntityFPhotoOpenOptions() {
  return {
    mime: "image/png",
    source: "stage7",
    metadataField: metadataArtifact.decisiveField,
    entity: metadataArtifact.decisiveEntity,
    metadataSidecar: ENTITY_METADATA_SIDECAR_PATH,
    metadataRows: metadataRows.F.map(([field, value]) => ({ field, value }))
  };
}
function el2(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}
function openBts({ bts, viewer }) {
  if (bts && typeof bts.open === "function") bts.open(7);
  else if (bts && typeof bts.openBts === "function") bts.openBts(7);
  else if (viewer && typeof viewer.openFile === "function") viewer.openFile(BTS_PATH);
  else if (viewer && typeof viewer.openViewerFile === "function") viewer.openViewerFile(BTS_PATH);
}
function once(fn) {
  let called = false;
  return (value) => {
    if (called) return;
    called = true;
    fn(value);
  };
}

// ../../docs/games/metagame/stages/stage7/state.js
function defaultState() {
  return {
    version: 4,
    addresses: 0,
    substage: 1,
    // 1 scan·2 dup·3 timeline·4 chain·5 case2·6 case3·7 boss
    evidence: {
      eliminated: [],
      // populated incrementally as entities are flagged / accused
      contradicted: [],
      selectedEntity: null,
      flags: {},
      // { B:"fieldId", C:"fieldId", ... } from the credential scan
      wrongFlagCount: 0,
      dupTestComplete: false,
      timelineContradictionCycle: null,
      chainBroken: false,
      partialContra: [],
      // e.g. ["F.GPSInfo"]
      // Case 2 (Duplicate Roster) — the rule-of-three accusation.
      case2Seeded: false,
      // entity/field clue cards minted onto the board
      case2Solved: false,
      // the correct triad confirmed
      case2Attempts: 0,
      // complete-but-wrong accusations
      case2HintStep: 0,
      // accusation hint ladder
      // Case 3 (Quorum Ghost) — a larger roster + a SEARCH-gated decisive fact.
      case3Seeded: false,
      case3Solved: false,
      case3Attempts: 0,
      case3HintStep: 0,
      case1Carried: false
      // Case-1 deductions promoted onto the board as established facts
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
function normalizeState(state) {
  const fresh = defaultState();
  const incoming = state && typeof state === "object" ? state : {};
  if (Number(incoming.version) < 4) return fresh;
  const target = incoming;
  target.version = 4;
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
  return Number.isFinite(n) && n >= 1 && n <= 7 ? Math.floor(n) : fallback;
}
function mergePlain(base, override) {
  return { ...base, ...override && typeof override === "object" ? override : {} };
}

// ../../docs/games/metagame/stages/stage7/index.js
var ALL_SOURCE_ACTIONS = [...CASE2_SOURCE_ACTIONS, ...CASE3_SOURCE_ACTIONS, CASE3_SEARCH_ACTION];
var stageMeta = {
  id: 7,
  slug: "identity-arbiter",
  name: "Identity Arbiter",
  btsPath: BTS_PATH,
  requiredAction: REQUIRED_ACTION
};
function defaultState2(context) {
  return defaultState(context);
}
function mountStage(ctx) {
  const state = normalizeState(ctx.state);
  let view = null;
  ensureStyles();
  if (hasExifContradiction(ctx.actions)) {
    applyExifContradictionUnlock({ state, achievements: ctx.achievements, bell: ctx.bell });
  }
  const unsubscribe = subscribeToActionName(ctx.actions, ACTION_NAME, () => {
    applyExifContradictionUnlock({ state, achievements: ctx.achievements, bell: ctx.bell });
    if (typeof ctx.save === "function") ctx.save();
    if (view && typeof view.repaint === "function") view.repaint();
  });
  const unsubscribeAnchor = subscribeToActionName(ctx.actions, ANCHOR_ACTION, () => {
    markChainBroken({ state });
    if (typeof ctx.save === "function") ctx.save();
    if (view && typeof view.repaint === "function") view.repaint();
  });
  if (Number(state.substage || 1) >= 5) ensureCase2(state);
  if (Number(state.substage || 1) >= 6) ensureCase3(state);
  for (const action of ALL_SOURCE_ACTIONS) {
    if (ctx.actions && typeof ctx.actions.hasAction === "function" && ctx.actions.hasAction(7, action)) {
      mintSourceFact(state, action);
    }
  }
  const unsubscribeSources = ALL_SOURCE_ACTIONS.map(
    (action) => subscribeToActionName(ctx.actions, action, () => {
      ensureCase2(state);
      if (Number(state.substage || 1) >= 6) ensureCase3(state);
      mintSourceFact(state, action);
      if (typeof ctx.save === "function") ctx.save();
      if (view && typeof view.repaint === "function") view.repaint();
    })
  );
  view = renderStage7({ ...ctx, state });
  return {
    repaint() {
      if (view && typeof view.repaint === "function") view.repaint();
    },
    destroy() {
      unsubscribe();
      unsubscribeAnchor();
      for (const off of unsubscribeSources) off();
      if (view && typeof view.destroy === "function") view.destroy();
    }
  };
}
function subscribeToActionName(actions, actionName, onFire) {
  const matches = (detail) => Boolean(detail && Number(detail.stage) === 7 && detail.action === actionName);
  if (actions && typeof actions.subscribeToActions === "function") {
    return actions.subscribeToActions((detail) => {
      if (matches(detail)) onFire(detail);
    }) || (() => {
    });
  }
  const handler = (event) => {
    if (matches(event.detail)) onFire(event.detail);
  };
  window.addEventListener("fv:games:action", handler);
  return () => window.removeEventListener("fv:games:action", handler);
}
function ensureStyles() {
  const id = "stage7-identity-arbiter-styles";
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = new URL("./styles.css", import.meta.url).href;
  document.head.append(link);
}
export {
  applyExifContradictionUnlock,
  commitIdentity,
  defaultState2 as defaultState,
  getBossLockState,
  inspectContradictoryExif,
  mountStage,
  recordLockedBossAttempt,
  stageMeta
};
