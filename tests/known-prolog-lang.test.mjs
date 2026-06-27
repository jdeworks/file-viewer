// Depth test for the Prolog known view: must capture REAL structure — predicates by name/ARITY,
// distinguishing facts from rules, plus module/use_module/DCG. Pure (analyzeProlog is DOM-free).
// Fixture = the committed sample.pro.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeProlog } from '../docs/types/text/known/prolog-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.pro'), 'utf8');
const { module, moduleExports, uses, predicates, dcgRules } = analyzeProlog(sample);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const pred = (n, ar) => predicates.find((p) => p.name === n && p.arity === ar);

ok(module === 'animals', 'module name = animals');
ok(moduleExports.includes('animal/2'), 'module exports include animal/2');
ok(uses.includes('lists') && uses.includes('aggregate'), 'use_module captured (lists, aggregate)');

// name/ARITY is the signature: animal/2 is 7 facts, no rules
const animal = pred('animal', 2);
ok(animal && animal.facts === 7 && animal.rules === 0, 'animal/2 = 7 facts, 0 rules');

// mammal/1 = 4 facts
const mammal = pred('mammal', 1);
ok(mammal && mammal.facts === 4 && mammal.rules === 0, 'mammal/1 = 4 facts, 0 rules');

// can_fly/1 mixes a rule and a fact — must distinguish them
const canFly = pred('can_fly', 1);
ok(canFly && canFly.rules === 1 && canFly.facts === 1 && canFly.clauses === 2, 'can_fly/1 = 1 rule + 1 fact');

// vertebrate/1 = 5 rules (multi-clause rule predicate)
const vert = pred('vertebrate', 1);
ok(vert && vert.rules === 5 && vert.facts === 0, 'vertebrate/1 = 5 rules');

// multi-line rule head: describe/2
const describe = pred('describe', 2);
ok(describe && describe.arity === 2 && describe.rules === 1, 'describe/2 = 1 rule (arity from multi-line head)');

// DCG rules captured with name/arity
ok(dcgRules.some((d) => d.name === 'sentence' && d.arity === 0), 'DCG rule sentence//0');
ok(dcgRules.length >= 6, 'all DCG rules captured (>= 6)');

// not name-only: arity actually discriminates (animal/2 distinct from a hypothetical animal/1)
ok(predicates.every((p) => typeof p.arity === 'number'), 'every predicate carries a numeric arity (name/arity signature)');

console.log(failed ? `\n${failed} failed` : '\nall prolog-lang assertions passed');
process.exit(failed ? 1 : 0);
