// Depth test for the Agda known view: must capture REAL structure — module name, imports, data types
// WITH constructors, records WITH typed fields, function/operator type SIGNATURES, and postulates —
// not just names. Pure (analyzeAgda is DOM-free). Fixture = the committed sample.agda (read as utf8
// so Agda's unicode → ℕ ≡ survives). Mirrors tests/known-ada-lang.test.mjs.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeAgda } from '../docs/types/text/known/agda-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.agda'), 'utf8');
const { module: moduleName, imports, datatypes, records, functions, postulates } = analyzeAgda(sample);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const data = (n) => datatypes.find((d) => d.name === n);
const rec = (n) => records.find((r) => r.name === n);
const fn = (n) => functions.find((f) => f.name === n);

ok(moduleName === 'Demo', 'module name = Demo');
ok(imports.includes('Data.Nat') && imports.includes('Data.Bool') && imports.length >= 3, 'imports captured');

// data Shape with constructors Circle / Rectangle / Triangle
const shape = data('Shape');
ok(!!shape, 'data type Shape found');
ok(shape && shape.constructors.some((c) => c.name === 'Circle'), 'Shape has constructor Circle');
ok(shape && shape.constructors.length === 3, 'Shape has 3 constructors');

// data Nat with constructors zero / suc (suc carries a function type)
const nat = data('Nat');
ok(nat && nat.constructors.some((c) => c.name === 'zero') && nat.constructors.some((c) => c.name === 'suc' && /Nat/.test(c.type)), 'Nat has zero + suc : Nat → Nat');

// record Point with typed fields x, y
const point = rec('Point');
ok(!!point, 'record Point found');
ok(point && point.fields.length === 2 && point.fields.some((f) => f.name === 'x' && /ℕ/.test(f.type)), 'Point has fields x, y : Data.Nat.ℕ');

// function signature `area : Shape → Data.Nat.ℕ`
const area = fn('area');
ok(area && /Shape/.test(area.type), 'function area signature contains Shape');
ok(area && /→/.test(area.type), 'area signature preserves unicode arrow →');

// function signature `add : Nat → Nat → Nat`
const add = fn('add');
ok(add && (add.type.match(/Nat/g) || []).length >= 3, 'function add : Nat → Nat → Nat');

// definition clauses must NOT be mistaken for signatures (no `area Circle` etc.)
ok(!functions.some((f) => f.name.includes(' ')), 'no clause/pattern lines captured as signatures');

// postulate funext with its (unicode) dependent type
const fe = postulates.find((p) => p.name === 'funext');
ok(!!fe, 'postulate funext found');
ok(fe && /≡/.test(fe.type), 'funext type preserves unicode ≡');

console.log(failed ? `\n${failed} failed` : '\nall agda-lang assertions passed');
process.exit(failed ? 1 : 0);
