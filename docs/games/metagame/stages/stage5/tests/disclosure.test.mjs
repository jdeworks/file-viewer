// disclosure.test.mjs — Stage 5: progressive disclosure of the select screen (UX audit M3/R1/R6).
import assert from 'node:assert/strict';
import { disclosure } from '../disclosure.js';

// fresh save (0 cleared): attract road + START only — no round list, no boss panel, no calibration.
{
  const d = disclosure({ run: { clearedRounds: 0 }, boss: { defeated: false } });
  assert.equal(d.attract, true, 'fresh: attract mode');
  assert.equal(d.showRoundList, false, 'fresh: no round list');
  assert.equal(d.showEstimates, false, 'fresh: no per-round estimates');
  assert.equal(d.bossFull, false, 'fresh: boss is a locked chip');
  assert.equal(d.showCalibration, false, 'fresh: no calibration chip');
  assert.equal(d.showAscension, false, 'fresh: no ascension ladder');
}

// veteran (any clear): round list + estimates appear; boss still gated until round 6.
{
  const d = disclosure({ run: { clearedRounds: 3 }, boss: { defeated: false } });
  assert.equal(d.attract, false, 'veteran: no attract-only screen');
  assert.equal(d.showRoundList, true, 'veteran: full round list');
  assert.equal(d.showEstimates, true, 'veteran: per-round estimates');
  assert.equal(d.bossFull, false, 'round 3 cleared: boss still a locked chip');
}

// round 6 cleared: the JAMMER panel (and its calibration chip) are revealed.
{
  const d = disclosure({ run: { clearedRounds: 6 }, boss: { defeated: false } });
  assert.equal(d.bossFull, true, 'round 6 cleared → boss panel revealed');
  assert.equal(d.showCalibration, true, 'round 6 cleared → calibration chip shown');
}

// defeated: everything is available immediately (incl. ascension), regardless of clearedRounds.
{
  const d = disclosure({ run: { clearedRounds: 0 }, boss: { defeated: true } });
  assert.equal(d.attract, false, 'defeated veteran: not attract');
  assert.equal(d.showRoundList, true, 'defeated: full round list');
  assert.equal(d.bossFull, true, 'defeated: boss panel');
  assert.equal(d.showAscension, true, 'defeated: ascension ladder');
}

console.log('stage5 disclosure tests passed');
