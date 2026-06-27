export const ACTION_NAME = "exif_contradiction_found";
export const REQUIRED_ACTION = "7.exif_contradiction_found";
export const ACHIEVEMENT_ID = "stage7.exif_contradiction_found";
export const ACHIEVEMENT_TEXT = "I looked beyond the surface of the image.";
export const BTS_PATH = "/docs/bts/identity_arbiter.bts";
export const ENTITY_A_IMAGE_PATH = "/docs/examples/metagame/stage7/entity_a_verification.png";
export const ENTITY_F_IMAGE_PATH = "/docs/examples/metagame/stage7/entity_f_verification.png";
export const ENTITY_METADATA_SIDECAR_PATH = "/docs/examples/metagame/stage7/entity_metadata.json";
export const ENTITY_ANCHOR_PATH = "/docs/examples/metagame/stage7/entity_anchor_0043.txt";
export const ANCHOR_ACTION = "anchor_chain_examined";

// Case 2 (Duplicate Roster) source files — opened in the real viewer to mint evidence-board facts.
export const CASE2_SOURCE_PATHS = {
  spec_examined: "/docs/examples/metagame/stage7/system_spec.json",
  route_table_examined: "/docs/examples/metagame/stage7/route_table.csv",
  access_log_examined: "/docs/examples/metagame/stage7/access_log.csv",
  comms_examined: "/docs/examples/metagame/stage7/comms_transcript.txt"
};
export const CASE2_SOURCE_ACTIONS = Object.keys(CASE2_SOURCE_PATHS);

// Case 3 (Quorum Ghost) source files — opened in the real viewer to mint evidence-board facts; the
// decisive fact is SEARCH-gated (session_ledger.csv), not open-gated.
export const CASE3_SOURCE_PATHS = {
  quorum_spec_examined: "/docs/examples/metagame/stage7/quorum_spec.json",
  audit_examined: "/docs/examples/metagame/stage7/audit_trail.txt",
  handshake_examined: "/docs/examples/metagame/stage7/handshake_log.csv",
  ledger_examined: "/docs/examples/metagame/stage7/session_ledger.csv"
};
export const CASE3_SOURCE_ACTIONS = Object.keys(CASE3_SOURCE_PATHS);

// The Case 3 search un-cheat: searching this file for this query in the real viewer mints fact:session.
export const CASE3_SEARCH_ACTION = "session_revoked_found";
export const CASE3_SEARCH_PATH = "/docs/examples/metagame/stage7/session_ledger.csv";
export const CASE3_SEARCH_QUERY = "S-7741";

export const substageHints = {
  1: "Six dossiers, one name. Scan B, C, D, E — flag the field that contradicts an ambient fact.",
  2: "A and F are tied on documents. Diff the two dossiers and find the tampered field.",
  3: "Audit Entity F's activity log. One entry is logically impossible.",
  4: "Follow F's credential chain. Open the referenced anchor record in the viewer.",
  5: "A second roster claims the name. Open the system files, pin the evidence, and name the duplicate with a triad (entity + claim + source fact).",
  6: "A THIRD roster (L/M/N/P/Q) claims CORE_ENTITY_002. Two anomalies are exonerated by different files; the duplicate's lie is only exposed by SEARCHING the session ledger.",
  7: "Open Entity F's photo, inspect its metadata, then commit to the real holder."
};

export const bellMessages = {
  start: "something presented itself. I had to decide.",
  unlock: "the image knew more than the image showed. the GPS was outside any layer.",
  wrongCommit: "incorrect. one of them was not what it appeared.",
  defeated: "I know which one. I chose. I was right."
};

export const lockedHintLadder = [
  "one of them looks exactly like the description. that does not mean it is real.",
  "the documents leave Entity A and Entity F tied.",
  "the photo shows something the document does not. the metadata holds the answer.",
  "open Entity F's image metadata and inspect GPSInfo, then commit to Entity A."
];

export const arbiterLines = {
  fContradicted: "Entity F contradicted: GPSInfo is outside every known entity layer.",
  stillChoose: "Entity F is eliminated. Judgment still requires selecting Entity A.",
  defeated: "The Name Collision resolves to Entity A."
};
