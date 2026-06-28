// s1dev.js — Stage 1 dev-menu cheat helpers.
// Pure functions: take state (+ optional cfg), mutate in place, return nothing.
// No DOM, no Date.now — unit-testable in Node without a browser.

/**
 * Reveal the tab bar without waiting for bits to accumulate.
 * Sets tabsUnlocked + the two common milestone flags so tabs + score HUD appear.
 */
export function cheatUnlockTabs(state) {
  state.tabsUnlocked = true;
  state.helpersUnlocked = true;
  const needed = ['score-unlock', 'sound-unlock'];
  state.milestones = [...new Set([...(state.milestones || []), ...needed])];
}

/**
 * Make the "Confront" boss button appear live.
 * Unlocks tabs, sets every tier to ≥1 (satisfies allSubStagesOwned),
 * and sets bits + totalBits to the boss-ticket value so the gate is met.
 *
 * @param {object} state  - live stage state (mutated in place)
 * @param {object} cfg    - stage config from stages.js (.tiers[], .bossTicket {m,e})
 */
export function cheatBossReady(state, cfg) {
  cheatUnlockTabs(state);
  state.owned = state.owned || {};
  for (const t of (cfg.tiers || [])) {
    if ((state.owned[t.id] || 0) < 1) state.owned[t.id] = 1;
  }
  if (cfg.bossTicket) {
    state.bits = { ...cfg.bossTicket };
    // totalBits must be ≥ bits (prestige / score HUD read it); bump only if lower.
    const currentE = (state.totalBits && typeof state.totalBits === 'object') ? (state.totalBits.e || 0) : 0;
    if (currentE < cfg.bossTicket.e) state.totalBits = { ...cfg.bossTicket };
  }
}

/**
 * Grant cores (post-prestige meta-currency) without doing a real prestige.
 * Useful for testing the core-upgrade store in the Prestige tab.
 *
 * @param {object} state
 * @param {number} [amount=10]
 */
export function cheatGrantCores(state, amount = 10) {
  state.cores = (state.cores || 0) + amount;
}

/**
 * Hire all Stage-1 managers at level 1 (if not already hired at a higher level).
 * Enables auto-run for every timed tier immediately — useful for testing manager UI.
 *
 * @param {object} state
 * @param {object} cfg - stage config from stages.js (.managers[])
 */
export function cheatHireAllManagers(state, cfg) {
  state.managers = state.managers || {};
  for (const m of (cfg.managers || [])) {
    const ms = state.managers[m.id];
    if (!ms || ms.level < 1) {
      state.managers[m.id] = { level: 1, paused: false, lastFire: 0 };
    }
  }
}
