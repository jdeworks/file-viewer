// uncheat.test.mjs — Stage 7 boss un-cheat contract. The verdict's decisive evidence is an in-case
// DOCUMENT contradiction: the arbiter must pin BOTH Miss Marchmain's alibi statement and her postmarked
// torn letter and CONNECT them. Only that connection fires 7.alibi_contradiction_pinned; merely pinning
// (or pinning just one) never does. On reload, hasAlibiContradiction re-applies the unlock from the
// persisted action. No viewer/image dependency — the gate lives entirely inside the stage.
import assert from "node:assert/strict";
import {
  applyAlibiContradictionUnlock,
  connectAlibiContradiction,
  ensureBossBoard,
  hasAlibiContradiction
} from "../boss.js";
import { setPinned } from "../evidence-board.js";
import { BOSS_DOC_PAIR } from "../content.js";
import { defaultState } from "../state.js";

const ACTION = "alibi_contradiction_pinned";

function bus() {
  const calls = [];
  return {
    calls,
    setAction: (stage, action, detail) => { calls.push({ stage, action, detail }); },
    hasAction: (stage, action) => calls.some((c) => c.stage === stage && c.action === action),
    fired: () => calls.some((c) => c.stage === 7 && c.action === ACTION)
  };
}

// 1. Pinning ONE document, then connecting, must NOT fire the un-cheat.
{
  const state = defaultState();
  ensureBossBoard(state);
  const b = bus();
  setPinned(state, BOSS_DOC_PAIR[0], true);
  connectAlibiContradiction({ state, actions: b });
  assert.equal(b.fired(), false, "pinning one document and connecting must NOT fire the boss un-cheat");
  assert.equal(state.boss.unlocked, false);
}

// 2. Pinning BOTH but never connecting must NOT fire the un-cheat (pins alone are inert).
{
  const state = defaultState();
  ensureBossBoard(state);
  const b = bus();
  setPinned(state, BOSS_DOC_PAIR[0], true);
  setPinned(state, BOSS_DOC_PAIR[1], true);
  // No connect() call.
  assert.equal(b.fired(), false, "pinning both without connecting fires nothing");
  assert.equal(state.boss.unlocked, false);
}

// 3. Pinning BOTH and connecting fires exactly the boss action, keyed to stage 7.
{
  const state = defaultState();
  ensureBossBoard(state);
  const b = bus();
  setPinned(state, BOSS_DOC_PAIR[0], true);
  setPinned(state, BOSS_DOC_PAIR[1], true);
  const r = connectAlibiContradiction({ state, actions: b });
  assert.equal(r.ok, true);
  assert.equal(b.fired(), true, "connecting the alibi statement to the postmark fires the un-cheat");
  const rec = b.calls.find((c) => c.action === ACTION);
  assert.equal(rec.stage, 7);
  assert.equal(rec.detail.source, "evidence-board");
  assert.equal(rec.detail.entity, "F");
}

// 4. On reload, the mount path re-applies the unlock from the persisted action (hasAlibiContradiction).
{
  const b = bus();
  b.setAction(7, ACTION, { source: "evidence-board", entity: "F" });
  assert.equal(hasAlibiContradiction(b), true, "the persisted action is detected on remount");
  const state = defaultState();
  applyAlibiContradictionUnlock({ state, achievements: null, bell: null });
  assert.equal(state.boss.unlocked, true, "remount re-applies the unlock");
  assert.deepEqual(state.evidence.contradicted, ["F"]);
}

console.log("stage7 un-cheat tests passed");
