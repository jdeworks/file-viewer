// Depth test for the Nim known view: must capture routine SIGNATURES (typed params + return
// type), object types with typed fields, and enums with values — not just names. Pure
// (analyzeNim is DOM-free). Fixture = the committed sample.nim.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeNim } from '../docs/types/text/known/nim-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.nim'), 'utf8');
const { imports, routines, types, enums, consts } = analyzeNim(sample);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const routine = (n) => routines.find((r) => r.name === n);
const type = (n) => types.find((t) => t.name === n);
const enm = (n) => enums.find((e) => e.name === n);

// imports
ok(imports.includes('strutils') && imports.includes('sequtils') && imports.includes('math'),
  'imports: strutils, sequtils, math');

// proc with shared-name typed params + return type: distance(a, b: Point): float
const dist = routine('distance');
ok(dist && dist.kind === 'proc' && dist.returns === 'float', 'proc distance returns float');
ok(dist && dist.params.length === 2 && dist.params[0].name === 'a' && dist.params[0].type === 'Point'
  && dist.params[1].name === 'b' && dist.params[1].type === 'Point',
  'distance(a, b: Point) — shared type on two params');

// func with typed param + return: greet(name: string): string
const greet = routine('greet');
ok(greet && greet.kind === 'func' && greet.returns === 'string'
  && greet.params[0] && greet.params[0].type === 'string', 'func greet(name: string): string');

// iterator captured with kind + return type
const cu = routine('countUp');
ok(cu && cu.kind === 'iterator' && cu.returns === 'int' && cu.params[0].type === 'int',
  'iterator countUp(n: int): int');

// body-local var/let are NOT leaked as module declarations
ok(!routines.some((r) => r.name === 'i') && !consts.some((c) => c.name === 'i'),
  'routine bodies skipped (no leaked locals)');

// object type with typed fields: Point = object { x, y: float }
const pt = type('Point');
ok(pt && pt.kind === 'object', 'type Point is object');
ok(pt && pt.fields.length === 2 && pt.fields.every((f) => f.type === 'float')
  && pt.fields.map((f) => f.name).join(',') === 'x,y', 'Point object fields x, y: float (shared type)');

// enum with values: Color = enum red, green, blue
const color = enm('Color');
ok(color && color.values.join(',') === 'red,green,blue', 'enum Color values red, green, blue');

// const captured with value
ok(consts.some((c) => c.kind === 'const' && c.name === 'PI_APPROX' && c.value === '3.14159'),
  'const PI_APPROX = 3.14159');

// not name-only: at least one routine carries a typed param
ok(routines.some((r) => r.params.some((p) => p.type)), 'signatures carry typed params (not name-only)');

console.log(failed ? `\n${failed} failed` : '\nall nim-lang assertions passed');
process.exit(failed ? 1 : 0);
