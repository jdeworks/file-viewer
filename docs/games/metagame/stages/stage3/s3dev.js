// Stage 3 dev-menu cheat functions — pure state/board mutators (no DOM, no grid).
// Called by renderer.js dev(id) which handles repaint/save; importable in unit tests
// without a browser context. All functions are DETERMINISTIC — no Date.now/Math.random.

import { BODY_SOLVES } from './board.js';

// SHOW SOLUTION — fill board.marks so every cell matches the puzzle's solution grid.
// sol > 0 (FILLED=1 or COLOR_B=2) → copy directly; sol === 0 (EMPTY) → leave as UNKNOWN (-1)
// so empty cells stay unset rather than X-marked.
// Caller is responsible for: isSolved(), encodeMarks(), grid.update(), and onSolved() if solved.
export function devFillSolution(board) {
  const { puzzle, marks } = board;
  for (let y = 0; y < puzzle.height; y += 1) {
    for (let x = 0; x < puzzle.width; x += 1) {
      const sol = puzzle.solution[y][x];
      marks[y][x] = sol > 0 ? sol : -1; // -1 = UNKNOWN
    }
  }
}

// GIVE CURRENCY — grant +500 registers and +3 retained fragments for shop/engram testing.
export function devGiveCurrency(state) {
  state.registers = Number(state.registers || 0) + 500;
  state.retained = Number(state.retained || 0) + 3;
}

// SKIP TO BOSS GATE — advance the run's solve count to peak corruption (BODY_SOLVES = 20)
// and flag that corruption-8 was reached through play. Satisfies bodyComplete() so the
// diff restoration key can be entered. The diff un-cheat (reading the three-way log diff
// to find the key) is still required to actually unlock the boss fight.
// Caller must call loadBoard() to regenerate a peak-corruption snapshot.
export function devSkipToBody(state) {
  state.run.solvedCount = BODY_SOLVES;
  state.run.index = BODY_SOLVES;
  state.boss.corruption8Reached = true;
  state.run.marks = null; // force a fresh snapshot at peak corruption
}

// CLEAR RUN PRESSURE — reset the cumulative wrong-fill stability counter to 0, restoring
// full run stability. Useful for testing deep content without triggering a soft collapse.
export function devClearPressure(state) {
  state.run.pressure = 0;
}
