// content.js — Stage 5 Signal Racer: narrative + presentation helpers (pure). One signal-warfare log
// line per round, plus the glyph legend shown in the HUD. No game state lives here.

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
  'this round: the jammer races every verb at once. only a calibrated counter-wave wins.',
];

export function roundIntro(roundIdx) {
  return roundIntros[Math.max(0, Math.min(roundIntros.length - 1, Number(roundIdx) || 0))];
}

export const GLYPH_LEGEND = [
  ['░', 'static (−2)'],
  ['▒', 'pulse (−2, off-beat hurts)'],
  ['▓', 'dense block (−5)'],
  ['»', 'boost gate (+packets)'],
  ['~', 'shield lane (phase through)'],
  ['o', 'rival racer (bump = −integrity)'],
  ['U', 'shield buff'],
  ['O', 'overclock (speed burst)'],
  ['+', 'repair (+12 hull)'],
  ['$', 'packet cache (+15p)'],
  ['E', 'EMP (set a rival back)'],
  ['p', 'par ghost (the clock to beat)'],
  ['g', 'your prior-best ghost'],
  ['↑↓', 'commit HI / LO route at a fork'],
];

// The display glyph the renderer draws for each obstacle-config glyph (mirrors render-track's DISP).
const OBSTACLE_DISPLAY = { '░': '░', '▒': '▒', '▓': '▓', '>>': '»' };
const LEGEND_TEXT = new Map(GLYPH_LEGEND);

// The IN-RACE legend (UX audit #5): only the glyphs actually present in THIS round — its obstacle
// glyphs (+ the shield lane when it uses counter-phase, + the rival marker). Returns [glyph,text]
// pairs; the renderer draws them as one short 12px line under the road. Pure.
export function roundGlyphLegend(round) {
  const glyphs = [];
  for (const g of (round?.glyphs || [])) {
    const shown = OBSTACLE_DISPLAY[g] || g;
    if (LEGEND_TEXT.has(shown)) glyphs.push(shown);
  }
  if (round?.counterPhaseShift) glyphs.push('~');
  if (Number(round?.rivals) > 0) glyphs.push('o');
  const seen = new Set();
  const out = [];
  for (const g of glyphs) {
    if (seen.has(g)) continue;
    seen.add(g);
    out.push([g, LEGEND_TEXT.get(g)]);
  }
  return out;
}
