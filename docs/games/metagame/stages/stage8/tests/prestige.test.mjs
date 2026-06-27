// prestige.test.mjs — Stage 8 Microstate prestige loop: gating, Cores, reset, permanent multiplier.
import assert from "node:assert/strict";
import { defaultState, normalizeState, snapshotRun, restoreRun } from "../state.js";
import { microstateCollapse, prestigeAvailable, coresPreview, prestigeMultFor } from "../prestige.js";
import { buyTech } from "../tech.js";

// ── multiplier curve ───────────────────────────────────────────────────────────────────────────────
{
  assert.equal(prestigeMultFor(0), 1, "no cores ⇒ ×1");
  assert.ok(prestigeMultFor(5) > prestigeMultFor(0), "cores raise the multiplier");
}

// ── collapse is gated behind a first clear AND a non-trivial run ────────────────────────────────────
{
  const s = defaultState();
  s.totalStatesEarned = 5000; s.stormsSurvived = 3;
  assert.equal(prestigeAvailable(s).ok, false, "cannot collapse before the field is ever cleared");
  s.meta.firstClearComplete = true;
  assert.equal(prestigeAvailable(s).ok, true, "collapse available after first clear with depth");
  const shallow = defaultState();
  shallow.meta.firstClearComplete = true;
  assert.equal(prestigeAvailable(shallow).reason, "too-shallow", "a zero-depth run banks nothing");
}

// ── collapse banks Cores (depth-scaled), resets the field, sets a permanent multiplier ──────────────
{
  const s = defaultState();
  s.meta.firstClearComplete = true;
  s.totalStatesEarned = 1200; // 1200/400 = 3
  s.stormsSurvived = 3;       // +3 → 6 cores
  s.cycle = 25; s.states = 800; s.scrap = 50; s.insight = 90;
  s.act = 4; s.onlineSectors = ["core", "alpha", "beta", "gamma"];
  // a researched tech persists across the collapse (permanent progress)
  s.insight = 5000; s.scrap = 5000; buyTech(s, "rep1");
  const preview = coresPreview(s);
  const r = microstateCollapse(s);
  assert.equal(r.ok, true, "collapsed");
  assert.equal(r.coresAwarded, preview, "Cores match the preview");
  assert.equal(r.totalCores, preview, "first collapse banks the preview");
  assert.equal(s.meta.cores, preview, "cores stored in meta");
  assert.equal(s.prestigeMult, prestigeMultFor(preview), "permanent multiplier set");
  // field reset to a fresh run
  assert.equal(s.cycle, 1, "cycle reset");
  assert.equal(s.totalStatesEarned, 0, "earnings reset");
  assert.equal(s.act, 1, "act reset");
  assert.deepEqual(s.onlineSectors, ["core"], "network reset to core sector");
  assert.equal(s.nodes.length, 14, "back to 14 nodes");
  assert.equal(s.meta.collapseLevel, 1, "collapse level incremented");
  // permanent progress survives
  assert.equal(s.tech.rep1, true, "tech persists across collapse");
  assert.equal(s.repairBudgetBonus, 3, "tech bonus persists across collapse");
  assert.equal(s.meta.firstClearComplete, true, "still marked cleared");
}

// ── Cores + multiplier survive normalize + snapshot/restore ────────────────────────────────────────
{
  const s = defaultState();
  s.meta.cores = 4;
  const norm = normalizeState(snapshotRun(s));
  assert.equal(norm.meta.cores, 4, "cores survive normalize");
  assert.equal(norm.prestigeMult, prestigeMultFor(4), "multiplier rebuilt from cores");
  const t = defaultState();
  restoreRun(t, snapshotRun(s));
  assert.equal(t.meta.cores, 4, "cores survive restore");
}

console.log("stage8 prestige tests passed");
