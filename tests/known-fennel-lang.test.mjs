// Depth test for the Fennel known view: must capture function SIGNATURES (param names + arity),
// local/var/global bindings, and requires — not just a name list. Pure (analyzeFennel is DOM-free).
// Fixture = the committed sample.fnl.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeFennel } from '../docs/types/text/known/fennel-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.fnl'), 'utf8');
const { requires, functions, locals, vars, globals, macros, macroImports, loops } = analyzeFennel(sample);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const fn = (n) => functions.find((f) => f.name === n);

// requires — including (local x (require :mod)) bindings, with the local alias captured
ok(requires.some((r) => r.module === 'lume' && r.as === 'lume'), 'require lume captured as a local binding');
ok(requires.some((r) => r.module === 'dkjson' && r.as === 'json'), 'require dkjson aliased as json');
ok(requires.length >= 3, 'at least 3 requires');

// functions WITH their param vectors (names + arity) — the load-bearing depth
const ms = fn('make-scene');
ok(ms && ms.arity === 4, 'make-scene arity = 4');
ok(ms && JSON.stringify(ms.params) === JSON.stringify(['name', 'init-fn', 'update-fn', 'draw-fn']),
  'make-scene param names captured in order');
ok(ms && ms.doc === 'Create a new scene table.', 'make-scene docstring captured');

const clamp = fn('clamp');
ok(clamp && clamp.arity === 3 && clamp.params[0] === 'val', 'clamp [val min-val max-val] params');

// lambda captured with kind + params
const mv = fn('make-vec2');
ok(mv && mv.kind === 'lambda' && mv.arity === 2, 'lambda make-vec2 [x y] arity 2');

// at least one function actually carries named params (not name-only)
ok(functions.some((f) => f.params.length > 0), 'functions carry named params (not name-only)');

// local / var / global bindings
ok(locals.includes('default-config'), 'local binding default-config');
ok(vars.includes('current-scene') && vars.includes('running?'), 'var declarations captured');

// macros (with rest params) and macro imports
ok(macros.some((m) => m.name === 'with-scene' && m.variadic), 'macro with-scene captured (variadic)');
ok(macroImports.includes('macros.core'), 'import-macros module captured');

// loop constructs counted
ok(loops.each >= 1 && loops.for >= 1 && loops.while >= 1, 'loop constructs counted');

console.log(failed ? `\n${failed} failed` : '\nall fennel-lang assertions passed');
process.exit(failed ? 1 : 0);
