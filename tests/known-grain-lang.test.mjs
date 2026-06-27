// Depth test for the Grain known view: must capture REAL structure — function bindings with typed
// params + return type, records with typed fields, enums with cases — not just names. analyzeGrain is
// pure (DOM-free). Fixture = the committed sample.gr.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeGrain } from '../docs/types/text/known/grain-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.gr'), 'utf8');
const { module, imports, functions, records, enums, aliases } = analyzeGrain(sample);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const fn = (n) => functions.find((f) => f.name === n);
const rec = (n) => records.find((r) => r.name === n);
const en = (n) => enums.find((e) => e.name === n);

ok(module === 'Main', 'module name = Main');

// imports: both `import X from "p"` and `from "p" import { a, b }`
ok(imports.some((i) => i.name === 'List' && i.from === 'immutable/list'), 'import List from "immutable/list"');
ok(imports.some((i) => i.name === 'concat' && i.from === 'string')
   && imports.some((i) => i.name === 'length' && i.from === 'string'), 'from "string" import { concat, length }');

// function WITH typed params (the key depth — not name-only)
const greet = fn('greet');
ok(greet && greet.params.length === 1 && greet.params[0].name === 'name'
   && greet.params[0].type === 'String', 'greet(name: String) — typed param');
ok(greet && greet.provided, 'greet marked provided (export)');

const distance = fn('distance');
ok(distance && distance.params.length === 2
   && distance.params[0].type === 'Point' && distance.params[1].type === 'Point',
   'distance(p1: Point, p2: Point) — two typed params (brace body)');

const colorName = fn('colorName');
ok(colorName && colorName.params.length === 1 && colorName.params[0].type === 'Color',
   'colorName(c: Color) — typed param (match body)');

// at least one binding carries a typed param (not name-only)
ok(functions.some((f) => f.params.some((p) => p.type)), 'functions carry typed params (not name-only)');

// record WITH typed fields
const point = rec('Point');
ok(point && point.fields.length === 2
   && point.fields[0].name === 'x' && point.fields[0].type === 'Number'
   && point.fields[1].name === 'y' && point.fields[1].type === 'Number',
   'record Point { x: Number, y: Number } — typed fields');
const person = rec('Person');
ok(person && person.fields.some((f) => f.name === 'name' && f.type === 'String')
   && person.fields.some((f) => f.name === 'age' && f.type === 'Number'),
   'record Person { name: String, age: Number }');

// enum WITH cases
const color = en('Color');
ok(color && color.cases.length === 3
   && color.cases.includes('Red') && color.cases.includes('Green') && color.cases.includes('Blue'),
   'enum Color { Red, Green, Blue } — cases captured');

// counts sane
ok(records.length === 2 && enums.length === 1 && functions.length === 3,
   `counts: ${records.length} records, ${enums.length} enums, ${functions.length} functions`);

// also verify newer-syntax forms via an inline fixture (provide / include / type alias / return type)
const inline = `module Geo
from "list" include List
provide let scale = (p: Point, k: Number): Point => p
provide type Coord = Number
`;
const f2 = analyzeGrain(inline);
ok(f2.module === 'Geo', 'inline: module Geo');
ok(f2.imports.some((i) => i.kind === 'include' && i.name === 'List' && i.from === 'list'), 'inline: include form');
const scale = f2.functions.find((f) => f.name === 'scale');
ok(scale && scale.provided && scale.returns === 'Point' && scale.params.length === 2,
   'inline: provide let scale(p: Point, k: Number): Point — provided + return type');
ok(f2.aliases.some((a) => a.name === 'Coord' && a.aliasOf === 'Number' && a.provided), 'inline: type alias Coord = Number');

console.log(failed ? `\n${failed} failed` : '\nall grain-lang assertions passed');
process.exit(failed ? 1 : 0);
