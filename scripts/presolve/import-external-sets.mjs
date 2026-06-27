// One-shot dev tool: import the offline lab's NEW external level sets into the shipped game.
// For each candidate set it (a) loads level defs + attribution from
// ~/soko-extension/.../imports/external-sourcecode/sourcecode-<set>.js, (b) gathers every verified
// move string for that set from the lab (ksokoban refs, bench/results, long-run accepted dirs),
// (c) keeps the SHORTEST replay-verified solution per level. Sets are then emitted two ways:
//   - SOLVED sets → sokoban-<id>-levels.js + sokoban-<id>-solutions.js, TRIMMED to solved levels only
//     (so every shipped set is fully solvable).
//   - One "Unsolved Challenges" batch (sokoban-unsolved-*.js) = the still-unsolved levels, playable
//     with no stored solution (Solve degrades gracefully).
// Run from repo root:  node scripts/presolve/import-external-sets.mjs [--write]
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { parseLevel, replay } from '../../docs/games/sokoban/solve.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, '../../docs/games/sokoban');
const HELD = join(OUT, '_held');                            // git-ignored, NOT deployed (manifest skips _*)
const LAB = resolve(process.env.HOME, 'soko-extension/sokoban-solver-new');
const SRC = join(LAB, 'imports/external-sourcecode');
const WRITE = process.argv.includes('--write');

// Candidate external sets → display name + emitted id. `ship:true` = license cleared for publishing
// (David W. Skinner sets are explicitly free to distribute with credit — same author as our Microban).
// Everything else is copyrighted with NO redistribution permission yet: emitted to _held/ (git-ignored)
// so we can keep working on them locally, but NOT registered in sets.js and NOT in the repo. See the
// folder README. Order = picker order.
const CANDIDATES = [
  { src: 'sourcecode-sasquatch',     id: 'sasquatch',     name: 'Sasquatch',     ship: true },
  { src: 'sourcecode-sasquatch-ii',  id: 'sasquatch2',    name: 'Sasquatch II',  ship: true },
  { src: 'sourcecode-sokochallenge', id: 'sokochallenge', name: 'SokoChallenge' },
  { src: 'sourcecode-sokocreation',  id: 'sokocreation',  name: 'SokoCreation' },
  { src: 'sourcecode-sokolasse',     id: 'sokolasse',     name: 'SokoLasse' },
  { src: 'sourcecode-sokomania',     id: 'sokomania',     name: 'SokoMania' },
  { src: 'sourcecode-sokomind',      id: 'sokomind',      name: 'SokoMind' },
  { src: 'sourcecode-sokompact',     id: 'sokompact',     name: 'Sokompact' },
  { src: 'sourcecode-sokobig-70',    id: 'sokobig',       name: 'SokoBig 70' },
  { src: 'sourcecode-sokodeal',      id: 'sokodeal',      name: 'SokoDeal' },
];

// ---- gather every candidate move string keyed "set#index", keep shortest valid (verified later) ----
const best = new Map();   // key -> shortest move string seen
function offer(key, moves) {
  if (typeof key !== 'string' || typeof moves !== 'string' || !/^[UDLR]+$/.test(moves)) return;
  const cur = best.get(key);
  if (!cur || moves.length < cur.length) best.set(key, moves);
}
function walkJson(obj, perEntry) {
  for (const r of (obj.results || [])) perEntry(r);
  for (const [k, v] of Object.entries(obj.references || {})) perEntry({ key: k, moves: v?.moves });
  if (obj.key && obj.moves) perEntry(obj);            // accepted/*.json is a single entry
}
function scanDir(dir) {
  if (!existsSync(dir)) return;
  for (const f of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, f.name);
    if (f.isDirectory()) { scanDir(p); continue; }
    if (!f.name.endsWith('.json')) continue;
    let obj; try { obj = JSON.parse(readFileSync(p, 'utf8')); } catch { continue; }
    walkJson(obj, (r) => offer(r.key, r.moves));
  }
}
scanDir(join(LAB, 'bench/results'));
scanDir(join(LAB, 'bench/long-runs'));
try {
  const refs = JSON.parse(readFileSync(join(LAB, 'imports/external-ksokoban/reference-seeds.json'), 'utf8'));
  for (const [k, v] of Object.entries(refs.references || {})) offer(k, v?.moves);
} catch { /* no refs */ }

const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const toRaw = (lvl) => lvl.replace(/\n+$/, '').replace(/\n/g, '/');   // '\n'-joined level → compact '/' rows

const levelsHeader = (name, src) =>
  '// ' + name + ' Sokoban levels — imported from ' + (src.provider || 'Sourcecode.se') + '\n'
  + '// (' + (src.providerUrl || '') + '), original title "' + (src.originalTitle || name) + '"'
  + (src.author ? ', author ' + src.author : '') + '.\n'
  + '// Glyphs: # wall · . goal · $ box · * box-on-goal · @ player · + player-on-goal · space floor.\n'
  + '// Rows joined with "/"; LEVELS rebuilds newline-joined strings. LICENSE: community set, see source.\n';

function emitLevels(file, name, src, levels) {
  const body = 'const RAW = [\n' + levels.map((l) => "'" + esc(toRaw(l)) + "',").join('\n') + '\n];\n'
    + 'export const LEVELS = RAW.map((l) => l.replace(/\\//g, \'\\n\'));\n';
  if (WRITE) writeFileSync(file, levelsHeader(name, src) + body);
}
function emitSolutions(file, name, solutions) {
  const body = 'export const SOLUTIONS = [\n' + solutions.map((s) => "'" + (s || '') + "',").join('\n') + '\n];\n';
  const head = '// ' + name + ' solutions (move strings U/D/L/R) — shortest replay-verified routes consolidated\n'
    + '// by our offline solver lab; some derive from public ksokoban.online reference solutions, others\n'
    + '// from our own solver (scripts/presolve/import-external-sets.mjs). \'\' = no solution yet.\n';
  if (WRITE) writeFileSync(file, head + body);
}

const structOk = (lvl) => { const p = parseLevel(lvl); return p.players === 1 && p.boxes.size >= 1 && p.boxes.size === p.goals.size; };

if (WRITE) mkdirSync(HELD, { recursive: true });
const shipUnsolved = [], heldUnsolved = [], registry = [];
for (const c of CANDIDATES) {
  const srcPath = join(SRC, c.src + '.js');
  if (!existsSync(srcPath)) { console.log(c.id.padEnd(14) + ' (no source file, skipped)'); continue; }
  const mod = await import(srcPath);
  const { LEVELS, SOURCE = {} } = mod;
  const dir = c.ship ? OUT : HELD;
  const unsolvedBucket = c.ship ? shipUnsolved : heldUnsolved;
  const keepL = [], keepS = [];
  let solved = 0, unsolved = 0, malformed = 0;
  LEVELS.forEach((lvl, i) => {
    if (!structOk(lvl)) { malformed++; return; }           // never ship a malformed level
    const cand = best.get(c.src + '#' + (i + 1));
    if (cand && replay(lvl, cand)) { keepL.push(lvl); keepS.push(cand); solved++; }
    else { unsolvedBucket.push(lvl); unsolved++; }
  });
  console.log((c.ship ? 'SHIP ' : 'held ') + c.id.padEnd(14) + ' total=' + String(LEVELS.length).padStart(3) + '  solved=' + String(solved).padStart(3) + '  unsolved=' + String(unsolved).padStart(3) + '  malformed=' + malformed);
  if (solved) {
    emitLevels(join(dir, 'sokoban-' + c.id + '-levels.js'), c.name, SOURCE, keepL);
    emitSolutions(join(dir, 'sokoban-' + c.id + '-solutions.js'), c.name, keepS);
    if (c.ship) registry.push("  set('" + c.id + "', '" + c.name + "', " + solved + ", '" + c.id + "-'),");
  }
}

// Unsolved Challenges batch — still-unsolved levels, no stored solutions. Shippable batch holds only
// license-cleared (Skinner) levels; held batch goes to _held/ for local work.
function emitUnsolved(dir, levels) {
  if (!levels.length) return 0;
  emitLevels(join(dir, 'sokoban-unsolved-levels.js'), 'Unsolved Challenges',
    { provider: 'David W. Skinner (Sasquatch)', providerUrl: 'http://www.sneezingtiger.com/sokoban/levels.html' }, levels);
  emitSolutions(join(dir, 'sokoban-unsolved-solutions.js'), 'Unsolved Challenges', levels.map(() => ''));
  return levels.length;
}
const shipN = emitUnsolved(OUT, shipUnsolved);
emitUnsolved(HELD, heldUnsolved);
if (shipN) registry.push("  set('unsolved', 'Unsolved Challenges', " + shipN + ", 'unsolved-', { maxPending: " + shipN + " }),");

console.log('\n--- registry lines for sets.js (SHIP only) ---\n' + registry.join('\n'));
console.log('\n' + (WRITE ? 'WROTE files (ship → docs/games/sokoban, held → _held/).' : 'DRY-RUN (no files written). Re-run with --write.'));
