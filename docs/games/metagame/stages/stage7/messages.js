// messages.js — Stage 7 "The Meridian Estate Affair" player-facing copy + the engine constants that
// name the boss action, the achievement, and the case's real viewer files.
//
// The boss is no longer an image-metadata read. Its decisive evidence is an in-case DOCUMENT
// contradiction: the arbiter pins Miss Marchmain's alibi statement AND her postmarked torn letter to
// the evidence board and CONNECTS them. That connection fires 7.alibi_contradiction_pinned through the
// same action bus the stage uses to record actions. (The action id itself changed — it is player-facing
// as an achievement — so this constant is a deliberate rename from the old exif_contradiction_found;
// all other engine ids, incl. the source-open action names, are kept.)
export const ACTION_NAME = "alibi_contradiction_pinned";
export const REQUIRED_ACTION = "7.alibi_contradiction_pinned";
export const ACHIEVEMENT_ID = "stage7.alibi_contradiction_pinned";
export const ACHIEVEMENT_TEXT = "Two documents, one lie. The postmark broke the alibi.";
export const BTS_PATH = "/docs/bts/identity_arbiter.bts";

// The verdict's two documents, opened in the viewer to read them (pinning + connecting is the gate).
export const ALIBI_STATEMENT_PATH = "/docs/examples/metagame/stage7/alibi_statement.txt";
export const TORN_LETTER_PATH = "/docs/examples/metagame/stage7/torn_letter.txt";

// SS4 Paper Trail: Miss Marchmain's claim rests on a letter of appointment that was rescinded. Opening
// the referenced record in the viewer breaks her paper trail.
export const ENTITY_ANCHOR_PATH = "/docs/examples/metagame/stage7/rescinded_appointment.txt";
export const ANCHOR_ACTION = "anchor_chain_examined";

// Case 2 (The Second Claim) source files — opened in the real viewer to mint evidence-board facts. The
// filenames are human documents; the ACTION names are kept as internal engine ids (they key which fact
// card an open mints), so they are unchanged despite the re-themed filenames.
export const CASE2_SOURCE_PATHS = {
  spec_examined: "/docs/examples/metagame/stage7/estate_rules.txt",
  route_table_examined: "/docs/examples/metagame/stage7/household_register.csv",
  access_log_examined: "/docs/examples/metagame/stage7/visitors_book.csv",
  comms_examined: "/docs/examples/metagame/stage7/parlour_interview.txt"
};
export const CASE2_SOURCE_ACTIONS = Object.keys(CASE2_SOURCE_PATHS);

// Case 3 (The Distant Relations) source files — opened in the real viewer to mint evidence-board facts;
// the decisive fact is SEARCH-gated (estate_ledger.csv), not open-gated.
export const CASE3_SOURCE_PATHS = {
  quorum_spec_examined: "/docs/examples/metagame/stage7/inheritance_customs.txt",
  audit_examined: "/docs/examples/metagame/stage7/solicitor_memo.txt",
  handshake_examined: "/docs/examples/metagame/stage7/mourners_register.csv",
  ledger_examined: "/docs/examples/metagame/stage7/estate_ledger.csv"
};
export const CASE3_SOURCE_ACTIONS = Object.keys(CASE3_SOURCE_PATHS);

// The Case 3 search un-cheat: searching this file for this query in the real viewer mints fact:session.
export const CASE3_SEARCH_ACTION = "session_revoked_found";
export const CASE3_SEARCH_PATH = "/docs/examples/metagame/stage7/estate_ledger.csv";
export const CASE3_SEARCH_QUERY = "Voucher 214";

// Player-facing narration is plain human-detective language — witness statements, alibis, paper trails.
// Field ids, file-open action names and card ids underneath are internal, so the win-condition logic and
// existing tests referencing those still work unchanged.
export const substageHints = {
  1: "Six claim the estate; one is the heir. Read the rival statements (B, C, D, E) and flag the one line in each that contradicts something you already know to be true.",
  2: "Miss Vane and Miss Marchmain are tied on paper. Compare the two statements side by side and find the one detail that's been altered.",
  3: "Check Miss Marchmain's movements. One entry could not have happened.",
  4: "Follow Miss Marchmain's paper trail. Open the record her claim rests upon.",
  5: "A second set of claimants presses the estate. Open the records, pin the evidence, and name the impostor with three things: who, what they claimed, and the fact that disproves it.",
  6: "A wider circle of distant relations (L/M/N/P/Q) claims a share. Two odd details turn out innocent, cleared by different records — the impostor's lie is exposed only by SEARCHING the estate ledger.",
  7: "Open Miss Marchmain's alibi statement and her torn letter, pin both to the board, and CONNECT them — the postmark breaks the alibi. Then name the true heir."
};

export const bellMessages = {
  start: "the claimants were assembled. I had to decide.",
  unlock: "the postmark broke her alibi. she could not have been at sea and in Harwick both.",
  wrongCommit: "incorrect. one of them was not who they claimed.",
  defeated: "I know the heir. I chose. I was right."
};

export const lockedHintLadder = [
  "one of them tells the story exactly as the will does. that does not make her the heir.",
  "on paper Miss Vane and Miss Marchmain cannot be told apart.",
  "the alibi and the letter cannot both be true — pin them together and the contradiction shows.",
  "connect Miss Marchmain's alibi statement to her postmarked letter, then name Miss Vane."
];

export const arbiterLines = {
  fContradicted: "Miss Marchmain contradicted: her alibi puts her at sea while her own postmark keeps her in Harwick.",
  stillChoose: "Miss Marchmain is eliminated. The verdict still requires naming the true heir.",
  defeated: "The Meridian inheritance is settled upon Miss Rosalind Vane."
};
