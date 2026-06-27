// Depth test for the Racket known view: must capture real code structure — function definitions with
// their parameter names/arity, struct fields, require/provide, macros, contracts — not just names.
// Pure (analyzeRacket is DOM-free). Fixture = the committed sample.rkt.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeRacket } from '../docs/types/text/known/racket-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.rkt'), 'utf8');
const { lang, isTyped, requires, provides, structs, functions, values, macros } = analyzeRacket(sample);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const fn = (n) => functions.find((f) => f.name === n);
const st = (n) => structs.find((s) => s.name === n);
const mac = (n) => macros.find((m) => m.name === n);

ok(lang === 'racket', '#lang racket detected');
ok(isTyped === false, 'not typed racket');

// require / provide modules + exports
ok(requires.includes('racket/list') && requires.includes('racket/contract') && requires.length >= 4, 'require modules');
ok(provides.includes('factorial') && provides.includes('stack-empty?') && provides.length >= 7, 'provide exports');

// struct with fields (not name-only)
const stk = st('stack');
ok(stk && stk.fields.length === 1 && stk.fields[0] === 'items', 'struct stack has field: items');

// function definitions carry the right param names + arity
const push = fn('stack-push');
ok(push && push.params.length === 2 && push.params[0] === 's' && push.params[1] === 'item', 'stack-push(s item) — arity 2, named params');

const proc = fn('process-items');
ok(proc && proc.params.length === 3 && proc.params.join(' ') === 'items transform filter-pred', 'process-items(items transform filter-pred) — arity 3');

const mk = fn('make-stack');
ok(mk && mk.params.length === 0, 'make-stack() — zero params');

// define/contract recognised as a function (with contract flag) carrying params
const fact = fn('factorial');
ok(fact && fact.contract === true && fact.params.length === 1 && fact.params[0] === 'n', 'factorial(n) parsed from define/contract with contract flag');

// dotted rest argument
const comp = fn('compose');
ok(comp && comp.params.length === 1 && comp.params[0] === '. fns', 'compose(. fns) — dotted rest captured');
const cur = fn('curry');
ok(cur && cur.params.join(' ') === 'f . args', 'curry(f . args) — fixed + rest params');

// macros via define-syntax
ok(mac('while') && mac('swap!'), 'define-syntax macros: while, swap!');

// plain value defines distinguished from functions
ok(values.some((v) => v.name === 'app-version') && values.some((v) => v.name === 'max-iterations') && values.length >= 3, 'value defines (app-version, max-iterations, default-timeout)');
ok(!functions.some((f) => f.name === 'app-version'), 'value define NOT misclassified as a function');

// not name-only: at least one function actually carries named parameters
ok(functions.some((f) => f.params.length > 0), 'functions carry param lists (not name-only)');

console.log(failed ? `\n${failed} failed` : '\nall racket-lang assertions passed');
process.exit(failed ? 1 : 0);
