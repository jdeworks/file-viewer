// Depth test for the PureScript known view: must capture REAL structure — function `::` signatures
// (split on top-level `->`), data types with constructors, type classes with method signatures,
// record type aliases with typed fields — not just names. Pure (analyzePureScript is DOM-free).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzePureScript } from '../docs/types/text/known/purescript-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.purs'), 'utf8');
const { module, imports, functions, dataTypes, newtypes, typeAliases, classes, instances } = analyzePureScript(sample);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const fn = (n) => functions.find((f) => f.name === n);
const dt = (n) => dataTypes.find((d) => d.name === n);
const cls = (n) => classes.find((c) => c.name === n);
const ta = (n) => typeAliases.find((t) => t.name === n);

ok(module === 'Data.Sample', 'module name = Data.Sample');

// imports including alias + import list
ok(imports.length >= 6, `imports captured (${imports.length})`);
const strImp = imports.find((i) => i.module === 'Data.String');
ok(strImp && strImp.alias === 'String', 'import Data.String as String → alias captured');
const maybeImp = imports.find((i) => i.module === 'Data.Maybe');
ok(maybeImp && maybeImp.items.some((it) => /Maybe/.test(it)), 'import list items captured (Data.Maybe)');

// function SIGNATURE: distance :: Point -> Point -> Number, split on top-level ->
const dist = fn('distance');
ok(dist && /Point\s*->\s*Point\s*->\s*Number/.test(dist.signature), 'distance signature = Point -> Point -> Number');
ok(dist && dist.parts.length === 3 && dist.parts[2] === 'Number', 'distance split on -> into 3 parts, returns Number');
ok(dist && dist.hasEquation, 'distance paired with its equation');

const ve = fn('validateEmail');
ok(ve && /Maybe Email/.test(ve.signature), 'validateEmail :: String -> Maybe Email');

// data type with constructors
const shape = dt('Shape');
ok(shape && shape.constructors.length === 3, 'data Shape has 3 constructors');
ok(shape && shape.constructors.map((c) => c.name).join(',') === 'Circle,Rectangle,Triangle', 'Shape constructors: Circle, Rectangle, Triangle');
ok(shape && /Point Number/.test(shape.constructors[0].args), 'Circle carries args (Point Number)');

// newtype
ok(newtypes.some((n) => n.name === 'Email' && n.wraps === 'String'), 'newtype Email = Email String');

// type class with method signature
const rend = cls('Renderable');
ok(rend && rend.methods.some((m) => m.name === 'render' && /a -> String/.test(m.signature)), 'class Renderable has method render :: a -> String');
const ha = cls('HasArea');
ok(ha && ha.methods.some((m) => m.name === 'area' && /Number/.test(m.signature)), 'class HasArea has method area :: a -> Number');

// record type alias with typed fields
const cfg = ta('Config');
ok(cfg && cfg.fields.length === 3, 'type Config record has 3 fields');
ok(cfg && cfg.fields.some((f) => f.name === 'port' && f.type === 'Int'), 'Config field port :: Int');

// instances
ok(instances.some((i) => i.cls === 'Renderable' && /Shape/.test(i.signature)), 'instance Renderable Shape captured');

// not name-only: at least one function carries a real `::` signature
ok(functions.some((f) => f.signature && /->|::|Effect|Maybe/.test(f.signature)), 'functions carry real signatures (not name-only)');

console.log(failed ? `\n${failed} failed` : '\nall purescript-lang assertions passed');
process.exit(failed ? 1 : 0);
