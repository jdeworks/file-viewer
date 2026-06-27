// Depth test for the ReScript known view: must capture TYPED signatures (labeled params + types,
// record fields, variant constructors, externals), not just names. Pure (analyzeReScript is
// DOM-free). Fixture = the committed sample.res.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeReScript } from '../docs/types/text/known/rescript-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.res'), 'utf8');
const { opens, types, lets, modules, externals, jsx } = analyzeReScript(sample);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const fn = (n) => lets.find((l) => l.name === n);
const typ = (n) => types.find((t) => t.name === n);

// imports
ok(opens.includes('Belt') && opens.includes('React'), 'opens Belt and React');

// @react.component function with labeled, typed params: make(~name: string, ~sound: string)
const make = fn('make');
ok(make && make.fn && make.params.length === 2, 'make is a function with 2 params');
ok(make && make.params[0].name === 'name' && make.params[0].label && make.params[0].type === 'string', 'make first param ~name: string (labeled, typed)');
ok(make && make.params[1].name === 'sound' && make.params[1].type === 'string', 'make second param ~sound: string');
ok(make && make.attrs.includes('@react.component'), 'make carries @react.component decorator');

// plain arrow function with positional params: add = (a, b) => ...
const add = fn('add');
ok(add && add.fn && add.params.map((p) => p.name).join(',') === 'a,b', 'add(a, b) positional params');

// single param: greet = (name) => ...
const greet = fn('greet');
ok(greet && greet.fn && greet.params.length === 1 && greet.params[0].name === 'name', 'greet(name) single param');

// value let (not a function)
const defaultDog = fn('defaultDog');
ok(defaultDog && !defaultDog.fn, 'defaultDog is a value (not fn)');

// nested module functions captured with parent
const makeAnimal = fn('makeAnimal');
ok(makeAnimal && makeAnimal.fn && makeAnimal.module === 'AnimalUtils', 'makeAnimal captured inside module AnimalUtils');
ok(modules.some((m) => m.name === 'AnimalUtils'), 'module AnimalUtils captured');

// record type with typed fields
const animal = typ('animal');
ok(animal && animal.kind === 'record' && animal.fields.length === 3, 'type animal is a record with 3 fields');
ok(animal && animal.fields.find((f) => f.name === 'name' && f.type === 'string'), 'animal.name: string field typed');
ok(animal && animal.fields.find((f) => f.name === 'alive' && f.type === 'bool'), 'animal.alive: bool field typed');

// variant type with constructors
const trick = typ('dogTrick');
ok(trick && trick.kind === 'variant' && trick.constructors.map((c) => c.name).join(',') === 'Sit,Shake,Roll', 'type dogTrick variant Sit|Shake|Roll');

// externals with JS name + attrs
const alert = externals.find((e) => e.name === 'alert');
ok(alert && alert.jsName === 'alert' && /string/.test(alert.type), 'external alert: string => unit = "alert"');
const ce = externals.find((e) => e.name === 'createElement');
ok(ce && ce.attrs.includes('@module("react")') && ce.attrs.includes('@val'), 'external createElement carries @module("react") @val');

ok(jsx === true, 'JSX / React component detected');

// not name-only: at least one binding carries a typed param AND a type carries structure
ok(lets.some((l) => l.params.some((p) => p.type)), 'a function carries typed params (not name-only)');
ok(types.some((t) => t.fields.length || t.constructors.length), 'a type carries fields/constructors (not name-only)');

console.log(failed ? `\n${failed} failed` : '\nall rescript-lang assertions passed');
process.exit(failed ? 1 : 0);
