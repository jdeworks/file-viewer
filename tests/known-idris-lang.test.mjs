// Depth test for the Idris known view: must capture REAL structure — function type
// SIGNATURES (`name : Type`), data declarations with their constructors, interfaces
// with methods, records with fields — not just names. Pure (analyzeIdris is DOM-free).
// Fixture = the committed sample.idr.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeIdris } from '../docs/types/text/known/idris-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.idr'), 'utf8');
const { module, imports, dataTypes, records, interfaces, implementations, functions } = analyzeIdris(sample);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const data = (n) => dataTypes.find((d) => d.name === n);
const iface = (n) => interfaces.find((x) => x.name === n);
const func = (n) => functions.find((f) => f.name === n);
const rec = (n) => records.find((r) => r.name === n);

ok(module === 'Main', 'module name = Main');
ok(imports.includes('Data.List') && imports.includes('Data.String'), 'imports captured');

// Function with its `:` type SIGNATURE (the key depth target).
const sa = func('shapeArea');
ok(sa && /Shape\s*->\s*Double/.test(sa.signature), `shapeArea signature = Shape -> Double (got: ${sa && sa.signature})`);
ok(sa && sa.totality === 'total', 'shapeArea is total (annotation attached to signature)');
const lg = func('largest');
ok(lg && /List Shape\s*->\s*Shape/.test(lg.signature) && lg.totality === 'partial', 'largest : List Shape -> Shape (partial)');
ok(func('eval') && func('main'), 'eval and main signatures captured');

// ADT data type WITH its constructors.
const shape = data('Shape');
ok(shape && shape.style === 'adt', 'Shape is an ADT');
ok(shape && ['Circle', 'Rectangle', 'Triangle'].every((c) => shape.constructors.includes(c)),
  `Shape constructors = Circle/Rectangle/Triangle (got: ${shape && shape.constructors.join(',')})`);

// GADT-style data type with typed constructors.
const expr = data('Expr');
ok(expr && expr.style === 'gadt', 'Expr is a GADT (data ... : Type -> Type where)');
ok(expr && ['IntLit', 'BoolLit', 'Add'].every((c) => expr.constructors.includes(c)),
  `Expr constructors = IntLit/BoolLit/Add (got: ${expr && expr.constructors.join(',')})`);

// Interface WITH a typed method (the key depth target).
const ha = iface('HasArea');
ok(ha, 'interface HasArea captured');
ok(ha && ha.methods.some((mt) => mt.name === 'area' && /a\s*->\s*Double/.test(mt.signature)),
  'HasArea has method area : a -> Double');

// Record with constructor + typed fields.
const fig = rec('Figure');
ok(fig && fig.constructor === 'MkFigure', 'record Figure constructor = MkFigure');
ok(fig && fig.fields.some((f) => f.name === 'label' && f.type === 'String')
       && fig.fields.some((f) => f.name === 'shape' && f.type === 'Shape'), 'Figure typed fields (label/shape)');

// Implementation captured.
ok(implementations.some((s) => /HasArea\s+Shape/.test(s)), 'implementation HasArea Shape captured');

// Not name-only: at least one function carries a real type signature.
ok(functions.some((f) => f.signature && /->/.test(f.signature)), 'signatures carry real types (not name-only)');

console.log(failed ? `\n${failed} failed` : '\nall idris-lang assertions passed');
process.exit(failed ? 1 : 0);
