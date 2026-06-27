// Decay clock: dormant below the threshold corruption, move + wrong-fill pressure, fail detection.
import { makePuzzle } from "../nonogram.js";
import { createDecay, pressureMove, pressureWrong, decayFailed, decayRatio, decayThreshold, DECAY_AT } from "../s3decay.js";

let failed = 0;
const ok = (cond, msg) => { console.log(`${cond ? "OK" : "FAIL"} ${msg}`); if (!cond) failed += 1; };

const puzzle = makePuzzle("decay-seed", { width: 8, height: 8 });

// Dormant below DECAY_AT — pressure never accrues, never fails.
const calm = createDecay(puzzle, DECAY_AT - 1);
ok(!calm.active, "decay clock is dormant below the corruption threshold");
for (let i = 0; i < 1000; i += 1) { pressureMove(calm); pressureWrong(calm); }
ok(!decayFailed(calm) && calm.meter === 0, "no pressure accrues while dormant");

// Active at/above DECAY_AT.
const d = createDecay(puzzle, DECAY_AT);
ok(d.active && d.threshold > 0, "decay clock engages at the threshold corruption");
ok(d.threshold === decayThreshold(puzzle), "threshold matches decayThreshold");

// Moves drip; wrong fills spike (a wrong fill is worth several moves).
const d2 = createDecay(puzzle, DECAY_AT);
pressureMove(d2); const afterMove = d2.meter;
pressureWrong(d2); const afterWrong = d2.meter - afterMove;
ok(afterMove > 0 && afterWrong > afterMove, "a wrong fill costs more pressure than a move");

// Crossing the threshold fails the snapshot; ratio is clamped 0..1.
const d3 = createDecay(puzzle, DECAY_AT);
let guard = 0;
while (!decayFailed(d3) && guard < 100000) { pressureWrong(d3); guard += 1; }
ok(decayFailed(d3), "enough wrong fills fail the snapshot");
ok(decayRatio(d3) === 1, "ratio clamps to 1 at/over threshold");

console.log(failed ? `\nSTAGE 3 DECAY FAILED (${failed})` : "\nSTAGE 3 DECAY PASSED");
if (failed) process.exit(1);
