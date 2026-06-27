// Stage 3 TEST/DEBUG hook (window.__fvStage3) — drives the headless smoke deterministically (no
// real-time play). NOT a player affordance and NOT a bypass: bodySolver fast-forwards the snapshot
// loop only via the same solve path a player uses, and the boss still needs BOTH corruption-8
// (reached through play) AND the diff-derived restoration key before it can fall.
//
//   window.__fvStage3 = {
//     state(),               // live save state
//     solveCurrent(),        // solve the current snapshot (advances solvedCount/corruption)
//     bodySolver(),          // play snapshots until corruption peaks at 8 → { reached, corruption, solved, aliasSeen }
//     deriveKey(),           // the seed-derived restoration key (what the v1/v2/v3 3-way diff reveals)
//     tryRestoreKey(key),    // attempt the boss un-cheat with a key
//     bossSolver(),          // defeat The Memory Leak once unlocked → bool
//     draftPending(),        // is a per-run boon draft available? → bool
//     draftOffer(),          // the current 3-boon offer (ids)
//     draft(id?),            // pick a boon (default = first offered) → bool
//   };
import { diffKeyFromState } from './content.js';
import { corruptionForRun } from './board.js';

export function installStage3Hook(api) {
  window.__fvStage3 = {
    state: () => api.state,
    solveCurrent: () => api.solveCurrent(),
    bodySolver: () => {
      let guard = 0;
      let aliasSeen = 0;
      while (!api.state.boss.corruption8Reached && guard < 300) {
        guard += 1;
        // Sample the current snapshot's aliased-clue count BEFORE solving it (proves the aliased
        // tier actually appears mid-climb, at corruption 3–5 mono snapshots).
        if (typeof api.aliasedNow === 'function') aliasSeen = Math.max(aliasSeen, Number(api.aliasedNow() || 0));
        if (!api.solveCurrent()) break;
      }
      return {
        reached: Boolean(api.state.boss.corruption8Reached),
        corruption: corruptionForRun(api.state.run),
        solved: api.state.run.solvedCount,
        aliasSeen,
      };
    },
    deriveKey: () => diffKeyFromState(api.state),
    tryRestoreKey: (key) => api.tryRestoreKey(key),
    bossSolver: () => api.bossSolver(),
    draftPending: () => (typeof api.draftPending === 'function' ? api.draftPending() : false),
    draftOffer: () => (typeof api.draftOffer === 'function' ? api.draftOffer() : []),
    draft: (id) => (typeof api.draft === 'function' ? api.draft(id) : false),
  };
  return () => { if (window.__fvStage3) delete window.__fvStage3; };
}
