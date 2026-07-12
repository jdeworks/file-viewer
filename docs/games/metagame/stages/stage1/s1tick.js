// s1tick.js — Stage 1 game tick loop (100 ms): passive accrual (× post-prestige income mult),
// manager cost drain, timed builder/payout completions, manager auto-fire, post-prestige mechanics,
// Cores auto-tapper, pixel reveal, score HUD, live-tab repaint, periodic save. Pulled out of
// stage1.js. Deterministic game logic is tick-count driven inside s1mechanics; the wall-clock here
// only paces the live UI (unchanged from the original loop).

import { add, sub, mulScalar, fromNumber, gte } from './bignum.js';
import { netRate, passiveRate, managerCostPerSec, timedPayout, timedProduction, totalCost } from './s1economy.js';
import { bellLoad, checkMessages } from './s1bell.js';
import { checkAchievements } from './s1achievements.js';
import { tickMechanics, incomeMult } from './s1mechanics.js';
import { coreAutoMult } from './s1cores.js';
import { paintResetPanel as paintS1ResetPanel } from './s1reset.js';
import { hiddenTab } from '../../shared/frame-loop.js';

// createTickLoop(deps) → { tick }. deps wires the live DOM + the economy/UI callbacks the loop
// drives. getActiveTab() returns the live active-tab id (mutable in the orchestrator); onTeardown()
// is called once when the host DOM is gone (the orchestrator clears its interval + debug hook there).
export function createTickLoop(deps) {
  const {
    host, grid, state, cfg, bell, save, timedTiers, multTier, panelsEl,
    managersController, getActiveTab, reveal, checkTabUnlock, updateHud, updateEcho,
    renderTabs, paintShop, paintTimed, paintStats, onTeardown,
  } = deps;
  let tickAcc = 0;
  let wasHidden = false;

  function tick() {
    // Self-terminate if our DOM was torn down (orchestrator switched to boss/another stage).
    if (!host.isConnected || !grid.isConnected) { onTeardown(); return; }
    // Hidden-tab guard (CPU fix): intervals keep firing while hidden (browsers only throttle to
    // ~1s). Accrual/mechanics are fixed-per-TICK, not timestamp-based, so a plain skip would lose
    // that progress for good — instead STATE below keeps advancing and only PAINTS are skipped;
    // the first visible tick redoes the event-driven paints (tab bar / echo) deferred while hidden.
    const hidden = hiddenTab();
    if (hidden) wasHidden = true;
    else if (wasHidden) { wasHidden = false; if (state.tabsUnlocked) renderTabs(); updateEcho(); }
    const activeTab = getActiveTab();
    // 1. Passive accrual (scaled by the post-prestige income multiplier: Cores yield × Flux × Resonance).
    const incMult = incomeMult(state, cfg);
    const passive = mulScalar(fromNumber(passiveRate(state, cfg) * incMult), 1 / 10);
    state.bits = add(state.bits, passive);
    state.totalBits = add(state.totalBits, passive);
    // 2. Manager cost drain.
    state.bits = sub(state.bits, mulScalar(fromNumber(managerCostPerSec(state, cfg)), 1 / 10));
    // 2b. Track net-negative streak for the ach-net-neg achievement.
    const rate = netRate(state, cfg);
    if (rate < 0) { if (!state._netNegSince) state._netNegSince = Date.now(); }
    else state._netNegSince = 0;
    // 3. Timed completions. Builder tiers assemble units of the tier below; others pay bits.
    let timedDone = false;
    let builtUnits = false;
    for (const t of timedTiers) {
      const ts = state.timedStates[t.id];
      if (!ts || !ts.active) continue;
      if (Date.now() - ts.startedAt >= (ts.duration_ms || t.duration_ms)) {
        if (t.produces) {
          const prod = timedProduction(state, cfg, t.id);
          if (prod && prod.amount > 0) {
            state.owned[prod.targetId] = (state.owned[prod.targetId] || 0) + prod.amount;
            builtUnits = true;
          }
        } else {
          const payout = mulScalar(timedPayout(state, cfg, t.id), incMult);
          state.bits = add(state.bits, payout);
          state.totalBits = add(state.totalBits, payout);
        }
        ts.active = false;
        timedDone = true;
      }
    }
    if (timedDone) checkMessages('bit-earn', state, bellLoad(), bell);
    // A built unit can unlock a tier row or tab — repaint in place (no full rebuild → no flicker).
    if (builtUnits && state.tabsUnlocked && !hidden) {
      renderTabs();
      if (activeTab === 'bits') { paintShop(); paintTimed(); }
    }
    // 3b. Manager auto-fire + shutdown rule (§5.6/§6.3).
    managersController.runAutoFire();
    // 3c. Post-prestige mechanics (pipeline/flux/entropy/echoes/resonance) — deterministic, tick-driven.
    const mech = tickMechanics(state, cfg);
    if (mech.producedUnits && state.tabsUnlocked && !hidden) {
      renderTabs();
      if (activeTab === 'bits') { paintShop(); paintTimed(); }
    }
    if (mech.echo && !hidden) updateEcho();
    // 3d. Auto-Tapper Cores upgrade: buy a Multiplier whenever affordable.
    if (coreAutoMult(state) && multTier) {
      const lvl = state.owned[multTier.id] || 0;
      const cost = totalCost(multTier, lvl, 1);
      if (gte(state.bits, cost)) {
        state.bits = sub(state.bits, cost);
        state.owned[multTier.id] = lvl + 1;
        state.totalBought = (state.totalBought || 0) + 1;
      }
    }
    // 4. Reveal (phase 1 only; reveal() no-ops when tabsUnlocked). Paint-only — fully state-derived.
    if (!hidden) reveal();
    // 4b. Tab unlock check (passive rate could push bits to 150 without a tap).
    checkTabUnlock();
    // 4c. Score HUD / helper unlock + live bit count (guarded, so a steady state writes nothing).
    if (!hidden) updateHud();
    // 5. Partial re-render of the live tab (phase 2 only — tabs are hidden in phase 1).
    if (state.tabsUnlocked && !hidden) {
      if (activeTab === 'bits') { paintShop(); paintTimed(); paintStats(); }
      else if (activeTab === 'managers') managersController.paint();
      else if (activeTab === 'reset') paintS1ResetPanel(panelsEl, state);
    }
    // A newly-unlocked achievement may reveal the Achievements tab — refresh the tab bar so it
    // appears (achievement CHECK always runs; only the repaint waits for a visible tick).
    if (checkAchievements(state, cfg, bellLoad()) && state.tabsUnlocked && !hidden) renderTabs();
    // 6. Periodic save.
    if (++tickAcc >= 10) { tickAcc = 0; save(state); }
  }

  return { tick };
}
