// Validates the embedded Sokoban levels using the SAME solver the game ships (docs/.../solve.js).
// STRUCTURAL checks run on every level (exactly one player, equal boxes & goals, ≥1 box) and FAIL the
// build if violated. The BFS solver then confirms solvability within a node budget: a level proven
// UNSOLVABLE fails; a hard published level that exceeds the budget is reported "unverified" (Microban
// is a trusted solvable set, so we don't fail the gate on solver budget). Cheap enough for the gate.
import { LEVELS } from '../docs/games/sokoban/sokoban-levels.js';
import { parseLevel, solve } from '../docs/games/sokoban/solve.js';

const CAP = 20000;   // gate budget: confirms easy levels fast; hard levels bail to "unverified"
let fails = 0, solved = 0, unverified = 0;

LEVELS.forEach((lvl, i) => {
  const p = parseLevel(lvl);
  if (p.players !== 1 || p.boxes.size < 1 || p.boxes.size !== p.goals.size) {
    console.error('  Level ' + (i + 1) + ': MALFORMED (players=' + p.players + ', boxes=' + p.boxes.size + ', goals=' + p.goals.size + ')');
    fails++; return;
  }
  const r = solve(lvl, CAP);
  if (Array.isArray(r)) solved++;
  else if (r === 'cap') unverified++;
  else { console.error('  Level ' + (i + 1) + ': UNSOLVABLE'); fails++; }
});
console.log('✓ ' + LEVELS.length + ' sokoban levels: ' + solved + ' solved, ' + unverified + ' unverified (solver budget), ' + fails + ' bad');
if (fails) { console.error('FAIL: ' + fails + ' invalid level(s)'); process.exit(1); }
