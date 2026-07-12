// substages.js — Stage 7 "The Meridian Estate Affair": pure logic for the four investigation sub-stages
// that gate the verdict. Each correct deduction advances state.substage; the verdict is only reachable
// once the run is worked through (honors boss-never-from-start). No DOM/timers.

import { entityFields, entityFEventLog, SCAN_ENTITIES, DUP_FIELDS, nameFor } from "./content.js";
import { establishFact } from "./evidence-board.js";

export const SUBSTAGE = { SCAN: 1, DUP: 2, TIMELINE: 3, CHAIN: 4, ACCUSE: 5, ACCUSE3: 6, BOSS: 7 };
export const FINAL_SUBSTAGE = 7;

// SS1 — Witness Statements: flag the one contradicting line on each rival claimant (B/C/D/E).
export function flagField({ state, entityId, fieldId }) {
  const field = (entityFields[entityId] || []).find((f) => f.id === fieldId);
  if (!field) return { ok: false, reason: "unknown" };
  if (!field.wrong) {
    state.evidence.wrongFlagCount = Number(state.evidence.wrongFlagCount || 0) + 1;
    pushLog(state, "not enough to disprove it — check it against what you already know.");
    return { ok: false, reason: "not-contradiction" };
  }
  if (state.evidence.flags[entityId]) return { ok: true, already: true };
  state.evidence.flags[entityId] = fieldId;
  state.evidence.eliminated = [...new Set([...(state.evidence.eliminated || []), entityId])];
  state.addresses = Number(state.addresses || 0) + 10;
  pushLog(state, `${nameFor(entityId)}: ${field.reason}`);
  const complete = SCAN_ENTITIES.every((e) => state.evidence.flags[e]);
  if (complete) {
    if (Number(state.evidence.wrongFlagCount || 0) === 0) {
      state.addresses += 25;
      pushLog(state, "a clean reading. +25 for precision.");
    }
    advance(state, SUBSTAGE.DUP);
  }
  return { ok: true, complete };
}

// SS2 — Two Statements: diff Miss Marchmain (F) against Miss Vane (A). The whereabouts line is altered.
export function diffField({ state, fieldName }) {
  const info = DUP_FIELDS[fieldName];
  if (!info?.tamper) {
    // A benign-difference decoy (the clerk line) gives a specific nudge; anything else simply matches.
    pushLog(state, info?.benignDiff ? info.note : "this line matches across both statements.");
    return { ok: false, reason: info?.benignDiff ? "benign-diff" : "match" };
  }
  state.evidence.partialContra = [...new Set([...(state.evidence.partialContra || []), "F.whereabouts"])];
  state.evidence.dupTestComplete = true;
  state.addresses = Number(state.addresses || 0) + 15;
  pushLog(state, "Miss Marchmain's whereabouts differ from Miss Vane's. Not yet decisive — the case continues.");
  advance(state, SUBSTAGE.TIMELINE);
  return { ok: true, complete: true };
}

// SS3 — Movements Audit: mark the impossible entry in Miss Marchmain's stated movements (ev6).
export function markImpossible({ state, evId }) {
  const ev = entityFEventLog.find((e) => e.id === evId);
  if (!ev || !ev.impossible) {
    pushLog(state, "this entry is plausible. keep looking.");
    return { ok: false };
  }
  state.evidence.timelineContradictionCycle = ev.when;
  state.addresses = Number(state.addresses || 0) + 15;
  pushLog(state, ev.reason);
  advance(state, SUBSTAGE.CHAIN);
  return { ok: true, complete: true };
}

// SS4 — Paper Trail: opening the rescinded appointment breaks Miss Marchmain's paper trail. This is
// triggered by a REAL viewer file-open (wired through viewer-actions/index), not an in-game shortcut.
// Breaking the trail closes Case 1 and opens Case 2 (The Second Claim), not the verdict.
export function markChainBroken({ state }) {
  if (state.evidence.chainBroken) return { ok: true, already: true };
  state.evidence.chainBroken = true;
  state.addresses = Number(state.addresses || 0) + 15;
  pushLog(state, "Miss Marchmain's claim rests on an appointment the estate rescinded. The trail is broken.");
  pushLog(state, "A second set of claimants presses the estate. Open the records and name the impostor.");
  carryCase1Facts(state);
  advance(state, SUBSTAGE.ACCUSE);
  return { ok: true, complete: true };
}

// Continuity: when Case 1 closes (the paper trail breaks) its four deductions are promoted onto the
// evidence board as persistent ESTABLISHED facts, so the later cases read as one continuous file. Idempotent.
export function carryCase1Facts(state) {
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

function pushLog(state, line) {
  state.log = [...(state.log || []), line].slice(-8);
}
