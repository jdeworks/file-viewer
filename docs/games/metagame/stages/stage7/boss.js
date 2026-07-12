import {
  ACHIEVEMENT_ID,
  ACHIEVEMENT_TEXT,
  ACTION_NAME,
  REQUIRED_ACTION,
  arbiterLines,
  bellMessages,
  lockedHintLadder
} from "./messages.js";
import { BOSS_DOCS, BOSS_DOC_PAIR, nameFor } from "./content.js";
import { drawLink, getCard, mintCard } from "./evidence-board.js";

export function hasAlibiContradiction(actions) {
  return Boolean(actions && typeof actions.hasAction === "function" && actions.hasAction(7, ACTION_NAME));
}

// The alibi contradiction is an optional buff, not a gate. A wrong accusation is genuinely evaluated:
// it eliminates that claimant (the SAME `contradicted` marker the buff uses) and costs real lead
// progress (ACCUSE_PENALTY, matching Case 2/3's cost), so a determined arbiter can always narrow the 6
// claimants down to Miss Vane through elimination alone — worst case 5 costly wrong guesses. Connecting
// the alibi statement to the postmarked letter pre-eliminates Miss Marchmain for free, skipping one cost.
const ACCUSE_PENALTY = 10; // matches accusation.js's Case 2/3 wrong-accusation cost

export function getBossLockState({ actions, state }) {
  const unlocked = hasAlibiContradiction(actions) || Boolean(state?.boss?.unlocked);
  const hintIndex = Math.min(Math.max(Number(state?.boss?.lockHintStep || 0), 0), lockedHintLadder.length - 1);
  return {
    unlocked,
    defeated: Boolean(state?.boss?.defeated),
    informationState: unlocked ? "Miss Marchmain contradicted" : "Vane / Marchmain unresolved",
    contradicted: [...(state?.evidence?.contradicted || [])],
    defeatPossible: true,
    requiredSelection: "A",
    hint: unlocked ? bellMessages.unlock : lockedHintLadder[hintIndex]
  };
}

export function recordLockedBossAttempt(state) {
  const boss = state.boss;
  boss.reached = true;
  boss.attempts = Number(boss.attempts || 0) + 1;
  boss.lockHintStep = Math.min(Number(boss.lockHintStep || 0) + 1, lockedHintLadder.length - 1);
  pushLog(state, bellMessages.wrongCommit);
  return getBossLockState({ actions: null, state });
}

// Seed the two verdict documents onto the board so they can be pinned (idempotent). Called at SS7.
export function ensureBossBoard(state) {
  for (const doc of BOSS_DOCS) mintCard(state, doc);
}

export function applyAlibiContradictionUnlock({ state, achievements, bell }) {
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

// The boss un-cheat: pin BOTH the alibi statement and the postmarked letter, then CONNECT them. Only a
// genuine connection (both pinned → drawLink succeeds) fires the action + unlocks; merely pinning does
// not. Fires through the same action bus the stage records with, so the mount subscription and the
// central save mirror both see 7.alibi_contradiction_pinned. Pure enough to unit-test with a mock bus.
export function connectAlibiContradiction({ state, actions, achievements, bell }) {
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

export function commitIdentity({ state, entity }) {
  const selected = String(entity || "").trim().toUpperCase();
  // The verdict is only reachable once the full investigation (Case 1 SS1–SS4 + Case 2 + Case 3
  // accusations) is complete (substage 7). Guards stale saves and any path that would let a commit
  // arrive before the run is worked through — boss-never-from-start.
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

export function pushLog(state, line) {
  state.log = [...(state.log || []), line].slice(-8);
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
