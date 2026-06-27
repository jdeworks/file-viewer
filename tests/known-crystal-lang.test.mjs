// Depth test for the Crystal known view: must capture REAL structure — method SIGNATURES
// (typed params + return type) and class/struct/module membership, not just names.
// Pure (analyzeCrystal is DOM-free). Fixture = the committed sample.cr.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeCrystal } from '../docs/types/text/known/crystal-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.cr'), 'utf8');
const { requires, classes, enums, topMethods, constants, macros, aliases } = analyzeCrystal(sample);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const type = (n) => classes.find((c) => c.name === n);
const method = (c, n) => c && c.methods.find((m) => m.name === n);

// requires
ok(requires.includes('json') && requires.includes('http/client') && requires.length >= 3, 'require statements captured');

// class with super and member methods
const circle = type('Circle');
ok(circle && circle.kind === 'class' && circle.super === 'Shape', 'class Circle < Shape (kind + super)');
const area = method(circle, 'area');
ok(area && area.returns === 'Float64', 'Circle#area : Float64 return type');
ok(circle && circle.methods.some((m) => m.name === 'initialize'), 'class carries member methods');

// struct with a method that has a typed param + return type
const point = type('Point');
ok(point && point.kind === 'struct', 'struct Point');
const dist = method(point, 'distance_to');
ok(dist && dist.returns === 'Float64' && dist.params.length === 1
   && dist.params[0].name === 'other' && dist.params[0].type === 'Point',
   'distance_to(other : Point) : Float64 — typed param + return');

// abstract class + abstract methods
const shape = type('Shape');
ok(shape && shape.abstract === true, 'abstract class Shape flagged');
ok(method(shape, 'area') && method(shape, 'area').abstract === true, 'abstract def area flagged');

// module method with self. receiver and typed params/return
const utils = type('Utils');
const clamp = method(utils, 'clamp');
ok(utils && utils.kind === 'module', 'module Utils');
ok(clamp && clamp.self === true && clamp.returns === 'Float64' && clamp.params.length === 3
   && clamp.params.every((p) => p.type === 'Float64'), 'Utils.self.clamp typed signature');

// instance vars
ok(circle && circle.ivars.some((v) => v.name === 'radius' && v.type === 'Float64'), 'instance var @radius : Float64');

// enum + members
ok(enums.some((e) => e.name === 'Color' && e.members.includes('Red') && e.members.length === 3), 'enum Color with members');

// constant
ok(constants.some((k) => k.name === 'PI'), 'constant PI captured');

// macro with params
ok(macros.some((m) => m.name === 'debug_print' && m.params.length === 1), 'macro debug_print(expr)');

// alias
ok(aliases.some((a) => a.name === 'JsonHash'), 'type alias JsonHash');

// not name-only: at least one method actually carries a typed param + a return type
ok([...classes.flatMap((c) => c.methods), ...topMethods].some((m) => m.returns && m.params.some((p) => p.type)),
   'signatures carry typed params + return (not name-only)');

console.log(failed ? `\n${failed} failed` : '\nall crystal-lang assertions passed');
process.exit(failed ? 1 : 0);
