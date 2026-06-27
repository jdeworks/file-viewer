// Depth test for the LiveScript known view: must capture REAL structure — functions WITH their
// param names, classes WITH methods, require! bindings, exports — not just names. Pure
// (analyzeLiveScript is DOM-free). Fixture = the committed sample.ls.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeLiveScript } from '../docs/types/text/known/livescript-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.ls'), 'utf8');
const { requires, functions, classes, constants, exports } = analyzeLiveScript(sample);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const fn = (n) => functions.find((f) => f.name === n);
const cls = (n) => classes.find((c) => c.name === n);

// require! block with bindings
ok(requires.some((r) => r.module === 'prelude-ls'), 'require! prelude-ls captured');
ok(requires.some((r) => r.module === 'fs'), 'require! fs captured');

// top-level functions WITH param names and bound (~>) flag
const greet = fn('greet');
ok(greet && greet.params.length === 1 && greet.params[0] === 'name' && greet.bound === false, 'greet = (name) -> : param name + unbound');

const readFile = fn('readFileAsync');
ok(readFile && readFile.params.join(',') === 'path,cb', 'readFileAsync = (path, cb) -> : both param names');

const addLogger = fn('addLogger');
ok(addLogger && addLogger.params[0] === 'prefix' && addLogger.bound === true, 'addLogger = (prefix) ~> : bound (fat arrow)');

// classes WITH methods (and the extends relationship)
const animal = cls('Animal');
ok(animal && animal.methods.some((m) => m.name === 'speak'), 'class Animal has method speak');
ok(animal && animal.methods.some((m) => m.name === 'constructor' && m.params.includes('@name')), 'Animal constructor captures @name param');

const dog = cls('Dog');
ok(dog && dog.extends === 'Animal', 'class Dog extends Animal');
const learn = dog && dog.methods.find((m) => m.name === 'learn');
ok(learn && learn.params[0] === 'trick', 'Dog.learn(trick) : method WITH param name');
ok(dog && dog.methods.some((m) => m.name === 'perform' && m.bound === true), 'Dog.perform is bound (~>)');

// constants (non-function assignments)
ok(constants.some((c) => c.name === 'doubled'), 'constant doubled captured');

// exports from module.exports = { ... }
ok(exports.includes('Animal') && exports.includes('greet') && exports.length >= 5, 'module.exports names captured');

// not name-only: at least one function actually carries named params
ok(functions.some((f) => f.params.length > 0), 'functions carry param names (not name-only)');

console.log(failed ? `\n${failed} failed` : '\nall livescript-lang assertions passed');
process.exit(failed ? 1 : 0);
