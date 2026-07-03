// disclosure.js — Stage 5 Signal Racer: progressive disclosure of the SELECT screen (UX audit
// M3/R1/R4/R6). First contact opens on PLAY, not meta: a fresh save (0 rounds cleared) shows only the
// attract road + one START button + integrity/packets. Everything else arrives when it first matters:
// the round list + per-round packet estimates after the first clear; the JAMMER boss panel stays a
// one-line locked chip until round 6 is cleared; the ascension ladder only after the stage is beaten.
// Pure — derived entirely from persisted progress (clearedRounds / boss.defeated), so it is stable
// across reloads and a veteran (any clear) immediately sees what they've unlocked.

export function disclosure(state) {
  const cleared = Math.max(0, Number(state?.run?.clearedRounds || 0));
  const defeated = Boolean(state?.boss?.defeated);
  return {
    cleared,
    attract: cleared === 0 && !defeated,        // fresh: just the road + START ROUND 1
    showRoundList: cleared >= 1 || defeated,     // the full round grid arrives after round 1
    showEstimates: cleared >= 1 || defeated,     // per-round packet bands after the first clear
    bossFull: cleared >= 6 || defeated,          // JAMMER panel (R6) — a locked chip before that
    showCalibration: cleared >= 6 || defeated,   // the calibration HUD chip rides with the boss reveal
    showAscension: defeated,                     // opt-in replay depth only once beaten
  };
}
