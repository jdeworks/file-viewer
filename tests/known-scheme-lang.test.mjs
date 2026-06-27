// Depth test for the Scheme known view: must capture REAL code structure — function param
// names/arity (incl. dotted-rest & full-variadic lambdas), macros, records (with fields),
// imports/exports — not just names. Pure (analyzeScheme is DOM-free). Fixture = sample.scm.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeScheme } from '../docs/types/text/known/scheme-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.scm'), 'utf8');
const facts = analyzeScheme(sample);
const { moduleName, isModule, imports, exports, functions, values } = facts;

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const fn = (n) => functions.find((f) => f.name === n);

// ── module / imports / exports from the (define-library ...) form ──
ok(isModule && moduleName === 'sample math', 'define-library name = "sample math"');
ok(imports.includes('(scheme base)') && imports.includes('(srfi 1)') && imports.length >= 4, 'imports captured as specs');
ok(exports.includes('factorial') && exports.includes('make-rational'), 'exports captured');

// ── functions: (define (name args...) ...) with correct param names + arity ──
const gcd = fn('gcd-extended');
ok(gcd && gcd.params.length === 2 && gcd.params[0] === 'a' && gcd.params[1] === 'b', 'gcd-extended params (a b)');
const fac = fn('factorial');
ok(fac && fac.params.length === 1 && fac.params[0] === 'n', 'factorial param (n)');
const mr = fn('make-rational');
ok(mr && mr.params.join(' ') === 'num den', 'make-rational params (num den)');

// ── (define name (lambda (args) ...)) recognised as a FUNCTION, not a value ──
const fl = fn('fold-left');
ok(fl && fl.params.join(' ') === 'f init lst', 'fold-left lambda-define → function with params (f init lst)');
ok(!values.find((v) => v.name === 'fold-left'), 'fold-left is NOT misclassified as a value');

// ── value defines distinguished from functions ──
ok(values.some((v) => v.name === 'pi') && values.some((v) => v.name === 'golden-ratio'), 'value defines captured');
ok(!fn('pi'), 'pi is a value, not a function');

// ── not name-only: at least one function actually carries parsed param names ──
ok(functions.some((f) => f.params.length > 0), 'functions carry parsed params (not name-only)');

// ── synthetic coverage for features beyond the sample: dotted-rest, variadic, macros, records ──
const extra = analyzeScheme(`
; comment ;; and a #| block
#| nested #| block |# still comment |#
(define (sum first . rest) (apply + first rest))      #; (this datum ignored)
(define logger (lambda args (for-each display args)))
(define-syntax swap! (syntax-rules () ((_ a b) (let ((t a)) (set! a b) (set! b t)))))
(define-record-type <point> (make-point x y) point? (x point-x set-point-x!) (y point-y))
(require (only racket/list first))
(define greeting "(define not-a-define x)")
`);
const sum = extra.functions.find((f) => f.name === 'sum');
ok(sum && sum.params.join(' ') === 'first . rest', 'dotted-rest params (first . rest)');
const logr = extra.functions.find((f) => f.name === 'logger');
ok(logr && logr.params.join(' ') === '. args', 'full-variadic lambda (. args)');
ok(extra.macros.some((m) => m.name === 'swap!'), 'define-syntax macro captured');
const pt = extra.records.find((r) => r.name === 'point');
ok(pt && pt.fields.join(' ') === 'x y', 'record fields (x y) parsed positionally');
ok(extra.imports.includes('(only racket/list first)'), 'require import captured');
ok(!extra.functions.some((f) => f.name === 'not-a-define'), 'string-literal content not parsed as a define');

console.log(failed ? `\n${failed} failed` : '\nall scheme-lang assertions passed');
process.exit(failed ? 1 : 0);
