// Protocol Codex run lifecycle helpers: seed a new run and record its local-only score.
// Kept outside renderer.js so the controller stays below the repository's soft LOC cap.

import { strHash } from "./combat.js";
import { createRun, finalActForWins, runScore } from "./run.js";

// Build and install a run from the selected mode. Date is sampled once here to derive a daily seed;
// no wall-clock value enters the deterministic combat loop.
export function beginProtocolRun({
  state,
  ascensionLevel = 0,
  mode = "standard",
  seedText = null,
  dailyKeyOverride = null,
}) {
  state.meta.runsStarted = (state.meta.runsStarted || 0) + 1;
  let seed;
  let dailyKey = null;
  if (mode === "daily") {
    dailyKey = currentDailyKey(dailyKeyOverride);
    seed = strHash(`daily:${dailyKey}`);
  } else if (mode === "custom" && String(seedText || "").trim()) {
    dailyKey = String(seedText).trim().slice(0, 40);
    seed = strHash(`custom:${dailyKey}`);
  } else {
    mode = "standard";
    seed = 1000 + state.meta.runsStarted * 7919 + (state.meta.protocolVersion || 0) * 131;
  }
  state.run = createRun({
    seed,
    version: state.meta.protocolVersion || 0,
    handshakes: 0,
    ascension: ascensionLevel,
    mode,
    dailyKey,
    finalAct: finalActForWins(state.meta.runsCleared || 0),
    permanentUpgrades: state.meta.permanentUpgrades || [],
  });
  state.ui.screen = "run";
  return state.run;
}

export function currentDailyKey(override = null) {
  if (override) return String(override);
  try { return new Date().toISOString().slice(0, 10); } catch { return "1970-01-01"; }
}

// Record self-competition locally: all-time best plus a best for each daily/custom seed.
export function recordProtocolScore(meta, run) {
  if (!run) return 0;
  const score = runScore(run);
  meta.lastScore = score;
  meta.lastMode = run.mode || "standard";
  meta.lastSeedKey = run.dailyKey || null;
  if (score > (meta.bestScore || 0)) meta.bestScore = score;
  if (run.dailyKey) {
    if (!meta.dailyBest || typeof meta.dailyBest !== "object") meta.dailyBest = {};
    if (score > (meta.dailyBest[run.dailyKey] || 0)) meta.dailyBest[run.dailyKey] = score;
  }
  return score;
}
