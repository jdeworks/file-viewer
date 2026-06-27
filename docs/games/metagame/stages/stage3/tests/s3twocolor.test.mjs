// Two-colour engine: colour-run clues, colour line-solver, uniqueness via solve-completion, determinism.
import { FILLED, COLOR_B } from "../nonogram.js";
import { colorRuns, colorSolve, makeTwoColorPuzzle, TWOCOLOR_MAX } from "../s3twocolor.js";

let failed = 0;
const ok = (cond, msg) => { console.log(`${cond ? "OK" : "FAIL"} ${msg}`); if (!cond) failed += 1; };

// colorRuns splits on EMPTY and on colour change, preserving order.
ok(JSON.stringify(colorRuns([1, 1, 0, 2, 2, 2])) === JSON.stringify([{ len: 2, color: 1 }, { len: 3, color: 2 }]), "colorRuns reads colour blocks");
ok(JSON.stringify(colorRuns([1, 2, 2, 1])) === JSON.stringify([{ len: 1, color: 1 }, { len: 2, color: 2 }, { len: 1, color: 1 }]), "adjacent different colours split with no gap");

// Every generated two-colour puzzle is uniquely line-solvable and reproduces its solution exactly.
function verify(p) {
  const r = colorSolve(p.rowClues, p.colClues);
  if (!r || !r.solved) return false;
  for (let y = 0; y < p.height; y += 1) for (let x = 0; x < p.width; x += 1) if (r.grid[y][x] !== p.solution[y][x]) return false;
  return true;
}

let allUnique = true;
let anyFallback = false;
let bothColours = true;
for (const sz of [6, 7, 8, 9]) {
  for (let i = 0; i < 8; i += 1) {
    const p = makeTwoColorPuzzle(`tc${sz}-${i}`, { width: sz, height: sz });
    if (!verify(p)) allUnique = false;
    if (p.isFallback) anyFallback = true;
    let a = false;
    let b = false;
    for (const row of p.solution) for (const v of row) { if (v === FILLED) a = true; if (v === COLOR_B) b = true; }
    if (!(a && b)) bothColours = false;
    if (p.width > TWOCOLOR_MAX) allUnique = false;
  }
}
ok(allUnique, "every generated two-colour puzzle (6..9) is uniquely line-solvable");
ok(!anyFallback, "the random search finds two-colour puzzles without the stripes fallback");
ok(bothColours, "two-colour puzzles actually use both colours");

// Determinism: same seed → identical puzzle.
const a = makeTwoColorPuzzle("dc", { width: 8, height: 8 });
const b = makeTwoColorPuzzle("dc", { width: 8, height: 8 });
ok(JSON.stringify(a.solution) === JSON.stringify(b.solution) && a.seed === b.seed, "same seed regenerates the identical two-colour puzzle");
ok(JSON.stringify(makeTwoColorPuzzle("other", { width: 8, height: 8 }).solution) !== JSON.stringify(a.solution), "a different seed yields a different puzzle");

console.log(failed ? `\nSTAGE 3 TWO-COLOUR FAILED (${failed})` : "\nSTAGE 3 TWO-COLOUR PASSED");
if (failed) process.exit(1);
