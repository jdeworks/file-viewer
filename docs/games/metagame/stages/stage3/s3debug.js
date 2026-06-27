// Stage 3 TEST/DEBUG hook (window.__fvStage3) — drives the headless smoke deterministically (no
// real-time play). NOT a player affordance and NOT a bypass: bodySolver fast-forwards the snapshot
// loop only via the same solve path a player uses, and the boss still needs BOTH corruption-8
// (reached through play) AND the diff-derived restoration key before it can fall.
//
//   window.__fvStage3 = {
//     state(),               // live save state
//     solveCurrent(),        // solve the current snapshot (advances solvedCount/corruption)
//     bodySolver(),          // play snapshots until corruption peaks at 8 → { reached, corruption, solved }
//     deriveKey(),           // the seed-derived restoration key (what the v1/v2 diff reveals)
//     tryRestoreKey(key),    // attempt the boss un-cheat with a key
//     bossSolver(),          // defeat The Memory Leak once unlocked → bool
//   };
import { diffKeyFromState } from './content.js';
import { corruptionForRun } from './board.js';

export function installStage3Hook(api) {
  window.__fvStage3 = {
    state: () => api.state,
    solveCurrent: () => api.solveCurrent(),
    bodySolver: () => {
      let guard = 0;
      while (!api.state.boss.corruption8Reached && guard < 300) {
        guard += 1;
        if (!api.solveCurrent()) break;
      }
      return {
        reached: Boolean(api.state.boss.corruption8Reached),
        corruption: corruptionForRun(api.state.run),
        solved: api.state.run.solvedCount,
      };
    },
    deriveKey: () => diffKeyFromState(api.state),
    tryRestoreKey: (key) => api.tryRestoreKey(key),
    bossSolver: () => api.bossSolver(),
  };
  return () => { if (window.__fvStage3) delete window.__fvStage3; };
}
