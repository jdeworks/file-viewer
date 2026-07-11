// testhook.js — Stage 8 Observer State: the window.__fvStage8 smoke/debug hook (no player affordance).
// It does NOT bypass anything — each call CROSSes a real level at its real solve moment for the seed
// that level actually uses right now. rhythm's solveMoment is a press-time ARRAY (one per beat) → each
// is a genuine timed CROSS. The onlineUnstable back third + boss reseed while online, so solveOffline
// only completes once Offline Mode is active (solveStableBody stalls at the first unstable level).
//
// 2026-07-11 (ship steering): geometry()/steerTo() expose the new player-steered ship state for
// deterministic test coverage. steerTo(angleDeg) sets shipAngle DIRECTLY — it deliberately does NOT
// simulate a timed key-hold (rAF dt-integration under CI jitter feeding an exact-value assertion is
// a textbook flaky test); every test that needs a specific ship position should use steerTo(), never
// a wall-clock hold simulation.
import { levelConfig, solveMoment, BOSS_LEVEL } from "./game.js";
import { FIXED_OFFLINE_SEED } from "./messages.js";

export function installTestHook(api) {
  const hook = {
    state: () => api.state,
    config: (level) => levelConfig(level ?? api.state.currentLevel),
    aids: () => ({ clarity: api.state.clarity, ...api.getAids() }),
    buyAid: (id) => api.buyAid(id),
    crossAt(ms) { api.crossAt(Number(ms) || 0); },
    geometry: () => api.geometry(),
    steerTo: (angleDeg) => api.steerTo(angleDeg),
    // CROSS the current level at its perfect moment(s) for the seed it actually uses right now.
    solveLevel() {
      const sol = solveMoment(api.activeSeed(), api.state.currentLevel);
      for (const t of (Array.isArray(sol) ? sol : [sol])) api.crossAt(t);
      return api.state.currentLevel;
    },
    // Clear the learnable front. Online this STALLS at the first onlineUnstable level (its gap reseeds
    // on every commit) — proving the back third demands the offline un-cheat.
    solveStableBody() {
      let guard = 0;
      while (api.state.currentLevel < BOSS_LEVEL && !levelConfig(api.state.currentLevel).onlineUnstable && guard++ < 96) {
        const before = api.state.currentLevel;
        this.solveLevel();
        if (api.state.currentLevel === before) break;
      }
      return api.state.currentLevel;
    },
    // Full run to defeat (assumes Offline Mode already activated by the player/smoke).
    solveOffline() {
      let guard = 0;
      while (api.state.currentLevel < BOSS_LEVEL && guard++ < 96) {
        const before = api.state.currentLevel;
        this.solveLevel();
        if (api.state.currentLevel === before) break;
      }
      api.reobserve();
      api.crossAt(solveMoment(FIXED_OFFLINE_SEED, BOSS_LEVEL));
      return Boolean(api.state.boss.defeated);
    }
  };
  window.__fvStage8 = hook;
  return () => { if (window.__fvStage8 === hook) delete window.__fvStage8; };
}
