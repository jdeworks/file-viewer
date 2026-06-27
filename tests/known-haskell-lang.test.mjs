// Depth test for the Haskell known view: must capture REAL structure — type SIGNATURES (the `::`
// annotations split on top-level `->`), data declarations WITH constructors, and type classes WITH
// their method signatures — not just names. Pure (analyzeHaskell is DOM-free). Fixture = committed sample.hs.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeHaskell } from '../docs/types/text/known/haskell-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.hs'), 'utf8');
const a = analyzeHaskell(sample);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const fn = (n) => a.functions.find((f) => f.name === n);
const dt = (n) => a.dataTypes.find((d) => d.name === n);
const cls = (n) => a.classes.find((c) => c.name === n);

// module + export list
ok(a.module === 'DataStructures.BinaryTree', 'module name');
ok(a.exports.includes('insert') && a.exports.some((e) => e === 'Tree(..)'), 'export list incl Tree(..) + insert');

// imports: regular with items + qualified with alias
const dl = a.imports.find((i) => i.module === 'Data.List');
ok(dl && !dl.qualified && dl.items.includes('sort'), 'regular import Data.List (sort, ...)');
const dm = a.imports.find((i) => i.module === 'Data.Map.Strict');
ok(dm && dm.qualified && dm.alias === 'Map', 'qualified import Data.Map.Strict as Map');

// function SIGNATURE captured + split on top-level -> (NOT name-only)
const insert = fn('insert');
ok(insert && insert.signature && insert.context === '(Ord a)', 'insert has signature + context (Ord a)');
ok(insert && insert.parts.length === 3 && insert.parts[0] === 'a' && insert.returns === 'Tree a',
  'insert :: a -> Tree a -> Tree a (3 parts, returns Tree a)');
const search = fn('search');
ok(search && search.returns === 'Maybe (Tree a)', 'search returns Maybe (Tree a) — paren-aware split');
ok(a.functions.some((f) => f.signature), 'functions carry real signatures (not name-only)');

// data declarations WITH constructors
const tree = dt('Tree');
ok(tree && tree.constructors.map((c) => c.name).join(',') === 'Leaf,Node', 'data Tree = Leaf | Node (constructors)');
ok(dt('RoseTree') && dt('RoseTree').constructors[0].name === 'RoseNode', 'data RoseTree constructor RoseNode');

// newtype + type alias
ok(a.newtypes.some((n) => n.name === 'SizedList' && n.constructors.some((c) => c.fields.includes('unSized'))),
  'newtype SizedList with field unSized');
ok(a.typeAliases.some((t) => t.name === 'Index'), 'type alias Index');

// type classes WITH method signatures
const cont = cls('Container');
ok(cont && cont.methods.map((m) => m.name).sort().join(',') === 'isEmpty,member,toList', 'class Container methods');
ok(cont && cont.methods.find((m) => m.name === 'member').returns === 'Bool', 'Container.member :: ... -> Bool signature');
ok(cls('TreeFunctor') && cls('TreeFunctor').methods.some((m) => m.name === 'mapTree'), 'class TreeFunctor method mapTree');

// instances
ok(a.instances.some((i) => i.head === 'Container Tree') && a.instances.some((i) => i.head === 'Functor Tree'),
  'instances Container Tree + Functor Tree');

console.log(failed ? `\n${failed} failed` : '\nall haskell-lang assertions passed');
process.exit(failed ? 1 : 0);
