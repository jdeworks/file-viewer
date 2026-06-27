// Depth test for the Zig known view: must capture TYPED signatures (param name+type, return type),
// struct/enum fields & methods, imports and tests — not just names. Pure (analyzeZig is DOM-free).
// Fixture = the committed sample.zig.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeZig } from '../docs/types/text/known/zig-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.zig'), 'utf8');
const { imports, types, functions, constants, errorSets, tests, comptimeBlocks } = analyzeZig(sample);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const fn = (n) => functions.find((f) => f.name === n);
const ty = (n) => types.find((t) => t.name === n);

// imports: const std = @import("std"); const math = @import("std").math;
ok(imports.some((i) => i.name === 'std' && i.path === 'std'), 'import std → "std"');
ok(imports.some((i) => i.name === 'math' && i.path === 'std'), 'import math → "std"');

// free fn with typed params + return type: pub fn add(a: i32, b: i32) i32
const add = fn('add');
ok(add && add.pub === true, 'add is pub');
ok(add && add.params.length === 2
  && add.params[0].name === 'a' && add.params[0].type === 'i32'
  && add.params[1].name === 'b' && add.params[1].type === 'i32', 'add params: a: i32, b: i32');
ok(add && add.returns === 'i32', 'add returns i32');

// error-union return type: pub fn divide(a: f64, b: f64) !f64
const divide = fn('divide');
ok(divide && divide.returns === '!f64' && divide.params[1].type === 'f64', 'divide returns !f64');

// !void return on main
ok(fn('main') && fn('main').returns === '!void', 'main returns !void');
ok(fn('fibonacci') && fn('fibonacci').params[0].type === 'u32' && fn('fibonacci').returns === 'u64', 'fibonacci(n: u32) u64');

// struct const with fields AND a method carrying typed params + return
const Point = ty('Point');
ok(Point && Point.kind === 'struct', 'Point is a struct type');
ok(Point && Point.fields.some((f) => f.name === 'x' && f.type === 'f64')
  && Point.fields.some((f) => f.name === 'y' && f.type === 'f64'), 'Point fields x: f64, y: f64');
const distance = Point && Point.methods.find((m) => m.name === 'distance');
ok(distance && distance.pub === true && distance.returns === 'f64'
  && distance.params[0].name === 'self' && distance.params[0].type === 'Point'
  && distance.params[1].type === 'Point', 'Point.distance(self: Point, other: Point) f64');

// error set with members
ok(errorSets.some((e) => e.name === 'MathError'
  && e.members.includes('DivisionByZero') && e.members.includes('Overflow')), 'MathError error set members');

// fn body inner consts must NOT leak as top-level constants/types
ok(!constants.some((c) => c.name === 'dx' || c.name === 'sum' || c.name === 'tmp'), 'fn-body consts not leaked top-level');
ok(!types.some((t) => t.name === 'i' || t.name === 'a'), 'no spurious types from fn bodies');

// tests captured by name
ok(tests.includes('add works correctly') && tests.includes('divide by zero returns error'), 'test blocks captured by name');
ok(comptimeBlocks === 0, 'comptime block inside main not counted as top-level');

// not name-only: at least one fn actually carries typed params
ok([...functions, ...types.flatMap((t) => t.methods)].some((f) => f.params.some((p) => p.type)),
  'signatures carry typed params (not name-only)');

console.log(failed ? `\n${failed} failed` : '\nall zig-lang assertions passed');
process.exit(failed ? 1 : 0);
