// One-shot dev tool: merge the offline solver lab's move-best routes into the shipped solution files.
// Reads ~/soko-extension/sokoban-solver-new/best/best-known.json (.levels, keyed "set#index", 1-based),
// replay-verifies each candidate against our committed level, and replaces our stored string ONLY when
// the candidate is valid AND strictly shorter. Never regresses, never writes an invalid/longer string.
// Rewrites each *-solutions.js in place, preserving its header comment. Run from the repo root:
//   node scripts/presolve/merge-best-known.mjs            (dry-run summary)
//   node scripts/presolve/merge-best-known.mjs --write    (apply)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { replay } from '../../docs/games/sokoban/solve.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const SOKO = resolve(HERE, '../../docs/games/sokoban');
const BEST = resolve(process.env.HOME, 'soko-extension/sokoban-solver-new/best/best-known.json');
const WRITE = process.argv.includes('--write');

// set id -> { levels file, solutions file } (microban base uses the unprefixed names)
const SETS = {
  microban:    ['sokoban-levels.js',             'sokoban-solutions.js'],
  microban2:   ['sokoban-microban2-levels.js',   'sokoban-microban2-solutions.js'],
  microban3:   ['sokoban-microban3-levels.js',   'sokoban-microban3-solutions.js'],
  microban4:   ['sokoban-microban4-levels.js',   'sokoban-microban4-solutions.js'],
  minicosmos:  ['sokoban-minicosmos-levels.js',  'sokoban-minicosmos-solutions.js'],
  microcosmos: ['sokoban-microcosmos-levels.js', 'sokoban-microcosmos-solutions.js'],
  nabokosmos:  ['sokoban-nabokosmos-levels.js',  'sokoban-nabokosmos-solutions.js'],
  picokosmos:  ['sokoban-picokosmos-levels.js',  'sokoban-picokosmos-solutions.js'],
  yoshio:      ['sokoban-yoshio-levels.js',       'sokoban-yoshio-solutions.js'],
};

const best = JSON.parse(readFileSync(BEST, 'utf8')).levels;

// Rewrite a *-solutions.js keeping everything up to `export const SOLUTIONS` as-is.
function rewriteSolutions(file, arr) {
  const text = readFileSync(file, 'utf8');
  const marker = text.indexOf('export const SOLUTIONS');
  if (marker < 0) throw new Error('no SOLUTIONS export in ' + file);
  const header = text.slice(0, marker);
  const body = 'export const SOLUTIONS = [\n'
    + arr.map((s) => "'" + (s || '') + "',").join('\n')
    + '\n];\n';
  writeFileSync(file, header + body);
}

let grand = 0;
for (const [id, [levelsFile, solutionsFile]] of Object.entries(SETS)) {
  const { LEVELS } = await import(resolve(SOKO, levelsFile));
  const mod = await import(resolve(SOKO, solutionsFile));
  const cur = [...mod.SOLUTIONS];
  let replaced = 0, notShorter = 0, invalid = 0, missing = 0;
  const out = LEVELS.map((lvl, i) => {
    const candidate = best[id + '#' + (i + 1)]?.moves;
    const current = cur[i] || '';
    if (!candidate) { missing++; return current; }
    if (current && candidate.length >= current.length) { notShorter++; return current; }
    if (!replay(lvl, candidate)) { invalid++; return current; }   // never write a broken string
    replaced++; return candidate;
  });
  console.log(
    id.padEnd(12) + ' levels=' + String(LEVELS.length).padStart(4)
    + '  replaced=' + String(replaced).padStart(3)
    + '  not-shorter=' + String(notShorter).padStart(3)
    + '  invalid=' + String(invalid).padStart(3)
    + '  no-candidate=' + String(missing).padStart(3));
  grand += replaced;
  if (WRITE && replaced) rewriteSolutions(resolve(SOKO, solutionsFile), out);
}
console.log((WRITE ? 'WROTE ' : 'DRY-RUN ') + grand + ' improved solution string(s)');
