import { memories, memoryById, routeSummaryCopy } from "./content.js";
import {
  ACTION_NAME,
  STAGE_ID,
  achievementIds,
  achievementText,
  bellMessages,
  defragmenterConductLines,
  defragmenterLines,
  defragmenterRebuttalLines,
  echoThresholds,
  finalChoices,
  thresholds
} from "./messages.js";

export function getEchoCounts(state) {
  const entries = Object.values(state?.memories || {});
  return { witnessed: entries.filter((memory) => memory.echoWitnessed === true).length, total: echoThresholds.total };
}

// Witness a memory's echo (set by the host-app open of its artifact, via index's action subscription).
// No constraint on slot.state — an echo can be witnessed before or after resolving the memory.
export function witnessEcho({ state, memoryId }) {
  const slot = state?.memories?.[memoryId];
  if (!memoryById(memoryId) || !slot) return { ok: false, reason: "unknown-memory" };
  if (slot.echoWitnessed) return { ok: true, already: true };
  slot.echoWitnessed = true;
  return { ok: true, witnessed: getEchoCounts(state).witnessed };
}

// The Defragmenter's response scales with how many echoes have been witnessed: refuse (<5),
// caveat (5–8), full (9). Below the access threshold it shows no choices at all.
export function getDefragmenterRebuttal(state) {
  const echoCount = getEchoCounts(state).witnessed;
  if (echoCount < echoThresholds.defragmenterAccess) return { mode: "refuse", lines: [...defragmenterRebuttalLines.refuse], echoCount };
  const lines = getDefragmenterResponse(getThresholdState(state));
  const conduct = confrontConductLines(state); // post-confront reflection (empty until it's won)
  if (echoCount < echoThresholds.total) return { mode: "caveat", lines: [...lines, defragmenterRebuttalLines.caveat, ...conduct], echoCount };
  return { mode: "full", lines: [...lines, ...conduct], echoCount };
}

// Once the three-phase confrontation is won, the Defragmenter reflects on HOW it went: at most one
// conduct line (flawless / re-anchored / nearly-compacted, most-honest first) + one stance line.
// Pure + deterministic — reads only the completed confront flags. Empty before the fight is won.
function confrontConductLines(state) {
  const c = state?.confront;
  if (!c || !c.completed) return [];
  const out = [];
  if (!c.everCompacted && !c.everRewitnessed) out.push(defragmenterConductLines.clean);
  else if (c.everRewitnessed) out.push(defragmenterConductLines.rewitnessed);
  else out.push(defragmenterConductLines.compacted);
  const stanceLine = c.stance && defragmenterConductLines.stance[c.stance.dominant];
  if (stanceLine) out.push(stanceLine);
  return out;
}

export function getMemoryCounts(state) {
  const entries = Object.values(state?.memories || {});
  return {
    read: entries.filter((memory) => ["read", "resolved", "integrated"].includes(memory.state)).length,
    resolved: entries.filter((memory) => ["resolved", "integrated"].includes(memory.state)).length,
    integrated: entries.filter((memory) => memory.state === "integrated").length
  };
}

export function getThresholdState(state) {
  const counts = getMemoryCounts(state);
  const echoCount = getEchoCounts(state).witnessed;
  return {
    ...counts,
    echoCount,
    finalQuestionUnlocked: counts.resolved >= thresholds.finalQuestion,
    enrichedResponse: counts.resolved >= thresholds.enrichedResponse,
    memoryRouteComplete: counts.resolved >= thresholds.memoryRoute,
    fullCapstoneComplete: counts.integrated >= thresholds.capstoneIntegrated,
    defragmenterAccess: echoCount >= echoThresholds.defragmenterAccess,
    expandAvailable: echoCount >= echoThresholds.expand,
    understandAvailable: counts.integrated >= thresholds.capstoneIntegrated && echoCount >= echoThresholds.understand
  };
}

export function markMemoryRead({ state, memoryId, now = Date.now() }) {
  const memory = memoryById(memoryId);
  if (!memory || !state?.memories?.[memoryId]) return false;
  const slot = state.memories[memoryId];
  if (slot.state === "unread") slot.state = "read";
  if (!slot.readAt) slot.readAt = now;
  return true;
}

export function resolveMemory({ state, memoryId, choice, actions, achievements, bell, now = Date.now() }) {
  const memory = memoryById(memoryId);
  if (!memory || !state?.memories?.[memoryId]) return { ok: false, reason: "unknown-memory" };
  if (!memory.choices.includes(choice)) return { ok: false, reason: "unknown-choice" };

  const slot = state.memories[memoryId];
  const wasResolved = getMemoryCounts(state).resolved > 0;
  if (slot.state === "unread") {
    slot.state = "read";
    slot.readAt = slot.readAt || now;
  }
  slot.state = slot.state === "integrated" ? "integrated" : "resolved";
  slot.choice = choice;
  slot.resolvedAt = slot.resolvedAt || now;

  if (!wasResolved) {
    setAction(actions, STAGE_ID, ACTION_NAME, { source: "stage9-reflection", memory: memoryId });
    unlockAchievement(achievements, achievementIds.firstMemoryResolved, {
      id: achievementIds.firstMemoryResolved,
      stage: STAGE_ID,
      text: achievementText.firstMemoryResolved,
      action: "9.memory_resolved"
    });
    notifyBell(bell, bellMessages.firstMemoryResolved, "stage9.memory_resolved");
  }

  const thresholdsAfter = getThresholdState(state);
  if (thresholdsAfter.finalQuestionUnlocked && !state.meta.finalQuestionUnlockedAt) {
    state.meta.finalQuestionUnlockedAt = now;
    notifyBell(bell, bellMessages.finalQuestionUnlocked, "stage9.final_question");
  }
  if (thresholdsAfter.memoryRouteComplete && !state.meta.memoryRouteCompleteAt) {
    state.meta.memoryRouteCompleteAt = now;
  }
  return { ok: true, thresholds: thresholdsAfter };
}

export function integrateMemory({ state, memoryId, achievements, bell, now = Date.now() }) {
  const memory = memoryById(memoryId);
  const slot = state?.memories?.[memoryId];
  if (!memory || !slot) return { ok: false, reason: "unknown-memory" };
  if (!["resolved", "integrated"].includes(slot.state)) return { ok: false, reason: "not-resolved" };
  // Load-bearing echo gate: a memory cannot be folded in until its echo artifact has been witnessed.
  if (slot.state !== "integrated" && !slot.echoWitnessed) return { ok: false, reason: "echo-required" };
  slot.state = "integrated";
  slot.integratedAt = slot.integratedAt || now;

  const thresholdsAfter = getThresholdState(state);
  if (thresholdsAfter.fullCapstoneComplete && !state.meta.capstoneCompleteAt) {
    state.meta.capstoneCompleteAt = now;
    unlockAchievement(achievements, achievementIds.fullCapstone, {
      id: achievementIds.fullCapstone,
      stage: STAGE_ID,
      text: achievementText.fullCapstone,
      route: "full-capstone"
    });
    notifyBell(bell, bellMessages.fullCapstone, "stage9.full_capstone");
  }
  return { ok: true, thresholds: thresholdsAfter };
}

export function getFinalChoiceState(state) {
  const gate = getThresholdState(state);
  const rebuttal = getDefragmenterRebuttal(state);
  // The final question is only reachable once the three-phase confrontation is won. confront state
  // is read directly (no import) to avoid a boss.js ⇄ confront.js cycle.
  const confrontCompleted = Boolean(state?.confront?.completed);
  return {
    // 2026-07-11 playtest fix: `locked` is the ENTRY gate to the confrontation — the memory body alone
    // (≥5 resolved) now, matching confront.js's isConfrontReady. Defragmenter echo access no longer
    // gates entry; it only scales the rebuttal's quality (refuse/caveat/full, still below) and unlocks
    // the "expand"/"understand" ending variants (per-choice echoRequired, still below) — a genuine
    // buff, not the only door to a completed run. The renderer routes a non-locked, not-yet-won state
    // into the confront UI; only after confrontCompleted does it show the actual final choices.
    locked: !gate.finalQuestionUnlocked,
    confrontCompleted,
    gate,
    rebuttal,
    choices: finalChoices.map((choice) => ({
      ...choice,
      disabled: !gate.finalQuestionUnlocked || !confrontCompleted || Number(choice.echoRequired || 0) > gate.echoCount
    })),
    defragmenter: rebuttal.lines,
    routeSummary: getRouteSummary(state)
  };
}

export function getRouteSummary(state) {
  const gate = getThresholdState(state);
  const tier = getRouteTier(gate);
  const copy = routeSummaryCopy[tier];
  const resolvedMemories = memories
    .map((memory) => ({ memory, slot: state?.memories?.[memory.id] }))
    .filter(({ slot }) => ["resolved", "integrated"].includes(slot?.state));
  const integratedTitles = resolvedMemories
    .filter(({ slot }) => slot.state === "integrated")
    .map(({ memory }) => memory.title);
  const unresolvedTitles = memories
    .filter((memory) => !["resolved", "integrated"].includes(state?.memories?.[memory.id]?.state))
    .map((memory) => memory.title);
  return {
    tier,
    label: copy.label,
    headline: copy.headline,
    detail: copy.detail,
    countsText: `${gate.resolved} memories resolved, ${gate.integrated} integrated.`,
    finalChoiceText: getFinalChoiceText(state),
    memoryLines: resolvedMemories.map(({ memory, slot }) => ({
      id: memory.id,
      stage: memory.stage,
      title: memory.title,
      state: slot.state,
      choice: slot.choice,
      text: memory.reflections?.[slot.choice] || memory.resolvedText
    })),
    integratedText: integratedTitles.length
      ? `Integrated: ${formatList(integratedTitles)}.`
      : "No memories have been integrated yet.",
    remainingText: unresolvedTitles.length
      ? `Still unresolved: ${formatList(unresolvedTitles)}.`
      : "No prior memory remains unresolved."
  };
}

export function chooseFinal({ state, choiceId, onStageComplete, achievements, now = Date.now() }) {
  if (state.final?.completed) {
    return {
      ok: true,
      alreadyCompleted: true,
      result: {
        stage: STAGE_ID,
        choice: state.final.choice,
        memoryRouteComplete: getThresholdState(state).memoryRouteComplete,
        fullCapstoneComplete: getThresholdState(state).fullCapstoneComplete
      }
    };
  }
  const finalState = getFinalChoiceState(state);
  if (!finalState.gate.finalQuestionUnlocked) return { ok: false, reason: "not-enough-resolved", required: thresholds.finalQuestion };
  // 2026-07-11 playtest fix: Defragmenter echo access no longer gates the final choice — it only
  // gates the "expand"/"understand" ending VARIANTS below (per-choice echoRequired), same as it
  // always did for those two specifically. "continue"/"rest" (echoRequired: 0) are always reachable.
  // Boss-never-self-unlocks: the final choice is only valid after the three-phase confrontation is
  // won. Re-read live so even a console chooseFinal cannot skip the fight.
  if (!state?.confront?.completed) return { ok: false, reason: "confront-incomplete" };
  const choice = finalChoices.find((item) => item.id === choiceId);
  if (!choice) return { ok: false, reason: "unknown-choice" };
  // chooseFinal re-reads echo state live — even a console call can't skip the per-choice echo gate.
  if (choiceId === "expand" && !finalState.gate.expandAvailable) return { ok: false, reason: "echo-gate", required: echoThresholds.expand, echoCount: finalState.gate.echoCount };
  if (choiceId === "understand" && !finalState.gate.understandAvailable) return { ok: false, reason: "echo-gate", required: echoThresholds.understand, echoCount: finalState.gate.echoCount };
  state.final.choice = choice.id;
  state.final.route = choice.id;
  state.final.completed = true;
  state.final.completedAt = state.final.completedAt || now;
  unlockAchievement(achievements, `${achievementIds.routePrefix}${choice.id}`, {
    id: `${achievementIds.routePrefix}${choice.id}`,
    stage: STAGE_ID,
    text: achievementText.route?.[choice.id] || `Route: ${choice.id}`,
    route: choice.id
  });
  const result = {
    stage: STAGE_ID,
    choice: choice.id,
    memoryRouteComplete: finalState.gate.memoryRouteComplete,
    fullCapstoneComplete: finalState.gate.fullCapstoneComplete
  };
  if (typeof onStageComplete === "function") onStageComplete(result);
  return { ok: true, result };
}

function getDefragmenterResponse(gate) {
  const lines = [...defragmenterLines.base];
  if (gate.enrichedResponse) lines.push(defragmenterLines.enriched);
  if (gate.memoryRouteComplete) lines.push(defragmenterLines.complete);
  if (gate.fullCapstoneComplete) lines.push(defragmenterLines.capstone);
  return lines;
}

function getRouteTier(gate) {
  if (gate.fullCapstoneComplete) return "capstone";
  if (gate.memoryRouteComplete) return "complete";
  if (gate.enrichedResponse) return "enriched";
  return "minimum";
}

function getFinalChoiceText(state) {
  if (!state?.final?.completed) return "The final answer has not been chosen.";
  const choice = finalChoices.find((item) => item.id === state.final.choice);
  if (!choice) return "The final answer is recorded, but its wording is unavailable.";
  return `Final answer: ${choice.text}`;
}

function formatList(items) {
  if (items.length <= 2) return items.join(items.length === 2 ? " and " : "");
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

function setAction(actions, stage, action, detail) {
  if (actions && typeof actions.setAction === "function") actions.setAction(stage, action, detail);
}

function notifyBell(bell, text, id) {
  if (bell && typeof bell.push === "function") bell.push({ id, stage: STAGE_ID, text });
  else if (bell && typeof bell.say === "function") bell.say(text, { id, stage: STAGE_ID });
  else if (bell && typeof bell.add === "function") bell.add(text, { id, stage: STAGE_ID });
}

export function unlockAchievement(achievements, id, detail) {
  if (achievements && typeof achievements.unlockAchievement === "function") achievements.unlockAchievement(id, detail);
  else if (achievements && typeof achievements.unlock === "function") achievements.unlock(id, detail);
}
