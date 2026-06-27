// Depth test for the OCaml known view: must capture REAL structure (typed params, variant
// constructors, typed record fields) — not just names. Pure (analyzeOCaml is DOM-free).
// The committed sample.ml exercises variants + let-bindings with params; a small inline fixture
// adds typed params + records + val signatures the sample does not contain.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeOCaml } from '../docs/types/text/known/ocaml-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.ml'), 'utf8');

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };

// --- real committed sample.ml ------------------------------------------------
const s = analyzeOCaml(sample);
const fn = (n) => s.functions.find((f) => f.name === n);
const variant = (n) => s.variants.find((v) => v.name === n);

ok(s.opens.includes('List') && s.opens.includes('Printf'), 'opens: List + Printf');

// variant type with constructors: type 'a tree = Leaf | Node of ...
const tree = variant('tree');
ok(tree && tree.constructors.map((c) => c.name).join(',') === 'Leaf,Node', "variant 'a tree has constructors Leaf | Node");
ok(tree && tree.constructors.find((c) => c.name === 'Node').of, 'Node constructor carries an `of` payload type');

// function let-bindings WITH params: insert x, factorial n
const insert = fn('insert');
ok(insert && insert.rec && insert.params.some((p) => p.name === 'x'), 'let rec insert has param x');
const fac = fn('factorial');
ok(fac && fac.params.length === 1 && fac.params[0].name === 'n', 'let rec factorial has param n');

ok(s.exceptions.some((e) => e.name === 'Empty_tree' && e.of === 'string'), 'exception Empty_tree of string');
ok(s.externals.some((e) => e.name === 'c_strlen' && e.type === 'string -> int'), 'external c_strlen : string -> int');
ok(s.hasEntryPoint, 'let () = entry point detected');

// not name-only: at least one function actually carries a captured param
ok(s.functions.some((f) => f.params.length), 'functions carry params (not name-only)');

// --- inline fixture: typed params + record + module (depth the sample lacks) -
const fixture = `
type shape = Circle of float | Square of float
type point = { x : float; y : float }
let add (a : int) (b : int) : int = a + b
module Geometry = struct
  let pi = 3.14159
end
`;
const f = analyzeOCaml(fixture);
const ffn = (n) => f.functions.find((x) => x.name === n);

// typed function: let add (a : int) (b : int) : int = ...
const add = ffn('add');
ok(add && add.params.length === 2, 'add has 2 params');
ok(add && add.params[0].name === 'a' && add.params[0].type === 'int', 'add param a typed int');
ok(add && add.params[1].type === 'int', 'add param b typed int');
ok(add && add.returns === 'int', 'add return type annotated int');
ok(f.functions.some((x) => x.params.some((p) => p.type)), 'a function carries a TYPED param (not name-only)');

// variant with constructors
const shape = f.variants.find((v) => v.name === 'shape');
ok(shape && shape.constructors.length === 2 && shape.constructors[0].name === 'Circle' && shape.constructors[0].of === 'float',
  'variant shape = Circle of float | Square of float');

// record with typed fields
const point = f.records.find((r) => r.name === 'point');
ok(point && point.fields.length === 2, 'record point has 2 fields');
ok(point && point.fields[0].name === 'x' && point.fields[0].type === 'float'
  && point.fields[1].name === 'y' && point.fields[1].type === 'float', 'record point fields typed float');

// module captured
ok(f.modules.some((m) => m.name === 'Geometry'), 'module Geometry captured');

// --- inline .mli-style fixture: val signatures -------------------------------
const iface = analyzeOCaml('val area : shape -> float\nval name : string\n');
ok(iface.values.some((v) => v.name === 'area' && v.type === 'shape -> float'), 'val area : shape -> float');
ok(iface.values.length === 2, 'both val signatures captured');

console.log(failed ? `\n${failed} failed` : '\nall ocaml-lang assertions passed');
process.exit(failed ? 1 : 0);
