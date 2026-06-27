// Depth test for the Janet known view: must capture REAL structure — function names WITH their
// param vectors (names + arity), private defn-, def/var bindings, imports/use, and macros — not
// just names. Pure (analyzeJanet is DOM-free). Fixture = the committed docs/examples/sample.janet.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeJanet } from '../docs/types/text/known/janet-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.janet'), 'utf8');
const { moduleName, imports, uses, functions, macros, defs, vars, structs } = analyzeJanet(sample);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const fn = (n) => functions.find((f) => f.name === n);

ok(moduleName === 'myapp', 'module name = myapp');

// imports: (import spork/misc :as misc), (import json), (use judge)
ok(imports.some((i) => i.spec === 'spork/misc' && i.alias === 'misc'), 'import spork/misc :as misc (spec + alias)');
ok(imports.some((i) => i.spec === 'json'), 'import json');
ok(uses.includes('judge'), 'use judge');

// public defn WITH its param vector + arity
const add = fn('add-nums');
ok(add && !add.private, 'add-nums is a public defn');
ok(add && add.params.length === 2 && add.params[0] === 'a' && add.params[1] === 'b', 'add-nums params = [a b]');
ok(add && add.arity === 2 && !add.variadic, 'add-nums arity = 2');
ok(add && add.doc === 'Add two numbers together.', 'add-nums docstring captured');

const greet = fn('greet');
ok(greet && greet.params.length === 1 && greet.params[0] === 'name' && greet.arity === 1, 'greet params = [name], arity 1');

// variadic function: (defn main [& args] ...)
const main = fn('main');
ok(main && main.variadic && main.params.includes('&'), 'main is variadic ([& args])');

// private defn-
const helper = fn('private-helper');
ok(helper && helper.private === true, 'private-helper flagged private (defn-)');
ok(helper && helper.params[0] === 'x' && helper.arity === 1, 'private-helper params = [x]');

// macros with param vectors
ok(macros.some((m) => m.name === 'when-positive' && m.variadic), 'macro when-positive captured (variadic body)');
ok(macros.some((m) => m.name === 'with-logging'), 'macro with-logging captured');

// def / var bindings
ok(defs.some((d) => d.name === 'PI' && d.value === '3.14159265'), 'def PI = 3.14159265');
ok(defs.some((d) => d.name === 'MAX-RETRIES'), 'def MAX-RETRIES binding');
ok(vars.some((v) => v.name === '*global-count*'), 'var *global-count* binding');

// not name-only: at least one function actually carries a param vector
ok(functions.some((f) => f.params.length > 0), 'functions carry param vectors (not name-only)');

// inner (def result ...) inside the with-logging macro body must NOT leak as a top-level def
ok(!defs.some((d) => d.name === 'result'), 'nested def inside macro body not captured as top-level');

console.log(failed ? `\n${failed} failed` : '\nall janet-lang assertions passed');
process.exit(failed ? 1 : 0);
