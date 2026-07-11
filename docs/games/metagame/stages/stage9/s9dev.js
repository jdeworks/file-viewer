// Pure dev-menu cheat functions for Stage 9. No DOM — all effects are state mutations only.
// Each exported function takes the live state object and mutates it in-place; the caller (renderer
// dev()) saves + repaints after. All cheats are deterministic (DEV_NOW instead of Date.now(), no
// Math.random()) so they compose cleanly and stay testable.
import { memories } from "./content.js";
import { witnessEcho } from "./boss.js";
import {
  challengedMemoryIds,
  startConfront,
  answerCompaction,
  rewitnessFragmentation,
  fragStatus,
  answerCore
} from "./confront.js";
import { coreQuestions } from "./content-confront.js";

// Fixed sentinel epoch used wherever a timestamp is required — guarantees determinism.
const DEV_NOW = 1;

// Grant all 9 echo tokens (echoWitnessed = true for every memory slot).
// Satisfies the ≥5-echo Defragmenter-access gate and the ≥9-echo "understand" choice gate.
// Also unlocks the integration path for every memory (integrateMemory requires echoWitnessed).
export function devGrantEchoes(state) {
  for (const m of memories) witnessEcho({ state, memoryId: m.id });
}

// Resolve all 9 memories (set to "resolved" with the first choice if no prior choice recorded).
// Satisfies finalQuestionUnlocked (≥5 resolved) and memoryRouteComplete (≥9 resolved).
// Does not downgrade a memory that is already "integrated".
export function devResolveAll(state) {
  for (const m of memories) {
    const slot = state.memories?.[m.id];
    if (!slot) continue;
    if (slot.state === "integrated") continue; // already past resolved; respect it
    slot.state = "resolved";
    slot.choice = slot.choice || m.choices[0]; // keep an existing recorded choice
    if (!slot.readAt) slot.readAt = DEV_NOW;
    if (!slot.resolvedAt) slot.resolvedAt = DEV_NOW;
  }
}

// Integrate all 9 memories (echoes + resolve are implied and applied first).
// Satisfies fullCapstoneComplete (≥9 integrated) — the highest-tier route summary.
export function devIntegrateAll(state) {
  devGrantEchoes(state); // echo gate: integrateMemory requires echoWitnessed
  devResolveAll(state);  // resolve gate: integrateMemory requires resolved/integrated state
  for (const m of memories) {
    const slot = state.memories?.[m.id];
    if (!slot) continue;
    slot.state = "integrated";
    if (!slot.integratedAt) slot.integratedAt = DEV_NOW;
  }
}

// Win the three-phase Defragmenter confrontation (Phases A → B → C), deterministically.
// Also ensures the echo + memory gates are satisfied (calls devGrantEchoes + devResolveAll first).
//
// Phase A — Compaction: affirms each challenged memory with its recorded choice (no mis-recalls,
// so everCompacted stays false → flawless-compaction badge is preserved for the player).
// Phase B — Fragmentation: re-witnesses all pending traces (save=null → no prior un-cheat flags
// are on record, so all must be re-witnessed manually, setting everRewitnessed=true).
// Phase C — Core: answers every question with the "seeker" stance (or first option as fallback).
export function devWinConfront(state) {
  devGrantEchoes(state);
  devResolveAll(state);
  startConfront(state); // idempotent: no-op if already started or completed
  if (state.confront?.completed) return; // already won — preserve the existing completedAt

  // Phase A — Compaction
  if (state.confront?.phase === "compaction") {
    for (const id of challengedMemoryIds(state)) {
      answerCompaction({ state, memoryId: id, choice: state.memories[id].choice, save: null, now: DEV_NOW });
    }
  }

  // Phase B — Fragmentation (save=null → no un-cheat flags → all traces need re-witnessing)
  if (state.confront?.phase === "fragmentation") {
    for (const id of challengedMemoryIds(state)) {
      if (fragStatus(state, null, id) === "pending") {
        rewitnessFragmentation({ state, memoryId: id, save: null, now: DEV_NOW });
      }
    }
  }

  // Phase C — Core (all "seeker"; first option as deterministic fallback)
  if (state.confront?.phase === "core") {
    for (const q of coreQuestions) {
      if ((state.confront?.core?.length ?? 0) >= coreQuestions.length) break;
      const opt = q.options.find((o) => o.stance === "seeker") || q.options[0];
      answerCore({ state, optionId: opt.id, save: null, achievements: null, now: DEV_NOW });
    }
  }
}

// ── dispatch table ─────────────────────────────────────────────────────────────────────────────

const CHEATS = {
  "grant-echoes":  devGrantEchoes,
  "resolve-all":   devResolveAll,
  "integrate-all": devIntegrateAll,
  "win-confront":  devWinConfront
};

// Entry point called by renderer.dev(id). Unknown ids are silently ignored (safe no-op).
export function devCheat(state, id) {
  const fn = CHEATS[id];
  if (fn) fn(state);
}
