// Stage 3 play model: solve detection, marks encode/decode round-trip, clue cross-out, run sizing.
import { makePuzzle, FILLED } from "../nonogram.js";
import { createBoard, isSolved, setCell, encodeMarks, lineDone, sizeForRun, puzzleForRun, progress, applyPrefetch, firstHintCell, wrongCells } from "../board.js";

let failed = 0;
const ok = (cond, msg) => { console.log(`${cond ? "OK" : "FAIL"} ${msg}`); if (!cond) failed += 1; };

const puzzle = makePuzzle("board-seed", { width: 6, height: 6 });
const board = createBoard(puzzle);
ok(!board.solved, "a fresh board is unsolved");

// Auto-fill exactly the solution → solved; an extra wrong fill → unsolved again.
for (let y = 0; y < puzzle.height; y += 1) for (let x = 0; x < puzzle.width; x += 1) if (puzzle.solution[y][x] === FILLED) setCell(board, x, y, false);
ok(board.solved, "filling exactly the solution solves the board");
ok(isSolved(puzzle, board.marks), "isSolved agrees");

// Marks persist via compact row strings and decode back identically.
const enc = encodeMarks(board.marks);
ok(Array.isArray(enc) && enc.length === puzzle.height && enc[0].length === puzzle.width, "encodeMarks → row strings");
const restored = createBoard(puzzle, enc);
ok(restored.solved && JSON.stringify(restored.marks) === JSON.stringify(board.marks), "decode round-trips marks (and stays solved)");

// An empty-mark (✕) never counts as a fill, so it can't solve a cell.
const b2 = createBoard(makePuzzle("board-seed2", { width: 5, height: 5 }));
setCell(b2, 0, 0, true); // mark empty
ok(b2.marks[0][0] !== FILLED, "an empty-mark is not a fill");

// lineDone crosses out a fully-correct row.
const full = createBoard(puzzle, encodeMarks(board.marks));
ok(lineDone(puzzle, full.marks, "row", 0) === true, "a correct row reads as done");

// progress counts correct fills toward the needed total.
const pr = progress(puzzle, board.marks);
ok(pr.have === pr.need && pr.need > 0, "progress reaches have===need on a solved board");

// Run sizing ramps with solvedCount and stays in the line-solvable range; puzzleForRun is seeded.
ok(sizeForRun({ solvedCount: 0 }) === 5 && sizeForRun({ solvedCount: 8 }) <= 20 && sizeForRun({ solvedCount: 100 }) === 20, "size ramps 5→20 and clamps");
const r = { seed: "s3-run0", index: 2, solvedCount: 0 };
ok(JSON.stringify(puzzleForRun(r).solution) === JSON.stringify(puzzleForRun(r).solution), "puzzleForRun is deterministic for a run");

// Prefetch pre-fills only CORRECT cells; Overclock lifts the size cap.
const pf = createBoard(makePuzzle("pf-seed", { width: 6, height: 6 }));
applyPrefetch(pf, 3);
let pfFilled = 0;
let pfWrong = 0;
for (let y = 0; y < 6; y += 1) for (let x = 0; x < 6; x += 1) if (pf.marks[y][x] === FILLED) { pfFilled += 1; if (pf.puzzle.solution[y][x] !== FILLED) pfWrong += 1; }
ok(pfFilled === 3 && pfWrong === 0, "prefetch fills exactly N correct cells");
ok(sizeForRun({ solvedCount: 100 }, {}) === 20 && sizeForRun({ solvedCount: 100 }, { overclock: 5 }) === 25, "overclock lifts the grid-size cap toward 25×25");

// Oracle hint cell is a correct, not-yet-filled cell; Parity flags only wrong fills.
const hb = createBoard(makePuzzle("hint-seed", { width: 6, height: 6 }));
const hc = firstHintCell(hb);
ok(hc && hb.puzzle.solution[hc.y][hc.x] === FILLED && hb.marks[hc.y][hc.x] !== FILLED, "firstHintCell points at a correct empty cell");
// place one wrong fill (a solution-empty cell) and confirm wrongCells finds exactly it
let ex = -1;
let ey = -1;
for (let y = 0; y < 6 && ex < 0; y += 1) for (let x = 0; x < 6 && ex < 0; x += 1) if (hb.puzzle.solution[y][x] !== FILLED) { ex = x; ey = y; }
setCell(hb, ex, ey, false);
const wrong = wrongCells(hb);
ok(wrong.length === 1 && wrong[0].x === ex && wrong[0].y === ey, "wrongCells flags exactly the wrong fill");

console.log(failed ? `\nSTAGE 3 BOARD FAILED (${failed})` : "\nSTAGE 3 BOARD PASSED");
if (failed) process.exit(1);
