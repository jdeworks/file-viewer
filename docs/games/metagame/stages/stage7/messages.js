export const ACTION_NAME = "exif_contradiction_found";
export const REQUIRED_ACTION = "7.exif_contradiction_found";
export const ACHIEVEMENT_ID = "stage7.exif_contradiction_found";
export const ACHIEVEMENT_TEXT = "I looked beyond the surface of the image.";
export const BTS_PATH = "/docs/bts/identity_arbiter.bts";
export const ENTITY_A_IMAGE_PATH = "/docs/examples/metagame/stage7/entity_a_verification.png";
export const ENTITY_F_IMAGE_PATH = "/docs/examples/metagame/stage7/entity_f_verification.jpg";
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

// Playtest fix (2026-07-11): reworded the player-facing narration from computer-forensics jargon
// (EXIF, GPSInfo, "ambient fact", "credential chain") into plain human-detective language — witness
// statements, alibis, paper trails — since testers found the original wording hard to follow. This is
// vocabulary/flavor ONLY: field ids, file paths, and action names underneath are untouched, so the
// win-condition logic and existing tests referencing those technical strings still work unchanged.
export const substageHints = {
  1: "Six dossiers, one identity. Read B, C, D, E — flag the one detail that contradicts something you already know to be true.",
  2: "A and F match on paper. Compare the two dossiers side by side and find the one detail that's been altered.",
  3: "Check Entity F's movements. One entry in the log couldn't have happened.",
  4: "Follow F's paper trail. Open the record it points to.",
  5: "A second suspect claims the same identity. Open the case files, pin the evidence to the board, and name the impostor with three things: who, what they claimed, and the fact that disproves it.",
  6: "A THIRD group of suspects (L/M/N/P/Q) claims the same identity. Two odd details turn out to be innocent, cleared by different records — the impostor's lie is only exposed by SEARCHING the sign-in ledger.",
  7: "Open Entity F's photograph, then check where and when it was really taken — a photo remembers more than it shows. Then name the real one."
};

export const bellMessages = {
  start: "something presented itself. I had to decide.",
  unlock: "the photograph knew more than it showed. it had been somewhere it claimed it hadn't.",
  wrongCommit: "incorrect. one of them was not what it appeared.",
  defeated: "I know which one. I chose. I was right."
};

export const lockedHintLadder = [
  "one of them looks exactly like the description. that does not mean it is real.",
  "the paperwork leaves Entity A and Entity F tied.",
  "the photo shows something the paperwork doesn't. its hidden details hold the answer.",
  "open Entity F's photo details and check where it claims to be from, then commit to Entity A."
];

export const arbiterLines = {
  fContradicted: "Entity F contradicted: the photo's location doesn't match anywhere it claims to be.",
  stillChoose: "Entity F is eliminated. Judgment still requires selecting Entity A.",
  defeated: "The Name Collision resolves to Entity A."
};
