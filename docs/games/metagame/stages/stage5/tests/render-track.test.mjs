// render-track.test.mjs — Stage 5: ASCII viewport renderer.
import assert from 'node:assert/strict';
import { renderTrackGrid } from '../render-track.js';

const table = [
  { lanes: ['░', null, '>>'], beatOpen: true, counterPhaseLane: 2 },
  { lanes: [null, '▓', null], beatOpen: false, counterPhaseLane: 0 },
];

{
  const grid = renderTrackGrid({ table, tick: 0, lane: 1, lookAhead: 2 });
  const lines = grid.split('\n');
  // header + lookAhead rows + player row
  assert.equal(lines.length, 1 + 2 + 1, 'header + rows + player row');
  // player in lane 1 → [>] in the middle of the bottom row
  assert.ok(lines[lines.length - 1].includes('[>]'), 'player marker rendered');
  assert.equal(lines[lines.length - 1].split('|')[1].trim(), '[>]', 'player in lane 1');
  // counter-phase header marks lane 2 with ~ and beat-open with *
  assert.ok(lines[0].includes('~'), 'counter-phase header marker');
  assert.ok(lines[0].trimEnd().endsWith('*'), 'beat-open indicator');
  // nearest row (tick 0) is the last obstacle row, above the player row; it carries the gate
  assert.ok(grid.includes('>>'), 'boost gate rendered');
  assert.ok(grid.includes('░'), 'block rendered');
}

// deterministic
assert.equal(
  renderTrackGrid({ table, tick: 0, lane: 0, lookAhead: 2 }),
  renderTrackGrid({ table, tick: 0, lane: 0, lookAhead: 2 }),
  'render is deterministic',
);

console.log('stage5 render-track tests passed');
