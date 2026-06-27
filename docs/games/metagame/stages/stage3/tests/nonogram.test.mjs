// Stage 3 nonogram engine: seeded generation, uniqueness (via line-solve completion), determinism.
import { makePuzzle, solve, lineSolve, runLengths, FILLED, EMPTY, UNKNOWN } from "../nonogram.js";

let failed = 0;
const ok = (cond, msg) => { console.log(`${cond ? "OK" : "FAIL"} ${msg}`); if (!cond) failed += 1; };

// runLengths derives clues from a line.
ok(JSON.stringify(runLengths([1, 1, 0, 1, 1, 1])) === "[2,3]", "runLengths reads consecutive runs");
ok(runLengths([0, 0, 0]).length === 0, "an empty line has clue []");

// lineSolve forces what a clue determines: [3] in a width-5 line fills the overlapping middle cell.
const ls = lineSolve([UNKNOWN, UNKNOWN, UNKNOWN, UNKNOWN, UNKNOWN], [3]);
ok(ls && ls.out[2] === FILLED, "lineSolve forces the overlap cell of [3] in width 5");
ok(lineSolve([FILLED, FILLED, UNKNOWN], [1]) === null, "lineSolve reports contradiction (two fills, clue [1])");

// Every generated puzzle is UNIQUE: re-solving its clues reproduces exactly the solution, fully.
function verify(p) {
  const r = solve(p.rowClues, p.colClues);
  if (!r || !r.solved) return false;
  for (let y = 0; y < p.height; y += 1) {
    for (let x = 0; x < p.width; x += 1) {
      if ((r.grid[y][x] === FILLED ? 1 : 0) !== p.solution[y][x]) return false;
    }
  }
  return true;
}

let allUnique = true;
let anyFallback = false;
for (const [w, h] of [[5, 5], [8, 8], [10, 10], [12, 12], [15, 15]]) {
  for (let i = 0; i < 12; i += 1) {
    const p = makePuzzle(`t${w}-${i}`, { width: w, height: h });
    if (!verify(p)) allUnique = false;
    if (p.isFallback) anyFallback = true;
  }
}
ok(allUnique, "every generated puzzle (5x5..15x15) is uniquely line-solvable");
ok(!anyFallback, "the random search finds puzzles without hitting the stripes fallback");

// Determinism: same seed → identical puzzle; different seed → (almost surely) different.
const a = makePuzzle("dseed", { width: 10, height: 10 });
const b = makePuzzle("dseed", { width: 10, height: 10 });
ok(JSON.stringify(a.solution) === JSON.stringify(b.solution) && a.seed === b.seed, "same seed regenerates the identical puzzle");
ok(JSON.stringify(makePuzzle("other", { width: 10, height: 10 }).solution) !== JSON.stringify(a.solution), "a different seed yields a different puzzle");

// Solution cells are 0/1 only and clue sums match the fill count (sanity of the data model).
const fillCount = a.solution.reduce((s, row) => s + row.reduce((t, v) => t + v, 0), 0);
const rowClueSum = a.rowClues.reduce((s, c) => s + c.reduce((t, v) => t + v, 0), 0);
ok(fillCount === rowClueSum && fillCount > 0, "row clues sum to the filled-cell count");

// Corruption (`hard`) yields tougher puzzles (more solver passes) while staying unique + deterministic.
function avgPasses(hard) {
  let s = 0;
  let bad = 0;
  for (let i = 0; i < 12; i += 1) { const p = makePuzzle(`hard${i}`, { width: 10, height: 10, hard }); s += p.difficulty; if (!verify(p)) bad += 1; }
  return { avg: s / 12, bad };
}
const easy = avgPasses(0);
const hard = avgPasses(6);
ok(hard.avg > easy.avg && easy.bad === 0 && hard.bad === 0, "higher corruption → harder but still uniquely-solvable puzzles");
ok(JSON.stringify(makePuzzle("z", { width: 9, height: 9, hard: 4 }).solution) === JSON.stringify(makePuzzle("z", { width: 9, height: 9, hard: 4 }).solution), "(seed,hard) is deterministic");

console.log(failed ? `\nSTAGE 3 NONOGRAM FAILED (${failed})` : "\nSTAGE 3 NONOGRAM PASSED");
if (failed) process.exit(1);
