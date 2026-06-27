// Volatile cells: seeded selection, decay after the move window, locking prevents decay, determinism.
import { makePuzzle, FILLED, EMPTY, UNKNOWN } from "../nonogram.js";
import { createBoard, isSolved, setCell } from "../board.js";
import { initVolatile, noteFill, lockCell, tickVolatile, decayWindow, pass1Forced, VOLATILE_AT } from "../s3volatile.js";

let failed = 0;
const ok = (cond, msg) => { console.log(`${cond ? "OK" : "FAIL"} ${msg}`); if (!cond) failed += 1; };

const puzzle = makePuzzle("vol-seed", { width: 8, height: 8 });

// Below VOLATILE_AT there is no volatile tracking at all.
const calm = initVolatile(createBoard(puzzle), VOLATILE_AT - 1, "s");
ok(!calm.volatile, "no volatile cells below the corruption threshold");

// At threshold a seeded, deterministic subset of FILLED cells becomes volatile.
const a = initVolatile(createBoard(puzzle), 3, "run:1");
const b = initVolatile(createBoard(puzzle), 3, "run:1");
ok(a.volatile && a.volatile.size > 0, "volatile cells appear at/above the threshold");
ok(JSON.stringify([...a.volatile].sort()) === JSON.stringify([...b.volatile].sort()), "volatile selection is deterministic for a seed");
for (const k of a.volatile) { const [x, y] = k.split(",").map(Number); ok(puzzle.solution[y][x] === FILLED, "volatile cells are solution-filled cells (" + k + ")"); break; }

// A filled, unlocked volatile cell reverts after exactly decayWindow moves.
const board = initVolatile(createBoard(puzzle), 3, "run:1");
const [vx, vy] = [...board.volatile][0].split(",").map(Number);
setCell(board, vx, vy, false); // fill it
noteFill(board, vx, vy);
ok(board.marks[vy][vx] === FILLED, "volatile cell starts filled");
const win = decayWindow(3);
for (let i = 0; i < win - 1; i += 1) tickVolatile(board, isSolved);
ok(board.marks[vy][vx] === FILLED, "volatile cell survives within its decay window");
const reverted = tickVolatile(board, isSolved);
ok(board.marks[vy][vx] === UNKNOWN, "volatile cell reverts to UNKNOWN past the window");
ok(reverted.some((c) => c.x === vx && c.y === vy), "tickVolatile reports the reverted cell");

// Locking a filled volatile cell prevents decay forever.
const lb = initVolatile(createBoard(puzzle), 3, "run:1");
const [lx, ly] = [...lb.volatile][0].split(",").map(Number);
setCell(lb, lx, ly, false);
noteFill(lb, lx, ly);
ok(lockCell(lb, lx, ly) === true, "lockCell locks a filled volatile cell");
for (let i = 0; i < decayWindow(3) + 3; i += 1) tickVolatile(lb, isSolved);
ok(lb.marks[ly][lx] === FILLED, "a locked volatile cell never decays");
ok(lockCell(lb, lx, ly) === false, "re-locking a locked cell is a no-op");

// pass1Forced identifies cells the line-solver forces in a single sweep — e.g. a full-width row clue.
{
  const synthetic = {
    width: 5, height: 5,
    rowClues: [[5], [], [], [], []],
    colClues: [[1], [1], [1], [1], [1]],
    solution: [[1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]],
  };
  const forced = pass1Forced(synthetic);
  ok(forced.size === 5 && [0, 1, 2, 3, 4].every((x) => forced.has(`${x},0`)), "pass1Forced flags a full-width forced row");
  ok(pass1Forced({ twoColor: true }).size === 0, "pass1Forced is a no-op on two-colour puzzles");
}

// On real puzzles, the volatile picker AVOIDS pass-1-forced cells whenever enough alternatives exist.
for (const seed of ["fa:1", "fa:2", "fa:3", "fa:4", "fa:5"]) {
  const pz = makePuzzle(seed, { width: 8, height: 8, hard: 4 });
  const bd = initVolatile(createBoard(pz), 4, seed);
  if (!bd.volatile) continue;
  const forced = pass1Forced(pz);
  const filled = [];
  for (let y = 0; y < pz.height; y += 1) for (let x = 0; x < pz.width; x += 1) if (pz.solution[y][x] !== EMPTY) filled.push(`${x},${y}`);
  const interesting = filled.filter((k) => !forced.has(k));
  if (interesting.length >= bd.volatile.size) {
    ok(![...bd.volatile].some((k) => forced.has(k)), "volatile cells avoid pass-1-forced cells when alternatives exist (" + seed + ")");
  }
}

console.log(failed ? `\nSTAGE 3 VOLATILE FAILED (${failed})` : "\nSTAGE 3 VOLATILE PASSED");
if (failed) process.exit(1);
