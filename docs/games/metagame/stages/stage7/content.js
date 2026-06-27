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
