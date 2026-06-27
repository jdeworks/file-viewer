// test-hook.js — Stage 7 window.__fvStage7 debug/smoke hook. Split out of renderer.js to keep it under
// the LOC cap. Fast-forwards the IN-GAME deductions, but the load-bearing real-file gates are NOT
// bypassed: solveCase2 needs the route table OPENED and solveCase3 needs the ledger SEARCHED before the
// correct triad's fact card exists, so each returns ok:false until the player engages the real file.

import { flagField, diffField, markImpossible } from "./substages.js";
import { accuseFromBoard, ensureCase2, ensureCase3 } from "./accusation.js";
import { getCard, setPinned } from "./evidence-board.js";
import { SCAN_ENTITIES, entityFields, entityFEventLog } from "./content.js";

export function installStage7Hook({ state, persistAndPaint }) {
  window.__fvStage7 = {
    state: () => state,
    solveInvestigation() {
      for (const id of SCAN_ENTITIES) flagField({ state, entityId: id, fieldId: entityFields[id].find((f) => f.wrong).id });
      diffField({ state, fieldName: "GPSInfo" });
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

export function removeStage7Hook() {
  if (window.__fvStage7) delete window.__fvStage7;
}
