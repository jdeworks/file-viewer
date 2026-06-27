// Depth test for the Chapel known view: must capture proc/iter SIGNATURES (typed params + return
// type), config declarations, and record fields — not just names. Pure (analyzeChapel is DOM-free).
// Primary fixture = the committed sample.chpl; an inline fixture covers records (sample has none).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeChapel } from '../docs/types/text/known/chapel-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.chpl'), 'utf8');
const a = analyzeChapel(sample);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const proc = (n) => a.procs.find((p) => p.name === n);

ok(a.modules.includes('Demo'), 'module Demo captured');

// proc parallelSum(arr: [] int): int  — typed param + return type (the key depth requirement)
const ps = proc('parallelSum');
ok(ps && ps.returns === 'int', 'parallelSum return type = int');
ok(ps && ps.params.length === 1 && ps.params[0].name === 'arr' && ps.params[0].type === '[] int',
  'parallelSum param: arr : [] int');

// proc greet(name: string)
const greet = proc('greet');
ok(greet && greet.params[0].name === 'name' && greet.params[0].type === 'string', 'greet(name: string) typed param');

// iterator with two typed params: iter range2D(rows: int, cols: int)
const r2d = a.iters.find((it) => it.name === 'range2D');
ok(r2d && r2d.params.length === 2 && r2d.params[0].type === 'int' && r2d.params[1].name === 'cols',
  'iter range2D(rows: int, cols: int) captured with typed params');

// config consts/vars
ok(a.configs.some((c) => c.name === 'n' && c.kind === 'const'), 'config const n');
ok(a.configs.some((c) => c.name === 'verbose' && c.kind === 'var'), 'config var verbose');

// parallel constructs counted
ok(a.parallelConstructs.forall >= 1, 'forall counted');
ok(a.parallelConstructs.coforall >= 1, 'coforall counted');
ok(a.parallelConstructs.total >= 2, 'parallel construct total');

// not name-only: at least one callable carries a typed param
ok([...a.procs, ...a.iters].some((c) => c.params.some((p) => p.type)), 'signatures carry typed params (not name-only)');

// --- inline fixture: records/classes with typed fields + a config with explicit type ---
const fixture = `
module Geometry {
  config const epsilon: real = 1e-9;
  record Point {
    var x: real;
    var y: real;
    proc dist(): real { return sqrt(x*x + y*y); }
  }
  class Shape : Drawable {
    const id: int;
    var name: string;
  }
  proc scale(in p: Point, factor: real): Point {
    return new Point(p.x * factor, p.y * factor);
  }
}`;
const b = analyzeChapel(fixture);

const pt = b.records.find((r) => r.name === 'Point' && r.kind === 'record');
ok(pt && pt.fields.length === 2 && pt.fields[0].name === 'x' && pt.fields[0].type === 'real',
  'record Point with typed fields x: real, y: real (method not counted as field)');
const shape = b.records.find((r) => r.name === 'Shape' && r.kind === 'class');
ok(shape && shape.parent === 'Drawable' && shape.fields.some((f) => f.name === 'id' && f.type === 'int'),
  'class Shape : Drawable with typed field id: int');
ok(b.configs.some((c) => c.name === 'epsilon' && c.type === 'real' && c.value === '1e-9'), 'config const epsilon: real = 1e-9');
const scale = b.procs.find((p) => p.name === 'scale');
ok(scale && scale.returns === 'Point' && scale.params[0].intent === 'in' && scale.params[0].type === 'Point',
  'scale(in p: Point, factor: real): Point — intent + typed param + return type');

console.log(failed ? `\n${failed} failed` : '\nall chapel-lang assertions passed');
process.exit(failed ? 1 : 0);
