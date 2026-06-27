// Depth test for the F# known view: must capture REAL structure — function let-bindings WITH typed
// params + return type, discriminated unions WITH cases, records WITH typed fields (not name-only).
// Pure (analyzeFSharp is DOM-free). Primary fixture = the committed sample.fs; a tiny inline fixture
// covers a fully type-annotated function which the sample lacks at top level.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeFSharp } from '../docs/types/text/known/fsharp-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.fs'), 'utf8');

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };

// ── Real committed sample: docs/examples/sample.fs ───────────────────────────
const s = analyzeFSharp(sample);

ok(s.module === 'MyApp.Domain' && !s.isNamespace, 'module name = MyApp.Domain');
ok(s.opens.includes('System') && s.opens.includes('System.Collections.Generic'), 'opens captured');

// Discriminated union Shape WITH cases (and `of` payloads).
const shape = s.unions.find((u) => u.name === 'Shape');
ok(!!shape, 'union Shape found');
ok(shape && shape.cases.map((c) => c.name).join(',') === 'Circle,Rectangle,Triangle', 'Shape cases: Circle, Rectangle, Triangle');
ok(shape && /float/.test(shape.cases.find((c) => c.name === 'Circle').of), 'Circle carries `of ... float`');
ok(shape && /\*/.test(shape.cases.find((c) => c.name === 'Rectangle').of), 'Rectangle carries a tuple payload');

// Record Person WITH typed fields.
const person = s.records.find((r) => r.name === 'Person');
ok(!!person, 'record Person found');
ok(person && person.fields.length === 3, 'Person has 3 fields');
ok(person && person.fields.find((f) => f.name === 'Name').type === 'string', 'Person.Name: string');
ok(person && person.fields.find((f) => f.name === 'Age').type === 'int', 'Person.Age: int');

// Top-level function let-binding with a param (the [<EntryPoint>] main).
const main = s.functions.find((f) => f.name === 'main');
ok(main && main.params.some((p) => p.name === 'argv'), 'function main captured with param argv');
ok(s.attrCount >= 1, 'attribute [<EntryPoint>] counted');
ok(s.asyncCount >= 1, 'async block counted');

// ── Inline fixture: a fully type-annotated function + DU + record ────────────
const inline = `
module Geometry

let add (a: int) (b: int) : int = a + b

type Shape2 =
    | Circle of float
    | Square

type Point = { X: float; Y: float }
`;
const f = analyzeFSharp(inline);
const add = f.functions.find((x) => x.name === 'add');
ok(!!add, 'inline: function add found');
ok(add && add.params.length === 2, 'inline: add has 2 params');
ok(add && add.params[0].name === 'a' && add.params[0].type === 'int', 'inline: add param a: int (typed)');
ok(add && add.params[1].name === 'b' && add.params[1].type === 'int', 'inline: add param b: int (typed)');
ok(add && add.returns === 'int', 'inline: add return type = int (typed)');

const sh2 = f.unions.find((u) => u.name === 'Shape2');
ok(sh2 && sh2.cases.length === 2 && sh2.cases[0].of === 'float', 'inline: union Shape2 = Circle of float | Square');

const pt = f.records.find((r) => r.name === 'Point');
ok(pt && pt.fields.find((x) => x.name === 'X').type === 'float' && pt.fields.find((x) => x.name === 'Y').type === 'float',
  'inline: record Point { X: float; Y: float } typed fields');

// Not name-only: at least one function carries a typed param.
ok([...s.functions, ...f.functions].some((fn) => fn.params.some((p) => p.type)), 'signatures carry typed params (not name-only)');

console.log(failed ? `\n${failed} failed` : '\nall fsharp-lang assertions passed');
process.exit(failed ? 1 : 0);
