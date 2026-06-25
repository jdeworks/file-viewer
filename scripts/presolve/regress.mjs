// Solver regression harness — the soundness net for adding deadlock pruning (e.g. corral). Runs OUR
// solver over every level in every set at a FIXED fast budget and prints, per set, how many it solves
// (replay-verified) plus the list of UNSOLVED level ids. Capture this list as a baseline BEFORE a
// pruning change; after the change, the unsolved set must be a SUBSET of the baseline — a previously
// solved level going unsolved means the new prune is UNSOUND (it discarded a solvable position). Pruning
// may only ever make MORE levels solvable (faster), never fewer.
//   node scripts/presolve/regress.mjs [maxStates]
import { SETS } from '../../docs/games/sokoban/sets.js';
import { replay } from '../../docs/games/sokoban/solve.js';
import { solve } from './solve.mjs';

const maxStates = process.argv[2] ? parseInt(process.argv[2], 10) : 500_000;
const picorral = process.env.PICORRAL === '1';           // toggle the PI-corral prune for soundness checks
const t0 = Date.now();
let total = 0, solved = 0;
const unsolved = [];
for (const set of SETS) {
  let s = 0;
  set.levels.forEach((lvl, i) => {
    total++;
    const m = solve(lvl, { greedy: true, maxStates, picorral });   // fast greedy dive — same config baseline vs change
    if (m != null && replay(lvl, m)) { s++; solved++; } else unsolved.push(set.id + '#' + (i + 1));
  });
  console.log(`${set.id}: ${s}/${set.levels.length}`);
}
console.log(`\nTOTAL solved ${solved}/${total} @maxStates=${maxStates} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
console.log('UNSOLVED (' + unsolved.length + '): ' + unsolved.join(' '));
