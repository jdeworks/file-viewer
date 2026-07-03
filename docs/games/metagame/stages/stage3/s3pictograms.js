// Stage 3 "Memory Grid" pictogram library — recognizable 1-bit icons (computer-memory / data theme)
// that double as nonogram puzzles.
//
// UNIQUENESS CONSTRAINT: a bitmap only qualifies if it is UNIQUELY LINE-SOLVABLE — i.e. the pure
// line-solver in nonogram.js (solve(rowClues, colClues)) can fully determine the grid from the row
// and column run-length clues ALONE, with no guessing. That is our uniqueness guarantee (webpbn /
// Leiden idea): if a line-solver finishes it, the clues admit exactly one solution. Many otherwise
// recognizable shapes are NOT line-solvable (isolated single pixels, checker/ambiguous regions);
// only shapes that pass are kept here. Every entry below was authored, then TESTED with the real
// solver, and is re-verified on every run by tests/pictograms.test.mjs (the library-integrity guard,
// which asserts each entry is square and that pictogramToPuzzle() returns non-null). Fills are kept
// roughly in the 25%–70% range so boards read clearly (not near-empty, not near-full).

import { runLengths, solve, FILLED, EMPTY } from "./nonogram.js";
import { makeRng } from "./rng.js";

// Verified uniquely-line-solvable icons. grid = array of '#'/'.' strings (square: height rows,
// each `width` chars). id is unique; name is UPPERCASE for display.
export const PICTOGRAMS = [
  // ---- 5×5 ----
  { id: "heart5", name: "HEART", width: 5, height: 5,
    grid: [".#.#.", "#####", "#####", ".###.", "..#.."] },
  { id: "diamond5", name: "DIAMOND", width: 5, height: 5,
    grid: ["..#..", ".###.", "#####", ".###.", "..#.."] },
  { id: "key5", name: "CACHE KEY", width: 5, height: 5,
    grid: [".###.", ".#.#.", ".###.", "..#..", "..##."] },
  { id: "spark5", name: "SPARK", width: 5, height: 5,
    grid: ["..#..", "..#..", "#####", "..#..", "..#.."] },
  { id: "arrow5", name: "POINTER", width: 5, height: 5,
    grid: ["..#..", ".###.", "#.#.#", "..#..", "..#.."] },
  { id: "bolt5", name: "SIGNAL", width: 5, height: 5,
    grid: ["..##.", ".##..", "####.", "..##.", ".##.."] },

  // ---- 6×6 ----
  { id: "heart6", name: "HEART", width: 6, height: 6,
    grid: [".##.##", "######", "######", ".####.", "..##..", "......"] },
  { id: "key6", name: "KEY RING", width: 6, height: 6,
    grid: [".###..", ".#.#..", ".###..", "..#...", "..#.#.", "..###."] },
  { id: "disk6", name: "DATA DISK", width: 6, height: 6,
    grid: ["######", "#....#", "#.##.#", "#.##.#", "#....#", "######"] },
  { id: "lock6", name: "LOCK", width: 6, height: 6,
    grid: ["..##..", ".#..#.", "######", "##..##", "##..##", "######"] },
  { id: "anchor6", name: "ANCHOR", width: 6, height: 6,
    grid: ["..##..", "..##..", ".####.", "..##..", "#.##.#", "######"] },
  { id: "bell6", name: "SIGNAL BELL", width: 6, height: 6,
    grid: ["..##..", ".####.", ".####.", "######", "######", "..##.."] },

  // ---- 7×7 ----
  { id: "chip7", name: "MEMORY CHIP", width: 7, height: 7,
    grid: ["..###..", "#######", "#.###.#", "#.....#", "#.###.#", "#######", "..###.."] },
  { id: "bell7", name: "ALERT BELL", width: 7, height: 7,
    grid: ["..###..", ".#####.", ".#####.", ".#####.", "#######", "#######", "...#..."] },
  { id: "heart7", name: "HEART", width: 7, height: 7,
    grid: [".##.##.", "#######", "#######", "#######", ".#####.", "..###..", "...#..."] },
  { id: "leaf7", name: "LEAF", width: 7, height: 7,
    grid: ["......#", "....###", "..#####", ".####.#", "####..#", "###....", "#......"] },
  { id: "key7", name: "LONG KEY", width: 7, height: 7,
    grid: [".###...", ".#.#...", ".###...", "..#....", "..#....", "..##...", "..#.#.."] },
  { id: "glyph7", name: "GLYPH", width: 7, height: 7,
    grid: ["#######", "#.....#", "#.###.#", "#.#.#.#", "#.###.#", "#.....#", "#######"] },
  { id: "disk7", name: "DISK STACK", width: 7, height: 7,
    grid: ["#######", "#.###.#", "#.....#", "#.....#", "#.###.#", "#.###.#", "#######"] },
  { id: "spark7", name: "SPARK", width: 7, height: 7,
    grid: ["...##..", "..##...", ".##....", "#######", "....##.", "...##..", "..##..."] },

  // ---- 8×8 ----
  { id: "heart8", name: "HEART", width: 8, height: 8,
    grid: [".##..##.", "########", "########", "########", ".######.", "..####..", "...##...", "........"] },
  { id: "star8", name: "STAR", width: 8, height: 8,
    grid: ["...##...", "...##...", "########", ".######.", "..####..", ".##..##.", ".#....#.", "........"] },
  { id: "wave8", name: "WAVE", width: 8, height: 8,
    grid: ["........", ".##..##.", "####.###", "###..###", "###..###", "###.####", ".##..##.", "........"] },
  { id: "key8", name: "VAULT KEY", width: 8, height: 8,
    grid: [".####...", ".#..#...", ".#..#...", ".####...", "..##....", "..##....", "..##.##.", "..#####."] },
  { id: "bell8", name: "BELL", width: 8, height: 8,
    grid: ["...##...", "..####..", ".######.", ".######.", ".######.", "########", "########", "...##..."] },
  { id: "anchor8", name: "ANCHOR", width: 8, height: 8,
    grid: ["...##...", "..####..", "...##...", "...##...", "#..##..#", "#..##..#", "#######.", ".######."] },

  // ---- 9×9 ----
  { id: "chip9", name: "MEMORY CHIP", width: 9, height: 9,
    grid: ["..#####..", "#########", "#.......#", "#.#####.#", "#.#...#.#", "#.#####.#", "#.......#", "#########", "..#####.."] },
  { id: "diamond9", name: "DIAMOND", width: 9, height: 9,
    grid: ["....#....", "...###...", "..#####..", ".#######.", "#########", ".#######.", "..#####..", "...###...", "....#...."] },
  { id: "key9", name: "KEY", width: 9, height: 9,
    grid: [".#####...", ".#...#...", ".#...#...", ".#####...", "...#.....", "...#.....", "...#.##..", "...#####.", "...#....."] },
  { id: "bell9", name: "BELL", width: 9, height: 9,
    grid: ["....#....", "...###...", "..#####..", "..#####..", ".#######.", ".#######.", "#########", "#########", "....#...."] },

  // ---- 10×10 ----
  { id: "diamond10", name: "DIAMOND", width: 10, height: 10,
    grid: ["....##....", "...####...", "..######..", ".########.", "##########", "##########", ".########.", "..######..", "...####...", "....##...."] },
  { id: "chip10", name: "MEMORY CHIP", width: 10, height: 10,
    grid: ["..######..", "##########", "#........#", "#.######.#", "#.#....#.#", "#.#....#.#", "#.######.#", "#........#", "##########", "..######.."] },
  { id: "bell10", name: "BELL", width: 10, height: 10,
    grid: ["....##....", "...####...", "..######..", "..######..", ".########.", ".########.", "##########", "##########", "##########", "....##...."] },
  { id: "key10", name: "KEY", width: 10, height: 10,
    grid: [".#####....", ".#...#....", ".#...#....", ".#####....", "...##.....", "...##.....", "...##.....", "...##.###.", "...#####.#", "...##.###."] },

  // ---- 11×11 ----
  { id: "diamond11", name: "DIAMOND", width: 11, height: 11,
    grid: [".....#.....", "....###....", "...#####...", "..#######..", ".#########.", "###########", ".#########.", "..#######..", "...#####...", "....###....", ".....#....."] },
  { id: "chip11", name: "MEMORY CHIP", width: 11, height: 11,
    grid: ["...#####...", "###########", "#.........#", "#.#######.#", "#.#.....#.#", "#.#.###.#.#", "#.#.....#.#", "#.#######.#", "#.........#", "###########", "...#####..."] },
  { id: "bell11", name: "BELL", width: 11, height: 11,
    grid: [".....#.....", "....###....", "...#####...", "..#######..", "..#######..", ".#########.", ".#########.", "###########", "###########", "###########", ".....#....."] },

  // ---- 12×12 ----
  { id: "diamond12", name: "DIAMOND", width: 12, height: 12,
    grid: [".....##.....", "....####....", "...######...", "..########..", ".##########.", "############", "############", ".##########.", "..########..", "...######...", "....####....", ".....##....."] },
  { id: "chip12", name: "MEMORY CHIP", width: 12, height: 12,
    grid: ["....#####...", "............", "############", "#..........#", "#.########.#", "#.#......#.#", "#.#......#.#", "#.########.#", "#..........#", "############", "............", "....#####..."] },
  { id: "bell12", name: "BELL", width: 12, height: 12,
    grid: [".....##.....", "....####....", "...######...", "..########..", "..########..", ".##########.", ".##########.", "############", "############", "############", ".....##.....", "....####...."] },
];

// Parse a pictogram's grid into a solution matrix of FILLED/EMPTY.
export function pictogramSolution(picto) {
  return picto.grid.map((row) => [...row].map((ch) => (ch === "#" ? FILLED : EMPTY)));
}

// Derive row + column run-length clues for a solution matrix.
function cluesOf(solution, width) {
  const rowClues = solution.map(runLengths);
  const colClues = [];
  for (let c = 0; c < width; c += 1) colClues.push(runLengths(solution.map((row) => row[c])));
  return { rowClues, colClues };
}

// Build a puzzle object (same shape as nonogram makePuzzle returns) from a pictogram, or null if it
// is NOT uniquely line-solvable (defensive — every library entry should pass). Difficulty = solver
// passes, like makePuzzle.
export function pictogramToPuzzle(picto) {
  const solution = pictogramSolution(picto);
  const { rowClues, colClues } = cluesOf(solution, picto.width);
  const res = solve(rowClues, colClues);
  if (!res || !res.solved) return null;
  return {
    width: picto.width,
    height: picto.height,
    solution,
    rowClues,
    colClues,
    seed: `picto:${picto.id}`,
    difficulty: res.passes,
    picto: { id: picto.id, name: picto.name },
  };
}

// Deterministically choose a uniquely-solvable pictogram of EXACTLY `size`×`size` for `seed`,
// returning its puzzle object, or null if the library has none for that size.
export function pictogramPuzzle(seed, size) {
  const pool = PICTOGRAMS.filter((p) => p.width === size && p.height === size);
  if (pool.length === 0) return null;
  const order = makeRng(`s3-picto:${seed}`).shuffle(pool);
  for (const picto of order) {
    const puzzle = pictogramToPuzzle(picto);
    if (puzzle) return puzzle;
  }
  return null;
}
