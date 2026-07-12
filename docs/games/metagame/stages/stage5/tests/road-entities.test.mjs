// road-entities.test.mjs — Stage 5: the pure mapping from game rows/rivals → positioned road entities.
import assert from 'node:assert/strict';
import {
  rowToZ, zToRow, laneToOffset, classifyGlyph, collectTrackEntities, collectRivalEntities,
} from '../road-entities.js';
import { ROW_SPACING_Z, LANE_OFFSETS } from '../road.js';

// ── row ↔ z + lane ↔ offset ───────────────────────────────────────────────────────────────────────
{
  assert.equal(rowToZ(0), 0);
  assert.equal(rowToZ(4), 4 * ROW_SPACING_Z, 'row i → i·ROW_SPACING_Z');
  assert.equal(zToRow(rowToZ(7)), 7, 'zToRow inverts rowToZ');
  assert.deepEqual([laneToOffset(0), laneToOffset(1), laneToOffset(2)], LANE_OFFSETS, 'lanes map to the road offsets');
  assert.equal(laneToOffset(9), LANE_OFFSETS[2], 'lane clamps to the road');
}

// ── glyph classification ──────────────────────────────────────────────────────────────────────────
{
  assert.equal(classifyGlyph(null), null, 'empty lane → no entity');
  assert.equal(classifyGlyph('░').kind, 'block');
  assert.equal(classifyGlyph('▓').kind, 'block');
  assert.equal(classifyGlyph('▓').glyph, '▓', 'block keeps its glyph (for the −5 dense look)');
  assert.equal(classifyGlyph('>>').kind, 'gate');
  const pu = classifyGlyph('+');
  assert.equal(pu.kind, 'pickup');
  assert.equal(pu.ptype, 'repair', 'a + glyph is a repair pickup');
  assert.equal(classifyGlyph('$').ptype, 'cache');
}

// ── collectTrackEntities: look-ahead window, lane + ahead tagging ─────────────────────────────────
{
  const table = [
    { lanes: ['░', null, '>>'], beatOpen: true, counterPhaseLane: null }, // tick 0 (ahead 0)
    { lanes: [null, '▓', null], beatOpen: true, counterPhaseLane: null }, // tick 1 (ahead 1)
    { lanes: ['$', null, null], beatOpen: true, counterPhaseLane: null }, // tick 2 (ahead 2, out of window)
  ];
  const view = { table, tick: 0, lookAhead: 2, channel: 'lo', archetype: 'sprint' };
  const ents = collectTrackEntities(view);
  // ahead 0: block in lane 0 + gate in lane 2 ; ahead 1: block in lane 1 ; ahead 2 excluded by lookAhead
  assert.equal(ents.length, 3, 'only entities inside the look-ahead window');
  const b0 = ents.find((e) => e.ahead === 0 && e.kind === 'block');
  assert.equal(b0.lane, 0, 'block tagged with its lane');
  assert.ok(ents.some((e) => e.ahead === 0 && e.kind === 'gate' && e.lane === 2), 'gate at ahead 0 lane 2');
  assert.ok(ents.some((e) => e.ahead === 1 && e.kind === 'block' && e.lane === 1), 'block at ahead 1 lane 1');
  assert.ok(!ents.some((e) => e.ahead >= 2), 'nothing beyond the window');
}

// ── circuit wrap: the table loops, so tick beyond length reads from the start ─────────────────────
{
  const table = [
    { lanes: ['░', null, null], beatOpen: true, counterPhaseLane: null },
    { lanes: [null, null, '░'], beatOpen: true, counterPhaseLane: null },
  ];
  const view = { table, tick: 3, lookAhead: 1, channel: 'lo', archetype: 'circuit' };
  const ents = collectTrackEntities(view); // tick 3 % 2 === 1 → second row
  assert.equal(ents.length, 1);
  assert.equal(ents[0].lane, 2, 'circuit wrap reads the looped row');
}

// ── rivals → entities (float ahead + lane preserved) ──────────────────────────────────────────────
{
  const view = { rivals: [
    { glyph: 'o', lane: 1, ahead: 3.4 },
    { glyph: 'p', lane: 0, ahead: -1, ghost: true },
  ] };
  const ents = collectRivalEntities(view);
  assert.equal(ents.length, 2);
  assert.equal(ents[0].kind, 'rival');
  assert.equal(ents[0].ahead, 3.4, 'rival keeps its fractional lead');
  assert.equal(ents[1].kind, 'ghost', 'time-trial ghost tagged as ghost');
  assert.equal(ents[1].ahead, -1, 'a rival behind the player keeps a negative ahead');
}

console.log('stage5 road-entities tests passed');
