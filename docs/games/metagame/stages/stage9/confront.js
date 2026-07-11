// Engine for the Stage 9 three-phase confrontation with the Defragmenter. Pure + deterministic:
// every decoy order is seeded from state.createdAt, never Date.now()/Math.random() in the live path
// (only `now = Date.now()` injectable defaults for timestamps). It never lowers the canonical
// slot.echoWitnessed — Phase B uses TRANSIENT confront flags so re-witnessing during the fight does
// not touch the integration gate. The boss is never self-unlocked: confront is only "ready" after
// the full memory body + ≥5 echoes (the same gate the final question already used).
import { memories, memoryById } from "./content.js";
import { getThresholdState, unlockAchievement } from "./boss.js";
import { uncheatForMemory } from "./crossstage.js";
import { achievementIds, achievementText, STAGE_ID } from "./messages.js";
import { coreQuestions, concedeLines, confrontLines, stanceProfiles, STANCE_KEYS } from "./content-confront.js";

const RESOLVED = new Set(["resolved", "integrated"]);

// The confront only challenges memories the player actually resolved, in memory (stage) order.
export function challengedMemoryIds(state) {
  return memories.filter((m) => RESOLVED.has(state?.memories?.[m.id]?.state)).map((m) => m.id);
}

// Entry gate: identical to the final-question gate (body resolved + Defragmenter echo access).
export function isConfrontReady(state) {
  const gate = getThresholdState(state);
  return gate.finalQuestionUnlocked && gate.defragmenterAccess;
}

function ensureConfront(state) {
  if (!state.confront || typeof state.confront !== "object") {
    state.confront = { phase: "idle", completed: false, completedAt: null, compaction: {}, fragmentation: {}, core: [], stance: null, everCompacted: false, everRewitnessed: false };
  }
  return state.confront;
}

// Begin (or no-op resume) the confrontation. Idempotent: re-calling after start/completion is safe.
export function startConfront(state) {
  const c = ensureConfront(state);
  if (c.completed || c.phase !== "idle") return c;
  c.phase = "compaction";
  c.compaction = {};
  for (const id of challengedMemoryIds(state)) c.compaction[id] = "pending";
  return c;
}

// ── deterministic decoy ordering (seeded from createdAt) ────────────────────────────────────────

function hashStr(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

// The 3 compaction options for a memory = its real stance + its two other stances, ORDER seeded from
// createdAt so the right answer is not always in the same slot. Deterministic per save.
export function getCompactionOptions(state, memoryId) {
  const memory = memoryById(memoryId);
  if (!memory) return [];
  const seed = `${Number(state?.createdAt) || 0}:${memoryId}`;
  return memory.choices
    .map((value, i) => ({ value, sort: hashStr(`${seed}:${i}:${value}`) }))
    .sort((a, b) => a.sort - b.sort || (a.value < b.value ? -1 : 1))
    .map((x) => x.value);
}

// ── Phase A — Compaction (active recall) ────────────────────────────────────────────────────────

export function answerCompaction({ state, memoryId, choice, save = null, now = Date.now() }) {
  const c = ensureConfront(state);
  if (c.phase !== "compaction") return { ok: false, reason: "wrong-phase" };
  if (!(memoryId in c.compaction)) return { ok: false, reason: "not-challenged" };
  const slot = state?.memories?.[memoryId];
  const correct = Boolean(slot && choice === slot.choice);
  c.compaction[memoryId] = correct ? "affirmed" : "compacted";
  if (!correct) c.everCompacted = true; // a single mis-recall forfeits the flawless-compaction badge
  advanceConfront(state, save, now);
  return { ok: true, correct, status: c.compaction[memoryId] };
}

// ── Phase B — Fragmentation Stress Test (transient; never touches slot.echoWitnessed) ────────────

// Effective per-memory trace status: conceded if the prior un-cheat is on record, else rewitnessed
// once the echo is re-opened during the fight, else pending. Reads save null-guarded every call.
export function fragStatus(state, save, memoryId) {
  if (uncheatForMemory(save, memoryId).done) return "conceded";
  if (state?.confront?.fragmentation?.[memoryId]) return "rewitnessed";
  return "pending";
}

export function rewitnessFragmentation({ state, memoryId, save = null, now = Date.now() }) {
  const c = ensureConfront(state);
  if (c.phase !== "fragmentation") return { ok: false, reason: "wrong-phase" };
  if (!challengedMemoryIds(state).includes(memoryId)) return { ok: false, reason: "not-challenged" };
  c.fragmentation[memoryId] = true; // TRANSIENT — confront-only, does not alter slot.echoWitnessed
  c.everRewitnessed = true; // a manual re-open means the prior run wasn't fully on record
  advanceConfront(state, save, now);
  return { ok: true, status: fragStatus(state, save, memoryId) };
}

// ── Phase C — Core Question (expressive; no gating) ──────────────────────────────────────────────

function optionStance(optionId) {
  for (const q of coreQuestions) {
    const opt = q.options.find((o) => o.id === optionId);
    if (opt) return opt.stance;
  }
  return null;
}

export function answerCore({ state, optionId, save = null, achievements = null, now = Date.now() }) {
  const c = ensureConfront(state);
  if (c.phase !== "core") return { ok: false, reason: "wrong-phase" };
  const index = c.core.length;
  const question = coreQuestions[index];
  if (!question || !question.options.some((o) => o.id === optionId)) return { ok: false, reason: "unknown-option" };
  const wasCompleted = Boolean(c.completed);
  c.core = [...c.core, optionId];
  advanceConfront(state, save, now);
  if (c.completed && !wasCompleted) awardConfrontAchievements(state, achievements);
  return { ok: true, answered: c.core.length, total: coreQuestions.length };
}

// On winning the confrontation, award the conduct badges earned across the three phases. Idempotent
// (the achievements store ignores re-unlocks); only fires on the completion transition.
function awardConfrontAchievements(state, achievements) {
  const c = state.confront || {};
  if (!c.everCompacted) {
    unlockAchievement(achievements, achievementIds.flawlessCompaction, {
      id: achievementIds.flawlessCompaction, stage: STAGE_ID, text: achievementText.flawlessCompaction, route: "confront"
    });
  }
  if (!c.everRewitnessed && challengedMemoryIds(state).length > 0) {
    unlockAchievement(achievements, achievementIds.allTracesConceded, {
      id: achievementIds.allTracesConceded, stage: STAGE_ID, text: achievementText.allTracesConceded, route: "confront"
    });
  }
}

function computeStance(answers) {
  const scores = { keeper: 0, seeker: 0, free: 0 };
  for (const optId of answers) { const s = optionStance(optId); if (s) scores[s] += 1; }
  let dominant = STANCE_KEYS[0];
  for (const k of STANCE_KEYS) if (scores[k] > scores[dominant]) dominant = k;
  return { dominant, scores };
}

// ── Phase advancement (cascading, idempotent) ───────────────────────────────────────────────────

function advanceConfront(state, save, now) {
  const c = state.confront;
  const ids = challengedMemoryIds(state);
  if (c.phase === "compaction" && ids.every((id) => c.compaction[id] === "affirmed")) c.phase = "fragmentation";
  if (c.phase === "fragmentation" && ids.every((id) => fragStatus(state, save, id) !== "pending")) c.phase = "core";
  if (c.phase === "core" && c.core.length >= coreQuestions.length) {
    c.stance = computeStance(c.core);
    c.phase = "done";
    c.completed = true;
    if (!c.completedAt) c.completedAt = now;
  }
}

// ── View model for the renderer ──────────────────────────────────────────────────────────────────

export function getConfrontState(state, save = null) {
  const c = ensureConfront(state);
  const ids = challengedMemoryIds(state);
  const meta = (id) => { const m = memoryById(id); return { id, stage: m?.stage ?? null, title: m?.title ?? id, prompt: m?.prompt ?? "" }; };

  const compactionItems = ids.map((id) => ({
    ...meta(id),
    status: c.compaction[id] || "pending",
    options: getCompactionOptions(state, id)
  }));
  const fragItems = ids.map((id) => {
    const status = fragStatus(state, save, id);
    return { ...meta(id), status, line: status === "pending" ? confrontLines.fragmentation.pending : (status === "conceded" ? concedeLines[id] : confrontLines.fragmentation.rewitnessed) };
  });
  const coreItems = c.core.map((optId, i) => ({ questionId: coreQuestions[i]?.id, optionId: optId }));
  const currentQuestion = c.phase === "core" ? coreQuestions[c.core.length] || null : null;

  return {
    ready: isConfrontReady(state),
    started: c.phase !== "idle",
    completed: Boolean(c.completed),
    phase: c.phase,
    challenged: ids.map(meta),
    compaction: {
      items: compactionItems,
      remaining: compactionItems.filter((i) => i.status !== "affirmed").length,
      done: compactionItems.length > 0 && compactionItems.every((i) => i.status === "affirmed")
    },
    fragmentation: {
      items: fragItems,
      remaining: fragItems.filter((i) => i.status === "pending").length,
      done: fragItems.length > 0 && fragItems.every((i) => i.status !== "pending")
    },
    core: {
      questions: coreQuestions,
      answered: coreItems,
      current: currentQuestion,
      done: c.core.length >= coreQuestions.length
    },
    stance: c.stance ? { ...c.stance, profile: stanceProfiles[c.stance.dominant] } : null
  };
}
