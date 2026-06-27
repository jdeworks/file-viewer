// Depth test for the Coq known view: must capture REAL structure — definitions WITH typed params +
// return type, inductives WITH their constructors, and theorems WITH statement + proof status — not
// just names. Pure (analyzeCoq is DOM-free). Fixture = the committed sample.coq.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeCoq } from '../docs/types/text/known/coq-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.coq'), 'utf8');
const { requires, definitions, inductives, theorems, modules } = analyzeCoq(sample);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const def = (n) => definitions.find((d) => d.name === n);
const ind = (n) => inductives.find((i) => i.name === n);
const thm = (n) => theorems.find((t) => t.name === n);

// Imports + module framing
ok(requires.includes('Coq.Arith.Arith') && requires.includes('Coq.Lists.List'), 'Require Import list captured (qualified names intact)');
ok(modules.some((mm) => mm.name === 'Sorting' && mm.kind === 'Module'), 'Module Sorting captured');

// Fixpoint WITH typed params + return type: Fixpoint insert (x : nat) (l : list nat) : list nat
const insert = def('insert');
ok(insert && insert.kind === 'Fixpoint', 'insert is a Fixpoint');
ok(insert && insert.returns === 'list nat', 'insert return type = list nat');
ok(insert && insert.params.length === 2
   && insert.params[0].name === 'x' && insert.params[0].type === 'nat'
   && insert.params[1].name === 'l' && insert.params[1].type === 'list nat',
   'insert typed params: (x : nat) (l : list nat)');

// Inductive WITH constructors: sorted with sorted_nil / sorted_single / sorted_cons
const sorted = ind('sorted');
ok(sorted && sorted.constructors.length === 3, 'inductive sorted has 3 constructors');
ok(sorted && sorted.constructors.some((c) => c.name === 'sorted_cons'), 'constructor sorted_cons captured');

// Theorem WITH statement + proof status: insert_sorted ... Qed (proved); sorted_nil_trivial Lemma Qed
const it = thm('insert_sorted');
ok(it && it.kind === 'Theorem', 'insert_sorted is a Theorem');
ok(it && /sorted \(insert x l\)/.test(it.statement), 'insert_sorted carries its statement');
ok(it && it.status === 'proved' && it.terminator === 'Qed', 'insert_sorted proof status = proved (Qed)');
ok(thm('sorted_nil_trivial') && thm('sorted_nil_trivial').status === 'proved', 'Lemma sorted_nil_trivial proved');

// not name-only: at least one definition actually carries typed params
ok(definitions.some((d) => d.params.some((p) => p.type)), 'definitions carry typed params (not name-only)');

console.log(failed ? `\n${failed} failed` : '\nall coq-lang assertions passed');
process.exit(failed ? 1 : 0);
