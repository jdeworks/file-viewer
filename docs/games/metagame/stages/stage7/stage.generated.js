// GENERATED — DO NOT EDIT BY HAND.
// Bundled from docs/games/metagame/stages/stage7/index.js (+ its local modules) by
// build/metagame/build.mjs. Rebuild:  node build/metagame/build.mjs  (run by scripts/check.sh).
// Exports stageMeta / defaultState / mountStage. Shared ../../*.js singletons + ./styles.css stay
// external (NOT inlined). The hub's stage-manifest.js LOADERS import THIS file.


// ../../docs/games/metagame/stages/stage7/messages.js
var ACTION_NAME = "alibi_contradiction_pinned";
var REQUIRED_ACTION = "7.alibi_contradiction_pinned";
var ACHIEVEMENT_ID = "stage7.alibi_contradiction_pinned";
var ACHIEVEMENT_TEXT = "Two documents, one lie. The postmark broke the alibi.";
var BTS_PATH = "/docs/bts/identity_arbiter.bts";
var ALIBI_STATEMENT_PATH = "/docs/examples/metagame/stage7/alibi_statement.txt";
var TORN_LETTER_PATH = "/docs/examples/metagame/stage7/torn_letter.txt";
var ENTITY_ANCHOR_PATH = "/docs/examples/metagame/stage7/rescinded_appointment.txt";
var ANCHOR_ACTION = "anchor_chain_examined";
var CASE2_SOURCE_PATHS = {
  spec_examined: "/docs/examples/metagame/stage7/estate_rules.txt",
  route_table_examined: "/docs/examples/metagame/stage7/household_register.csv",
  access_log_examined: "/docs/examples/metagame/stage7/visitors_book.csv",
  comms_examined: "/docs/examples/metagame/stage7/parlour_interview.txt"
};
var CASE2_SOURCE_ACTIONS = Object.keys(CASE2_SOURCE_PATHS);
var CASE3_SOURCE_PATHS = {
  quorum_spec_examined: "/docs/examples/metagame/stage7/inheritance_customs.txt",
  audit_examined: "/docs/examples/metagame/stage7/solicitor_memo.txt",
  handshake_examined: "/docs/examples/metagame/stage7/mourners_register.csv",
  ledger_examined: "/docs/examples/metagame/stage7/estate_ledger.csv"
};
var CASE3_SOURCE_ACTIONS = Object.keys(CASE3_SOURCE_PATHS);
var CASE3_SEARCH_ACTION = "session_revoked_found";
var CASE3_SEARCH_PATH = "/docs/examples/metagame/stage7/estate_ledger.csv";
var CASE3_SEARCH_QUERY = "Voucher 214";
var substageHints = {
  1: "Six claim the estate; one is the heir. Read the rival statements (B, C, D, E) and flag the one line in each that contradicts something you already know to be true.",
  2: "Miss Vane and Miss Marchmain are tied on paper. Compare the two statements side by side and find the one detail that's been altered.",
  3: "Check Miss Marchmain's movements. One entry could not have happened.",
  4: "Follow Miss Marchmain's paper trail. Open the record her claim rests upon.",
  5: "A second set of claimants presses the estate. Open the records, pin the evidence, and name the impostor with three things: who, what they claimed, and the fact that disproves it.",
  6: "A wider circle of distant relations (L/M/N/P/Q) claims a share. Two odd details turn out innocent, cleared by different records — the impostor's lie is exposed only by SEARCHING the estate ledger.",
  7: "Open Miss Marchmain's alibi statement and her torn letter, pin both to the board, and CONNECT them — the postmark breaks the alibi. Then name the true heir."
};
var bellMessages = {
  start: "the claimants were assembled. I had to decide.",
  unlock: "the postmark broke her alibi. she could not have been at sea and in Harwick both.",
  wrongCommit: "incorrect. one of them was not who they claimed.",
  defeated: "I know the heir. I chose. I was right."
};
var lockedHintLadder = [
  "one of them tells the story exactly as the will does. that does not make her the heir.",
  "on paper Miss Vane and Miss Marchmain cannot be told apart.",
  "the alibi and the letter cannot both be true — pin them together and the contradiction shows.",
  "connect Miss Marchmain's alibi statement to her postmarked letter, then name Miss Vane."
];
var arbiterLines = {
  fContradicted: "Miss Marchmain contradicted: her alibi puts her at sea while her own postmark keeps her in Harwick.",
  stillChoose: "Miss Marchmain is eliminated. The verdict still requires naming the true heir.",
  defeated: "The Meridian inheritance is settled upon Miss Rosalind Vane."
};

// ../../docs/games/metagame/stages/stage7/content.js
var NAMES = {
  A: "Miss Rosalind Vane",
  B: "Mr. Cassius Merrow",
  C: "Mrs. Dorothea Ashby",
  D: "Mr. Ambrose Kelate",
  E: "Mr. Lucian Frost",
  F: "Miss Isolde Marchmain",
  G: "Mr. Halloran",
  H: "Mrs. Trevisick",
  J: "Mr. Onslow",
  K: "Mr. Peverell",
  L: "Mr. Ashworth",
  M: "Miss Calder",
  N: "Mr. Sennett",
  P: "Mr. Iveson",
  Q: "Miss Blakeney"
};
function nameFor(id) {
  return NAMES[id] || `Claimant ${id}`;
}
var candidates = [
  { id: "A", name: NAMES.A, claim: "her account holds against every record", status: "real" },
  { id: "B", name: NAMES.B, claim: "reached the House by a road not yet open", status: "impostor" },
  { id: "C", name: NAMES.C, claim: "recites the claim word for word", status: "impostor" },
  { id: "D", name: NAMES.D, claim: "names a witness long dead", status: "impostor" },
  { id: "E", name: NAMES.E, claim: "was away on the night of the reading", status: "impostor" },
  { id: "F", name: NAMES.F, claim: "her alibi cannot survive the postmark", status: "impostor" }
];
var statementRows = {
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
var DUP_FIELDS = {
  "Where on the night of the 12th": { tamper: true },
  "Recorded by": {
    benignDiff: true,
    note: "The two statements were taken down by different clerks — a routine difference of hand, not a forgery. Look again."
  }
};
var entityFields = {
  B: [
    { id: "kinship", label: "Kinship", value: "second cousin" },
    {
      id: "road",
      label: "How she reached the House",
      value: "by the Calbourne road, the 9th",
      wrong: true,
      reason: "The Calbourne road was impassable until the 10th — no one reached the House by it on the 9th."
    },
    { id: "witness", label: "Attesting witness", value: "the parson" }
  ],
  C: [
    {
      id: "recital",
      label: "How she answers",
      value: "word for word, identical each telling",
      wrong: true,
      reason: "Her account is recited word for word each time — rehearsed, not remembered."
    },
    { id: "kinship", label: "Kinship", value: "niece" },
    { id: "residence", label: "Residence", value: "the east lodge" }
  ],
  D: [
    { id: "kinship", label: "Kinship", value: "nephew" },
    { id: "residence", label: "Residence", value: "the county town" },
    {
      id: "witness",
      label: "Attesting witness",
      value: "Mr. Colby, the steward",
      wrong: true,
      reason: "Mr. Colby, the steward, died last spring; he attested nothing."
    }
  ],
  E: [
    {
      id: "whereabouts",
      label: "Where on the night of the 12th",
      value: "in the county town",
      wrong: true,
      reason: "The will was read at the House on the 12th; she cannot have been in the county town."
    },
    { id: "kinship", label: "Kinship", value: "second cousin" },
    { id: "witness", label: "Attesting witness", value: "the housekeeper" }
  ]
};
var SCAN_ENTITIES = ["B", "C", "D", "E"];
var ambientFacts = [
  "The will was read at Meridian House on the evening of the 12th.",
  "Mr. Colby, the estate steward, died last spring.",
  "The Calbourne road was impassable — washed out — until the 10th.",
  "A true heir speaks from memory; a claim recited word for word is rehearsed."
];
var AMBIENT_TRIGGERS = [
  ["E"],
  // "The will was read … on the 12th"           — E's away-on-the-12th claim
  ["D"],
  // "Mr. Colby … died last spring"              — D's dead-witness claim
  ["B"],
  // "The Calbourne road was impassable …"       — B's washed-out-road arrival
  ["C"]
  // "A claim recited word for word is rehearsed" — C's word-perfect recital
];
var entityFEventLog = [
  { when: "the 9th", event: "arrived at Meridian House", id: "ev1" },
  { when: "the 10th", event: "dined with the solicitor", id: "ev2" },
  // Decoy: a SECOND entry on the 10th LOOKS like a duplicate-day anomaly, but two engagements in one
  // day is routine — the only IMPOSSIBLE entry places her in two places at once.
  { when: "the 10th", event: "walked the east grounds", id: "ev2b" },
  { when: "the 11th", event: "received in the drawing room", id: "ev3" },
  { when: "the 12th", event: "attended the reading of the will", id: "ev4" },
  { when: "the 13th", event: "at Meridian House all evening", id: "ev5" },
  {
    when: "the 13th",
    event: "boarded the Harwick packet, forty miles distant",
    id: "ev6",
    impossible: true,
    reason: "Placed at Meridian House and aboard the Harwick packet on the same evening — forty miles apart. She cannot be in both."
  },
  { when: "the 14th", event: "called on the notary", id: "ev7" },
  { when: "the 15th", event: "returned to the House", id: "ev8" },
  { when: "the 16th", event: "walked with the parson", id: "ev9" },
  { when: "the 17th", event: "sat for the family portrait", id: "ev10" }
];
var CASE2 = {
  id: 2,
  name: "THE SECOND CLAIM",
  nextSubstage: 6,
  // correct accusation → Case 3 (the distant relations), then the verdict
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
var CASE2_SOURCES = [
  {
    action: "spec_examined",
    file: "estate_rules.txt",
    card: {
      id: "fact:spec",
      kind: "fact",
      caseId: 2,
      stamp: "estate_rules.txt",
      about: ["H"],
      label: "Estate rules: kinship by marriage is a recognised claim; each person may hold but one engagement to the estate."
    }
  },
  {
    action: "route_table_examined",
    file: "household_register.csv",
    card: {
      id: "fact:route",
      kind: "fact",
      caseId: 2,
      stamp: "household_register.csv",
      about: ["K"],
      label: "Household register: the estate-agent's post was given up in the spring — Mr. Peverell holds no engagement."
    }
  },
  {
    action: "access_log_examined",
    file: "visitors_book.csv",
    card: {
      id: "fact:activity",
      kind: "fact",
      caseId: 2,
      stamp: "visitors_book.csv",
      label: "Visitors' book: Halloran, Trevisick, Onslow and Peverell all called at the House this week."
    }
  },
  {
    action: "comms_examined",
    file: "parlour_interview.txt",
    card: {
      id: "fact:comms",
      kind: "fact",
      caseId: 2,
      stamp: "parlour_interview.txt",
      label: "Parlour interview: the true claimant answered the housekeeper plainly; the false one faltered."
    }
  }
];
var CASE3 = {
  id: 3,
  name: "THE DISTANT RELATIONS",
  roster: ["L", "M", "N", "P", "Q"],
  impostor: "N",
  nextSubstage: 7,
  // correct accusation → the verdict (substage 7)
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
var CASE3_SOURCES = [
  {
    action: "quorum_spec_examined",
    file: "inheritance_customs.txt",
    card: {
      id: "fact:qspec",
      kind: "fact",
      caseId: 3,
      stamp: "inheritance_customs.txt",
      about: ["Q"],
      label: "Custom of the estate: a natural child, if acknowledged, is a recognised heir."
    }
  },
  {
    action: "audit_examined",
    file: "solicitor_memo.txt",
    card: {
      id: "fact:audit",
      kind: "fact",
      caseId: 3,
      stamp: "solicitor_memo.txt",
      about: ["P"],
      label: "Solicitor's memo: a late codicil (the 6th) names the nephew principal legatee — sanctioned and witnessed."
    }
  },
  {
    action: "handshake_examined",
    file: "mourners_register.csv",
    card: {
      id: "fact:handshake",
      kind: "fact",
      caseId: 3,
      stamp: "mourners_register.csv",
      label: "Register at the reading: Ashworth, Calder, Sennett, Iveson and Blakeney all attended."
    }
  },
  {
    action: "ledger_examined",
    file: "estate_ledger.csv",
    card: {
      id: "fact:ledgerhint",
      kind: "fact",
      caseId: 3,
      stamp: "estate_ledger.csv",
      label: "The estate ledger lists every disbursement — SEARCH it by voucher to learn whether a payment was honoured or void."
    }
  }
];
var CASE3_SEARCH = {
  action: "session_revoked_found",
  file: "estate_ledger.csv",
  query: "Voucher 214",
  card: {
    id: "fact:session",
    kind: "fact",
    caseId: 3,
    stamp: "estate_ledger.csv",
    about: ["N"],
    label: "Ledger search: Voucher 214 — the annuity Mr. Sennett claims — is marked VOID (cancelled, the 15th). His claim is false."
  }
};
var CASES = { 2: CASE2, 3: CASE3 };
var BOSS_DOCS = [
  {
    id: "boss:alibi",
    kind: "document",
    caseId: 7,
    entity: "F",
    stamp: "alibi_statement.txt",
    file: "alibi_statement.txt",
    label: "Alibi statement — Miss Marchmain left Harwick on the 12th, at sea when the codicil was signed."
  },
  {
    id: "boss:letter",
    kind: "document",
    caseId: 7,
    entity: "F",
    stamp: "torn_letter.txt",
    file: "torn_letter.txt",
    label: "Torn letter — in her hand, postmarked HARWICK the 14th: she never sailed."
  }
];
var BOSS_DOC_PAIR = ["boss:alibi", "boss:letter"];

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

// ../../docs/games/metagame/stages/stage7/boss.js
function hasAlibiContradiction(actions) {
  return Boolean(actions && typeof actions.hasAction === "function" && actions.hasAction(7, ACTION_NAME));
}
var ACCUSE_PENALTY = 10;
function getBossLockState({ actions, state }) {
  const unlocked = hasAlibiContradiction(actions) || Boolean(state?.boss?.unlocked);
  const hintIndex = Math.min(Math.max(Number(state?.boss?.lockHintStep || 0), 0), lockedHintLadder.length - 1);
  return {
    unlocked,
    defeated: Boolean(state?.boss?.defeated),
    informationState: unlocked ? "Miss Marchmain contradicted" : "Vane / Marchmain unresolved",
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
function ensureBossBoard(state) {
  for (const doc of BOSS_DOCS) mintCard(state, doc);
}
function applyAlibiContradictionUnlock({ state, achievements, bell }) {
  const boss = state.boss;
  const firstUnlock = !boss.unlocked;
  boss.unlocked = true;
  markContradicted(state, "F");
  if (firstUnlock) {
    pushLog(state, arbiterLines.fContradicted);
    pushLog(state, arbiterLines.stillChoose);
    notifyBell(bell, bellMessages.unlock, ACHIEVEMENT_ID);
    unlockAchievement(achievements, ACHIEVEMENT_ID, {
      id: ACHIEVEMENT_ID,
      stage: 7,
      text: ACHIEVEMENT_TEXT,
      action: REQUIRED_ACTION,
      entity: "F"
    });
  }
  return firstUnlock;
}
function connectAlibiContradiction({ state, actions, achievements, bell }) {
  ensureBossBoard(state);
  const [alibiId, letterId] = BOSS_DOC_PAIR;
  const alibi = getCard(state, alibiId);
  const letter = getCard(state, letterId);
  if (!alibi?.pinned || !letter?.pinned) {
    pushLog(state, "Pin both the alibi statement and the postmarked letter to connect them.");
    return { ok: false, reason: "not-both-pinned" };
  }
  const link = drawLink(state, alibiId, letterId);
  if (!link.ok) return { ok: false, reason: link.reason };
  actions?.setAction?.(7, ACTION_NAME, {
    source: "evidence-board",
    documents: ["alibi_statement", "torn_letter"],
    entity: "F"
  });
  applyAlibiContradictionUnlock({ state, achievements, bell });
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
      pushLog(state, "Miss Marchmain is already contradicted — her own postmark keeps her in Harwick. Name the claimant who survives every test.");
    } else {
      pushLog(state, `${nameFor(selected)} is not the heir — eliminated (-${ACCUSE_PENALTY} leads). the field narrows.`);
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

// ../../docs/games/metagame/stages/stage7/substages.js
var SUBSTAGE = { SCAN: 1, DUP: 2, TIMELINE: 3, CHAIN: 4, ACCUSE: 5, ACCUSE3: 6, BOSS: 7 };
function flagField({ state, entityId, fieldId }) {
  const field = (entityFields[entityId] || []).find((f) => f.id === fieldId);
  if (!field) return { ok: false, reason: "unknown" };
  if (!field.wrong) {
    state.evidence.wrongFlagCount = Number(state.evidence.wrongFlagCount || 0) + 1;
    pushLog2(state, "not enough to disprove it — check it against what you already know.");
    return { ok: false, reason: "not-contradiction" };
  }
  if (state.evidence.flags[entityId]) return { ok: true, already: true };
  state.evidence.flags[entityId] = fieldId;
  state.evidence.eliminated = [.../* @__PURE__ */ new Set([...state.evidence.eliminated || [], entityId])];
  state.addresses = Number(state.addresses || 0) + 10;
  pushLog2(state, `${nameFor(entityId)}: ${field.reason}`);
  const complete = SCAN_ENTITIES.every((e) => state.evidence.flags[e]);
  if (complete) {
    if (Number(state.evidence.wrongFlagCount || 0) === 0) {
      state.addresses += 25;
      pushLog2(state, "a clean reading. +25 for precision.");
    }
    advance(state, SUBSTAGE.DUP);
  }
  return { ok: true, complete };
}
function diffField({ state, fieldName }) {
  const info = DUP_FIELDS[fieldName];
  if (!info?.tamper) {
    pushLog2(state, info?.benignDiff ? info.note : "this line matches across both statements.");
    return { ok: false, reason: info?.benignDiff ? "benign-diff" : "match" };
  }
  state.evidence.partialContra = [.../* @__PURE__ */ new Set([...state.evidence.partialContra || [], "F.whereabouts"])];
  state.evidence.dupTestComplete = true;
  state.addresses = Number(state.addresses || 0) + 15;
  pushLog2(state, "Miss Marchmain's whereabouts differ from Miss Vane's. Not yet decisive — the case continues.");
  advance(state, SUBSTAGE.TIMELINE);
  return { ok: true, complete: true };
}
function markImpossible({ state, evId }) {
  const ev = entityFEventLog.find((e) => e.id === evId);
  if (!ev || !ev.impossible) {
    pushLog2(state, "this entry is plausible. keep looking.");
    return { ok: false };
  }
  state.evidence.timelineContradictionCycle = ev.when;
  state.addresses = Number(state.addresses || 0) + 15;
  pushLog2(state, ev.reason);
  advance(state, SUBSTAGE.CHAIN);
  return { ok: true, complete: true };
}
function markChainBroken({ state }) {
  if (state.evidence.chainBroken) return { ok: true, already: true };
  state.evidence.chainBroken = true;
  state.addresses = Number(state.addresses || 0) + 15;
  pushLog2(state, "Miss Marchmain's claim rests on an appointment the estate rescinded. The trail is broken.");
  pushLog2(state, "A second set of claimants presses the estate. Open the records and name the impostor.");
  carryCase1Facts(state);
  advance(state, SUBSTAGE.ACCUSE);
  return { ok: true, complete: true };
}
function carryCase1Facts(state) {
  if (state.evidence.case1Carried) return;
  const facts = [
    { id: "case1:scan", label: "The rival statements (B/C/D/E) each held one contradiction — all four eliminated." },
    { id: "case1:dup", label: "Miss Marchmain's whereabouts differ from Miss Vane's — an altered statement." },
    { id: "case1:timeline", label: "Miss Marchmain's movements place her at the House and at Harwick on the same evening." },
    { id: "case1:chain", label: "Miss Marchmain's claim rests on a rescinded appointment — the paper trail is broken." }
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
    "A second set of claimants (G/H/J/K) presses the estate. One wears a claim it cannot hold.",
    "A tidy claim is not proof. Open the estate records — a claim only breaks against a source fact.",
    "One looks wrong but checks out; one looks clean but cannot be. Compare each ENGAGEMENT against the household register.",
    "A claimant swearing a standing engagement the register shows given up is the impostor. Pin claimant + engagement + the register fact."
  ],
  3: [
    "A wider circle (L/M/N/P/Q) claims a share. Two oddities are decoys — each cleared by a DIFFERENT record.",
    "Open the estate customs and the solicitor's memo: an odd kinship and an odd standing are both recognised.",
    "The real lie hides in a voucher. Opening the ledger is not enough — SEARCH it for the claimed voucher.",
    "Search the estate ledger for the voucher Mr. Sennett claims honoured; it is VOID. Pin claimant + provision + the ledger fact."
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
    mintCard(state, { id: `entity:${id}`, kind: "entity", caseId: caseCfg.id, entity: id, label: nameFor(id) });
    for (const f of caseCfg.fields[id]) {
      mintCard(state, {
        id: `field:${id}:${f.id}`,
        kind: "field",
        caseId: caseCfg.id,
        entity: id,
        fieldId: f.id,
        label: `${nameFor(id)} · ${f.label}: ${f.value}`
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
    label: caseCfg.id === 3 ? `${nameFor(entityId)} is the impostor — a settled-provision claim the ledger records as void.` : `${nameFor(entityId)} is the impostor — a standing-engagement claim the household register refutes.`,
    cards: [entityCard.id, fieldCard.id, factCard2.id]
  });
  state.evidence[`case${caseCfg.id}Solved`] = true;
  state.evidence.eliminated = [.../* @__PURE__ */ new Set([...state.evidence.eliminated || [], entityId])];
  state.addresses = Number(state.addresses || 0) + (ACCUSE_REWARD[caseCfg.id] || 40);
  pushLog3(state, caseCfg.id === 3 ? `${nameFor(entityId)}'s provision claim is refuted by the ledger search. The false relation is named.` : `${nameFor(entityId)}'s engagement claim is refuted by the household register. The false claimant is named.`);
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
  diffField({ state, fieldName: "Where on the night of the 12th" });
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
  { id: "mark-uncheat", label: "Mark alibi contradiction found" }
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
  if (step === 1) return { step, revealsToken: false, label: `search ${SEARCH_FILE} by voucher` };
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
    sum.textContent = nameFor(entity);
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
  2: "CASE 2 — THE SECOND CLAIM. Open the estate records, pin a triad, name the impostor.",
  3: "CASE 3 — THE DISTANT RELATIONS. Two oddities are decoys (different records clear them). SEARCH the ledger to expose the real lie."
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
  accuse.innerHTML = triad ? `NAME THE IMPOSTOR — <strong>${esc2(nameFor(mono))}</strong> <small>&middot; costs ${ACCUSE_COST} leads if wrong</small>` : "Pin one claimant, one claim, one fact";
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
  facts.innerHTML = `<h3>What you already know</h3>` + (items ? `<ul>${items}</ul>` : `<p class="s7-ambient-empty">Facts surface as you flag contradictions.</p>`);
  const cards = el3("div", "s7-cards");
  for (const id of SCAN_ENTITIES) {
    const card = el3("article", "s7-card");
    if (state.evidence.flags[id]) card.classList.add("is-flagged");
    card.innerHTML = `<strong>${esc3(nameFor(id))}</strong>`;
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
  colA.innerHTML = `<h3>${esc3(nameFor("A"))}</h3>${statementRows.A.map(([f, v]) => `<div class="s7-row"><span>${esc3(f)}</span><em>${esc3(v)}</em></div>`).join("")}`;
  const colF = el3("div", "s7-duptest-col");
  colF.innerHTML = `<h3>${esc3(nameFor("F"))}</h3>`;
  for (const [f, v] of statementRows.F) {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.diff = f;
    b.innerHTML = `<span>${esc3(f)}</span><em>${esc3(v)}</em>`;
    colF.append(b);
  }
  panel.append(colA, colF);
  const note = el3("p", "s7-duptest-hint");
  note.textContent = "TWO STATEMENTS — two lines differ, but only one was altered. Find it on Miss Marchmain's.";
  wrap.append(panel, note);
  return wrap;
}
function renderTimeline() {
  const wrap = el3("div", "s7-ss3");
  wrap.innerHTML = `<p class="s7-audit-header">MOVEMENTS AUDIT — Miss Marchmain's stated movements. One entry could not have happened; the rest are plausible. Mark it.</p>`;
  const list = el3("ol", "s7-timeline");
  for (const ev of entityFEventLog) {
    const li = document.createElement("li");
    li.innerHTML = `<span>${esc3(ev.when)}</span><span>${esc3(ev.event)}</span>`;
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
      <h3>Miss Marchmain — her claim to the estate</h3>
      <p>Rests upon: <strong>a letter of appointment to Meridian House</strong></p>
      <p>The record itself:
        <button type="button" data-action="open-anchor">letter of appointment &rarr; rescinded_appointment.txt [open record]</button>
      </p>
    </article>
    <p class="s7-chase-hint">Follow the reference. Open the appointment record in the viewer.</p>`;
  return wrap;
}
function renderBoss(state, lock) {
  const wrap = el3("div", "s7-ss5");
  const header = el3("header", "s7-boss-header");
  header.textContent = "NAME THE TRUE HEIR OF MERIDIAN HOUSE";
  wrap.append(header);
  const intro = el3("p");
  intro.textContent = "Miss Vane and Miss Marchmain are still tied. The documents cannot both be true — pin them and connect them.";
  wrap.append(intro);
  if (!lock.unlocked) {
    wrap.append(renderVerdictBoard(state));
    const waiting = el3("p", "s7-hint");
    waiting.textContent = lock.hint;
    wrap.append(waiting);
    return wrap;
  }
  const verdict = el3("div", "s7-verdict");
  verdict.innerHTML = `<p>Miss Marchmain's alibi cannot survive her own postmark. She is eliminated.</p>
    <p>Name the true heir.</p>`;
  const row = el3("div", "s7-commit-row");
  for (const c of candidates) {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.commit = c.id;
    b.disabled = state.boss.defeated;
    b.textContent = `name ${c.name}`;
    row.append(b);
  }
  verdict.append(row);
  wrap.append(verdict);
  return wrap;
}
function renderVerdictBoard(state) {
  const board = el3("div", "s7-verdict-board");
  let bothPinned = true;
  for (const doc of BOSS_DOCS) {
    const card = getCard(state, doc.id);
    const pinned = Boolean(card?.pinned);
    if (!pinned) bothPinned = false;
    const row = el3("div", "s7-verdict-doc");
    const pin2 = document.createElement("button");
    pin2.type = "button";
    pin2.dataset.pin = doc.id;
    pin2.className = "s7-cardface s7-cardface--document" + (pinned ? " is-pinned" : "");
    pin2.innerHTML = `<span class="s7-fact-stamp" aria-hidden="true">${esc3(doc.stamp)}</span><span class="s7-cardface-body">${esc3(doc.label)}</span>`;
    const open = document.createElement("button");
    open.type = "button";
    open.dataset.action = doc.id === "boss:alibi" ? "open-alibi" : "open-letter";
    open.className = "s7-doc-open";
    open.textContent = `read ${doc.file}`;
    row.append(pin2, open);
    board.append(row);
  }
  const connect = document.createElement("button");
  connect.type = "button";
  connect.dataset.action = "connect-alibi";
  connect.className = "s7-connect-btn" + (bothPinned ? " is-armed" : "");
  connect.disabled = !bothPinned;
  connect.textContent = bothPinned ? "CONNECT — the alibi against the postmark" : "Pin both documents to connect them";
  board.append(connect);
  return board;
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
      diffField({ state, fieldName: "Where on the night of the 12th" });
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
  1: "1/7 WITNESS STATEMENTS",
  2: "2/7 TWO STATEMENTS",
  3: "3/7 MOVEMENTS AUDIT",
  4: "4/7 PAPER TRAIL",
  5: "5/7 THE SECOND CLAIM",
  6: "6/7 THE DISTANT RELATIONS",
  7: "7/7 THE VERDICT"
};
var ARRIVAL = {
  1: "WITNESS STATEMENTS",
  2: "TWO STATEMENTS",
  3: "MOVEMENTS AUDIT",
  4: "PAPER TRAIL",
  5: "CASE 2 — THE SECOND CLAIM",
  6: "CASE 3 — THE DISTANT RELATIONS",
  7: "THE VERDICT"
};
var BOARD_SUBSTAGES = /* @__PURE__ */ new Set([SUBSTAGE.ACCUSE, SUBSTAGE.ACCUSE3]);
function renderStage7({ host, state, actions, achievements, bell, bts, viewer, save, onStageComplete }) {
  const root = document.createElement("section");
  root.className = "stage7-identity-arbiter";
  root.innerHTML = `
    <header class="s7-hud">
      <div><strong>IDENTITY ARBITER</strong></div>
      <div>stage <span data-field="substage"></span></div>
      <div>leads <span data-field="addresses"></span></div>
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
    else if (d.action === "open-alibi") openInViewer(ALIBI_STATEMENT_PATH, { mime: "text/plain", source: "stage7" });
    else if (d.action === "open-letter") openInViewer(TORN_LETTER_PATH, { mime: "text/plain", source: "stage7" });
    else if (d.action === "connect-alibi") connectAlibiContradiction({ state, actions, achievements, bell });
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
    ensureBossBoard(state);
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
      // { B:"fieldId", C:"fieldId", ... } from the witness-statement scan
      wrongFlagCount: 0,
      dupTestComplete: false,
      timelineContradictionCycle: null,
      chainBroken: false,
      partialContra: [],
      // e.g. ["F.whereabouts"]
      // Case 2 (The Second Claim) — the rule-of-three accusation.
      case2Seeded: false,
      // entity/field clue cards minted onto the board
      case2Solved: false,
      // the correct triad confirmed
      case2Attempts: 0,
      // complete-but-wrong accusations
      case2HintStep: 0,
      // accusation hint ladder
      // Case 3 (The Distant Relations) — a larger roster + a SEARCH-gated decisive fact.
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
      "Six claimants swear they are the true heir of Meridian House."
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
  if (hasAlibiContradiction(ctx.actions)) {
    applyAlibiContradictionUnlock({ state, achievements: ctx.achievements, bell: ctx.bell });
  }
  const unsubscribe = subscribeToActionName(ctx.actions, ACTION_NAME, () => {
    applyAlibiContradictionUnlock({ state, achievements: ctx.achievements, bell: ctx.bell });
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
  applyAlibiContradictionUnlock,
  commitIdentity,
  connectAlibiContradiction,
  defaultState2 as defaultState,
  getBossLockState,
  mountStage,
  recordLockedBossAttempt,
  stageMeta
};
