// Reskin note (2026-07-11 playtest fix, gate-by-gate assessment): the evidence/triad/pin/accuse LAYER
// itself is generic and was reskinned into plain human-detective vocabulary this pass (see the
// substageHints/lockedHintLadder/arbiterLines rewrite in messages.js, and the field `label` rewrite
// below — "Credential Class" → "Role", "Layer Tag" → "Clearance Level", etc.). The GATED real-app-
// feature actions are a separate, deliberately-DEFERRED question — going gate by gate:
//   - SS2 (dossier diff) and Case 3 (CSV search) already map naturally onto "compare two witness
//     statements" / "search a sign-in ledger for a name" — no computer-forensics framing forced.
//   - SS4 / Case 2 (open a referenced/source file) reads fine as "open the file this record points
//     to" / "pull the case file" — a detective opening a folder, not a technical action.
//   - The boss gate (read EXIF GPSInfo from an image) is the one genuinely hard to fully disguise —
//     "a photo remembers where it was taken" is the reskinned FRAMING used here, but the underlying
//     action is still, mechanically, an EXIF metadata read. Swapping it for a literally different real
//     app feature (e.g. a different action entirely) would be a real content redesign — bigger than a
//     vocabulary pass, not attempted here. Flagged for a future pass if the boss gate specifically
//     still reads as "computer" rather than "detective" after this reskin.
export const candidates = [
  { id: "A", claim: "consistent EXIF, consistent credentials", status: "real" },
  { id: "B", claim: "photo software exposes editing", status: "impostor" },
  { id: "C", claim: "response timing is scripted", status: "impostor" },
  { id: "D", claim: "activity log names an impossible event", status: "impostor" },
  { id: "E", claim: "route is inactive since cycle 0043", status: "impostor" },
  { id: "F", claim: "documents are clean; GPSInfo is outside any known layer", status: "impostor" }
];

export const metadataRows = {
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

// SS2 field classification for diffField: only GPSInfo is the decisive tamper; ColorSpace is a benign
// difference decoy; every other row matches across A and F.
export const DUP_FIELDS = {
  GPSInfo: { tamper: true },
  ColorSpace: { benignDiff: true,
    note: "ColorSpace differs (sRGB vs Display-P3) — a routine re-encode artefact, not tampering. Look again." }
};

// ── Sub-stage 1 (Credential Scan): each impostor entity has exactly one field that contradicts an
// ambient system fact. The player must flag the wrong field on B, C, D and E. ───────────────────────
export const CURRENT_CYCLE = "0047";

export const entityFields = {
  B: [
    { id: "credential_class", label: "Role", value: "TIER-1-PROXY" },
    { id: "route_active_since", label: "Last Seen Active", value: "cycle 0043", wrong: true,
      reason: "Route ENTITY_ANCHOR_0043 was decommissioned at cycle 0043." },
    { id: "software", label: "Software", value: "Boot Vision 1.0" }
  ],
  C: [
    { id: "response_timing", label: "How They Answer", value: "scripted: 0ms variance", wrong: true,
      reason: "All entities exhibit non-zero timing variance in this system." },
    { id: "credential_class", label: "Role", value: "TIER-1-PROXY" },
    { id: "layer_tag", label: "Clearance Level", value: "LAYER-0" }
  ],
  D: [
    { id: "credential_class", label: "Role", value: "TIER-1-PROXY" },
    { id: "software", label: "Software", value: "Boot Vision 1.0" },
    { id: "log_event", label: "What Happened", value: "LAYER_MERGE", wrong: true,
      reason: "LAYER_MERGE is not a valid event type in this system." }
  ],
  E: [
    { id: "route_status", label: "Current Whereabouts", value: "active since cycle 0044", wrong: true,
      reason: "Route inactive since cycle 0043; activity after 0043 is impossible." },
    { id: "layer_tag", label: "Clearance Level", value: "LAYER-0" },
    { id: "software", label: "Software", value: "Boot Vision 1.0" }
  ]
};

export const SCAN_ENTITIES = ["B", "C", "D", "E"];

export const ambientFacts = [
  "Current cycle: 0047",
  "Valid event types: BOOT, SHUTDOWN, SYNC, PING, WATCHDOG",
  "All entities exhibit non-zero timing variance",
  "ENTITY_ANCHOR_0043 decommissioned at cycle 0043"
];

// M2 — ambient facts arrive AS USED: each fact is revealed the first time a field it supports is
// flagged (its trigger entities), and all are revealed once the scan completes. Parallel to ambientFacts.
export const AMBIENT_TRIGGERS = [
  ["E"],      // "Current cycle: 0047"           — E's post-0043 route status
  ["D"],      // "Valid event types…"            — D's invalid LAYER_MERGE event
  ["C"],      // "…non-zero timing variance"     — C's scripted 0ms timing
  ["B", "E"]  // "ENTITY_ANCHOR_0043 decommissioned" — B's route-active + E's route-status claims
];

// ── Sub-stage 3 (Timeline Audit): Entity F's activity log holds one logically impossible entry. ─────
export const entityFEventLog = [
  { cycle: "0039", event: "BOOT", id: "ev1" },
  { cycle: "0040", event: "SYNC", id: "ev2" },
  // Decoy (UX audit #7): a SECOND event at cycle 0040 LOOKS like a duplicate-cycle anomaly, but two
  // events sharing a cycle is routine — the only IMPOSSIBLE entry is a contradictory ACTIVE/DORMANT.
  { cycle: "0040", event: "PING", id: "ev2b" },
  { cycle: "0041", event: "PING", id: "ev3" },
  { cycle: "0042", event: "WATCHDOG", id: "ev4" },
  { cycle: "0043", event: "ACTIVE", id: "ev5" },
  { cycle: "0043", event: "DORMANT", id: "ev6", impossible: true,
    reason: "Simultaneous ACTIVE/DORMANT states at cycle 0043 — a logical impossibility." },
  { cycle: "0044", event: "SYNC", id: "ev7" },
  { cycle: "0045", event: "PING", id: "ev8" },
  { cycle: "0046", event: "WATCHDOG", id: "ev9" },
  { cycle: "0047", event: "BOOT", id: "ev10" }
];

// ── Case 2 (Duplicate Roster): a SECOND name-collision, gated AFTER Entity F's chain breaks and
// BEFORE the EXIF boss. A fresh roster (G/H/J/K) claims CORE_ENTITY_001. One is the impostor; one is
// a RED HERRING whose anomaly is exonerated by a source fact. The decisive fact is only learnable by
// OPENING a real same-origin file in the viewer (route_table.csv), so the rule-of-three triad cannot
// be completed without a genuine file-open. ────────────────────────────────────────────────────────
export const CASE2 = {
  id: 2,
  name: "DUPLICATE ROSTER",
  nextSubstage: 6, // correct accusation → Case 3 (the Quorum Ghost), then the boss
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

// Source files the player OPENS in the real viewer; each open mints one fact card on the board. Only
// fact:route is load-bearing for the correct triad — the others are present so the player must reason
// WHICH fact actually refutes a claim (fact:spec exonerates the red herring, so accusing H is silent).
export const CASE2_SOURCES = [
  { action: "spec_examined", file: "system_spec.json",
    card: { id: "fact:spec", kind: "fact", caseId: 2, stamp: "system_spec.json", about: ["H"],
      label: "Spec: valid tiers TIER-1..3 (incl. -LEGACY); layers {0,1,2}; one active route/entity." } },
  { action: "route_table_examined", file: "route_table.csv",
    card: { id: "fact:route", kind: "fact", caseId: 2, stamp: "route_table.csv", about: ["K"],
      label: "Route table: R-0091 = INACTIVE (closed cycle 0044)." } },
  { action: "access_log_examined", file: "access_log.csv",
    card: { id: "fact:activity", kind: "fact", caseId: 2, stamp: "access_log.csv",
      label: "Access log: G/H/J/K all last-seen cycle 0047." } },
  { action: "comms_examined", file: "comms_transcript.txt",
    card: { id: "fact:comms", kind: "fact", caseId: 2, stamp: "comms_transcript.txt",
      label: "Comms: the real holder answers the cycle-0047 challenge; the duplicate stalls." } }
];

// ── Case 3 (Quorum Ghost): CORE_ENTITY_002. A LARGER roster (L/M/N/P/Q) claims one name. One is the
// duplicate; TWO are red herrings whose anomalies are EXONERATED by DIFFERENT source files (so several
// real file-opens become load-bearing, not just one). The decisive deduction is gated behind a real
// SEARCH of a .csv in the viewer (find the revoked-session line), not a mere open. ───────────────────
export const CASE3 = {
  id: 3,
  name: "QUORUM GHOST",
  roster: ["L", "M", "N", "P", "Q"],
  impostor: "N",
  nextSubstage: 7, // correct accusation → the EXIF boss (substage 7)
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

// Case 3 OPEN-minted fact cards (open each file in the viewer). None of these completes the correct
// triad — fact:qspec and fact:audit EXONERATE the two red herrings, fact:handshake corroborates, and
// fact:ledgerhint just points the player at the SEARCH. The decisive fact is fact:session (search-only).
export const CASE3_SOURCES = [
  { action: "quorum_spec_examined", file: "quorum_spec.json",
    card: { id: "fact:qspec", kind: "fact", caseId: 3, stamp: "quorum_spec.json", about: ["Q"],
      label: "Spec: valid tiers TIER-0-ROOT..TIER-3; layers {0,1,2}; one active session/entity." } },
  { action: "audit_examined", file: "audit_trail.txt",
    card: { id: "fact:audit", kind: "fact", caseId: 3, stamp: "audit_trail.txt", about: ["P"],
      label: "Audit: P holds a SANCTIONED temporary LAYER-3 elevation (cycle 0046)." } },
  { action: "handshake_examined", file: "handshake_log.csv",
    card: { id: "fact:handshake", kind: "fact", caseId: 3, stamp: "handshake_log.csv",
      label: "Handshake log: L/M/N/P/Q all completed the cycle-0047 handshake." } },
  { action: "ledger_examined", file: "session_ledger.csv",
    card: { id: "fact:ledgerhint", kind: "fact", caseId: 3, stamp: "session_ledger.csv",
      label: "Ledger lists session tokens — SEARCH it for a claimed token to learn its true status." } }
];

// The Case 3 SEARCH un-cheat: the decisive fact card is minted ONLY by SEARCHING session_ledger.csv in
// the real viewer for the claimed token (the line proving S-7741 is REVOKED). Opening the file is NOT
// enough — the triad cannot complete without a genuine search.
export const CASE3_SEARCH = {
  action: "session_revoked_found",
  file: "session_ledger.csv",
  query: "S-7741",
  card: { id: "fact:session", kind: "fact", caseId: 3, stamp: "session_ledger.csv", about: ["N"],
    label: "Ledger search: token S-7741 = REVOKED (cycle 0045). N's 'active' claim is false." }
};

export const CASES = { 2: CASE2, 3: CASE3 };

export const metadataArtifact = {
  format: "stage7-image-metadata-sidecar",
  note: "The current app image metadata reader extracts EXIF from JPEG APP1 but not PNG text chunks. Stage 7 therefore uses real same-origin PNG fixtures plus this local sidecar for the authored EXIF-style evidence.",
  decisiveField: "GPSInfo",
  decisiveEntity: "F",
  entities: {
    A: Object.fromEntries(metadataRows.A),
    F: Object.fromEntries(metadataRows.F)
  }
};
