// Depth test for the Ruby known view: must capture REAL structure — classes with superclass,
// methods nested under their class with param names/arity, instance-vs-class (self.) scope,
// attrs/mixins/requires/constants — not just names. Pure (analyzeRuby is DOM-free).
// Fixture = the committed sample.rb.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeRuby } from '../docs/types/text/known/ruby-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.rb'), 'utf8');
const { classes, modules, methods, requires, constants, mixins, attrs } = analyzeRuby(sample);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const cls = (n) => classes.find((c) => c.name === n);
const mod = (n) => modules.find((c) => c.name === n);
const meth = (c, n) => c && c.methods.find((m) => m.name === n);
const param = (m, n) => m && m.params.find((p) => p.name === n);

// --- classes & superclass ---
ok(cls('Animal') && cls('Dog'), 'classes Animal and Dog found');
ok(cls('Dog').superclass === 'Animal', 'Dog < Animal (superclass captured)');
ok(cls('Animal').superclass === null, 'Animal has no superclass');

// --- methods nested under their class with params/arity ---
const init = meth(cls('Animal'), 'initialize');
ok(init && init.arity === 3, 'Animal#initialize nested with arity 3');
ok(init && param(init, 'name') && param(init, 'name').kind === 'required', 'initialize: name is required positional');
ok(init && param(init, 'age') && param(init, 'age').kind === 'optional' && param(init, 'age').default === '0',
  'initialize: age = 0 captured as optional with default 0');

// splat param: def to_json(*args)
const tj = meth(cls('Animal'), 'to_json');
ok(tj && param(tj, 'args') && param(tj, 'args').kind === 'splat', 'to_json(*args): splat param captured');

// visibility: internal_id is private, compare_age is protected
ok(meth(cls('Animal'), 'internal_id') && meth(cls('Animal'), 'internal_id').visibility === 'private', 'internal_id is private');
ok(meth(cls('Animal'), 'compare_age') && meth(cls('Animal'), 'compare_age').visibility === 'protected', 'compare_age is protected');

// Dog methods nested under Dog (not Animal)
ok(meth(cls('Dog'), 'fetch') && param(meth(cls('Dog'), 'fetch'), 'item'), 'Dog#fetch(item) nested under Dog');
ok(!meth(cls('Dog'), 'speak') || meth(cls('Animal'), 'speak'), 'speak exists on Animal');

// --- self. (class) method detection ---
const ser = mod('Serializable');
const inc = meth(ser, 'included');
ok(inc && inc.scope === 'class', 'Serializable.included detected as class (self.) method');
ok(meth(ser, 'serialize') && meth(ser, 'serialize').scope === 'instance', 'serialize detected as instance method');

// --- modules & nested module methods ---
ok(mod('Greeter') && mod('Formatter'), 'modules Greeter and Formatter found');
ok(meth(mod('Formatter'), 'format_name'), 'Formatter#format_name nested under Formatter');
ok(meth(mod('ClassMethods'), 'from_json'), 'ClassMethods#from_json nested under nested module');

// --- attrs ---
ok(attrs.some((a) => a.name === 'name' && a.kind === 'accessor'), 'attr_accessor :name captured');
ok(attrs.some((a) => a.name === 'species' && a.kind === 'reader'), 'attr_reader :species captured');
ok(attrs.some((a) => a.name === 'habitat' && a.kind === 'writer'), 'attr_writer :habitat captured');
ok(cls('Animal').attrs.some((a) => a.name === 'age'), 'attrs also attached to their class');

// --- mixins ---
ok(mixins.some((m) => m.kind === 'include' && m.name === 'Greeter::Formatter'), 'include Greeter::Formatter captured');
ok(mixins.some((m) => m.kind === 'extend' && m.name === 'Comparable'), 'extend Comparable captured');

// --- requires ---
ok(requires.some((r) => r.path === 'json' && r.kind === 'require'), 'require json captured');
ok(requires.some((r) => r.path === 'utils/helpers' && r.kind === 'require_relative'), 'require_relative utils/helpers captured');

// --- constants ---
ok(constants.some((k) => k.name === 'VERSION'), 'VERSION constant captured');
ok(mod('Greeter').constants.some((k) => k.name === 'VERSION'), 'VERSION attached to its module');

// --- not name-only: methods carry real params ---
const allMethods = [...methods, ...classes.flatMap((c) => c.methods), ...modules.flatMap((c) => c.methods)];
ok(allMethods.some((m) => m.params.length > 0), 'methods carry params (not name-only)');

console.log(failed ? `\n${failed} failed` : '\nall ruby-lang assertions passed');
process.exit(failed ? 1 : 0);
