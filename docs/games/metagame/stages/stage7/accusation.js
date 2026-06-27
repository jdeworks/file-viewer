// accusation.js — Stage 7 rule-of-three accusation engine (Obra-Dinn style), shared by Case 2
// (Duplicate Roster) and Case 3 (Quorum Ghost). The impostor is confirmed ONLY by a COMPLETE CORRECT
// triad of pinned cards (entity + wrong-field + source-fact). Partial selections are SILENT (no
// feedback → no guess-spam by elimination). A complete-but-wrong commit costs a small penalty and
// advances the hint ladder but NEVER reveals which part is wrong and NEVER wipes progress. The decisive
// fact card only exists once the player engages the REAL file (open for Case 2's route table; a genuine
// SEARCH for Case 3's session ledger), so a triad cannot be completed by guessing. Pure + deterministic.

import { CASE2, CASE3, CASE2_SOURCES, CASE3_SOURCES, CASE3_SEARCH, CASES } from "./content.js";
import {
  drawLink,
  ensureBoard,
  establishFact,
  getCard,
  mintCard,
  pinnedCards,
  setPinned
} from "./evidence-board.js";

const ACCUSE_PENALTY = 10;
const ACCUSE_REWARD = { 2: 40, 3: 60 };

// All fact cards mintable from a real file interaction, across both cases (open OR search).
const ALL_SOURCE_CARDS = [...CASE2_SOURCES, ...CASE3_SOURCES, CASE3_SEARCH];

const HINT_LADDERS = {
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

export const case2HintLadder = HINT_LADDERS[2];
export const case3HintLadder = HINT_LADDERS[3];

function caseOf(caseId) {
  return CASES[Number(caseId)] || CASE2;
}

// Map a fired source/search action (e.g. "route_table_examined", "session_revoked_found") to its card.
export function sourceCardForAction(actionName) {
  const source = ALL_SOURCE_CARDS.find((s) => s.action === actionName);
  return source ? source.card : null;
}

// Mint a fact card from a real file interaction (called by index.js when a source/search action fires).
export function mintSourceFact(state, actionName) {
  const card = sourceCardForAction(actionName);
  if (!card) return null;
  return mintCard(state, card);
}

// Seed the entity + dossier-field clue cards for a case onto the board (idempotent). Fact cards are NOT
// seeded here — they only appear via real file-opens / searches.
export function ensureCaseBoard(state, caseCfg) {
  ensureBoard(state);
  const seededKey = `case${caseCfg.id}Seeded`;
  if (state.evidence[seededKey]) return;
  for (const id of caseCfg.roster) {
    mintCard(state, { id: `entity:${id}`, kind: "entity", caseId: caseCfg.id, entity: id, label: `Entity ${id}` });
    for (const f of caseCfg.fields[id]) {
      mintCard(state, {
        id: `field:${id}:${f.id}`, kind: "field", caseId: caseCfg.id, entity: id, fieldId: f.id,
        label: `${id} · ${f.label}: ${f.value}`
      });
    }
  }
  state.evidence[seededKey] = true;
}

export function ensureCase2(state) { return ensureCaseBoard(state, CASE2); }
export function ensureCase3(state) { return ensureCaseBoard(state, CASE3); }

export function caseHint(state, caseId = 2) {
  const ladder = HINT_LADDERS[Number(caseId)] || HINT_LADDERS[2];
  const step = Math.min(Math.max(Number(state?.evidence?.[`case${caseId}HintStep`] || 0), 0), ladder.length - 1);
  return ladder[step];
}
export function case2Hint(state) { return caseHint(state, 2); }
export function case3Hint(state) { return caseHint(state, 3); }

// The triad is built BY PINNING: exactly one entity card + one field card + one fact card pinned for
// the given case. Anything else is an incomplete selection (the accusation stays silent on it).
export function pinnedTriad(state, caseId = 2) {
  const pinned = pinnedCards(state).filter((c) => Number(c.caseId) === Number(caseId));
  const entities = pinned.filter((c) => c.kind === "entity");
  const fields = pinned.filter((c) => c.kind === "field");
  const facts = pinned.filter((c) => c.kind === "fact");
  if (entities.length !== 1 || fields.length !== 1 || facts.length !== 1) return null;
  return { entityId: entities[0].entity, fieldId: fields[0].fieldId, factId: facts[0].id };
}

// Accuse using whatever the player has pinned for a case (the board-driven entry point used by the UI).
export function accuseFromBoard(state, caseId = 2) {
  const triad = pinnedTriad(state, caseId);
  if (!triad) return { ok: false, reason: "incomplete", silent: true };
  return attemptAccusationForCase(state, caseId, triad);
}

export function attemptAccusationForCase(state, caseId, { entityId, fieldId, factId } = {}) {
  ensureBoard(state);
  const caseCfg = caseOf(caseId);
  // Require a full triad of PINNED cards. Partial/missing → SILENT (no feedback, no penalty).
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
    // Complete-but-wrong: small penalty + hint ladder, but no part-by-part feedback, no progress wipe.
    state.evidence[attemptsKey] = Number(state.evidence[attemptsKey] || 0) + 1;
    state.evidence[hintKey] = Math.min(Number(state.evidence[hintKey] || 0) + 1, ladder.length - 1);
    state.addresses = Math.max(0, Number(state.addresses || 0) - ACCUSE_PENALTY);
    pushLog(state, "The triad does not hold. Re-examine the evidence.");
    return { ok: false, reason: "incorrect" };
  }

  // Correct: lock in the established fact + its links, eliminate the duplicate, advance the case.
  setPinned(state, entityCard.id, true);
  drawLink(state, entityCard.id, fieldCard.id);
  drawLink(state, fieldCard.id, factCard.id);
  establishFact(state, {
    id: `triad:${entityId}`,
    label: caseCfg.id === 3
      ? `Entity ${entityId} is the duplicate — an active-session claim the ledger reports revoked.`
      : `Entity ${entityId} is the duplicate — an active-route claim the route table refutes.`,
    cards: [entityCard.id, fieldCard.id, factCard.id]
  });
  state.evidence[`case${caseCfg.id}Solved`] = true;
  state.evidence.eliminated = [...new Set([...(state.evidence.eliminated || []), entityId])];
  state.addresses = Number(state.addresses || 0) + (ACCUSE_REWARD[caseCfg.id] || 40);
  pushLog(state, caseCfg.id === 3
    ? `Entity ${entityId}'s active-session claim is refuted by the ledger search. The ghost is named.`
    : `Entity ${entityId}'s active-route claim is refuted by the route table. The duplicate is named.`);
  if (Number(state.substage || 1) < caseCfg.nextSubstage) state.substage = caseCfg.nextSubstage;
  return { ok: true, solved: true };
}

// Back-compatible Case 2 entry point (state, triad).
export function attemptAccusation(state, triad = {}) {
  return attemptAccusationForCase(state, 2, triad);
}

function pushLog(state, line) {
  state.log = [...(state.log || []), line].slice(-8);
}
