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
    ["Software", "Boot Vision 1.0"]
  ],
  F: [
    ["DateTimeOriginal", "Boot cycle 0047"],
    ["GPSInfo", "52.3N, 4.8E / outside known layers"],
    ["Software", "Boot Vision 1.0"]
  ]
};

// ── Sub-stage 1 (Credential Scan): each impostor entity has exactly one field that contradicts an
// ambient system fact. The player must flag the wrong field on B, C, D and E. ───────────────────────
export const CURRENT_CYCLE = "0047";

export const entityFields = {
  B: [
    { id: "credential_class", label: "Credential Class", value: "TIER-1-PROXY" },
    { id: "route_active_since", label: "Route Active Since", value: "cycle 0043", wrong: true,
      reason: "Route ENTITY_ANCHOR_0043 was decommissioned at cycle 0043." },
    { id: "software", label: "Software", value: "Boot Vision 1.0" }
  ],
  C: [
    { id: "response_timing", label: "Response Timing", value: "scripted: 0ms variance", wrong: true,
      reason: "All entities exhibit non-zero timing variance in this system." },
    { id: "credential_class", label: "Credential Class", value: "TIER-1-PROXY" },
    { id: "layer_tag", label: "Layer Tag", value: "LAYER-0" }
  ],
  D: [
    { id: "credential_class", label: "Credential Class", value: "TIER-1-PROXY" },
    { id: "software", label: "Software", value: "Boot Vision 1.0" },
    { id: "log_event", label: "Activity Log Event", value: "LAYER_MERGE", wrong: true,
      reason: "LAYER_MERGE is not a valid event type in this system." }
  ],
  E: [
    { id: "route_status", label: "Route Status", value: "active since cycle 0044", wrong: true,
      reason: "Route inactive since cycle 0043; activity after 0043 is impossible." },
    { id: "layer_tag", label: "Layer Tag", value: "LAYER-0" },
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

// ── Sub-stage 3 (Timeline Audit): Entity F's activity log holds one logically impossible entry. ─────
export const entityFEventLog = [
  { cycle: "0039", event: "BOOT", id: "ev1" },
  { cycle: "0040", event: "SYNC", id: "ev2" },
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

// Source files the player OPENS in the real viewer; each open mints one fact card on the board. Only
// fact:route is load-bearing for the correct triad — the others are present so the player must reason
// WHICH fact actually refutes a claim (fact:spec exonerates the red herring, so accusing H is silent).
export const CASE2_SOURCES = [
  { action: "spec_examined", file: "system_spec.json",
    card: { id: "fact:spec", kind: "fact", caseId: 2,
      label: "Spec: valid tiers TIER-1..3 (incl. -LEGACY); layers {0,1,2}; one active route/entity." } },
  { action: "route_table_examined", file: "route_table.csv",
    card: { id: "fact:route", kind: "fact", caseId: 2,
      label: "Route table: R-0091 = INACTIVE (closed cycle 0044)." } },
  { action: "access_log_examined", file: "access_log.csv",
    card: { id: "fact:activity", kind: "fact", caseId: 2,
      label: "Access log: G/H/J/K all last-seen cycle 0047." } },
  { action: "comms_examined", file: "comms_transcript.txt",
    card: { id: "fact:comms", kind: "fact", caseId: 2,
      label: "Comms: the real holder answers the cycle-0047 challenge; the duplicate stalls." } }
];

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
