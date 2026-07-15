// s1debug.js — Stage 1 TEST/DEBUG hook (window.__fvStage1). Not a player affordance: it lets the
// headless smoke grind to the boss, exercise the prestige mechanics, and resolve the click-contest
// WITHOUT real-time waiting. It does not bypass the boss gate (all tiers owned + bits ≥ ticket).

import { fromNumber } from './bignum.js';
import { simulateFight } from './boss-sim.js';
import { doPrestige, unlockedMechanics } from './s1prestige.js';
import { clickEcho } from './s1echoes.js';

// api = { state, cfg, save, renderAll, tick, addBits, canFightBoss, allSubStagesOwned,
//         onStageComplete, updateEcho }
export function installStage1Debug(api) {
  if (typeof window === 'undefined') return { destroy() {} };
  const { state, cfg, save } = api;

  function fightBoss(opts = {}) {
    if (!api.canFightBoss()) {
      return { gated: true, allTiers: api.allSubStagesOwned(), reason: 'boss locked — need all tiers owned and bits ≥ ticket' };
    }
    const result = simulateFight({ tapsPerSec: opts.tapsPerSec || 12, seed: (state.ticks || 0) + 1 });
    if (result.won) {
      state.defeated = Array.isArray(state.defeated) ? state.defeated : [];
      if (!state.defeated.includes(1)) state.defeated.push(1);
      save(state);
      if (typeof api.onStageComplete === 'function') api.onStageComplete({ stage: 1, defeated: true });
    }
    return result;
  }

  window.__fvStage1 = {
    state: () => state,
    // Run the real 100 ms logic tick n times (advances the tick-count-driven prestige mechanics).
    tick(n = 1) { for (let i = 0; i < n; i++) api.tick(); },
    // Simulate n Compute taps through the real economy.
    addBits(n = 1) { for (let i = 0; i < n; i++) api.addBits(); },
    // Fast-forward the run to a boss-ready state: every tier owned ≥1, bits = ticket, totalBits high
    // enough that a prestige is allowed. Does NOT defeat the boss — only makes the gate satisfiable.
    grind() {
      state.owned = state.owned || {};
      for (const t of (cfg.tiers || [])) state.owned[t.id] = Math.max(1, state.owned[t.id] || 0);
      state.tabsUnlocked = true;
      if (cfg.bossTicket) state.bits = { ...cfg.bossTicket };
      state.totalBits = fromNumber(1e18);
      save(state);
      api.renderAll();
    },
    canFightBoss: () => api.canFightBoss(),
    allTiersOwned: () => api.allSubStagesOwned(),
    prestige() {
      const r = doPrestige(state);
      state.runStartedAt = Date.now();
      save(state);
      api.renderAll();
      return { ...r, depth: state.prestigeCount };
    },
    mechanics: () => unlockedMechanics(state).map((m) => m.id),
    clickEcho() { const ok = clickEcho(state, cfg); if (ok) { save(state); if (api.updateEcho) api.updateEcho(); } return ok; },
    bossSolver: (opts) => simulateFight({ tapsPerSec: (opts && opts.tapsPerSec) || 12, seed: (state.ticks || 0) + 1 }),
    fightBoss,
  };

  return { destroy() { if (window.__fvStage1) delete window.__fvStage1; } };
}
