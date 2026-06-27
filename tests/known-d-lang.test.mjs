// Depth test for the D known view: must capture function SIGNATURES (typed params + return type)
// and aggregate STRUCTURE (typed fields + methods), not just names. analyzeD is pure (DOM-free).
// Fixture = the committed docs/examples/sample.d.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeD } from '../docs/types/text/known/d-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.d'), 'utf8');
const { module, imports, functions, aggregates, enums, templates } = analyzeD(sample);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const agg = (n) => aggregates.find((a) => a.name === n);
const fn = (n) => functions.find((f) => f.name === n);

ok(module === 'samples.animals', 'module name = samples.animals');
ok(imports.std.includes('std.stdio'), 'std import std.stdio');
ok(imports.local.includes('animals.base'), 'local import animals.base');

// Module-level function with typed params + return type: @safe string formatAnimal(const Animal a)
const fmt = fn('formatAnimal');
ok(fmt && fmt.returns === 'string', 'formatAnimal return type = string');
ok(fmt && fmt.params.length === 1 && fmt.params[0].name === 'a' && fmt.params[0].type === 'const Animal',
  'formatAnimal param: const Animal a');

// function with derived return type
const cls = fn('classify');
ok(cls && cls.returns === 'AgeGroup', 'classify return type = AgeGroup');
ok(fn('main') && fn('main').returns === 'void', 'main return type = void');

// class with typed fields + methods + base list
const animal = agg('Animal');
ok(animal && animal.kind === 'class', 'class Animal');
ok(animal && animal.fields.some((f) => f.name === 'name' && f.type === 'string'), 'Animal field name : string');
ok(animal && animal.fields.some((f) => f.name === '_age' && f.type === 'int'), 'Animal field _age : int');
ok(animal && animal.methods.some((m) => m.name === 'isAdult'), 'Animal method isAdult');

const bird = agg('Bird');
ok(bird && /Animal/.test(bird.base) && /Behaviour/.test(bird.base), 'class Bird : Animal, Behaviour (base list)');

const iface = agg('Behaviour');
ok(iface && iface.kind === 'interface' && iface.methods.some((m) => m.name === 'canFly'), 'interface Behaviour with method canFly');

// struct with typed fields + method signatures (template struct)
const store = agg('AnimalStore');
ok(store && store.kind === 'struct', 'struct AnimalStore');
ok(store && store.fields.some((f) => f.name === '_items' && f.type === 'T[]'), 'AnimalStore field _items : T[]');
const find = store && store.methods.find((m) => m.name === 'findBySpecies');
ok(find && find.returns === 'T[]' && find.params[0] && find.params[0].type === 'string' && find.params[0].name === 'species',
  'findBySpecies(string species) returns T[]');

// enum with members
const ag = enums.find((e) => e.name === 'AgeGroup');
ok(ag && ag.members.length === 3 && ag.members.includes('Juvenile') && ag.members.includes('Senior'),
  'enum AgeGroup members [Juvenile, Adult, Senior]');

// template captured
ok(templates.includes('maxBy'), 'template maxBy');

// depth proof: signatures carry typed params (not name-only); structs carry typed fields
const allFns = [...functions, ...aggregates.flatMap((a) => a.methods)];
ok(allFns.some((s) => s.params.some((p) => p.type)), 'signatures carry typed params (not name-only)');
ok(aggregates.some((a) => a.fields.some((f) => f.type)), 'aggregates carry typed fields');

console.log(failed ? `\n${failed} failed` : '\nall d-lang assertions passed');
process.exit(failed ? 1 : 0);
