// Depth test for the Lean 4 known view: must capture REAL structure (def signatures with typed
// params + return type, theorem statements + sorry-status, inductive constructors, structure typed
// fields), not just names. Pure (analyzeLean is DOM-free). Fixture = the committed sample.lean
// (read as UTF-8 so Lean's unicode — → ∀ λ ℕ — is decoded correctly).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeLean } from '../docs/types/text/known/lean-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.lean'), 'utf8');
const { imports, namespaces, definitions, theorems, inductives, structures, classes, instances } = analyzeLean(sample);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const def = (n) => definitions.find((d) => d.name === n);
const thm = (n) => theorems.find((t) => t.name === n);
const ind = (n) => inductives.find((i) => i.name === n);
const str = (n) => structures.find((s) => s.name === n);

// imports + namespace
ok(imports.includes('Mathlib.Data.List.Basic') && imports.length >= 2, 'imports captured');
ok(namespaces.includes('Demo'), 'namespace Demo');

// def with typed param + return type: greet (name : String) : String
const greet = def('greet');
ok(greet && greet.returns === 'String', 'def greet return type = String');
ok(greet && greet.params.length === 1 && greet.params[0].name === 'name' && greet.params[0].type === 'String',
   'def greet param: name : String (typed, not name-only)');

// def with arrow type and no parens: fibonacci : Nat → Nat (unicode arrow)
const fib = def('fibonacci');
ok(fib && /Nat\s*→\s*Nat/.test(fib.returns), 'def fibonacci return type = Nat → Nat (unicode)');

// theorem with typed params + statement, proved (no sorry)
const ac = thm('add_comm');
ok(ac && ac.params.length === 2 && ac.params[0].type === 'Nat', 'theorem add_comm typed params (n m : Nat)');
ok(ac && /n \+ m = m \+ n/.test(ac.statement) && ac.incomplete === false, 'theorem add_comm statement + proved');

// lemma with ∀ statement (unicode)
const ac2 = thm("add_comm'");
ok(ac2 && /∀/.test(ac2.statement), "lemma add_comm' statement carries ∀ (unicode)");

// theorem left as sorry => incomplete
const hard = thm('hard_theorem');
ok(hard && hard.incomplete === true, 'theorem hard_theorem flagged incomplete (sorry)');

// inductive with constructors
const color = ind('Color');
ok(color && color.constructors.includes('red') && color.constructors.includes('green') && color.constructors.length === 3,
   'inductive Color with constructors red | green | blue');

// structure with typed field
const point = str('Point');
ok(point && point.fields.some((f) => f.name === 'x' && f.type === 'Float'), 'structure Point field x : Float (typed)');

// class + instance
ok(classes.some((c) => c.name === 'Describable'), 'class Describable captured');
ok(instances.some((i) => /Describable Color/.test(i.type)), 'instance : Describable Color captured');

// not name-only: at least one definition actually carries a typed param
ok(definitions.some((d) => d.params.some((p) => p.type)), 'definitions carry typed params (not name-only)');

console.log(failed ? `\n${failed} failed` : '\nall lean-lang assertions passed');
process.exit(failed ? 1 : 0);
