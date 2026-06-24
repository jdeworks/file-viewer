// Regenerate shipped Sokoban solutions with OUR OWN clean-room solvers (license cleanliness): for every
// level, try a forward push-A* (anytime) → forward beam (matching + PI-corral) → BACKWARD pull beam, and
// replace the shipped string with ours when we find a valid one. RULE: never blank a level — if all our
// methods fail, keep the existing shipped solution (so coverage / tests never regress). Each set's file
// header is preserved; only the SOLUTIONS array is rewritten. Run: node scripts/presolve/regen.mjs [setId...]
import { readFileSync, writeFileSync } from 'node:fs';
import { SETS } from '../../docs/games/sokoban/sets.js';
import { replay } from '../../docs/games/sokoban/solve.js';
import { solveAnytime } from './solve.mjs';
import { solveBeam } from './beam.mjs';
import { solveBackward } from './backward.mjs';

const DIR = new URL('../../docs/games/sokoban/', import.meta.url);
const FILE = { microban: 'sokoban-solutions.js' };   // microban uses the un-suffixed file; others follow the pattern
const fileFor = (id) => new URL(FILE[id] || `sokoban-${id}-solutions.js`, DIR);

const only = process.argv.slice(2);
const sets = only.length ? SETS.filter((s) => only.includes(s.id)) : SETS;

// Cascade tuned for THROUGHPUT over a whole-set sweep. KEY INSIGHT: this sweep only ever REPLACES a
// shipped solution when ours is SHORTER (keep-shorter rule). The shortening wins come from the fast
// forward weighted-A* (solveAnytime); the slow beam/backward passes essentially never beat an optimized
// shipped length (backward in particular yields LONG solutions), so they burned minutes per hard level
// for ~zero wins. So the sweep is forward-only and bounded: easy/medium levels shorten fast, hard ones
// fail fast and keep their shipped solution. (Genuinely basin-hard levels like #154 are handled
// separately by solveBackward and are already shipped; the deferred backlog tracks the rest.)
function ourSolve(lvl) {
  const m = solveAnytime(lvl, { maxStates: 600_000 });
  return (m != null && replay(lvl, m)) ? m : null;
}

for (const set of sets) {
  const t0 = Date.now();
  const out = [];
  let ours = 0, kept = 0, failed = 0, lenOld = 0, lenNew = 0;
  let longer = 0;   // our solver solved it but ours is LONGER than the shipped string → kept shipped (backlog)
  set.levels.forEach((lvl, i) => {
    const shipped = set.solutions[i] || '';
    const m = ourSolve(lvl);
    // Replace with OURS only when it does not make the demo longer (or fills an empty slot). Never degrade.
    const useOurs = m != null && (shipped === '' || m.length <= shipped.length);
    if (useOurs) { out.push(m); ours++; if (m !== shipped) process.stderr.write(`  ${set.id}#${i + 1}: ours ${m.length}mv (was ${shipped.length})\n`); }
    else { out.push(shipped); if (m != null) longer++; else if (shipped) kept++; else failed++; }
    lenOld += shipped.length; lenNew += out[out.length - 1].length;
  });
  // Preserve the file header; rewrite only the SOLUTIONS array.
  const path = fileFor(set.id);
  const src = readFileSync(path, 'utf8');
  const marker = 'export const SOLUTIONS = [';
  const head = src.slice(0, src.indexOf(marker));
  const body = marker + '\n' + out.map((s) => `'${s}',`).join('\n') + '\n];\n';
  writeFileSync(path, head + body);
  // Verify everything still replays.
  let bad = 0;
  set.levels.forEach((lvl, i) => { const s = out[i]; if (!s || !replay(lvl, s)) bad++; });
  console.log(`${set.id}: ours=${ours} ourLongerKept=${longer} keptShipped=${kept} pending=${failed} bad=${bad} len ${lenOld}->${lenNew} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
}
console.log('DONE');
