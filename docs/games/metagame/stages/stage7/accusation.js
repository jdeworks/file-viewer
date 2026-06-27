// accusation.js — Stage 7 Case 2 (Duplicate Roster): the Obra-Dinn rule-of-three. The impostor is
// confirmed ONLY by a COMPLETE CORRECT triad of pinned cards (entity + wrong-field + source-fact).
// Partial selections are SILENT (no feedback → no guess-spam by elimination). A complete-but-wrong
// commit costs a small penalty and advances the hint ladder but NEVER reveals which part is wrong and
// NEVER wipes progress. The decisive fact card only exists once the player opens the real route table
// in the viewer, so the triad cannot be completed without a genuine file-open. Pure + deterministic.

import { CASE2, CASE2_SOURCES } from "./content.js";
import {
  drawLink,
  ensureBoard,
  establishFact,
  getCard,
  mintCard,
  setPinned
} from "./evidence-board.js";
import { SUBSTAGE } from "./substages.js";

const ACCUSE_PENALTY = 10;
const ACCUSE_REWARD = 40;

export const case2HintLadder = [
  "Six dossiers became four. One of G/H/J/K wears a name it cannot hold.",
  "A clean dossier is not proof. Open the system files — a claim only breaks against a source fact.",
  "One looks wrong but checks out; one looks clean but cannot be. Compare each ROUTE against the route table.",
  "An entity claiming an ACTIVE route the route table closed is the duplicate. Pin entity + route + the route-table fact."
];

// Map a fired source-file action (e.g. "route_table_examined") to the fact card it mints.
export function sourceCardForAction(actionName) {
  const source = CASE2_SOURCES.find((s) => s.action === actionName);
  return source ? source.card : null;
}

// Mint a fact card from a real file-open (called by index.js when a Case 2 source action fires).
export function mintSourceFact(state, actionName) {
  const card = sourceCardForAction(actionName);
  if (!card) return null;
  return mintCard(state, card);
}

// Seed the entity + dossier-field clue cards onto the board once the player reaches the accusation.
// Fact cards are NOT seeded here — they only appear via real file-opens.
export function ensureCase2(state) {
  ensureBoard(state);
  if (state.evidence.case2Seeded) return;
  for (const id of CASE2.roster) {
    mintCard(state, { id: `entity:${id}`, kind: "entity", caseId: 2, entity: id, label: `Entity ${id}` });
    for (const f of CASE2.fields[id]) {
      mintCard(state, {
        id: `field:${id}:${f.id}`, kind: "field", caseId: 2, entity: id, fieldId: f.id,
        label: `${id} · ${f.label}: ${f.value}`
      });
    }
  }
  state.evidence.case2Seeded = true;
}

export function case2Hint(state) {
  const step = Math.min(Math.max(Number(state?.evidence?.case2HintStep || 0), 0), case2HintLadder.length - 1);
  return case2HintLadder[step];
}

export function attemptAccusation(state, { entityId, fieldId, factId } = {}) {
  ensureBoard(state);
  // Require a full triad of PINNED cards. Partial/missing → SILENT (no feedback, no penalty).
  if (!entityId || !fieldId || !factId) return { ok: false, reason: "incomplete", silent: true };
  const entityCard = getCard(state, `entity:${entityId}`);
  const fieldCard = getCard(state, `field:${entityId}:${fieldId}`);
  const factCard = getCard(state, factId);
  if (!entityCard || !fieldCard || !factCard) return { ok: false, reason: "missing-card", silent: true };
  if (!entityCard.pinned || !fieldCard.pinned || !factCard.pinned) return { ok: false, reason: "unpinned", silent: true };

  const t = CASE2.triad;
  const correct = entityId === t.entity && fieldId === t.fieldId && factId === t.factId;
  if (!correct) {
    // Complete-but-wrong: small penalty + hint ladder, but no part-by-part feedback, no progress wipe.
    state.evidence.case2Attempts = Number(state.evidence.case2Attempts || 0) + 1;
    state.evidence.case2HintStep = Math.min(Number(state.evidence.case2HintStep || 0) + 1, case2HintLadder.length - 1);
    state.addresses = Math.max(0, Number(state.addresses || 0) - ACCUSE_PENALTY);
    pushLog(state, "The triad does not hold. Re-examine the evidence.");
    return { ok: false, reason: "incorrect" };
  }

  // Correct: lock in the established fact + its links, eliminate the duplicate, reach the boss.
  setPinned(state, entityCard.id, true);
  drawLink(state, entityCard.id, fieldCard.id);
  drawLink(state, fieldCard.id, factCard.id);
  establishFact(state, {
    id: `triad:${entityId}`,
    label: `Entity ${entityId} is the duplicate — an active-route claim the route table refutes.`,
    cards: [entityCard.id, fieldCard.id, factCard.id]
  });
  state.evidence.case2Solved = true;
  state.evidence.eliminated = [...new Set([...(state.evidence.eliminated || []), entityId])];
  state.addresses = Number(state.addresses || 0) + ACCUSE_REWARD;
  pushLog(state, `Entity ${entityId}'s active-route claim is refuted by the route table. The duplicate is named.`);
  if (Number(state.substage || 1) < SUBSTAGE.BOSS) state.substage = SUBSTAGE.BOSS;
  return { ok: true, solved: true };
}

function pushLog(state, line) {
  state.log = [...(state.log || []), line].slice(-8);
}
