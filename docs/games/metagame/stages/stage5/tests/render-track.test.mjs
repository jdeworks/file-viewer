// render-track.test.mjs — Stage 5: ASCII viewport renderer (wide lanes + deterministic speed texture).
import assert from 'node:assert/strict';
import { renderTrackGrid, attractGrid } from '../render-track.js';

const table = [
  { lanes: ['░', null, '>>'], beatOpen: true, counterPhaseLane: 2 },
  { lanes: [null, '▓', null], beatOpen: false, counterPhaseLane: 0 },
];

{
  const grid = renderTrackGrid({ table, tick: 0, lane: 1, lookAhead: 2, laneWidth: 3 });
  const lines = grid.split('\n');
  assert.equal(lines.length, 1 + 2 + 1, 'header + rows + player row');
  // player car centered in lane 1 on the bottom row
  const cols = lines[lines.length - 1].split('|');
  assert.ok(cols[1].includes('▲'), 'player car in lane 1');
  // header marks the counter-phase lane with ~ and the beat-open tick with *
  assert.ok(lines[0].includes('~'), 'counter-phase header marker');
  assert.ok(lines[0].trimEnd().endsWith('*'), 'beat-open indicator');
  // the boost gate renders as » (display glyph) and the block as ░
  assert.ok(grid.includes('»'), 'boost gate rendered as »');
  assert.ok(grid.includes('░'), 'block rendered');
}

// deterministic for the same inputs
assert.equal(
  renderTrackGrid({ table, tick: 0, lane: 0, lookAhead: 2, speed: 0.5 }),
  renderTrackGrid({ table, tick: 0, lane: 0, lookAhead: 2, speed: 0.5 }),
  'render is deterministic',
);

// speed texture MOVES: consecutive ticks differ (streaming separators/gutters) — no static stamp.
{
  const t0 = renderTrackGrid({ table, tick: 4, lane: 1, lookAhead: 6, speed: 0.6 });
  const t1 = renderTrackGrid({ table, tick: 5, lane: 1, lookAhead: 6, speed: 0.6 });
  assert.notEqual(t0, t1, 'the road texture changes between ticks (motion)');
}

// reduced motion → solid separators, no streaming (same across ticks aside from obstacle scroll).
{
  const rm = renderTrackGrid({ table: [], tick: 0, lane: 1, lookAhead: 3, reducedMotion: true, speed: 1 });
  assert.ok(!rm.includes('≡'), 'no gutter marks under reduced motion');
}

// wider lanes make wider cells (race mode uses laneWidth 5).
{
  const w3 = renderTrackGrid({ table, tick: 0, lane: 1, lookAhead: 1, laneWidth: 3 }).split('\n')[1];
  const w5 = renderTrackGrid({ table, tick: 0, lane: 1, lookAhead: 1, laneWidth: 5 }).split('\n')[1];
  assert.ok(w5.length > w3.length, 'laneWidth 5 renders a wider road than laneWidth 3');
}

// attract grid is deterministic and non-empty (kills the empty-void select screen).
{
  const a = attractGrid({ seed: 'x', laneWidth: 5 });
  assert.equal(a, attractGrid({ seed: 'x', laneWidth: 5 }), 'attract grid is deterministic');
  assert.ok(a.includes('▲'), 'attract grid still shows the car');
}

console.log('stage5 render-track tests passed');
