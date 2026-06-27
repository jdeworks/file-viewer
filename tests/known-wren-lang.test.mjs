// Depth test for the Wren known view: must capture REAL class structure — methods with their
// param names, the construct constructor, getters/setters/operators/static distinguished, and
// imports — not just names. Pure (analyzeWren is DOM-free). Fixture = the committed sample.wren.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeWren } from '../docs/types/text/known/wren-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.wren'), 'utf8');
const { imports, classes, variables } = analyzeWren(sample);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const cls = (n) => classes.find((c) => c.name === n);
const mem = (c, n) => (c ? c.methods.find((x) => x.name === n) : null);

// imports
const math = imports.find((i) => i.module === 'math');
const io = imports.find((i) => i.module === 'io');
ok(math && math.names.length === 1 && math.names[0] === 'Math', 'import "math" for Math');
ok(io && io.names.join(',') === 'File,Directory', 'import "io" for File, Directory');

// classes + base (superclass via `is`)
const animal = cls('Animal');
const dog = cls('Dog');
const vector = cls('Vector');
ok(animal && animal.base === null, 'class Animal (no base)');
ok(dog && dog.base === 'Animal', 'class Dog is Animal (base captured)');
ok(vector && vector.base === 'Sequence', 'class Vector is Sequence (base captured)');

// constructor with param names
const ctor = mem(animal, 'new');
ok(ctor && ctor.kind === 'constructor' && ctor.params.join(',') === 'name,sound',
  'construct new(name, sound) — kind=constructor, params captured');

// method with param names + arity
const learn = mem(dog, 'learnTrick');
ok(learn && learn.kind === 'method' && learn.params.length === 1 && learn.params[0] === 'trick',
  'learnTrick(trick) — kind=method, param name captured');
const speak = mem(animal, 'speak');
ok(speak && speak.kind === 'method' && speak.params.length === 0, 'speak() — zero-arg method');

// getter vs method distinction (no parens = getter)
const name = mem(animal, 'name');
ok(name && name.kind === 'getter' && name.params.length === 0, 'name { _name } classified as getter');

// static getter
const breed = mem(dog, 'breed');
ok(breed && breed.static === true && breed.kind === 'getter', 'static breed { ... } — static getter');
const zero = mem(vector, 'zero');
ok(zero && zero.static === true, 'static zero — static member');

// setter (shares the name `x` with its getter, so look up by kind)
const setX = vector.methods.find((m) => m.name === 'x' && m.kind === 'setter');
ok(setX && setX.params.join(',') === 'value', 'x=(value) classified as setter');
// the getter x and setter x are distinct members
ok(vector.methods.filter((m) => m.name === 'x').some((m) => m.kind === 'getter'), 'x { _x } getter present alongside x= setter');

// operator overloads
ok(mem(vector, '+') && mem(vector, '+').kind === 'operator' && mem(vector, '+').params.join(',') === 'other',
  '+(other) classified as operator');
ok(mem(vector, '==') && mem(vector, '==').kind === 'operator', '==(other) classified as operator');
ok(vector.methods.some((m) => m.name === '[index]' && m.kind === 'operator'), '[index] subscript classified as operator');

// foreign method
const fetch = mem(dog, 'fetch');
ok(fetch && fetch.foreign === true && fetch.kind === 'method' && fetch.params.join(',') === 'item',
  'foreign fetch(item) — foreign flag + param captured');

// top-level variables (not inner method-body assignments)
ok(variables.includes('PI') && variables.includes('greeting') && variables.includes('dog'),
  'top-level vars PI, greeting, dog');
ok(!animal.methods.some((m) => m.name === '_name'), 'inner constructor assignments not parsed as members (brace-depth aware)');

// not name-only: members carry params and classified kinds
const allMembers = classes.flatMap((c) => c.methods);
ok(allMembers.some((m) => m.params.length > 0), 'members carry param names (not name-only)');
ok(new Set(allMembers.map((m) => m.kind)).size >= 4, 'multiple member kinds distinguished (getter/setter/method/operator/constructor)');

console.log(failed ? `\n${failed} failed` : '\nall wren-lang assertions passed');
process.exit(failed ? 1 : 0);
