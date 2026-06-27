// Depth test for the Scala known view: must capture TYPED signatures (typed params + return type,
// case-class ctor params, extends/with supertypes), not just names. Pure (analyzeScala is DOM-free).
// Fixture = the committed sample.scala.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeScala } from '../docs/types/text/known/scala-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.scala'), 'utf8');
const { packageName, imports, types, defs, vals } = analyzeScala(sample);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const def = (n) => defs.find((d) => d.name === n);
const type = (n) => types.find((t) => t.name === n);

ok(packageName === 'com.example.demo', 'package name = com.example.demo');
ok(imports.includes('scala.collection.mutable.ListBuffer') && imports.length >= 2, 'imports captured');

// def with typed params + return type: distanceBetween(a: Point, b: Point): Double
const d = def('distanceBetween');
ok(d && d.returns === 'Double', 'distanceBetween return type = Double');
ok(d && d.params.length === 2 && d.params[0].name === 'a' && d.params[0].type === 'Point'
   && d.params[1].type === 'Point', 'distanceBetween typed params (a: Point, b: Point)');

// single-expression def (no braces): circleArea(c: Circle): Double = ...
const ca = def('circleArea');
ok(ca && ca.params.length === 1 && ca.params[0].type === 'Circle' && ca.returns === 'Double', 'circleArea(c: Circle): Double');

// case class with ctor params: case class Point(x: Double, y: Double)
const pt = type('Point');
ok(pt && pt.kind === 'case class', 'Point kind = case class');
ok(pt && pt.params.length === 2 && pt.params[0].name === 'x' && pt.params[0].type === 'Double'
   && pt.params[1].type === 'Double', 'Point ctor params typed (x: Double, y: Double)');

// case class referencing another type: Circle(center: Point, radius: Double)
const ci = type('Circle');
ok(ci && ci.params.some((p) => p.type === 'Point'), 'Circle ctor references Point');

// object with extends supertype: object Main extends App
const main = type('Main');
ok(main && main.kind === 'object' && main.extends.includes('App'), 'object Main extends App');

// trait with abstract defs: trait Shape { def area: Double }
const shape = type('Shape');
ok(shape && shape.kind === 'trait', 'trait Shape');
ok(def('area') && def('area').returns === 'Double', 'trait member def area: Double');

// vals captured (top-level / member, not local body vals)
ok(vals.some((v) => v.name === 'p1'), 'member val p1 captured');
ok(!vals.some((v) => v.name === 'dx'), 'local body val dx NOT captured (depth-filtered)');

// not name-only: at least one def actually carries typed params
ok(defs.some((s) => s.params.some((p) => p.type)), 'defs carry typed params (not name-only)');

console.log(failed ? `\n${failed} failed` : '\nall scala-lang assertions passed');
process.exit(failed ? 1 : 0);
