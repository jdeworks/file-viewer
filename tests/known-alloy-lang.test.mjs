// Depth test for the Alloy known view: must capture REAL structure — signatures WITH their fields,
// predicates/functions WITH typed params (and function return types) — not just names. analyzeAlloy
// is pure (DOM-free). Primary fixture = the committed sample-alloy.als; an inline fixture exercises
// the `fun ...: ReturnType` path the sample lacks.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeAlloy } from '../docs/types/text/known/alloy-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample-alloy.als'), 'utf8');

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };

// --- Real committed sample (FileSystem model) ---
const a = analyzeAlloy(sample);
const sig = (n) => a.sigs.find((s) => s.name === n);
const pred = (n) => a.preds.find((p) => p.name === n);

ok(a.moduleName === 'FileSystem', 'module name = FileSystem');
ok(['File', 'Directory', 'Root'].every((n) => sig(n)), 'sigs File, Directory, Root captured');

// sig WITH fields: Directory { contents: set File + Directory }
const dir = sig('Directory');
ok(dir && dir.fields.length === 1, 'Directory has 1 field');
ok(dir && dir.fields[0].names === 'contents', 'Directory field name = contents');
ok(dir && dir.fields[0].mult === 'set', 'Directory field multiplicity = set');
ok(dir && /File/.test(dir.fields[0].type), 'Directory field type references File');

// extends + multiplicity: one sig Root extends Directory {}
const root = sig('Root');
ok(root && root.relation === 'extends' && root.parent === 'Directory', 'Root extends Directory');
ok(root && root.mult === 'one', 'Root multiplicity = one');

// pred WITH typed params: reachable[f: File, d: Directory]
const reach = pred('reachable');
ok(reach && reach.params.length === 2, 'pred reachable has 2 params');
ok(reach && reach.params[0].names === 'f' && reach.params[0].type === 'File', 'reachable param f: File');
ok(reach && reach.params[1].names === 'd' && reach.params[1].type === 'Directory', 'reachable param d: Directory');

ok(a.facts.length === 2, 'two facts captured (NoSelfContainment, RootNotContained)');
ok(a.assertions.includes('AllFilesReachable'), 'assertion AllFilesReachable');
ok(a.checks.includes('AllFilesReachable'), 'check AllFilesReachable');
ok(a.runs.includes('reachable'), 'run reachable');

// --- Inline fixture: function with return type the sample lacks ---
const fixture = `module M
open util/ordering[Person]
abstract sig Person { age: one Int }
fun parent[p: Person]: Person { p.age }
fun grandparents[p, q: Person]: set Person { p.age + q.age }`;
const b = analyzeAlloy(fixture);
const fun = (n) => b.functions.find((f) => f.name === n);

ok(b.opens.includes('util/ordering[Person]'), 'open import captured');
const par = fun('parent');
ok(par && par.returns === 'Person', 'fun parent returns Person');
ok(par && par.params.length === 1 && par.params[0].names === 'p' && par.params[0].type === 'Person', 'fun parent param p: Person');
const gp = fun('grandparents');
ok(gp && gp.returns === 'set Person', 'fun grandparents returns "set Person"');
ok(gp && gp.params.length === 1 && gp.params[0].names === 'p, q' && gp.params[0].type === 'Person', 'fun grandparents shared param "p, q: Person"');
ok(b.sigs.some((s) => s.name === 'Person' && s.mult === 'abstract'), 'abstract sig Person captured');

console.log(failed ? `\n${failed} failed` : '\nall alloy-lang assertions passed');
process.exit(failed ? 1 : 0);
