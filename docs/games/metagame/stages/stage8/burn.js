// burn.js — Stage 8 Heat Death: the deterministic escalating burn that replaces the old one-click win.
//
// Once the boss is UNLOCKED (triple-gated in boss.js), Heat Death drains the player's banked States
// across BURN_CYCLES escalating cycles (≈260 States total). Each cycle's drain grows; a Stabilizer is
// auto-spent to PAUSE (halve) a cycle that would otherwise overrun the reserves. If States ever go
// negative the field collapses (fail → rewind). Surviving all cycles defeats Heat Death. Pure +
// deterministic: same state + same seeded rng ⇒ same trace, so the smoke can fast-forward it exactly.

import { BURN_CYCLES } from "./messages.js";

// Per-cycle base drain — escalates linearly. i = 0..BURN_CYCLES-1.
export function baseDrain(i) {
  return 12 + i * 3; // 12,15,…,39 → base sum over 10 = 255
}

// Representative total drain the burn will demand of in-hand States (base sum + the ~2/cycle expected
// jitter). Used only for the boss-gate readout so the player can compare it against their balance —
// the real burn (simulateHeatDeath) is still what decides survival. Pure, deterministic.
export function estimateBurnTotal() {
  let total = 0;
  for (let i = 0; i < BURN_CYCLES; i += 1) total += baseDrain(i) + 2; // +2 = expected rng.int(0,4)
  return total; // = 255 + 20 = 275
}

// Simulate the full burn against a copy of the player's reserves. Does NOT mutate state.
export function simulateHeatDeath(state, rng) {
  let states = Math.max(0, Number(state.states || 0));
  let stabilizers = Math.max(0, Number(state.stabilizers || 0));
  const trace = [];
  for (let i = 0; i < BURN_CYCLES; i += 1) {
    let drain = baseDrain(i) + (rng && typeof rng.int === "function" ? rng.int(0, 4) : 2);
    let paused = false;
    // Spend a Stabilizer to pause a cycle that would otherwise break the reserves.
    if (stabilizers > 0 && drain > states) {
      stabilizers -= 1;
      paused = true;
      drain = Math.floor(drain / 2);
    }
    states -= drain;
    trace.push({ cycle: i + 1, drain, paused, remaining: states });
    if (states < 0) {
      return { survived: false, failedAt: i + 1, trace, remainingStates: states, stabilizersLeft: stabilizers };
    }
  }
  return { survived: true, trace, remainingStates: states, stabilizersLeft: stabilizers };
}
