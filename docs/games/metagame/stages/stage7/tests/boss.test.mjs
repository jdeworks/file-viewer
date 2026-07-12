import assert from "node:assert/strict";
import {
  applyAlibiContradictionUnlock,
  commitIdentity,
  connectAlibiContradiction,
  ensureBossBoard,
  getBossLockState,
  recordLockedBossAttempt
} from "../boss.js";
import { getCard, setPinned } from "../evidence-board.js";
import { BOSS_DOC_PAIR } from "../content.js";
import { defaultState } from "../state.js";

const ACTION = "alibi_contradiction_pinned";
const lockedActions = { hasAction: () => false };
const unlockedActions = { hasAction: (stage, action) => stage === 7 && action === ACTION };

{
  const state = defaultState();
  const lock = getBossLockState({ actions: lockedActions, state });
  assert.equal(lock.unlocked, false);
  assert.equal(lock.informationState, "Vane / Marchmain unresolved");
  // The alibi contradiction is an optional buff now, not a gate — the verdict is always defeatPossible,
  // even with zero board progress (a determined arbiter can accuse their way there).
  assert.equal(lock.defeatPossible, true);
  assert.equal(commitIdentity({ state, entity: "A" }).reason, "not-yet-boss", "no commit before the verdict substage");
  state.substage = 5;
  assert.equal(commitIdentity({ state, entity: "A" }).reason, "not-yet-boss", "Case 2 accusation (5) is still before the verdict");
  state.substage = 6;
  assert.equal(commitIdentity({ state, entity: "A" }).reason, "not-yet-boss", "Case 3 accusation (6) is still before the verdict");
  state.substage = 7;
  // A correct accusation wins EVEN with zero board progress — it's no longer refused outright.
  const win = commitIdentity({ state, entity: "A" });
  assert.equal(win.ok, true, "a correct accusation wins even before the alibi is ever connected");
  assert.equal(state.boss.defeated, true);
}

{
  // A wrong accusation before the alibi is connected is a real, costly setback (not a free non-attempt):
  // it eliminates the accused claimant and costs leads — never a dead-end refusal.
  const state = defaultState();
  state.substage = 7;
  state.addresses = 100;
  const wrong = commitIdentity({ state, entity: "B" });
  assert.equal(wrong.ok, false);
  assert.equal(wrong.reason, "wrong-entity");
  assert.equal(state.boss.defeated, false);
  assert.equal(state.addresses, 90, "wrong accusation costs the same 10-lead penalty as Case 2/3");
  assert.deepEqual(state.evidence.contradicted, ["B"], "the wrong claimant is eliminated, same marker the alibi buff uses");
  // The field is genuinely narrowable: eliminate every wrong claimant in turn, then win on Miss Vane.
  for (const bad of ["C", "D", "E", "F"]) commitIdentity({ state, entity: bad });
  assert.deepEqual(state.evidence.contradicted.sort(), ["B", "C", "D", "E", "F"], "all five wrong claimants eliminated through costly accusations alone");
  const finalWin = commitIdentity({ state, entity: "A" });
  assert.equal(finalWin.ok, true, "Miss Vane still wins after grinding out every wrong claimant blind");
  assert.equal(state.addresses, 200, "50 left after 5 penalties, +150 verdict reward on the final correct commit");
}

{
  const state = defaultState();
  recordLockedBossAttempt(state);
  recordLockedBossAttempt(state);
  const lock = getBossLockState({ actions: lockedActions, state });
  assert.equal(state.boss.attempts, 2);
  assert.match(lock.hint, /postmark|alibi|letter|Marchmain|Vane/i);
}

{
  const state = defaultState();
  const achievements = [];
  const bells = [];
  const first = applyAlibiContradictionUnlock({
    state,
    achievements: { unlockAchievement: (id, detail) => achievements.push({ id, detail }) },
    bell: { push: (entry) => bells.push(entry) }
  });
  const second = applyAlibiContradictionUnlock({
    state,
    achievements: { unlockAchievement: (id, detail) => achievements.push({ id, detail }) },
    bell: { push: (entry) => bells.push(entry) }
  });
  const lock = getBossLockState({ actions: unlockedActions, state });
  assert.equal(first, true);
  assert.equal(second, false);
  assert.equal(lock.unlocked, true);
  assert.deepEqual(state.evidence.contradicted, ["F"]);
  assert.equal(state.boss.defeated, false);
  assert.equal(achievements.length, 1);
  assert.equal(bells.length, 1);
}

// ── connectAlibiContradiction: the in-stage board-connect boss gate ─────────────────────────────────
{
  // Pinning is not enough — a connection needs BOTH documents pinned. With neither/one pinned, no fire.
  const state = defaultState();
  ensureBossBoard(state);
  const calls = [];
  const actions = { setAction: (stage, action, detail) => calls.push({ stage, action, detail }) };
  const [alibiId, letterId] = BOSS_DOC_PAIR;

  let r = connectAlibiContradiction({ state, actions });
  assert.equal(r.ok, false, "neither pinned → no connection");
  assert.equal(calls.length, 0, "no action fired");
  assert.equal(state.boss.unlocked, false);

  setPinned(state, alibiId, true);
  r = connectAlibiContradiction({ state, actions });
  assert.equal(r.ok, false, "only one pinned → still no connection");
  assert.equal(calls.length, 0, "merely pinning one does NOT fire the boss un-cheat");

  setPinned(state, letterId, true);
  r = connectAlibiContradiction({ state, actions });
  assert.equal(r.ok, true, "both pinned + connect → fires");
  assert.equal(r.contradicted, "F");
  assert.equal(calls.length, 1, "connecting the two documents fires exactly one action");
  assert.equal(calls[0].stage, 7);
  assert.equal(calls[0].action, ACTION);
  assert.equal(state.boss.unlocked, true, "the connection unlocks the verdict");
  assert.deepEqual(state.evidence.contradicted, ["F"], "Miss Marchmain is contradicted");
  // The link is now on the board.
  assert.ok(getCard(state, alibiId).pinned && getCard(state, letterId).pinned);
}

{
  const state = defaultState();
  state.substage = 7;
  state.boss.unlocked = true;
  state.evidence.contradicted = ["F"];
  const wrong = commitIdentity({ state, entity: "F" });
  assert.equal(wrong.ok, false);
  assert.equal(wrong.reason, "wrong-entity");
  assert.equal(state.boss.defeated, false);
  const right = commitIdentity({ state, entity: "A" });
  assert.equal(right.ok, true);
  assert.equal(state.boss.defeated, true);
  assert.equal(state.meta.firstClearComplete, true);
  assert.equal(state.addresses, 150);
}

console.log("stage7 boss tests passed");
