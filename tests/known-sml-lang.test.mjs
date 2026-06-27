// Depth test for the Standard ML known view: must capture REAL structure — typed fun signatures,
// datatype constructors, type aliases, val type annotations, the ML module system — not just names.
// Pure (analyzeSML is DOM-free). Fixture = the committed sample.sml.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeSML } from '../docs/types/text/known/sml-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.sml'), 'utf8');
const { funs, vals, types, datatypes, structures, signatures, functors, opens } = analyzeSML(sample);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const fun = (n) => funs.find((f) => f.name === n);
const val = (n) => vals.find((v) => v.name === n);
const dt = (n) => datatypes.find((d) => d.name === n);

// fun with simple parsed param
const greet = fun('greet');
ok(greet && greet.params.length === 1 && greet.params[0] === 'name', 'fun greet has param "name"');

// fun with TYPE-ANNOTATED curried params + return type: add (x: int) (y: int) : int
const add = fun('add');
ok(add && add.params.length === 2 && /x: ?int/.test(add.params[0]) && /y: ?int/.test(add.params[1]), 'add: curried typed params (x: int) (y: int)');
ok(add && add.returns === 'int', 'add return type = int');

// clausal definition with |
const fac = fun('factorial');
ok(fac && fac.clauses === 2, 'factorial parsed as 2 clauses');
const fib = fun('fibonacci');
ok(fib && fib.clauses === 3, 'fibonacci parsed as 3 clauses');

// datatype with constructors (no-arg enum)
const color = dt('color');
ok(color && color.constructors.map((c) => c.name).join(',') === 'Red,Green,Blue', 'datatype color: Red | Green | Blue');

// datatype with type variable + constructor carrying an "of" type
const tree = dt('tree');
ok(tree && tree.vars === "'a", "datatype tree has type variable 'a");
ok(tree && tree.constructors.some((c) => c.name === 'Leaf' && !c.of), 'tree has nullary constructor Leaf');
const node = tree && tree.constructors.find((c) => c.name === 'Node');
ok(node && /'a tree/.test(node.of), "tree Node of 'a * 'a tree * 'a tree (typed)");

// type alias with rhs
ok(types.some((t) => t.name === 'point' && t.rhs === 'int * int'), 'type point = int * int');
ok(types.some((t) => t.name === 'stack' && t.vars === "'a" && t.rhs === "'a list"), "type 'a stack = 'a list");

// val with type annotation (from the signature spec)
const pi = val('pi');
ok(pi && pi.type === 'real', 'val pi : real (typed)');
ok(vals.some((v) => v.name === 'square' && v.type === 'real -> real'), 'val square : real -> real (function-typed val)');

// ML module system
ok(structures.some((s) => s.name === 'Main'), 'structure Main captured');
ok(structures.some((s) => s.name === 'Math' && s.sig === 'MATH'), 'structure Math : MATH (signature ascription)');
ok(signatures.some((s) => s.name === 'MATH'), 'signature MATH captured');
ok(functors.some((f) => f.name === 'MakeSet'), 'functor MakeSet captured');

// imports — and functor-param decls (depth>0) must NOT leak in as spurious vals/types
ok(opens.includes('List'), 'open List captured');
ok(!vals.some((v) => v.name === 'eq') && !types.some((t) => t.name === 'elem'), 'functor-parameter decls not leaked as top-level');

// NOT name-only: signatures carry typed params / return types / constructor types
ok(funs.some((f) => f.returns || f.params.some((p) => /:/.test(p))), 'functions carry typed signatures (not name-only)');
ok(datatypes.some((d) => d.constructors.some((c) => c.of)), 'datatypes carry typed constructors (not name-only)');

console.log(failed ? `\n${failed} failed` : '\nall sml-lang assertions passed');
process.exit(failed ? 1 : 0);
