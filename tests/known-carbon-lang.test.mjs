// Depth test for the Carbon known view: must capture fn SIGNATURES (typed params + return type),
// class members, constants and choice types — not just names. analyzeCarbon is pure (DOM-free).
// Primary fixture = the committed sample.carbon; an inline fixture exercises constants + choice.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeCarbon } from '../docs/types/text/known/carbon-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.carbon'), 'utf8');
const s = analyzeCarbon(sample);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const fn = (n) => s.functions.find((f) => f.name === n);
const cls = (n) => s.classes.find((c) => c.name === n);

// package
ok(s.packageName === 'Demo' && s.packageKind === 'api', 'package Demo api');

// fn with typed params + return type (the key depth requirement)
const create = fn('Create');
ok(create && create.returns === 'Shape', 'Create() return type = Shape');
ok(create && create.params.length === 2 && create.params[0].name === 'name'
   && create.params[0].type === 'String', 'Create first param: name: String');
ok(create && create.params[1].name === 'sides' && create.params[1].type === 'i32',
   'Create second param: sides: i32');

// method with [self: Self] receiver + return type
const area = fn('Area');
ok(area && area.self === 'Self' && area.returns === 'f64', 'Area[self: Self]() -> f64');

// plain fn return type
ok(fn('Main') && fn('Main').returns === 'i32', 'Main() -> i32');

// interface + its method
ok(s.interfaces.some((i) => i.name === 'Printable'), 'interface Printable');

// class members (fields)
const shape = cls('Shape');
ok(shape && shape.members.some((m) => m.name === 'name' && m.type === 'String'), 'Shape.name: String field');
ok(shape && shape.members.some((m) => m.name === 'sides' && m.type === 'i32'), 'Shape.sides: i32 field');

// impl block
ok(s.impls.some((d) => /Shape\s+as\s+Printable/.test(d)), 'impl Shape as Printable');

// not name-only: at least one fn carries a typed param
ok(s.functions.some((f) => f.params.some((p) => p.type)), 'signatures carry typed params (not name-only)');

// --- inline fixture: constants + choice + import + multi-line signature ---
const extra = `package Geometry library "math" api;
import Math library "core";

let PI: f64 = 3.14159;
var counter: i32 = 0;

choice Result { Ok, Err }

fn Clamp(
  value: f64,
  lo: f64,
  hi: f64,
) -> f64 {
  return value;
}
`;
const e = analyzeCarbon(extra);
ok(e.imports.some((i) => i.name === 'Math' && i.library === 'core'), 'import Math library "core"');
ok(e.constants.some((c) => c.kind === 'let' && c.name === 'PI' && c.type === 'f64' && c.value === '3.14159'), 'top-level let PI: f64 = 3.14159');
ok(e.constants.some((c) => c.kind === 'var' && c.name === 'counter'), 'top-level var counter');
ok(e.choices.some((c) => c.name === 'Result' && c.alternatives.includes('Ok') && c.alternatives.includes('Err')), 'choice Result { Ok, Err }');
const clamp = e.functions.find((x) => x.name === 'Clamp');
ok(clamp && clamp.params.length === 3 && clamp.params[2].name === 'hi' && clamp.returns === 'f64', 'multi-line Clamp signature: 3 typed params -> f64');

console.log(failed ? `\n${failed} failed` : '\nall carbon-lang assertions passed');
process.exit(failed ? 1 : 0);
