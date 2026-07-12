// content.js — Stage 7 "The Meridian Estate Affair": the human detective case data. Several named
// claimants each swear they are the true heir of Meridian House; the arbiter must expose the frauds
// and name the real heir. The deduction ENGINE is unchanged — only the flavour is human (witness
// statements, a torn letter, a household register, an estate ledger, sworn movements). Engine ids are
// kept: entity keys stay single letters (A–F, G–K, L–Q) as compact case tags / card ids, field ids
// (tier / layer / route / session / whereabouts) and the source-open action names are internal and
// unchanged; only player-visible LABELS, VALUES, filenames and the search token are re-themed.

// Every claimant, keyed by the engine's entity letter → the name shown on the board. The letter is the
// suspect's monogram (an initial — thematically a detective's index tag); the name is the card label.
export const NAMES = {
  A: "Miss Rosalind Vane",   B: "Mr. Cassius Merrow",  C: "Mrs. Dorothea Ashby",
  D: "Mr. Ambrose Kelate",   E: "Mr. Lucian Frost",    F: "Miss Isolde Marchmain",
  G: "Mr. Halloran",         H: "Mrs. Trevisick",      J: "Mr. Onslow",   K: "Mr. Peverell",
  L: "Mr. Ashworth",         M: "Miss Calder",         N: "Mr. Sennett",  P: "Mr. Iveson",
  Q: "Miss Blakeney"
};
export function nameFor(id) { return NAMES[id] || `Claimant ${id}`; }

// The six principal claimants to Meridian House. One is the true heir (A); five are rivals to eliminate.
export const candidates = [
  { id: "A", name: NAMES.A, claim: "her account holds against every record", status: "real" },
  { id: "B", name: NAMES.B, claim: "reached the House by a road not yet open", status: "impostor" },
  { id: "C", name: NAMES.C, claim: "recites the claim word for word", status: "impostor" },
  { id: "D", name: NAMES.D, claim: "names a witness long dead", status: "impostor" },
  { id: "E", name: NAMES.E, claim: "was away on the night of the reading", status: "impostor" },
  { id: "F", name: NAMES.F, claim: "her alibi cannot survive the postmark", status: "impostor" }
];

// ── Sub-stage 2 (Two Statements): Miss Vane (A) and Miss Marchmain (F) are tied on paper. Their sworn
// statements are near-identical; one detail on F's was altered. Two fields DIFFER — one is the forgery,
// one is an innocent difference of clerk. Every other field matches. ─────────────────────────────────
export const statementRows = {
  A: [
    ["Claimed residence", "Meridian House, west wing"],
    ["Where on the night of the 12th", "at Meridian House"],
    ["Attesting witness", "Mrs. Deane, housekeeper"],
    ["Recorded by", "the day-clerk"]
  ],
  F: [
    ["Claimed residence", "Meridian House, west wing"],
    // Tamper: F's whereabouts were altered — a detail she will need at the verdict, and cannot keep.
    ["Where on the night of the 12th", "at the House, then away by the late coach"],
    ["Attesting witness", "Mrs. Deane, housekeeper"],
    // Decoy: a different clerk took F's statement down — a routine difference of hand, not a forgery.
    ["Recorded by", "the night-clerk"]
  ]
};

// SS2 field classification for diffField: only the whereabouts line is the decisive tamper; the clerk
// line is a benign difference decoy; every other row matches across A and F.
export const DUP_FIELDS = {
  "Where on the night of the 12th": { tamper: true },
  "Recorded by": { benignDiff: true,
    note: "The two statements were taken down by different clerks — a routine difference of hand, not a forgery. Look again." }
};

// ── Sub-stage 1 (Witness Statements): each rival claimant (B/C/D/E) makes one statement that contradicts
// a fact already established about the estate. The arbiter must flag the wrong line on each. ──────────
export const entityFields = {
  B: [
    { id: "kinship", label: "Kinship", value: "second cousin" },
    { id: "road", label: "How she reached the House", value: "by the Calbourne road, the 9th", wrong: true,
      reason: "The Calbourne road was impassable until the 10th — no one reached the House by it on the 9th." },
    { id: "witness", label: "Attesting witness", value: "the parson" }
  ],
  C: [
    { id: "recital", label: "How she answers", value: "word for word, identical each telling", wrong: true,
      reason: "Her account is recited word for word each time — rehearsed, not remembered." },
    { id: "kinship", label: "Kinship", value: "niece" },
    { id: "residence", label: "Residence", value: "the east lodge" }
  ],
  D: [
    { id: "kinship", label: "Kinship", value: "nephew" },
    { id: "residence", label: "Residence", value: "the county town" },
    { id: "witness", label: "Attesting witness", value: "Mr. Colby, the steward", wrong: true,
      reason: "Mr. Colby, the steward, died last spring; he attested nothing." }
  ],
  E: [
    { id: "whereabouts", label: "Where on the night of the 12th", value: "in the county town", wrong: true,
      reason: "The will was read at the House on the 12th; she cannot have been in the county town." },
    { id: "kinship", label: "Kinship", value: "second cousin" },
    { id: "witness", label: "Attesting witness", value: "the housekeeper" }
  ]
};

export const SCAN_ENTITIES = ["B", "C", "D", "E"];

// Facts already established about the estate — the "known truths" a false statement contradicts.
export const ambientFacts = [
  "The will was read at Meridian House on the evening of the 12th.",
  "Mr. Colby, the estate steward, died last spring.",
  "The Calbourne road was impassable — washed out — until the 10th.",
  "A true heir speaks from memory; a claim recited word for word is rehearsed."
];

// Facts arrive AS USED: each fact is revealed the first time a statement it disproves is flagged (its
// trigger claimants), and all are revealed once the scan completes. Parallel to ambientFacts.
export const AMBIENT_TRIGGERS = [
  ["E"],  // "The will was read … on the 12th"           — E's away-on-the-12th claim
  ["D"],  // "Mr. Colby … died last spring"              — D's dead-witness claim
  ["B"],  // "The Calbourne road was impassable …"       — B's washed-out-road arrival
  ["C"]   // "A claim recited word for word is rehearsed" — C's word-perfect recital
];

// ── Sub-stage 3 (Movements Audit): Miss Marchmain's (F) stated movements hold one impossibility. ─────
export const entityFEventLog = [
  { when: "the 9th", event: "arrived at Meridian House", id: "ev1" },
  { when: "the 10th", event: "dined with the solicitor", id: "ev2" },
  // Decoy: a SECOND entry on the 10th LOOKS like a duplicate-day anomaly, but two engagements in one
  // day is routine — the only IMPOSSIBLE entry places her in two places at once.
  { when: "the 10th", event: "walked the east grounds", id: "ev2b" },
  { when: "the 11th", event: "received in the drawing room", id: "ev3" },
  { when: "the 12th", event: "attended the reading of the will", id: "ev4" },
  { when: "the 13th", event: "at Meridian House all evening", id: "ev5" },
  { when: "the 13th", event: "boarded the Harwick packet, forty miles distant", id: "ev6", impossible: true,
    reason: "Placed at Meridian House and aboard the Harwick packet on the same evening — forty miles apart. She cannot be in both." },
  { when: "the 14th", event: "called on the notary", id: "ev7" },
  { when: "the 15th", event: "returned to the House", id: "ev8" },
  { when: "the 16th", event: "walked with the parson", id: "ev9" },
  { when: "the 17th", event: "sat for the family portrait", id: "ev10" }
];

// ── Case 2 (The Second Claim): a later set of claimants (G/H/J/K) forges its way onto the estate rolls,
// gated AFTER F's paper trail collapses and BEFORE the verdict. One is the impostor; one is a RED
// HERRING whose oddity the estate rules exonerate. The decisive fact is learnable only by OPENING a
// real same-origin file in the viewer (the household register), so the triad cannot complete without a
// genuine file-open. ─────────────────────────────────────────────────────────────────────────────────
export const CASE2 = {
  id: 2,
  name: "THE SECOND CLAIM",
  nextSubstage: 6, // correct accusation → Case 3 (the distant relations), then the verdict
  roster: ["G", "H", "J", "K"],
  impostor: "K",
  // Dossier fields shown on the board as clue cards once Case 2 begins.
  fields: {
    G: [
      { id: "tier", label: "Kinship", value: "second cousin" },
      { id: "layer", label: "Standing", value: "named in the will" },
      { id: "route", label: "Engagement", value: "steward, pensioned off (closed)" }
    ],
    H: [
      // Red herring: "great-aunt by marriage" LOOKS an invalid claim, but the estate rules recognise it.
      { id: "tier", label: "Kinship", value: "great-aunt by marriage" },
      { id: "layer", label: "Standing", value: "not named" },
      { id: "route", label: "Engagement", value: "companion to the late lady (closed)" }
    ],
    J: [
      { id: "tier", label: "Kinship", value: "nephew" },
      { id: "layer", label: "Standing", value: "named in the codicil" },
      { id: "route", label: "Engagement", value: "solicitor's clerk (closed)" }
    ],
    K: [
      { id: "tier", label: "Kinship", value: "second cousin" },
      { id: "layer", label: "Standing", value: "named in the will" },
      // The decisive lie: claims a standing engagement the household register shows was given up.
      { id: "route", label: "Engagement", value: "estate agent, still in service", suspect: true }
    ]
  },
  // The unique correct triad: K's "still in service" engagement is refuted by the register fact.
  triad: { entity: "K", fieldId: "route", factId: "fact:route" },
  // For authoring/clarity (not used by the matcher): H's kinship looks wrong but the rules exonerate it.
  redHerring: { entity: "H", fieldId: "tier", factId: "fact:spec" }
};

// Source files the arbiter OPENS in the real viewer; each open mints one fact card on the board. Only
// fact:route is load-bearing for the correct triad — the others are present so the arbiter must reason
// WHICH fact actually refutes a claim (fact:spec exonerates the red herring, so accusing H is silent).
export const CASE2_SOURCES = [
  { action: "spec_examined", file: "estate_rules.txt",
    card: { id: "fact:spec", kind: "fact", caseId: 2, stamp: "estate_rules.txt", about: ["H"],
      label: "Estate rules: kinship by marriage is a recognised claim; each person may hold but one engagement to the estate." } },
  { action: "route_table_examined", file: "household_register.csv",
    card: { id: "fact:route", kind: "fact", caseId: 2, stamp: "household_register.csv", about: ["K"],
      label: "Household register: the estate-agent's post was given up in the spring — Mr. Peverell holds no engagement." } },
  { action: "access_log_examined", file: "visitors_book.csv",
    card: { id: "fact:activity", kind: "fact", caseId: 2, stamp: "visitors_book.csv",
      label: "Visitors' book: Halloran, Trevisick, Onslow and Peverell all called at the House this week." } },
  { action: "comms_examined", file: "parlour_interview.txt",
    card: { id: "fact:comms", kind: "fact", caseId: 2, stamp: "parlour_interview.txt",
      label: "Parlour interview: the true claimant answered the housekeeper plainly; the false one faltered." } }
];

// ── Case 3 (The Distant Relations): a LARGER set of claimants (L/M/N/P/Q) presses the estate. One is
// the impostor; TWO are red herrings whose oddities are EXONERATED by DIFFERENT records (so several real
// file-opens become load-bearing, not just one). The decisive deduction is gated behind a real SEARCH
// of the estate ledger in the viewer (find the voided voucher), not a mere open. ─────────────────────
export const CASE3 = {
  id: 3,
  name: "THE DISTANT RELATIONS",
  roster: ["L", "M", "N", "P", "Q"],
  impostor: "N",
  nextSubstage: 7, // correct accusation → the verdict (substage 7)
  fields: {
    L: [
      { id: "tier", label: "Kinship", value: "first cousin" },
      { id: "layer", label: "Standing", value: "named in the will" },
      { id: "session", label: "Provision", value: "legacy of £200, paid" }
    ],
    M: [
      { id: "tier", label: "Kinship", value: "second cousin" },
      { id: "layer", label: "Standing", value: "named in the codicil" },
      { id: "session", label: "Provision", value: "annuity, paid" }
    ],
    N: [
      { id: "tier", label: "Kinship", value: "second cousin" },
      { id: "layer", label: "Standing", value: "named in the codicil" },
      // The decisive lie: claims a settled annuity the ledger records as void.
      { id: "session", label: "Provision", value: "annuity under Voucher 214, honoured", suspect: true }
    ],
    P: [
      { id: "tier", label: "Kinship", value: "nephew" },
      // Red herring #1: "principal legatee" LOOKS too high a standing, but a late codicil sanctions it.
      { id: "layer", label: "Standing", value: "named principal legatee" },
      { id: "session", label: "Provision", value: "residuary share, pending" }
    ],
    Q: [
      // Red herring #2: "natural daughter" LOOKS an irregular claim, but the estate custom recognises it.
      { id: "tier", label: "Kinship", value: "natural daughter" },
      { id: "layer", label: "Standing", value: "named in the will" },
      { id: "session", label: "Provision", value: "legacy of £500, paid" }
    ]
  },
  // The unique correct triad: N's "honoured" annuity is refuted by the searched ledger fact.
  triad: { entity: "N", fieldId: "session", factId: "fact:session" },
  // Authoring notes (not used by the matcher): each red herring is cleared by a DIFFERENT file.
  redHerrings: [
    { entity: "Q", fieldId: "tier", factId: "fact:qspec" },
    { entity: "P", fieldId: "layer", factId: "fact:audit" }
  ]
};

// Case 3 OPEN-minted fact cards (open each file in the viewer). None of these completes the correct
// triad — fact:qspec and fact:audit EXONERATE the two red herrings, fact:handshake corroborates, and
// fact:ledgerhint just points the arbiter at the SEARCH. The decisive fact is fact:session (search-only).
export const CASE3_SOURCES = [
  { action: "quorum_spec_examined", file: "inheritance_customs.txt",
    card: { id: "fact:qspec", kind: "fact", caseId: 3, stamp: "inheritance_customs.txt", about: ["Q"],
      label: "Custom of the estate: a natural child, if acknowledged, is a recognised heir." } },
  { action: "audit_examined", file: "solicitor_memo.txt",
    card: { id: "fact:audit", kind: "fact", caseId: 3, stamp: "solicitor_memo.txt", about: ["P"],
      label: "Solicitor's memo: a late codicil (the 6th) names the nephew principal legatee — sanctioned and witnessed." } },
  { action: "handshake_examined", file: "mourners_register.csv",
    card: { id: "fact:handshake", kind: "fact", caseId: 3, stamp: "mourners_register.csv",
      label: "Register at the reading: Ashworth, Calder, Sennett, Iveson and Blakeney all attended." } },
  { action: "ledger_examined", file: "estate_ledger.csv",
    card: { id: "fact:ledgerhint", kind: "fact", caseId: 3, stamp: "estate_ledger.csv",
      label: "The estate ledger lists every disbursement — SEARCH it by voucher to learn whether a payment was honoured or void." } }
];

// The Case 3 SEARCH un-cheat: the decisive fact card is minted ONLY by SEARCHING estate_ledger.csv in
// the real viewer for the claimed voucher (the line proving Voucher 214 is VOID). Opening the file is
// NOT enough — the triad cannot complete without a genuine search.
export const CASE3_SEARCH = {
  action: "session_revoked_found",
  file: "estate_ledger.csv",
  query: "Voucher 214",
  card: { id: "fact:session", kind: "fact", caseId: 3, stamp: "estate_ledger.csv", about: ["N"],
    label: "Ledger search: Voucher 214 — the annuity Mr. Sennett claims — is marked VOID (cancelled, the 15th). His claim is false." }
};

export const CASES = { 2: CASE2, 3: CASE3 };

// ── The verdict / boss: the two documents whose contradiction eliminates the last tied impostor (F).
// Miss Marchmain's alibi statement swears she left Harwick on the 12th and was at sea; her own torn
// letter, postmarked HARWICK the 14th, proves she never sailed. Pinning BOTH to the board and CONNECTING
// them exposes the contradiction. Each is a real file the arbiter can open in the viewer to read it. ──
export const BOSS_DOCS = [
  { id: "boss:alibi", kind: "document", caseId: 7, entity: "F", stamp: "alibi_statement.txt",
    file: "alibi_statement.txt", label: "Alibi statement — Miss Marchmain left Harwick on the 12th, at sea when the codicil was signed." },
  { id: "boss:letter", kind: "document", caseId: 7, entity: "F", stamp: "torn_letter.txt",
    file: "torn_letter.txt", label: "Torn letter — in her hand, postmarked HARWICK the 14th: she never sailed." }
];
export const BOSS_DOC_PAIR = ["boss:alibi", "boss:letter"];
