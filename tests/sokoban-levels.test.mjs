// Validates the embedded Sokoban levels + their precomputed solutions. For every level: STRUCTURAL
// checks (exactly one player, equal boxes & goals, ≥1 box). For every level WITH a stored solution, a
// REPLAY confirms the move string actually solves it — a broken solution fails the build. A small,
// bounded number of the very hardest Microban levels may ship without a precomputed solution yet
// (the Solve demo shows a notice for those); MAX_PENDING caps how many are allowed so a regression
// that drops solutions still fails.
import { LEVELS } from '../docs/games/sokoban/sokoban-levels.js';
import { SOLUTIONS } from '../docs/games/sokoban/sokoban-solutions.js';
import { parseLevel, replay } from '../docs/games/sokoban/solve.js';

const MAX_PENDING = 2;
let fails = 0, solved = 0, pending = 0;
if (SOLUTIONS.length !== LEVELS.length) { console.error('SOLUTIONS length ' + SOLUTIONS.length + ' != LEVELS ' + LEVELS.length); fails++; }
LEVELS.forEach((lvl, i) => {
  const p = parseLevel(lvl);
  if (p.players !== 1 || p.boxes.size < 1 || p.boxes.size !== p.goals.size) {
    console.error('  Level ' + (i + 1) + ': MALFORMED (players=' + p.players + ', boxes=' + p.boxes.size + ', goals=' + p.goals.size + ')');
    fails++; return;
  }
  const sol = SOLUTIONS[i];
  if (typeof sol !== 'string') { console.error('  Level ' + (i + 1) + ': solution not a string'); fails++; return; }
  if (!sol.length) { pending++; return; }                 // not yet solved — allowed up to MAX_PENDING
  if (!replay(lvl, sol)) { console.error('  Level ' + (i + 1) + ': stored solution does NOT solve it'); fails++; return; }
  solved++;
});
console.log('✓ ' + LEVELS.length + ' sokoban levels: ' + solved + ' solved+verified, ' + pending + ' pending, ' + fails + ' bad');
if (pending > MAX_PENDING) { console.error('FAIL: ' + pending + ' levels without a solution (max ' + MAX_PENDING + ')'); fails++; }
if (fails) { console.error('FAIL: ' + fails + ' problem(s)'); process.exit(1); }
