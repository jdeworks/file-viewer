import { memories, memoryById, routeSummaryCopy } from "./content.js";
import {
  ACTION_NAME,
  STAGE_ID,
  achievementIds,
  achievementText,
  bellMessages,
  defragmenterLines,
  finalChoices,
  thresholds
} from "./messages.js";

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
  return {
    ...counts,
    finalQuestionUnlocked: counts.resolved >= thresholds.finalQuestion,
    enrichedResponse: counts.resolved >= thresholds.enrichedResponse,
    memoryRouteComplete: counts.resolved >= thresholds.memoryRoute,
    fullCapstoneComplete: counts.integrated >= thresholds.capstoneIntegrated
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
    setAction(actions, STAGE_ID, ACTION_NAME, { source: "stage10-reflection", memory: memoryId });
    unlockAchievement(achievements, achievementIds.firstMemoryResolved, {
      id: achievementIds.firstMemoryResolved,
      stage: STAGE_ID,
      text: achievementText.firstMemoryResolved,
      action: "10.memory_resolved"
    });
    notifyBell(bell, bellMessages.firstMemoryResolved, "stage10.memory_resolved");
  }

  const thresholdsAfter = getThresholdState(state);
  if (thresholdsAfter.finalQuestionUnlocked && !state.meta.finalQuestionUnlockedAt) {
    state.meta.finalQuestionUnlockedAt = now;
    notifyBell(bell, bellMessages.finalQuestionUnlocked, "stage10.final_question");
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
    notifyBell(bell, bellMessages.fullCapstone, "stage10.full_capstone");
  }
  return { ok: true, thresholds: thresholdsAfter };
}

export function getFinalChoiceState(state) {
  const gate = getThresholdState(state);
  return {
    locked: !gate.finalQuestionUnlocked,
    gate,
    choices: finalChoices.map((choice) => ({
      ...choice,
      disabled: !gate.finalQuestionUnlocked
    })),
    defragmenter: getDefragmenterResponse(gate),
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

export function chooseFinal({ state, choiceId, onStageComplete, now = Date.now() }) {
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
  if (finalState.locked) return { ok: false, reason: "not-enough-resolved", required: thresholds.finalQuestion };
  const choice = finalChoices.find((item) => item.id === choiceId);
  if (!choice) return { ok: false, reason: "unknown-choice" };
  state.final.choice = choice.id;
  state.final.route = choice.id;
  state.final.completed = true;
  state.final.completedAt = state.final.completedAt || now;
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

function unlockAchievement(achievements, id, detail) {
  if (achievements && typeof achievements.unlockAchievement === "function") achievements.unlockAchievement(id, detail);
  else if (achievements && typeof achievements.unlock === "function") achievements.unlock(id, detail);
}
