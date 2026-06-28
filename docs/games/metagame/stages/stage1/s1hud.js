// s1hud.js — Stage 1 score HUD (live bit count + Gravitational-Pull chip) and the help panel.
// Pulled out of stage1.js. The 250 ms score throttle + the help affordance are UI-only.

import { fromNumber, toDisplay } from './bignum.js';
import { globalPull } from './s1economy.js';
import { escapeHtml } from './s1bell.js';
import { setText, setHidden, setHtml, bigToNum } from './s1dom.js';

// Progressive-disclosure help copy (revealed via the header help button → toggleHelp).
const HELP_SECTIONS = [
  ['👆 Tap', 'Tap the top area to compute bits. The ✖ Multiplier adds +1 bit per tap each level.'],
  ['🧰 Bit Box', 'Tap it to run a timed cycle that pays out bits. Your main income.'],
  ['📡 Signal Booster', 'Each cycle BUILDS Bit Boxes for you (and boosts their payout). It makes machines, not bits.'],
  ['🧊 Core Cluster', 'Each cycle BUILDS Signal Boosters — a machine that builds the machine that builds boxes.'],
  ['🛠 Managers', 'Hire one to auto-run a builder for a per-second bit cost. Watch the net rate stays positive.'],
  ['🌀 Reset', 'Once your total reaches ~1ab bits you may reset for a permanent ×pull multiplier on everything.'],
];

// createHud({ hudEl, scoreValEl, gravEl, helpEl, state }) → { updateHud, toggleHelp }
export function createHud({ hudEl, scoreValEl, gravEl, helpEl, state }) {
  function renderHelp() {
    setHtml(helpEl, '<div class="mg-s1-help-title">How the Foundry works</div>'
      + HELP_SECTIONS.map(([h, b]) =>
        '<div class="mg-s1-help-row"><strong>' + escapeHtml(h) + '</strong><span>' + escapeHtml(b) + '</span></div>').join(''));
  }
  // The help affordance lives in the metagame header (next to SFX); this toggles the panel.
  function toggleHelp() {
    const open = helpEl.hidden;
    if (open) renderHelp();
    setHidden(helpEl, !open);
  }

  let lastScoreAt = 0;
  function updateHud() {
    // Once unlocked the score stays visible — the 'score-unlock' milestone persists across a prestige
    // reset (which zeroes totalBits), so gate on it rather than the live total. The score chip is an
    // absolute top-right overlay, so revealing it never reflows the play area.
    const scoreOn = (state.milestones || []).includes('score-unlock') || bigToNum(state.totalBits) >= 400;
    setHidden(hudEl, !scoreOn);
    if (!scoreOn) return;
    // Gravitational Pull chip — shown once a prestige has earned pull (×>1); guarded so it only
    // writes when the value changes.
    const grav = globalPull(state);
    if (grav > 1.0001) { setText(gravEl, '🌀 ×' + toDisplay(fromNumber(grav))); setHidden(gravEl, false); }
    else setHidden(gravEl, true);
    // Bits score is recomputed at most every 0.25s (the 100ms tick would otherwise rewrite it 10×/s).
    const now = Date.now();
    if (now - lastScoreAt >= 250) {
      lastScoreAt = now;
      setText(scoreValEl, toDisplay(fromNumber(Math.floor(bigToNum(state.bits)))));
    }
  }

  return { updateHud, toggleHelp };
}
