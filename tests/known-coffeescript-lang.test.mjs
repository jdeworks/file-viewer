// Depth test for the CoffeeScript known view: must capture REAL structure — function/method
// param names + arrow kind (-> vs =>), class hierarchy with methods, imports, exports — not just
// a name list. Pure (analyzeCoffee is DOM-free). Fixture = the committed sample.coffee.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeCoffee } from '../docs/types/text/known/coffeescript-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const samplePath = resolve(HERE, '../docs/examples/sample.coffee');

const FIXTURE = `EventEmitter = require 'events'
class Foo extends Bar
  greet: (name, loud = false) ->
    "hi #{name}"
fn = (a, b) -> a + b
module.exports = { Foo, fn }
`;

const usingSample = existsSync(samplePath);
const src = usingSample ? readFileSync(samplePath, 'utf8') : FIXTURE;
console.log(usingSample ? `(using real sample: ${samplePath})` : '(no sample found — using inline fixture)');

const { imports, functions, classes, constants, exports } = analyzeCoffee(src);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const fn = (n) => functions.find((f) => f.name === n);
const cls = (n) => classes.find((c) => c.name === n);

if (usingSample) {
  // imports: name = require 'source'
  const ev = imports.find((i) => i.source === 'events');
  ok(ev && ev.name === 'EventEmitter', "import: EventEmitter = require 'events'");
  ok(imports.length >= 3, 'multiple requires captured');

  // top-level functions WITH param names + arrow kind
  const greet = fn('greet');
  ok(greet && greet.params.map((p) => p.name).join(',') === 'name' && greet.bound === false, 'greet = (name) -> : param + thin arrow');
  const add = fn('add');
  ok(add && add.params.map((p) => p.name).join(',') === 'a,b' && add.bound === false, 'add = (a, b) -> : params a,b');
  const mul = fn('multiply');
  ok(mul && mul.bound === true, 'multiply = (a, b) => : fat (bound) arrow');

  // class hierarchy + methods (indentation-associated)
  const animal = cls('Animal');
  ok(animal && animal.extends === null, 'class Animal (no extends)');
  ok(animal && animal.methods.some((m) => m.name === 'speak'), 'Animal has method speak');
  const dog = cls('Dog');
  ok(dog && dog.extends === 'Animal', 'class Dog extends Animal');
  const ctor = dog && dog.methods.find((m) => m.name === 'constructor');
  ok(ctor && ctor.params[0].name === 'name', 'Dog constructor param: name');
  const perform = dog && dog.methods.find((m) => m.name === 'perform');
  ok(perform && perform.bound === true, 'Dog#perform is a bound (=>) method');

  // constructor with @-bound params (real CoffeeScript structure)
  const aCtor = animal && animal.methods.find((m) => m.name === 'constructor');
  ok(aCtor && aCtor.params.length === 2 && aCtor.params[0].at && aCtor.params[0].name === 'name', 'Animal constructor @name/@sound @-bound params');

  // exports parsed from module.exports = { ... }
  ok(['Animal', 'Dog', 'greet', 'add', 'multiply'].every((n) => exports.includes(n)), 'exports list from module.exports braces');
} else {
  const f = fn('fn');
  ok(f && f.params.map((p) => p.name).join(',') === 'a,b', 'fn (a, b) param names');
  const foo = cls('Foo');
  ok(foo && foo.extends === 'Bar', 'class Foo extends Bar');
  const g = foo && foo.methods.find((m) => m.name === 'greet');
  ok(g && g.params[0].name === 'name' && g.params[1].name === 'loud' && g.params[1].default === 'false', 'greet method params incl default');
  ok(exports.includes('Foo') && exports.includes('fn'), 'exports from braces');
}

// not name-only: at least one callable carries named params
const allCallables = [...functions, ...classes.flatMap((c) => c.methods)];
ok(allCallables.some((c) => c.params.some((p) => p.name)), 'callables carry named params (not name-only)');

console.log(failed ? `\n${failed} failed` : '\nall coffeescript-lang assertions passed');
process.exit(failed ? 1 : 0);
