// substages.js — Stage 7 Identity Arbiter: pure logic for the four investigation sub-stages that gate
// the boss (SS5). Each correct deduction advances state.substage; the boss is only reachable at SS5,
// so the run must be worked through before any commit (honors boss-never-from-start). No DOM/timers.

import { entityFields, entityFEventLog, SCAN_ENTITIES } from "./content.js";

export const SUBSTAGE = { SCAN: 1, DUP: 2, TIMELINE: 3, CHAIN: 4, BOSS: 5 };
export const FINAL_SUBSTAGE = 5;

// SS1 — Credential Scan: flag the one wrong field on each impostor (B/C/D/E).
export function flagField({ state, entityId, fieldId }) {
  const field = (entityFields[entityId] || []).find((f) => f.id === fieldId);
  if (!field) return { ok: false, reason: "unknown" };
  if (!field.wrong) {
    state.evidence.wrongFlagCount = Number(state.evidence.wrongFlagCount || 0) + 1;
    pushLog(state, "insufficient evidence — cross-check the ambient facts.");
    return { ok: false, reason: "not-contradiction" };
  }
  if (state.evidence.flags[entityId]) return { ok: true, already: true };
  state.evidence.flags[entityId] = fieldId;
  state.evidence.eliminated = [...new Set([...(state.evidence.eliminated || []), entityId])];
  state.addresses = Number(state.addresses || 0) + 10;
  pushLog(state, `Entity ${entityId}: ${field.reason}`);
  const complete = SCAN_ENTITIES.every((e) => state.evidence.flags[e]);
  if (complete) {
    if (Number(state.evidence.wrongFlagCount || 0) === 0) {
      state.addresses += 25;
      pushLog(state, "clean scan. +25 precision bonus.");
    }
    advance(state, SUBSTAGE.DUP);
  }
  return { ok: true, complete };
}

// SS2 — Duplicate Test: diff Entity F against Entity A. GPSInfo is the tampered field.
export function diffField({ state, fieldName }) {
  if (fieldName !== "GPSInfo") {
    pushLog(state, "this field matches across both dossiers.");
    return { ok: false };
  }
  state.evidence.partialContra = [...new Set([...(state.evidence.partialContra || []), "F.GPSInfo"])];
  state.evidence.dupTestComplete = true;
  state.addresses = Number(state.addresses || 0) + 15;
  pushLog(state, "Entity F's GPSInfo diverges from Entity A. Not yet decisive — the case continues.");
  advance(state, SUBSTAGE.TIMELINE);
  return { ok: true, complete: true };
}

// SS3 — Timeline Audit: mark the impossible activity-log entry (ev6).
export function markImpossible({ state, evId }) {
  const ev = entityFEventLog.find((e) => e.id === evId);
  if (!ev || !ev.impossible) {
    pushLog(state, "this entry is plausible. keep looking.");
    return { ok: false };
  }
  state.evidence.timelineContradictionCycle = ev.cycle;
  state.addresses = Number(state.addresses || 0) + 15;
  pushLog(state, ev.reason);
  advance(state, SUBSTAGE.CHAIN);
  return { ok: true, complete: true };
}

// SS4 — Reference Chase: opening the decommissioned anchor record breaks F's credential chain. This is
// triggered by a REAL viewer file-open (wired through viewer-actions/index), not an in-game shortcut.
export function markChainBroken({ state }) {
  if (state.evidence.chainBroken) return { ok: true, already: true };
  state.evidence.chainBroken = true;
  state.addresses = Number(state.addresses || 0) + 15;
  pushLog(state, "Entity F's credential chain references a decommissioned anchor. The chain is invalid.");
  advance(state, SUBSTAGE.BOSS);
  return { ok: true, complete: true };
}

function advance(state, to) {
  if (Number(state.substage || 1) < to) state.substage = to;
}

function pushLog(state, line) {
  state.log = [...(state.log || []), line].slice(-8);
}
