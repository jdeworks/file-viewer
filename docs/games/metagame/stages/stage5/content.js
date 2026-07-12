// content.js — Stage 5 Signal Racer: narrative helpers (pure). One signal-warfare log line + one
// mechanic-intro line per round. No game state lives here. (The old glyph legend is gone with the
// 2.5D canvas rebuild — hazards/pickups/gates now read as drawn sprites, not ASCII glyphs.)

export const roundLogLines = [
  'signal corridor acquired. static interference at standard density.',
  'the interference pulses. move on the gaps, not against them.',
  'dense blocks ahead — choose which hit to take, not whether.',
  'a shield lane drifts through the noise. ride it.',
  'boost gates open on the beat. take the throughput, not just the safe line.',
  'the channel splits and re-merges. hold your route through the noise.',
  'a recording of your last clean lap rides beside you. beat the clock — and yourself.',
  'the channel forks again and again — commit HI for the gates, LO to stay alive, then merge.',
  'jammer signal collapses into silence. the channel is yours.',
];

export function roundLogLine(roundIdx) {
  return roundLogLines[Math.max(0, Math.min(roundLogLines.length - 1, Number(roundIdx) || 0))];
}

// One-line mechanic intro shown when a round starts, so a brand-new verb (counter-phase lane, boost
// gates, time-trial par clock, forks) is never met cold. Indexed by round index (0-based). Pure.
export const roundIntros = [
  'this round: slide off the static — any clear lane survives.',
  'this round: switch on the beat gap, not against the burst.',
  'this round: read the looping pattern ahead and hold a clear line.',
  'this round: the ~ shield lane phases through noise — ride it.',
  'this round: grab >> boost gates on the beat for extra packets.',
  'this round: the channel splits — pick a route and hold it to the merge.',
  'this round: beat the par ghost (P) to the line — survival alone is not a clear.',
  'this round: forks come fast — commit ↑HI for gates or ↓LO to stay alive.',
  'this round: the jammer races every verb at once, and bleeds your integrity the whole way — a calibrated counter-wave cancels that outright; a maxed rig can outrun it uncalibrated, but barely.',
];

export function roundIntro(roundIdx) {
  return roundIntros[Math.max(0, Math.min(roundIntros.length - 1, Number(roundIdx) || 0))];
}
