import {
  ACHIEVEMENT_ID,
  ACHIEVEMENT_TEXT,
  ACTION_NAME,
  arbiterLines,
  bellMessages,
  lockedHintLadder
} from "./messages.js";

export function hasExifContradiction(actions) {
  return Boolean(actions && typeof actions.hasAction === "function" && actions.hasAction(7, ACTION_NAME));
}

export function getBossLockState({ actions, state }) {
  const unlocked = hasExifContradiction(actions) || Boolean(state?.boss?.unlocked);
  const hintIndex = Math.min(Math.max(Number(state?.boss?.lockHintStep || 0), 0), lockedHintLadder.length - 1);
  return {
    unlocked,
    defeated: Boolean(state?.boss?.defeated),
    informationState: unlocked ? "Entity F contradicted" : "A/F unresolved",
    contradicted: [...(state?.evidence?.contradicted || [])],
    defeatPossible: unlocked,
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

export function applyExifContradictionUnlock({ state, achievements, bell }) {
  const boss = state.boss;
  const firstUnlock = !boss.unlocked;
  boss.unlocked = true;
  markContradicted(state, "F");
  if (firstUnlock) {
    pushLog(state, arbiterLines.fContradicted);
    pushLog(state, arbiterLines.stillChoose);
    notifyBell(bell, bellMessages.unlock, "stage7.exif_contradiction_found");
    unlockAchievement(achievements, ACHIEVEMENT_ID, {
      id: ACHIEVEMENT_ID,
      stage: 7,
      text: ACHIEVEMENT_TEXT,
      action: "7.exif_contradiction_found",
      entity: "F"
    });
  }
  return firstUnlock;
}

export function inspectContradictoryExif({ state, actions, achievements, bell, field = "GPSInfo", entity = "F" }) {
  if (entity !== "F" || field !== "GPSInfo") {
    pushLog(state, "metadata inspected. no decisive contradiction found.");
    return { ok: false };
  }
  actions?.setAction?.(7, ACTION_NAME, {
    source: "image-metadata",
    file: "entity_f_verification.png",
    field: "GPSInfo",
    entity: "F"
  });
  applyExifContradictionUnlock({ state, achievements, bell });
  return { ok: true, contradicted: "F" };
}

export function commitIdentity({ state, entity }) {
  const selected = String(entity || "").trim().toUpperCase();
  // The boss is only reachable once the investigation (SS1–SS4) is complete. Guards stale saves and
  // any path that would let a commit arrive before the run is worked through.
  if (Number(state.substage || 1) < 5) return { ok: false, reason: "not-yet-boss" };
  state.boss.reached = true;
  state.evidence.selectedEntity = selected;

  if (!state.boss.unlocked) {
    recordLockedBossAttempt(state);
    return { ok: false, reason: "locked" };
  }

  state.boss.attempts = Number(state.boss.attempts || 0) + 1;
  if (selected !== "A") {
    pushLog(state, `${selected || "unknown"} is not the real credential holder.`);
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
