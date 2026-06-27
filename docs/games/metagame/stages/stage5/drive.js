// drive.js — Stage 5 Signal Racer: the "drive the loop from outside" helpers, split out of
// game-loop.js to hold both files under the soft LOC cap. Two callers, one shared shape:
//   • autoSolve   — the deterministic test/debug bot: pick the committed channel at each split, then
//                   the optimal lane each tick. NEVER an in-game affordance.
//   • replayResume— fast-forward a resumed run by replaying its stored input transcript up to the
//                   checkpoint tick, then hand back to live play. Pure determinism (seed-derived
//                   table/rivals + recorded inputs ⇒ byte-identical reconstruction).
// Both operate on the loop's small driver surface (see game-loop.js return): tick / done / outcome /
// round / maxTicks / rawRowAt / activeRowAt / lane / commitLane / setChannel / step / setReplaying.

import { optimalLane } from './track.js';

// The bot commits to HI at a split when HI offers a boost gate within the span (harvest the
// throughput), else LO (safe) — both are always survivable thanks to the escape invariant.
export function bestChannelForSplit(loop, startTick) {
  const r = loop.rawRowAt(startTick);
  const span = r && r.fork ? (Number(loop.round.forkSpan) || 36) : 0;
  for (let i = 0; i < span; i += 1) {
    const row = loop.rawRowAt(startTick + i);
    if (row && row.forkHi && row.forkHi.includes('>>')) return 'hi';
  }
  return 'lo';
}

export function autoSolve(loop, limit = loop.maxTicks + 32) {
  let guard = 0;
  while (!loop.done && guard < limit) {
    if (loop.rawRowAt(loop.tick)?.forkEntry) loop.setChannel(bestChannelForSplit(loop, loop.tick));
    loop.commitLane(optimalLane(loop.activeRowAt(loop.tick), loop.lane));
    loop.step();
    guard += 1;
  }
  return loop.outcome;
}

export function replayResume(loop, resume) {
  if (!resume || typeof resume.lanes !== 'string') return;
  const L = resume.lanes;
  const C = typeof resume.channels === 'string' ? resume.channels : '';
  const upto = Math.min(Number(resume.tick) || L.length, L.length, loop.maxTicks);
  loop.setReplaying(true);
  for (let t = 0; t < upto && !loop.done; t += 1) {
    if (loop.rawRowAt(loop.tick)?.forkEntry) loop.setChannel(C[t] === 'h' ? 'hi' : 'lo');
    loop.commitLane(Number(L[t]) || 0);
    loop.step();
  }
  loop.setReplaying(false);
}
