// Unit tests for Stage 3 dev-menu cheat functions (s3dev.js).
// All functions are pure (no DOM) so they run directly under node --test.
import assert from 'node:assert/strict';
import { devFillSolution, devGiveCurrency, devSkipToBody, devClearPressure } from '../s3dev.js';
import { defaultState } from '../state.js';
import { BODY_SOLVES } from '../board.js';
import { FILLED, EMPTY, COLOR_B } from '../nonogram.js';

const UNKNOWN = -1; // nonogram.js UNKNOWN constant value

// ── devGiveCurrency ───────────────────────────────────────────────────────────────────────────────

{
  const state = defaultState();
  devGiveCurrency(state);
  assert.equal(state.registers, 500, 'devGiveCurrency adds 500 registers to a fresh state');
  assert.equal(state.retained, 3, 'devGiveCurrency adds 3 retained to a fresh state');
}

{
  const state = defaultState();
  state.registers = 100;
  state.retained = 2;
  devGiveCurrency(state);
  assert.equal(state.registers, 600, 'devGiveCurrency stacks on existing registers');
  assert.equal(state.retained, 5, 'devGiveCurrency stacks on existing retained');
}

{
  // Idempotent-ish: calling twice doubles the gain
  const state = defaultState();
  devGiveCurrency(state);
  devGiveCurrency(state);
  assert.equal(state.registers, 1000, 'devGiveCurrency called twice adds 1000 registers');
}

// ── devClearPressure ──────────────────────────────────────────────────────────────────────────────

{
  const state = defaultState();
  state.run.pressure = 15;
  devClearPressure(state);
  assert.equal(state.run.pressure, 0, 'devClearPressure resets non-zero pressure to 0');
}

{
  const state = defaultState();
  devClearPressure(state); // no-op on fresh state
  assert.equal(state.run.pressure, 0, 'devClearPressure is a no-op on a fresh state (already 0)');
}

{
  // Does not touch any other run field
  const state = defaultState();
  const prevSolvedCount = state.run.solvedCount;
  state.run.pressure = 99;
  devClearPressure(state);
  assert.equal(state.run.solvedCount, prevSolvedCount, 'devClearPressure leaves solvedCount untouched');
}

// ── devSkipToBody ─────────────────────────────────────────────────────────────────────────────────

{
  const state = defaultState();
  devSkipToBody(state);
  assert.equal(state.run.solvedCount, BODY_SOLVES, 'devSkipToBody sets solvedCount to BODY_SOLVES');
  assert.equal(state.run.index, BODY_SOLVES, 'devSkipToBody sets run.index to BODY_SOLVES');
  assert.equal(state.boss.corruption8Reached, true, 'devSkipToBody flags corruption8Reached');
  assert.equal(state.run.marks, null, 'devSkipToBody clears saved marks for a fresh snapshot');
}

{
  // After devSkipToBody the bodyComplete() gate is satisfied (same condition used in boss.js)
  const state = defaultState();
  devSkipToBody(state);
  assert.equal(Boolean(state.boss.corruption8Reached), true, 'body gate (corruption8Reached) is true after devSkipToBody');
}

{
  const state = defaultState();
  devSkipToBody(state);
  assert.equal(state.boss.corruption8Reached, true, 'devSkipToBody exposes the body-driven boss gate');
  assert.equal(state.boss.defeated, false, 'devSkipToBody does not defeat the boss');
}

{
  // Does not touch meta currency
  const state = defaultState();
  state.registers = 42;
  state.retained = 7;
  devSkipToBody(state);
  assert.equal(state.registers, 42, 'devSkipToBody preserves existing registers');
  assert.equal(state.retained, 7, 'devSkipToBody preserves existing retained');
}

// ── devFillSolution ───────────────────────────────────────────────────────────────────────────────

{
  // Mono puzzle (FILLED / EMPTY only)
  const solution = [
    [FILLED, EMPTY],
    [EMPTY, FILLED],
  ];
  const puzzle = { width: 2, height: 2, solution };
  const marks = [[UNKNOWN, UNKNOWN], [UNKNOWN, UNKNOWN]];
  const board = { puzzle, marks, cursor: { x: 0, y: 0 }, solved: false };
  devFillSolution(board);
  assert.equal(marks[0][0], FILLED, 'devFillSolution copies FILLED cells (row 0 col 0)');
  assert.equal(marks[0][1], UNKNOWN, 'devFillSolution leaves EMPTY cells as UNKNOWN (row 0 col 1)');
  assert.equal(marks[1][0], UNKNOWN, 'devFillSolution leaves EMPTY cells as UNKNOWN (row 1 col 0)');
  assert.equal(marks[1][1], FILLED, 'devFillSolution copies FILLED cells (row 1 col 1)');
}

{
  // Two-colour puzzle (COLOR_B cells included)
  const solution = [
    [FILLED, COLOR_B],
    [EMPTY, FILLED],
  ];
  const puzzle = { width: 2, height: 2, solution };
  const marks = [[UNKNOWN, UNKNOWN], [UNKNOWN, UNKNOWN]];
  const board = { puzzle, marks };
  devFillSolution(board);
  assert.equal(marks[0][0], FILLED, 'devFillSolution copies FILLED in two-colour puzzle');
  assert.equal(marks[0][1], COLOR_B, 'devFillSolution copies COLOR_B cells correctly');
  assert.equal(marks[1][0], UNKNOWN, 'devFillSolution leaves EMPTY as UNKNOWN in two-colour puzzle');
  assert.equal(marks[1][1], FILLED, 'devFillSolution copies FILLED (second row) in two-colour puzzle');
}

{
  // All-empty solution (edge case) — every cell should become UNKNOWN
  const solution = [[EMPTY, EMPTY], [EMPTY, EMPTY]];
  const puzzle = { width: 2, height: 2, solution };
  const marks = [[UNKNOWN, UNKNOWN], [UNKNOWN, UNKNOWN]];
  const board = { puzzle, marks };
  devFillSolution(board);
  assert.ok(marks.every((row) => row.every((v) => v === UNKNOWN)), 'devFillSolution on all-EMPTY solution leaves all cells as UNKNOWN');
}

{
  // devFillSolution does NOT set board.solved — caller handles that
  const solution = [[FILLED]];
  const puzzle = { width: 1, height: 1, solution };
  const marks = [[UNKNOWN]];
  const board = { puzzle, marks, solved: false };
  devFillSolution(board);
  assert.equal(board.solved, false, 'devFillSolution does not modify board.solved (caller does that)');
}

console.log('stage3 s3dev cheat tests passed');
