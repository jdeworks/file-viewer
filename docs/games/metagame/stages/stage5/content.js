// content.js — Stage 5 Signal Racer: narrative + presentation helpers (pure). One signal-warfare log
// line per round, plus the glyph legend shown in the HUD. No game state lives here.

export const roundLogLines = [
  'signal corridor acquired. static interference at standard density.',
  'the interference pulses. move on the gaps, not against them.',
  'dense blocks ahead — choose which hit to take, not whether.',
  'a shield lane drifts through the noise. ride it.',
  'boost gates open on the beat. take the throughput, not just the safe line.',
  'the channel splits and re-merges. hold your route through the noise.',
  'jammer signal collapses into silence. the channel is yours.',
];

export function roundLogLine(roundIdx) {
  return roundLogLines[Math.max(0, Math.min(roundLogLines.length - 1, Number(roundIdx) || 0))];
}

export const GLYPH_LEGEND = [
  ['░', 'static (−2)'],
  ['▒', 'pulse (−2, off-beat hurts)'],
  ['▓', 'dense block (−5)'],
  ['>>', 'boost gate (+packets)'],
  ['~', 'shield lane (phase through)'],
];
