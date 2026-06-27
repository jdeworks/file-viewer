// Depth test for the Reason (ReasonML) known view: must capture REAL structure — typed function
// params + return types, record fields, variant constructors — not just names. Pure (analyzeReason
// is DOM-free). Fixture = the committed sample.re.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeReason } from '../docs/types/text/known/reason-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.re'), 'utf8');
const { opens, modules, externals, types, lets } = analyzeReason(sample);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const letB = (n) => lets.find((l) => l.name === n);
const typeB = (n) => types.find((t) => t.name === n);

// opens
ok(opens.includes('Belt') && opens.includes('React'), 'opens Belt + React');

// module
ok(modules.includes('AnimalUtils'), 'module AnimalUtils captured');

// function let with labeled, TYPED params + correct names: let make = (~name: string, ~sound: string)
const make = letB('make');
ok(make && make.fn, 'make is a function');
ok(make && make.params.map((p) => p.name).join(',') === 'name,sound', 'make param names = name, sound');
ok(make && make.params.every((p) => p.type === 'string'), 'make params typed string');
ok(make && make.params.every((p) => p.labeled), 'make params are labeled (~)');

// plain arrow fn with multiple params: let add = (a, b) => a + b
const add = letB('add');
ok(add && add.fn && add.params.map((p) => p.name).join(',') === 'a,b', 'add(a, b) params captured');

// value (non-function) let: let defaultDog = AnimalUtils.makeAnimal(...)
const dd = letB('defaultDog');
ok(dd && !dd.fn, 'defaultDog is a value, not a function');

// record type with typed fields
const animal = typeB('animal');
ok(animal && animal.kind === 'record', 'type animal is a record');
ok(animal && animal.fields.find((f) => f.name === 'name' && f.type === 'string'), 'animal.name: string field');
ok(animal && animal.fields.find((f) => f.name === 'alive' && f.type === 'bool'), 'animal.alive: bool field');

// variant type with constructors
const trick = typeB('dogTrick');
ok(trick && trick.kind === 'variant', 'type dogTrick is a variant');
ok(trick && ['Sit', 'Shake', 'Roll'].every((c) => trick.constructors.some((k) => k.name === c)), 'dogTrick constructors Sit/Shake/Roll');

// externals with typed signatures
const alertExt = externals.find((e) => e.name === 'alert');
ok(alertExt && /string\s*=>\s*unit/.test(alertExt.type), 'external alert: string => unit');

// not name-only: at least one function carries a typed param
ok(lets.some((l) => l.fn && l.params.some((p) => p.type)), 'functions carry typed params (not name-only)');

console.log(failed ? `\n${failed} failed` : '\nall reason-lang assertions passed');
process.exit(failed ? 1 : 0);
