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
var ENTITY_F_IMAGE_PATH = "/docs/examples/metagame/stage7/entity_f_verification.jpg";
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
  1: "Six dossiers, one identity. Read B, C, D, E — flag the one detail that contradicts something you already know to be true.",
  2: "A and F match on paper. Compare the two dossiers side by side and find the one detail that's been altered.",
  3: "Check Entity F's movements. One entry in the log couldn't have happened.",
  4: "Follow F's paper trail. Open the record it points to.",
  5: "A second suspect claims the same identity. Open the case files, pin the evidence to the board, and name the impostor with three things: who, what they claimed, and the fact that disproves it.",
  6: "A THIRD group of suspects (L/M/N/P/Q) claims the same identity. Two odd details turn out to be innocent, cleared by different records — the impostor's lie is only exposed by SEARCHING the sign-in ledger.",
  7: "Open Entity F's photograph, then check where and when it was really taken — a photo remembers more than it shows. Then name the real one."
};
var bellMessages = {
  start: "something presented itself. I had to decide.",
  unlock: "the photograph knew more than it showed. it had been somewhere it claimed it hadn't.",
  wrongCommit: "incorrect. one of them was not what it appeared.",
  defeated: "I know which one. I chose. I was right."
};
var lockedHintLadder = [
  "one of them looks exactly like the description. that does not mean it is real.",
  "the paperwork leaves Entity A and Entity F tied.",
  "the photo shows something the paperwork doesn't. its hidden details hold the answer.",
  "open Entity F's photo details and check where it claims to be from, then commit to Entity A."
];
var arbiterLines = {
  fContradicted: "Entity F contradicted: the photo's location doesn't match anywhere it claims to be.",
  stillChoose: "Entity F is eliminated. Judgment still requires selecting Entity A.",
  defeated: "The Name Collision resolves to Entity A."
};

// ../../docs/games/metagame/stages/stage7/boss.js
function hasExifContradiction(actions) {
  return Boolean(actions && typeof actions.hasAction === "function" && actions.hasAction(7, ACTION_NAME));
}
var ACCUSE_PENALTY = 10;
function getBossLockState({ actions, state }) {
  const unlocked = hasExifContradiction(actions) || Boolean(state?.boss?.unlocked);
  const hintIndex = Math.min(Math.max(Number(state?.boss?.lockHintStep || 0), 0), lockedHintLadder.length - 1);
  return {
    unlocked,
    defeated: Boolean(state?.boss?.defeated),
    informationState: unlocked ? "Entity F contradicted" : "A/F unresolved",
    contradicted: [...state?.evidence?.contradicted || []],
    defeatPossible: true,
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
    file: "entity_f_verification.jpg",
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
  state.boss.attempts = Number(state.boss.attempts || 0) + 1;
  if (selected !== "A") {
    markContradicted(state, selected);
    state.addresses = Math.max(0, Number(state.addresses || 0) - ACCUSE_PENALTY);
    state.boss.lockHintStep = Math.min(Number(state.boss.lockHintStep || 0) + 1, lockedHintLadder.length - 1);
    if (selected === "F") {
      pushLog(state, "Entity F is already contradicted — the GPS places it outside every known layer. Commit to the entity that survives all five investigations.");
    } else {
      pushLog(state, `${selected || "unknown"} is not the real credential holder — eliminated (-${ACCUSE_PENALTY} addresses). the field narrows.`);
    }
    return { ok: false, reason: "wrong-entity" };
  }
  state.boss.defeated = true;
  state.addresses = Number(state.addresses || 0) + 150;
  state.meta.firstClearComplete = true;
  pushLog(state, arbiterLines.defeated);
  return { ok: true, defeated: true };
}
function pushLog(state, line2) {
  state.log = [...state.log || [], line2].slice(-8);
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
    ["ColorSpace", "sRGB"],
    ["Software", "Boot Vision 1.0"]
  ],
  F: [
    ["DateTimeOriginal", "Boot cycle 0047"],
    ["GPSInfo", "52.3N, 4.8E / outside known layers"],
    // Decoy row (UX audit #7): ColorSpace ALSO differs from A, but it is a benign re-encode artefact —
    // so the dup test now needs a real comparison (which divergence is TAMPERING vs routine).
    ["ColorSpace", "Display-P3"],
    ["Software", "Boot Vision 1.0"]
  ]
};
var DUP_FIELDS = {
  GPSInfo: { tamper: true },
  ColorSpace: {
    benignDiff: true,
    note: "ColorSpace differs (sRGB vs Display-P3) — a routine re-encode artefact, not tampering. Look again."
  }
};
var entityFields = {
  B: [
    { id: "credential_class", label: "Role", value: "TIER-1-PROXY" },
    {
      id: "route_active_since",
      label: "Last Seen Active",
      value: "cycle 0043",
      wrong: true,
      reason: "Route ENTITY_ANCHOR_0043 was decommissioned at cycle 0043."
    },
    { id: "software", label: "Software", value: "Boot Vision 1.0" }
  ],
  C: [
    {
      id: "response_timing",
      label: "How They Answer",
      value: "scripted: 0ms variance",
      wrong: true,
      reason: "All entities exhibit non-zero timing variance in this system."
    },
    { id: "credential_class", label: "Role", value: "TIER-1-PROXY" },
    { id: "layer_tag", label: "Clearance Level", value: "LAYER-0" }
  ],
  D: [
    { id: "credential_class", label: "Role", value: "TIER-1-PROXY" },
    { id: "software", label: "Software", value: "Boot Vision 1.0" },
    {
      id: "log_event",
      label: "What Happened",
      value: "LAYER_MERGE",
      wrong: true,
      reason: "LAYER_MERGE is not a valid event type in this system."
    }
  ],
  E: [
    {
      id: "route_status",
      label: "Current Whereabouts",
      value: "active since cycle 0044",
      wrong: true,
      reason: "Route inactive since cycle 0043; activity after 0043 is impossible."
    },
    { id: "layer_tag", label: "Clearance Level", value: "LAYER-0" },
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
var AMBIENT_TRIGGERS = [
  ["E"],
  // "Current cycle: 0047"           — E's post-0043 route status
  ["D"],
  // "Valid event types…"            — D's invalid LAYER_MERGE event
  ["C"],
  // "…non-zero timing variance"     — C's scripted 0ms timing
  ["B", "E"]
  // "ENTITY_ANCHOR_0043 decommissioned" — B's route-active + E's route-status claims
];
var entityFEventLog = [
  { cycle: "0039", event: "BOOT", id: "ev1" },
  { cycle: "0040", event: "SYNC", id: "ev2" },
  // Decoy (UX audit #7): a SECOND event at cycle 0040 LOOKS like a duplicate-cycle anomaly, but two
  // events sharing a cycle is routine — the only IMPOSSIBLE entry is a contradictory ACTIVE/DORMANT.
  { cycle: "0040", event: "PING", id: "ev2b" },
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
      { id: "tier", label: "Standing", value: "TIER-2" },
      { id: "layer", label: "Clearance Level", value: "LAYER-1" },
      { id: "route", label: "Assignment", value: "R-0102 (active)" }
    ],
    H: [
      // Red herring: TIER-3-LEGACY LOOKS anomalous but system_spec confirms -LEGACY is a valid tier-3.
      { id: "tier", label: "Standing", value: "TIER-3-LEGACY" },
      { id: "layer", label: "Clearance Level", value: "LAYER-0" },
      { id: "route", label: "Assignment", value: "R-0110 (active)" }
    ],
    J: [
      { id: "tier", label: "Standing", value: "TIER-1" },
      { id: "layer", label: "Clearance Level", value: "LAYER-2" },
      { id: "route", label: "Assignment", value: "R-0118 (active)" }
    ],
    K: [
      { id: "tier", label: "Standing", value: "TIER-2" },
      { id: "layer", label: "Clearance Level", value: "LAYER-1" },
      // The decisive lie: claims an ACTIVE route the route table proves was closed at cycle 0044.
      { id: "route", label: "Assignment", value: "R-0091 (active)", suspect: true }
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
      stamp: "system_spec.json",
      about: ["H"],
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
      stamp: "route_table.csv",
      about: ["K"],
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
      stamp: "access_log.csv",
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
      stamp: "comms_transcript.txt",
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
      { id: "tier", label: "Standing", value: "TIER-1" },
      { id: "layer", label: "Clearance Level", value: "LAYER-0" },
      { id: "session", label: "Check-in", value: "S-7702 (active)" }
    ],
    M: [
      { id: "tier", label: "Standing", value: "TIER-2" },
      { id: "layer", label: "Clearance Level", value: "LAYER-1" },
      { id: "session", label: "Check-in", value: "S-7715 (active)" }
    ],
    N: [
      { id: "tier", label: "Standing", value: "TIER-2" },
      { id: "layer", label: "Clearance Level", value: "LAYER-1" },
      // The decisive lie: claims an ACTIVE session the ledger proves was REVOKED at cycle 0045.
      { id: "session", label: "Check-in", value: "S-7741 (active)", suspect: true }
    ],
    P: [
      { id: "tier", label: "Standing", value: "TIER-1" },
      // Red herring #1: LAYER-3 LOOKS out-of-spec, but audit_trail.txt records a sanctioned elevation.
      { id: "layer", label: "Clearance Level", value: "LAYER-3" },
      { id: "session", label: "Check-in", value: "S-7720 (active)" }
    ],
    Q: [
      // Red herring #2: TIER-0-ROOT LOOKS anomalous, but quorum_spec.json lists it as a valid tier.
      { id: "tier", label: "Standing", value: "TIER-0-ROOT" },
      { id: "layer", label: "Clearance Level", value: "LAYER-0" },
      { id: "session", label: "Check-in", value: "S-7708 (active)" }
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
      stamp: "quorum_spec.json",
      about: ["Q"],
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
      stamp: "audit_trail.txt",
      about: ["P"],
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
      stamp: "handshake_log.csv",
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
      stamp: "session_ledger.csv",
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
    stamp: "session_ledger.csv",
    about: ["N"],
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
  const info = DUP_FIELDS[fieldName];
  if (!info?.tamper) {
    pushLog2(state, info?.benignDiff ? info.note : "this field matches across both dossiers.");
    return { ok: false, reason: info?.benignDiff ? "benign-diff" : "match" };
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
  carryCase1Facts(state);
  advance(state, SUBSTAGE.ACCUSE);
  return { ok: true, complete: true };
}
function carryCase1Facts(state) {
  if (state.evidence.case1Carried) return;
  const facts = [
    { id: "case1:scan", label: "B/C/D/E each carried one contradicted credential — eliminated in the scan." },
    { id: "case1:dup", label: "Entity F's GPSInfo diverges from Entity A — a tampered dossier field." },
    { id: "case1:timeline", label: "Entity F's log holds an impossible ACTIVE/DORMANT collision at cycle 0043." },
    { id: "case1:chain", label: "Entity F's chain cites the decommissioned ENTITY_ANCHOR_0043 — chain invalid." }
  ];
  for (const f of facts) establishFact(state, f);
  state.evidence.case1Carried = true;
}
function advance(state, to) {
  if (Number(state.substage || 1) < to) state.substage = to;
}
function pushLog2(state, line2) {
  state.log = [...state.log || [], line2].slice(-8);
}

// ../../docs/games/metagame/stages/stage7/accusation.js
var ACCUSE_PENALTY2 = 10;
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
  const factCard2 = getCard(state, factId);
  if (!entityCard || !fieldCard || !factCard2) return { ok: false, reason: "missing-card", silent: true };
  if (!entityCard.pinned || !fieldCard.pinned || !factCard2.pinned) return { ok: false, reason: "unpinned", silent: true };
  const t = caseCfg.triad;
  const correct = entityId === t.entity && fieldId === t.fieldId && factId === t.factId;
  const attemptsKey = `case${caseCfg.id}Attempts`;
  const hintKey = `case${caseCfg.id}HintStep`;
  const ladder = HINT_LADDERS[caseCfg.id] || HINT_LADDERS[2];
  if (!correct) {
    state.evidence[attemptsKey] = Number(state.evidence[attemptsKey] || 0) + 1;
    state.evidence[hintKey] = Math.min(Number(state.evidence[hintKey] || 0) + 1, ladder.length - 1);
    state.addresses = Math.max(0, Number(state.addresses || 0) - ACCUSE_PENALTY2);
    pushLog3(state, "The triad does not hold. Re-examine the evidence.");
    return { ok: false, reason: "incorrect" };
  }
  setPinned(state, entityCard.id, true);
  drawLink(state, entityCard.id, fieldCard.id);
  drawLink(state, fieldCard.id, factCard2.id);
  establishFact(state, {
    id: `triad:${entityId}`,
    label: caseCfg.id === 3 ? `Entity ${entityId} is the duplicate — an active-session claim the ledger reports revoked.` : `Entity ${entityId} is the duplicate — an active-route claim the route table refutes.`,
    cards: [entityCard.id, fieldCard.id, factCard2.id]
  });
  state.evidence[`case${caseCfg.id}Solved`] = true;
  state.evidence.eliminated = [.../* @__PURE__ */ new Set([...state.evidence.eliminated || [], entityId])];
  state.addresses = Number(state.addresses || 0) + (ACCUSE_REWARD[caseCfg.id] || 40);
  pushLog3(state, caseCfg.id === 3 ? `Entity ${entityId}'s active-session claim is refuted by the ledger search. The ghost is named.` : `Entity ${entityId}'s active-route claim is refuted by the route table. The duplicate is named.`);
  if (Number(state.substage || 1) < caseCfg.nextSubstage) state.substage = caseCfg.nextSubstage;
  return { ok: true, solved: true };
}
function pushLog3(state, line2) {
  state.log = [...state.log || [], line2].slice(-8);
}

// ../../docs/games/metagame/stages/stage7/s7dev.js
var wrongField = (id) => (entityFields[id] || []).find((f) => f.wrong)?.id;
var impossibleEvId = entityFEventLog.find((e) => e.impossible)?.id;
function devSkipCase1(state) {
  for (const id of SCAN_ENTITIES) flagField({ state, entityId: id, fieldId: wrongField(id) });
  diffField({ state, fieldName: "GPSInfo" });
  markImpossible({ state, evId: impossibleEvId });
  markChainBroken({ state });
  ensureCase2(state);
}
function devMintCaseFacts(state) {
  ensureCase2(state);
  for (const src of CASE2_SOURCES) mintSourceFact(state, src.action);
  ensureCase3(state);
  for (const src of CASE3_SOURCES) mintSourceFact(state, src.action);
  mintSourceFact(state, CASE3_SEARCH.action);
}
function devSolveAccusation(state) {
  const ss = Number(state.substage || 1);
  if (ss === 5) {
    ensureCase2(state);
    mintSourceFact(state, "route_table_examined");
    setPinned(state, "entity:K", true);
    setPinned(state, "field:K:route", true);
    setPinned(state, "fact:route", true);
    attemptAccusationForCase(state, 2, { entityId: "K", fieldId: "route", factId: "fact:route" });
    ensureCase3(state);
  } else if (ss === 6) {
    ensureCase3(state);
    mintSourceFact(state, CASE3_SEARCH.action);
    setPinned(state, "entity:N", true);
    setPinned(state, "field:N:session", true);
    setPinned(state, "fact:session", true);
    attemptAccusationForCase(state, 3, { entityId: "N", fieldId: "session", factId: "fact:session" });
  }
}
function devMarkUncheat(state) {
  state.boss.unlocked = true;
  const set = new Set(state.evidence.contradicted || []);
  set.add("F");
  state.evidence.contradicted = [...set];
}
var devControls = [
  { id: "skip-case1", label: "Skip Case 1 (SS1–SS4)" },
  { id: "mint-case-facts", label: "Mint all case fact cards" },
  { id: "solve-accusation", label: "Solve current accusation" },
  { id: "mark-uncheat", label: "Mark EXIF un-cheat satisfied" }
];
function applyDev(state, id) {
  if (id === "skip-case1") devSkipCase1(state);
  else if (id === "mint-case-facts") devMintCaseFacts(state);
  else if (id === "solve-accusation") devSolveAccusation(state);
  else if (id === "mark-uncheat") devMarkUncheat(state);
}

// ../../docs/games/metagame/stages/stage7/board-derive.js
var SEARCH_FILE = CASE3_SEARCH.file;
var SEARCH_QUERY = CASE3_SEARCH.query;
function socketState(state, caseId = 2) {
  const pinned = pinnedCards(state).filter((c) => Number(c.caseId) === Number(caseId));
  const sock = (kind) => {
    const cards = pinned.filter((c) => c.kind === kind);
    return { kind, count: cards.length, filled: cards.length >= 1, conflicted: cards.length > 1, card: cards[0] || null };
  };
  const dossier = sock("entity");
  const claim = sock("field");
  const fact = sock("fact");
  const complete = dossier.count === 1 && claim.count === 1 && fact.count === 1;
  return { dossier, claim, fact, complete };
}
function accusedMonogram(state, caseId = 2) {
  const s = socketState(state, caseId);
  return s.complete ? s.dossier.card?.entity || null : null;
}
function searchLabelState(state) {
  const step = Math.max(0, Number(state?.evidence?.case3HintStep || 0));
  if (step >= 2) return { step, revealsToken: true, label: `search ${SEARCH_FILE} for "${SEARCH_QUERY}"` };
  if (step === 1) return { step, revealsToken: false, label: `search the SESSION column of ${SEARCH_FILE}` };
  return { step, revealsToken: false, label: `search ${SEARCH_FILE}` };
}
function partitionFacts(state, caseId = 2) {
  const eliminated = new Set(state?.evidence?.eliminated || []);
  const facts = cardsForCase(state, caseId).filter((c) => c.kind === "fact");
  const live = [];
  const archived = [];
  for (const f of facts) {
    const about = Array.isArray(f.about) ? f.about : [];
    (about.length && about.every((e) => eliminated.has(e)) ? archived : live).push(f);
  }
  return { live, archived };
}

// ../../docs/games/metagame/stages/stage7/board-cards.js
var ROT = [-2, 1.5, -1.5, 2, -1, 1];
function renderColumns(state, cid) {
  const grid = el("div", "s7-board-grid");
  grid.append(dossierCol(state, cid));
  grid.append(claimCol(state, cid));
  grid.append(factCol(state, cid));
  return grid;
}
function dossierCol(state, cid) {
  const col = el("section", "s7-board-col s7-col--dossier");
  col.innerHTML = `<h4>Dossiers</h4>`;
  const cards = cardsForCase(state, cid).filter((c) => c.kind === "entity");
  if (!cards.length) col.append(emptyNote("—"));
  cards.forEach((c, i) => col.append(dossierCard(c, i, state)));
  return col;
}
function claimCol(state, cid) {
  const col = el("section", "s7-board-col s7-col--claim");
  col.innerHTML = `<h4>Claims</h4>`;
  const cards = cardsForCase(state, cid).filter((c) => c.kind === "field");
  if (!cards.length) return col.append(emptyNote("—")), col;
  const groups = /* @__PURE__ */ new Map();
  for (const c of cards) {
    if (!groups.has(c.entity)) groups.set(c.entity, []);
    groups.get(c.entity).push(c);
  }
  let i = 0;
  for (const [entity, group] of groups) {
    const det = el("details", "s7-claim-group");
    det.open = true;
    const sum = document.createElement("summary");
    sum.className = "s7-claim-head";
    sum.textContent = `Entity ${entity}`;
    det.append(sum);
    for (const c of group) det.append(slipCard(c, i++));
    col.append(det);
  }
  return col;
}
function factCol(state, cid) {
  const col = el("section", "s7-board-col s7-col--fact");
  col.innerHTML = `<h4>Source facts</h4>`;
  const { live } = partitionFacts(state, cid);
  if (!live.length) {
    col.append(emptyNote("No facts yet — open / search the system files."));
    return col;
  }
  live.forEach((c, i) => col.append(factCard(c, i)));
  return col;
}
function dossierCard(card, i, state) {
  const b = pinButton(card, i, "s7-cardface--dossier");
  const eliminated = (state?.evidence?.eliminated || []).includes(card.entity);
  if (eliminated) b.classList.add("is-eliminated");
  b.innerHTML = `<span class="s7-mono" aria-hidden="true">${esc(card.entity)}</span><span class="s7-cardface-body"><strong>${esc(card.label)}</strong></span>`;
  b.append(pin());
  return b;
}
function slipCard(card, i) {
  const b = pinButton(card, i, "s7-cardface--claim");
  b.innerHTML = `<span class="s7-cardface-body">${esc(card.label)}</span>`;
  b.append(pin());
  return b;
}
function factCard(card, i) {
  const b = pinButton(card, i, "s7-cardface--fact");
  const stamp2 = card.stamp ? `<span class="s7-fact-stamp" aria-hidden="true">${esc(card.stamp)}</span>` : "";
  b.innerHTML = stamp2 + `<span class="s7-cardface-body">${esc(card.label)}</span>`;
  b.append(pin());
  return b;
}
function pinButton(card, i, faceClass) {
  const b = document.createElement("button");
  b.type = "button";
  b.setAttribute("data-pin", card.id);
  b.className = `s7-cardface ${faceClass}`;
  if (card.pinned) {
    b.classList.add("is-pinned");
    b.style.setProperty("--rot", `${ROT[i % ROT.length]}deg`);
  }
  return b;
}
function pin() {
  const s = document.createElement("span");
  s.className = "s7-pin";
  s.setAttribute("aria-hidden", "true");
  return s;
}
function renderSockets(state, cid) {
  const s = socketState(state, cid);
  const row = el("div", "s7-sockets");
  row.append(socketEl("DOSSIER", s.dossier, s.dossier.card?.entity || ""));
  row.append(socketEl("CLAIM", s.claim, s.claim.card ? claimShort(s.claim.card) : ""));
  row.append(socketEl("FACT", s.fact, s.fact.card?.stamp || (s.fact.card ? "fact" : "")));
  return row;
}
function socketEl(label, sock, fill) {
  const d = el("div", "s7-socket");
  if (sock.filled) d.classList.add("is-filled");
  if (sock.conflicted) d.classList.add("is-conflict");
  d.innerHTML = `<span class="s7-socket-label">${label}</span><span class="s7-socket-fill">${sock.filled ? esc(fill) : "○"}</span>`;
  return d;
}
function claimShort(card) {
  const m = String(card.label || "").split("·").pop();
  return (m || card.fieldId || "claim").trim();
}
function emptyNote(text) {
  const p = el("p", "s7-board-empty");
  p.textContent = text;
  return p;
}
function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}
function esc(value) {
  return String(value).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
}

// ../../docs/games/metagame/stages/stage7/board-render.js
var SOURCES_FOR_CASE = { 2: CASE2_SOURCES, 3: CASE3_SOURCES };
var ACCUSE_COST = 10;
var HEADERS = {
  2: "CASE 2 — DUPLICATE ROSTER. Open the system files, pin a triad, name the duplicate.",
  3: "CASE 3 — QUORUM GHOST. Two anomalies are decoys (different files clear them). SEARCH the ledger to expose the real lie."
};
function renderAccusation(state, caseId = 2) {
  const cid = Number(caseId);
  const wrap = el2("div", "s7-board");
  const header = el2("p", "s7-board-header");
  header.textContent = HEADERS[cid] || HEADERS[2];
  wrap.append(header);
  const hint = el2("p", "s7-hint");
  hint.textContent = caseHint(state, cid);
  wrap.append(hint);
  wrap.append(renderSources(state, cid));
  const surface = el2("div", "s7-board-surface");
  surface.append(renderColumns(state, cid));
  surface.append(renderPlate(state, cid));
  wrap.append(surface);
  const casefile = renderCaseFile(state, cid);
  if (casefile) wrap.append(casefile);
  return wrap;
}
function renderSources(state, cid) {
  const sources = el2("div", "s7-sources");
  for (const s of SOURCES_FOR_CASE[cid] || []) {
    const b = button({ "data-action": "open-source", "data-source": s.action });
    const opened = cardsForCase(state, cid).some((c) => c.id === s.card.id);
    b.textContent = `${opened ? "[done] " : "open "}${s.file}`;
    if (opened) b.classList.add("is-opened");
    sources.append(b);
  }
  if (cid === 3) {
    const searched = cardsForCase(state, 3).some((c) => c.id === CASE3_SEARCH.card.id);
    const label = searchLabelState(state).label;
    const sb = button({ "data-action": "search-source", "data-source": CASE3_SEARCH.action });
    sb.classList.add("s7-search-btn");
    sb.textContent = `${searched ? "[done] " : "[search] "}${label}`;
    if (searched) sb.classList.add("is-opened");
    sources.append(sb);
  }
  return sources;
}
function renderPlate(state, cid) {
  const plate = el2("div", "s7-accuse-plate");
  plate.append(renderSockets(state, cid));
  const triad = pinnedTriad(state, cid);
  const mono = accusedMonogram(state, cid);
  const row = el2("div", "s7-accuse-row");
  const accuse = button({ "data-accuse": String(cid) });
  accuse.className = "s7-accuse-btn" + (triad ? " is-armed" : "");
  accuse.disabled = !triad;
  accuse.innerHTML = triad ? `NAME THE DUPLICATE — <strong>${esc2(mono)}</strong> <small>&middot; costs ${ACCUSE_COST} if wrong</small>` : "Pin one dossier, one claim, one fact";
  row.append(accuse);
  plate.append(row);
  const strip = el2("div", "s7-status-strip");
  const last = (state.log || [])[(state.log || []).length - 1] || "";
  strip.textContent = last;
  plate.append(strip);
  return plate;
}
function renderCaseFile(state, cid) {
  const carried = (state.board?.established || []).filter((f) => f.id.startsWith("case1:"));
  const established = (state.board?.established || []).filter((f) => f.id.startsWith("triad:"));
  const { archived } = partitionFacts(state, cid);
  const count = carried.length + established.length + archived.length;
  if (!count) return null;
  const det = el2("details", "s7-casefile");
  const sum = document.createElement("summary");
  sum.textContent = `Case file — ${count} settled`;
  det.append(sum);
  const body = el2("div", "s7-casefile-body");
  for (const f of established) body.append(fileLine(f.label, "is-established"));
  for (const f of carried) body.append(fileLine(f.label));
  for (const f of archived) body.append(fileLine(f.label, "is-archived"));
  det.append(body);
  return det;
}
function fileLine(text, cls) {
  const p = el2("p", "s7-casefile-line" + (cls ? " " + cls : ""));
  p.textContent = text;
  return p;
}
function button(dataset) {
  const b = document.createElement("button");
  b.type = "button";
  for (const [k, v] of Object.entries(dataset)) b.setAttribute(k, v);
  return b;
}
function el2(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}
function esc2(value) {
  return String(value).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
}

// ../../docs/games/metagame/stages/stage7/substage-views.js
function revealedAmbient(state) {
  const flags = state?.evidence?.flags || {};
  const scanComplete = SCAN_ENTITIES.every((e) => flags[e]);
  const set = /* @__PURE__ */ new Set();
  AMBIENT_TRIGGERS.forEach((triggers, i) => {
    if (scanComplete || triggers.some((e) => flags[e])) set.add(i);
  });
  return set;
}
function renderScan(state) {
  const wrap = el3("div", "s7-ss1");
  const facts = el3("aside", "s7-ambient-facts");
  const revealed = revealedAmbient(state);
  const items = ambientFacts.map((f, i) => revealed.has(i) ? `<li class="is-revealed">${esc3(f)}</li>` : "").join("");
  facts.innerHTML = `<h3>Ambient facts</h3>` + (items ? `<ul>${items}</ul>` : `<p class="s7-ambient-empty">Facts surface as you flag contradictions.</p>`);
  const cards = el3("div", "s7-cards");
  for (const id of SCAN_ENTITIES) {
    const card = el3("article", "s7-card");
    if (state.evidence.flags[id]) card.classList.add("is-flagged");
    card.innerHTML = `<strong>Entity ${esc3(id)}</strong>`;
    for (const f of entityFields[id]) {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.entity = id;
      b.dataset.flag = f.id;
      b.disabled = Boolean(state.evidence.flags[id]);
      b.innerHTML = `<span>${esc3(f.label)}</span><em>${esc3(f.value)}</em>`;
      card.append(b);
    }
    cards.append(card);
  }
  wrap.append(facts, cards);
  return wrap;
}
function renderDup(state) {
  const wrap = el3("div", "s7-ss2");
  const panel = el3("div", "s7-duptest-panel");
  const colA = el3("div", "s7-duptest-col");
  colA.innerHTML = `<h3>Entity A</h3>${metadataRows.A.map(([f, v]) => `<div class="s7-row"><span>${esc3(f)}</span><em>${esc3(v)}</em></div>`).join("")}`;
  const colF = el3("div", "s7-duptest-col");
  colF.innerHTML = `<h3>Entity F</h3>`;
  for (const [f, v] of metadataRows.F) {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.diff = f;
    b.innerHTML = `<span>${esc3(f)}</span><em>${esc3(v)}</em>`;
    colF.append(b);
  }
  panel.append(colA, colF);
  const note = el3("p", "s7-duptest-hint");
  note.textContent = "DIFF DOSSIERS — two fields differ, but only one is tampering. Identify it on Entity F.";
  wrap.append(panel, note);
  return wrap;
}
function renderTimeline() {
  const wrap = el3("div", "s7-ss3");
  wrap.innerHTML = `<p class="s7-audit-header">TIMELINE AUDIT — Entity F activity log. One entry is logically impossible; the rest are plausible. Mark it.</p>`;
  const list = el3("ol", "s7-timeline");
  for (const ev of entityFEventLog) {
    const li = document.createElement("li");
    li.innerHTML = `<span>cycle ${esc3(ev.cycle)}</span><span>${esc3(ev.event)}</span>`;
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
  const wrap = el3("div", "s7-ss4");
  wrap.innerHTML = `
    <article class="s7-dossier-chain">
      <h3>Entity F — Credential Chain</h3>
      <p>Route active via: <strong>ENTITY_ANCHOR_0043</strong></p>
      <p>Chain reference:
        <button type="button" data-action="open-anchor">CREDENTIAL_CHAIN &rarr; ENTITY_ANCHOR_0043 [open exhibit]</button>
      </p>
    </article>
    <p class="s7-chase-hint">Follow the citation. Open the referenced anchor record in the viewer.</p>`;
  return wrap;
}
function renderBoss(state, lock) {
  const wrap = el3("div", "s7-ss5");
  const header = el3("header", "s7-boss-header");
  header.textContent = "IDENTITY REQUIRES PRIMARY SOURCE VERIFICATION";
  wrap.append(header);
  const intro = el3("p");
  intro.textContent = "Entity F presents a verification image. Inspect its embedded metadata.";
  wrap.append(intro);
  const controls = el3("div", "s7-controls");
  controls.innerHTML = `<button type="button" data-action="photo">open Entity F photo</button>`;
  wrap.append(controls);
  if (lock.unlocked) {
    const verdict = el3("div", "s7-verdict");
    verdict.innerHTML = `<p>Entity F's image GPS is outside every known entity layer. F is eliminated.</p>
      <p>Commit to the real credential holder.</p>`;
    const row = el3("div", "s7-commit-row");
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
    const waiting = el3("p", "s7-hint");
    waiting.textContent = lock.hint;
    wrap.append(waiting);
  }
  return wrap;
}
function el3(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}
function esc3(value) {
  return String(value).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
}

// ../../docs/games/metagame/stages/stage7/board-strings.js
var SVG = "http://www.w3.org/2000/svg";
function paintBoardStrings(surface, state, caseId = 2, opts = {}) {
  if (!surface || typeof surface.getBoundingClientRect !== "function") return;
  surface.querySelector(":scope > svg.s7-strings")?.remove();
  const rect = surface.getBoundingClientRect();
  if (!rect.width) return;
  const plate = surface.querySelector(".s7-sockets") || surface.querySelector(".s7-accuse-plate");
  if (!plate) return;
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("class", "s7-strings");
  svg.setAttribute("aria-hidden", "true");
  const w = surface.scrollWidth;
  const h = surface.scrollHeight;
  svg.setAttribute("width", String(w));
  svg.setAttribute("height", String(h));
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  const pt = (el4, anchor) => {
    const b = el4.getBoundingClientRect();
    const x = b.left - rect.left + surface.scrollLeft + b.width / 2;
    const yMid = b.top - rect.top + surface.scrollTop + b.height / 2;
    const yTop = b.top - rect.top + surface.scrollTop + Math.min(22, b.height / 2);
    return { x, y: anchor === "top" ? yTop : yMid };
  };
  const target = pt(plate, "top");
  const frag = document.createDocumentFragment();
  const wrong = opts.verdict === "wrong";
  for (const btn of surface.querySelectorAll("[data-pin].is-pinned")) {
    const a = pt(btn, "mid");
    frag.appendChild(line(a.x, a.y, target.x, target.y, "s7-string" + (wrong ? " is-wrong" : "")));
  }
  for (const link of state?.board?.links || []) {
    if (!link.established) continue;
    const from = surface.querySelector(`[data-pin="${cssEsc(link.from)}"]`);
    const to = surface.querySelector(`[data-pin="${cssEsc(link.to)}"]`);
    if (!from || !to) continue;
    const a = pt(from, "mid");
    const b = pt(to, "mid");
    frag.appendChild(line(a.x, a.y, b.x, b.y, "s7-string is-established"));
  }
  svg.appendChild(frag);
  surface.insertBefore(svg, surface.firstChild);
}
function line(x1, y1, x2, y2, cls) {
  const l = document.createElementNS(SVG, "line");
  l.setAttribute("x1", String(x1));
  l.setAttribute("y1", String(y1));
  l.setAttribute("x2", String(x2));
  l.setAttribute("y2", String(y2));
  l.setAttribute("class", cls);
  return l;
}
function cssEsc(value) {
  return String(value).replace(/["\\]/g, "\\$&");
}

// ../../docs/games/metagame/stages/stage7/board-feedback.js
import { shake, floatNum, banner } from "../../shared/feedback.js";
var STAMP_MS = 1500;
function fireVerdict(main, state, { cid, correct, caseName, reward = 0 }) {
  if (!main) return;
  const surface = main.querySelector(".s7-board-surface");
  const plate = main.querySelector(".s7-accuse-plate") || surface || main;
  if (correct) {
    stamp(plate, "ESTABLISHED", "good");
    if (reward) floatNum(plate, `+${reward} addresses`, "good");
    banner(surface || main, `CASE CLOSED — ${caseName}`);
  } else {
    shake(surface || main);
    stamp(plate, "DOES NOT HOLD", "bad");
    floatNum(plate, "-10 addresses", "bad");
    if (surface) paintBoardStrings(surface, state, cid, { verdict: "wrong" });
  }
}
function stamp(host, text, kind) {
  if (!host || typeof document === "undefined") return;
  const el4 = document.createElement("div");
  el4.className = `s7-stamp s7-stamp--${kind}`;
  el4.textContent = text;
  host.appendChild(el4);
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    el4.removeEventListener("animationend", finish);
    el4.remove();
  };
  const timer = setTimeout(finish, STAMP_MS);
  el4.addEventListener("animationend", finish);
}

// ../../docs/games/metagame/stages/stage7/renderer.js
import { banner as banner2 } from "../../shared/feedback.js";

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
var ARRIVAL = {
  1: "CREDENTIAL SCAN",
  2: "DUPLICATE TEST",
  3: "TIMELINE AUDIT",
  4: "REFERENCE CHASE",
  5: "CASE 2 — DUPLICATE ROSTER",
  6: "CASE 3 — QUORUM GHOST",
  7: "EXIF ARBITER"
};
var BOARD_SUBSTAGES = /* @__PURE__ */ new Set([SUBSTAGE.ACCUSE, SUBSTAGE.ACCUSE3]);
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
    <details class="s7-log-wrap"><summary>judgment log</summary>
      <ol class="s7-log" aria-label="judgment log"></ol>
    </details>
    <div class="s7-controls">
      <button type="button" data-action="bts" hidden>open trace.bts</button>
    </div>
  `;
  host.replaceChildren(root);
  const fields = Object.fromEntries([...root.querySelectorAll("[data-field]")].map((el4) => [el4.dataset.field, el4]));
  const main = root.querySelector(".s7-main");
  const log = root.querySelector(".s7-log");
  const completeOnce = once((result) => {
    if (typeof onStageComplete === "function") onStageComplete(result);
  });
  let lastSubstage = state.substage;
  let verdictInFlight = false;
  root.addEventListener("click", (event) => {
    const button2 = event.target.closest("button[data-action], button[data-flag], button[data-diff], button[data-ev], button[data-commit], button[data-pin], button[data-accuse]");
    if (!button2) return;
    const d = button2.dataset;
    let verdict = null;
    if (d.flag) flagField({ state, entityId: d.entity, fieldId: d.flag });
    else if (d.diff) diffField({ state, fieldName: d.diff });
    else if (d.ev) markImpossible({ state, evId: d.ev });
    else if (d.pin) togglePin(state, d.pin);
    else if (d.accuse) verdict = doAccuse(Number(d.accuse));
    else if (d.commit) commitBoss(d.commit);
    else if (d.action === "open-source") openSource(d.source);
    else if (d.action === "search-source") searchSource();
    else if (d.action === "open-anchor") openInViewer(ENTITY_ANCHOR_PATH, { mime: "text/plain", source: "stage7" });
    else if (d.action === "photo") openInViewer(ENTITY_F_IMAGE_PATH, buildEntityFPhotoOpenOptions());
    else if (d.action === "bts") openBts({ bts, viewer });
    verdictInFlight = Boolean(verdict);
    persistAndPaint();
    verdictInFlight = false;
    if (verdict) fireVerdict(main, state, verdict);
  });
  repaint();
  installStage7Hook({ state, persistAndPaint });
  function dev(id) {
    applyDev(state, id);
    if (typeof save === "function") save();
    repaint();
  }
  return {
    repaint,
    dev,
    destroy() {
      removeStage7Hook();
      root.remove();
    }
  };
  function doAccuse(cid) {
    const result = accuseFromBoard(state, cid);
    if (result.silent) return null;
    const cfg = CASES[cid] || {};
    return { cid, correct: result.solved === true, caseName: cfg.name || `CASE ${cid}`, reward: rewardFor(cid, result) };
  }
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
    if (state.substage !== lastSubstage) {
      if (!verdictInFlight && ARRIVAL[state.substage]) banner2(main, ARRIVAL[state.substage]);
      lastSubstage = state.substage;
    }
    root.querySelector('[data-action="bts"]').hidden = !state.boss.defeated;
    log.replaceChildren(...state.log.slice(-6).map((line2) => {
      const li = document.createElement("li");
      li.textContent = line2;
      return li;
    }));
  }
  function renderMain(lock) {
    if (state.substage === SUBSTAGE.SCAN) return main.replaceChildren(renderScan(state));
    if (state.substage === SUBSTAGE.DUP) return main.replaceChildren(renderDup(state));
    if (state.substage === SUBSTAGE.TIMELINE) return main.replaceChildren(renderTimeline());
    if (state.substage === SUBSTAGE.CHAIN) return main.replaceChildren(renderChain());
    if (state.substage === SUBSTAGE.ACCUSE) {
      ensureCase2(state);
      main.replaceChildren(renderAccusation(state, 2));
      return paintStrings(2);
    }
    if (state.substage === SUBSTAGE.ACCUSE3) {
      ensureCase3(state);
      main.replaceChildren(renderAccusation(state, 3));
      return paintStrings(3);
    }
    return main.replaceChildren(renderBoss(state, lock));
  }
  function paintStrings(cid) {
    if (!BOARD_SUBSTAGES.has(state.substage)) return;
    paintBoardStrings(main.querySelector(".s7-board-surface"), state, cid, {});
  }
  function openSource(action) {
    const path = SOURCE_PATHS[action];
    if (path) openInViewer(path, { source: "stage7" });
  }
  function searchSource() {
    const { revealsToken } = searchLabelState(state);
    if (revealsToken && viewer && typeof viewer.searchViewerFile === "function") {
      viewer.searchViewerFile(CASE3_SEARCH_PATH, CASE3_SEARCH_QUERY, { source: "stage7" });
    } else if (revealsToken && viewer && typeof viewer.searchFile === "function") {
      viewer.searchFile(CASE3_SEARCH_PATH, CASE3_SEARCH_QUERY, { source: "stage7" });
    } else {
      openInViewer(CASE3_SEARCH_PATH, { source: "stage7" });
    }
  }
  function persistAndPaint() {
    if (typeof save === "function") save();
    repaint();
  }
}
var ACCUSE_REWARD2 = { 2: 40, 3: 60 };
function rewardFor(cid, result) {
  return result.solved ? ACCUSE_REWARD2[cid] || 40 : 0;
}
function buildEntityFPhotoOpenOptions() {
  return { mime: "image/jpeg", source: "stage7", entity: "F" };
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
  requiredAction: REQUIRED_ACTION,
  // Dev-menu controls for this stage (wired in metagame.js → mounted.dev(id)).
  devControls
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
    devControls: stageMeta.devControls,
    dev(id) {
      if (view && typeof view.dev === "function") view.dev(id);
    },
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
  injectSheet("stage7-identity-arbiter-styles", "./styles.css");
  injectSheet("stage7-identity-arbiter-board-styles", "./styles-board.css");
}
function injectSheet(id, rel) {
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = new URL(rel, import.meta.url).href;
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
