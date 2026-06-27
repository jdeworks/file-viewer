// Depth test for the Koka known view: must capture function SIGNATURES (typed params + effect/return
// type) and type declarations WITH constructors — not just names. analyzeKoka is pure (DOM-free).
// The committed sample.koka covers functions/effects; an inline fixture covers types/values/imports.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeKoka } from '../docs/types/text/known/koka-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.koka'), 'utf8');

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };

// --- Real committed sample: functions + effects ---
const s = analyzeKoka(sample);
const fn = (n) => s.functions.find((f) => f.name === n);

ok(s.moduleName === 'Demo', 'module name = Demo');

// fun fib(n: int): int  -> typed param + return type (pure, no effect)
const fib = fn('fib');
ok(fib && fib.params.length === 1 && fib.params[0].name === 'n' && fib.params[0].type === 'int', 'fib(n : int) typed param');
ok(fib && fib.returns === 'int' && !fib.effect, 'fib returns int (no effect)');

// fun greet(name: string): console ()  -> effect + return type
const greet = fn('greet');
ok(greet && greet.params[0].type === 'string', 'greet(name : string) typed param');
ok(greet && greet.effect === 'console' && greet.returns === '()', 'greet : console () (effect + return)');

// fun runConsole(action: () -> console ()): ()  -> nested-paren higher-order param survives splitting
const rc = fn('runConsole');
ok(rc && rc.params.length === 1 && /->/.test(rc.params[0].type), 'runConsole higher-order param type kept whole');

ok(s.functions.length === 4, 'four top-level functions (effect ops not counted)');

// effect Console { println, readLine }
const console_ = s.effects.find((e) => e.name === 'Console');
ok(console_ && console_.operations.includes('println') && console_.operations.includes('readLine'), 'effect Console with operations');

// not name-only: at least one function carries a typed param
ok(s.functions.some((f) => f.params.some((p) => p.type)), 'signatures carry typed params (not name-only)');

// --- Inline fixture: imports, types-with-constructors, values, braces, block comments ---
const fixture = `// inline koka fixture
module test/shapes
import std/core
import nm = std/num/double

/* a sum type */
type color { Red; Green; Blue }

fun add(a : int, b : int) : int { a + b }

val pi = 3.14159
pub val tau : double = 6.28318
alias name = string
`;
const f = analyzeKoka(fixture);

ok(f.imports.some((i) => i.path === 'std/core'), 'import std/core captured');
ok(f.imports.some((i) => i.alias === 'nm' && i.path === 'std/num/double'), 'aliased import captured');

const color = f.types.find((t) => t.name === 'color');
ok(color && color.constructors.length === 3 && ['Red', 'Green', 'Blue'].every((c) => color.constructors.includes(c)), 'type color with 3 constructors');

const add = f.functions.find((x) => x.name === 'add');
ok(add && add.params.length === 2 && add.params[1].name === 'b' && add.params[1].type === 'int' && add.returns === 'int', 'add(a:int,b:int):int (brace form)');

ok(f.values.some((v) => v.name === 'pi' && v.value === '3.14159'), 'val pi = 3.14159');
ok(f.values.some((v) => v.name === 'tau' && v.type === 'double' && v.pub), 'pub val tau : double');
ok(f.aliases.some((a) => a.name === 'name' && a.target === 'string'), 'alias name = string');

console.log(failed ? `\n${failed} failed` : '\nall koka-lang assertions passed');
process.exit(failed ? 1 : 0);
