// Pure cross-stage bridge for the Stage 9 confrontation's Phase B (Fragmentation Stress Test).
//
// Each stage-10 memory mirrors a prior stage. That prior stage had ONE load-bearing "un-cheat"
// action — the moment the player used a real file-viewer feature to beat the boss honestly instead
// of bypassing it. The orchestrator exposes every prior un-cheat flag on `ctx.orchestrator.save`
// (mirrored from action-flags.js as `save.actions['<stage>.<action>']`). During Phase B the
// Defragmenter challenges each memory's trace: if the player DID the prior un-cheat, the trace is
// already on record and it concedes instantly; if they SKIPPED it (e.g. a speed-run), they must do
// the work now by re-opening that memory's echo artifact.
//
// This module is PURE and fully null-guarded: it reads only `save.actions[key]` and never mutates
// state, never touches the DOM, never calls Date.now()/Math.random(). All prose lives in
// content-confront.js — this file is the mapping + the flag read only.

// NOTE (stage renumbering, see docs/games/metagame/stages/stage9/research/): Entropy Field (the
// old stage 8) was removed from the game entirely; Observer State was promoted from stage 9 to
// stage 8. There are now 8 prior-stage memories here, not 9 — the `entropy` entry is gone (not
// renumbered to anything), and `observation` now points at stage 8's un-cheat.
export const MEMORY_UNCHEAT = Object.freeze({
  genesis:     { stage: 1, key: "1.cheat_disabled" },
  syntax:      { stage: 2, key: "2.search_passage" },
  memory:      { stage: 3, key: "3.diff_key_restored" },
  pattern:     { stage: 4, key: "4.recursion_blueprint_read" },
  signal:      { stage: 5, key: "5.counter_wave_calibrated" },
  protocol:    { stage: 6, key: "6.protocol_ch9_read" },
  identity:    { stage: 7, key: "7.alibi_contradiction_pinned" },
  observation: { stage: 8, key: "8.offline_mode_activated" }
});

// Read the prior-stage un-cheat flag for a memory off the orchestrator save (null-guarded).
// Returns { stage, key, done } — `done` is false whenever save / save.actions / the entry is absent.
export function uncheatForMemory(save, memoryId) {
  const entry = MEMORY_UNCHEAT[memoryId] || null;
  if (!entry) return { stage: null, key: null, done: false };
  const actions = save && typeof save === "object" && save.actions && typeof save.actions === "object"
    ? save.actions
    : null;
  const done = Boolean(actions && actions[entry.key]);
  return { stage: entry.stage, key: entry.key, done };
}

// How many of the given memories already have their prior un-cheat trace on record.
export function tracesOnRecord(save, memoryIds = []) {
  return memoryIds.reduce((n, id) => n + (uncheatForMemory(save, id).done ? 1 : 0), 0);
}
