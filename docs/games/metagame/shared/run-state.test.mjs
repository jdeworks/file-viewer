// run-state.test.mjs — `node docs/games/metagame/shared/run-state.test.mjs`
//
// Covers the shared run/checkpoint framework: deterministic seeding, checkpoint→restore round-trips,
// reset clearing + run-count bump, and destroy flushing. No DOM required (browser APIs are
// feature-detected); runs clean under Node.

import assert from 'node:assert/strict';
import { createRun, makeRng } from './run-state.js';

let failed = 0;
const ok = (cond, msg) => { console.log((cond ? '✓ ' : '✗ ') + msg); if (!cond) failed++; };

function freshSave() {
  return { runs: {}, stageState: { 6: {} } };
}

// ── determinism: same seed ⇒ identical sequence (independent of save identity) ────────────────────
{
  const a = createRun({ save: freshSave(), stageId: 6, debounceMs: 0 });
  const b = createRun({ save: freshSave(), stageId: 6, debounceMs: 0 });
  ok(a.seed === '6:0', 'seed is `${stageId}:${runCount}` with no seedParts');
  const seqA = Array.from({ length: 8 }, () => a.float());
  const seqB = Array.from({ length: 8 }, () => b.float());
  ok(JSON.stringify(seqA) === JSON.stringify(seqB), 'same seed ⇒ identical float sequence');

  // The mirrored RNG surface matches a standalone makeRng on the same seed.
  const ref = makeRng('6:0');
  const c = createRun({ save: freshSave(), stageId: 6, debounceMs: 0 });
  ok(ref.int(1, 6) === c.int(1, 6) && ref.float() === c.float(), 'mirrored rng matches makeRng(seed)');
}

// ── seedParts + runCount change the seed deterministically ────────────────────────────────────────
{
  const node = createRun({ save: freshSave(), stageId: 4, seedParts: ['a1-l2-n0'], debounceMs: 0 });
  ok(node.seed === '4:0:a1-l2-n0', 'seedParts are appended to the seed');
  const save = freshSave();
  save.runs[6] = 3;
  const later = createRun({ save, stageId: 6, debounceMs: 0 });
  ok(later.seed === '6:3' && later.runCount === 3, 'runCount from save.runs feeds the seed');
}

// ── checkpoint → restore round-trips, merging (not clobbering) ────────────────────────────────────
{
  const save = freshSave();
  const run = createRun({ save, stageId: 6, debounceMs: 0 });
  ok(run.restore() === null, 'restore is null before any checkpoint');
  run.checkpoint({ hp: 50, act: 1 });
  run.checkpoint({ hp: 42 }); // merge: act survives, hp updated
  const snap = run.restore();
  ok(snap && snap.hp === 42 && snap.act === 1, 'checkpoint merges into the slot (no clobber)');
  ok(save.stageState[6].run === snap, 'snapshot persisted at stageState[id].run');

  // A second run constructed from the same save resumes the snapshot.
  const resumed = createRun({ save, stageId: 6, debounceMs: 0 });
  ok(resumed.restore().hp === 42, 'a new run on the same save restores the snapshot');
}

// ── custom slot keeps concurrent snapshots independent ────────────────────────────────────────────
{
  const save = freshSave();
  createRun({ save, stageId: 6, slot: 'run', debounceMs: 0 }).checkpoint({ x: 1 });
  createRun({ save, stageId: 6, slot: 'shadow', debounceMs: 0 }).checkpoint({ x: 2 });
  ok(save.stageState[6].run.x === 1 && save.stageState[6].shadow.x === 2, 'distinct slots are isolated');
}

// ── reset clears the slot and bumps the stage run-count ───────────────────────────────────────────
{
  const save = freshSave();
  const run = createRun({ save, stageId: 6, debounceMs: 0 });
  run.checkpoint({ hp: 9 });
  ok(save.stageState[6].run, 'slot exists before reset');
  run.reset();
  ok(save.stageState[6].run === undefined, 'reset deletes the slot');
  ok(save.runs[6] === 1, 'reset bumps runCount so the next run re-seeds');
  const next = createRun({ save, stageId: 6, debounceMs: 0 });
  ok(next.seed === '6:1', 'the next run uses the bumped run-count');
}

// ── debounced write + flush + destroy ─────────────────────────────────────────────────────────────
{
  const save = freshSave();
  const run = createRun({ save, stageId: 6, debounceMs: 1000 });
  run.checkpoint({ a: 1 });
  ok(save.stageState[6].run === undefined, 'a debounced checkpoint has not written yet');
  run.flush();
  ok(save.stageState[6].run && save.stageState[6].run.a === 1, 'flush writes the pending snapshot');

  const save2 = freshSave();
  const run2 = createRun({ save: save2, stageId: 6, debounceMs: 1000 });
  run2.checkpoint({ b: 2 });
  run2.destroy();
  ok(save2.stageState[6].run && save2.stageState[6].run.b === 2, 'destroy flushes pending writes');
  run2.checkpoint({ c: 3 });
  ok(save2.stageState[6].run.c === undefined, 'checkpoints after destroy are ignored');
}

// ── lazy stageState creation does not require a pre-seeded slot ───────────────────────────────────
{
  const save = { runs: {}, stageState: {} };
  const run = createRun({ save, stageId: 9, debounceMs: 0 });
  run.checkpoint({ ok: true });
  ok(save.stageState[9] && save.stageState[9].run.ok === true, 'creates stageState[id] on first checkpoint');
}

console.log(failed ? `\nRUN-STATE FAILED (${failed})` : '\nRUN-STATE PASSED');
process.exit(failed ? 1 : 0);
