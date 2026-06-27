// Validates EVERY Sokoban level set in the registry + their precomputed solutions. For each set, for
// every level: STRUCTURAL checks (exactly one player, equal boxes & goals, ≥1 box). For every level
// WITH a stored solution, a REPLAY confirms the move string actually solves it — a broken solution
// fails the build. A set's `solutions` array may be shorter than its `levels` (missing/empty entries
// are "pending" — the Solve demo shows a notice); each set declares a `maxPending` budget (default 2)
// so a regression that silently drops solutions still fails. sets.js is now metadata-only with lazy
// loaders, so we await loadLevels()/loadSolutions(); we also assert each set's hard-coded `count`
// matches its real LEVELS length (drift guard for the picker that renders from `count`).
import { SETS } from '../docs/games/sokoban/sets.js';
import { parseLevel, replay } from '../docs/games/sokoban/solve.js';

let fails = 0;
for (const set of SETS) {
  const { maxPending = 2, count } = set;
  const levels = await set.loadLevels();
  const solutions = (await set.loadSolutions().catch(() => [])) || [];
  let solved = 0, pending = 0, bad = 0;
  if (count !== levels.length) {
    console.error(set.id + ': declared count ' + count + ' != actual levels ' + levels.length); bad++;
  }
  if (solutions.length > levels.length) {
    console.error(set.id + ': solutions length ' + solutions.length + ' > levels ' + levels.length); bad++;
  }
  levels.forEach((lvl, i) => {
    const p = parseLevel(lvl);
    if (p.players !== 1 || p.boxes.size < 1 || p.boxes.size !== p.goals.size) {
      console.error('  ' + set.id + ' L' + (i + 1) + ': MALFORMED (players=' + p.players + ', boxes=' + p.boxes.size + ', goals=' + p.goals.size + ')');
      bad++; return;
    }
    const sol = solutions[i];
    if (sol == null || sol === '') { pending++; return; }   // not yet solved — allowed up to maxPending
    if (typeof sol !== 'string') { console.error('  ' + set.id + ' L' + (i + 1) + ': solution not a string'); bad++; return; }
    if (!replay(lvl, sol)) { console.error('  ' + set.id + ' L' + (i + 1) + ': stored solution does NOT solve it'); bad++; return; }
    solved++;
  });
  if (pending > maxPending) { console.error(set.id + ': ' + pending + ' levels without a solution (max ' + maxPending + ')'); bad++; }
  console.log((bad ? '✗' : '✓') + ' ' + set.name + ' (' + set.id + '): ' + levels.length + ' levels, ' + solved + ' solved+verified, ' + pending + ' pending, ' + bad + ' bad');
  fails += bad;
}
if (fails) { console.error('FAIL: ' + fails + ' problem(s) across ' + SETS.length + ' set(s)'); process.exit(1); }
console.log('✓ all ' + SETS.length + ' sokoban set(s) valid');
