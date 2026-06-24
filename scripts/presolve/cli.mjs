// Offline Sokoban solver — CLI runner. Solves the levels of a registered set with OUR solver, verifies
// each result by replaying it through the game's own solve.js, and cross-checks against the currently
// shipped solution (the joriswit "oracle") for move-count comparison. Does NOT write any files yet —
// this increment is about proving the solver. Usage:
//   node scripts/presolve/cli.mjs [setId] [limit]   (setId default 'microban'; limit = first N levels)
import { SETS } from '../../docs/games/sokoban/sets.js';
import { replay } from '../../docs/games/sokoban/solve.js';
import { solve } from './solve.mjs';

const setId = process.argv[2] || 'microban';
const limit = process.argv[3] ? parseInt(process.argv[3], 10) : Infinity;
const maxStates = process.env.MAX_STATES ? parseInt(process.env.MAX_STATES, 10) : 800_000;

const set = SETS.find((s) => s.id === setId);
if (!set) { console.error('Unknown set: ' + setId + ' (have: ' + SETS.map((s) => s.id).join(', ') + ')'); process.exit(1); }

const n = Math.min(set.levels.length, limit);
let solved = 0, failed = 0, badReplay = 0, shorter = 0, longer = 0, equal = 0, oracleMissing = 0;
const fails = [];
const t0 = Date.now();

for (let i = 0; i < n; i++) {
  const level = set.levels[i];
  const oracle = set.solutions[i] || '';
  const mine = solve(level, { maxStates });
  if (mine == null) { failed++; fails.push(i + 1); continue; }
  if (!replay(level, mine)) { badReplay++; fails.push((i + 1) + '!REPLAY'); continue; }
  solved++;
  if (!oracle) { oracleMissing++; continue; }
  if (mine.length < oracle.length) shorter++;
  else if (mine.length > oracle.length) longer++;
  else equal++;
}

const secs = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\n${set.name} (${setId}): solved ${solved}/${n} in ${secs}s  [maxStates=${maxStates}]`);
console.log(`  replay-valid: ${solved}  | bad replay: ${badReplay}  | unsolved (budget): ${failed}`);
console.log(`  vs oracle: ${equal} equal, ${shorter} shorter, ${longer} longer (moves), ${oracleMissing} no-oracle`);
if (fails.length) console.log('  failed levels: ' + fails.slice(0, 40).join(', ') + (fails.length > 40 ? ' …' : ''));
