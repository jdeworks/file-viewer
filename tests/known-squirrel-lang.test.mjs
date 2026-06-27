// Depth test for the Squirrel (.nut) known view: must capture REAL structure — classes with their
// `extends` base + methods carrying PARAM NAMES, free functions with params, enums/consts — not just
// names. Pure (analyzeSquirrel is DOM-free). Fixture = the committed sample.nut.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeSquirrel } from '../docs/types/text/known/squirrel-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.nut'), 'utf8');
const { classes, functions, globals } = analyzeSquirrel(sample);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const cls = (n) => classes.find((c) => c.name === n);
const fn = (n) => functions.find((f) => f.name === n);
const meth = (c, n) => c && c.methods.find((m) => m.name === n);
const pnames = (x) => (x ? x.params.map((p) => p.name) : []);

// --- classes ---
ok(classes.length === 2, `found 2 classes (got ${classes.length})`);

const vector = cls('Vector');
ok(vector && vector.base === null, 'class Vector has no base');
const vctor = meth(vector, 'constructor');
ok(vctor && pnames(vctor).join(',') === 'x,y', 'Vector.constructor(x, y) params');
ok(meth(vector, 'length') && pnames(meth(vector, 'length')).length === 0, 'Vector.length() no params');
ok(meth(vector, 'toString'), 'Vector.toString() method captured');
ok(vector && vector.members.includes('x') && vector.members.includes('y'), 'Vector members x, y');

const matrix = cls('Matrix');
ok(matrix && matrix.base === 'Vector', 'class Matrix extends Vector (base captured)');
ok(matrix && pnames(meth(matrix, 'constructor')).join(',') === 'x,y,z', 'Matrix.constructor(x, y, z) params');

// --- free functions (must NOT pick up class methods) ---
ok(functions.length === 3, `found 3 free functions (got ${functions.length}: ${functions.map((f) => f.name).join(',')})`);
ok(pnames(fn('add')).join(',') === 'a,b', 'free function add(a, b)');
ok(pnames(fn('multiply')).join(',') === 'a,b', 'free function multiply(a, b)');
ok(pnames(fn('greet')).join(',') === 'name', 'free function greet(name)');
ok(!fn('length') && !fn('toString'), 'class methods are NOT reported as free functions');

// --- globals (:: declarations) ---
ok(globals.includes('GameConfig') && globals.includes('EventBus'), ':: global declarations captured');

// --- not name-only: declarations carry real param structure ---
ok([...functions, ...classes.flatMap((c) => c.methods)].some((s) => s.params.length > 0),
  'declarations carry param lists (not name-only)');

// --- enum / const / default-arg / varargs paths (inline snippet, sample has none) ---
const extra = analyzeSquirrel(`
  enum Color { Red, Green = 5, Blue }
  const MAX_PLAYERS = 100;
  function spawn(kind, count = 1, ...) { return kind; }
  class Player extends Entity {
    hp = 100;
    function attack(target, dmg = 10) {}
  }
`);
ok(extra.enums.length === 1 && extra.enums[0].name === 'Color'
   && extra.enums[0].members.join(',') === 'Red,Green,Blue', 'enum Color members parsed (incl. = value)');
ok(extra.constants.some((c) => c.name === 'MAX_PLAYERS' && c.value === '100'), 'const MAX_PLAYERS = 100');
const spawn = extra.functions.find((f) => f.name === 'spawn');
ok(spawn && spawn.params.length === 3 && spawn.params[1].default === '1'
   && spawn.params[2].name === '...', 'spawn(kind, count = 1, ...) — default arg + varargs');
const player = extra.classes.find((c) => c.name === 'Player');
ok(player && player.base === 'Entity', 'inline class Player extends Entity');
const attack = player && player.methods.find((m) => m.name === 'attack');
ok(attack && attack.params[1] && attack.params[1].default === '10', 'method default arg dmg = 10');

console.log(failed ? `\n${failed} failed` : '\nall squirrel-lang assertions passed');
process.exit(failed ? 1 : 0);
