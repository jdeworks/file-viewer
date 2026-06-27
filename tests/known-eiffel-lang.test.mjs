// Depth test for the Eiffel known view: must capture REAL structure — class name, inheritance,
// creation procedures, routine SIGNATURES (typed args + return type), queries with a return type,
// and contract counts — not just feature names. Pure (analyzeEiffel is DOM-free). Fixture = the
// committed docs/examples/sample.e (absolute-path pattern from known-ada-lang.test.mjs); falls back
// to an inline ACCOUNT fixture if that file is ever removed.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeEiffel } from '../docs/types/text/known/eiffel-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const samplePath = resolve(HERE, '../docs/examples/sample.e');

const INLINE_FIXTURE = `class ACCOUNT
inherit
\tANY
create
\tmake
feature -- Access
\tbalance: INTEGER
feature -- Element change
\tdeposit (amount: INTEGER)
\t\trequire
\t\t\tamount > 0
\t\tdo
\t\t\tbalance := balance + amount
\t\tensure
\t\t\tbalance = old balance + amount
\t\tend
\tsum (a, b: INTEGER): INTEGER
\t\trequire
\t\t\ta >= 0
\t\tdo
\t\t\tResult := a + b
\t\tensure
\t\t\tResult = a + b
\t\tend
invariant
\tbalance >= 0
end
`;

const usedReal = existsSync(samplePath);
const source = usedReal ? readFileSync(samplePath, 'utf8') : INLINE_FIXTURE;
console.log(usedReal ? `(real sample: ${samplePath})` : '(inline fixture)');

const { className, deferred, inherits, creators, features, contracts } = analyzeEiffel(source);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const feat = (n) => features.find((f) => f.name === n);

// class + inheritance + creation
ok(className === (usedReal ? 'GREETER' : 'ACCOUNT'), `class name (got ${className})`);
ok(deferred === false, 'not a deferred class');
ok(inherits.includes('ANY'), `inherits ANY (got [${inherits.join(', ')}])`);
ok(creators.includes('make'), `creation procedure make (got [${creators.join(', ')}])`);

if (usedReal) {
  // routine with a typed arg: greet (name: STRING)
  const greet = feat('greet');
  ok(greet && greet.kind === 'procedure', 'greet is a procedure');
  ok(greet && greet.params.length === 1 && greet.params[0].name === 'name'
    && greet.params[0].type === 'STRING', 'greet (name: STRING) — typed arg');

  // query (function) with typed args AND a return type: add (a, b: INTEGER): INTEGER
  const add = feat('add');
  ok(add && add.kind === 'function' && add.returns === 'INTEGER', 'query add returns INTEGER');
  ok(add && add.params.length === 2 && add.params[0].name === 'a' && add.params[0].type === 'INTEGER'
    && add.params[1].name === 'b' && add.params[1].type === 'INTEGER',
    'add (a, b: INTEGER) — two typed args expanded');
} else {
  const deposit = feat('deposit');
  ok(deposit && deposit.kind === 'procedure' && deposit.params[0].type === 'INTEGER',
    'deposit (amount: INTEGER) — typed arg');
  const balance = feat('balance');
  ok(balance && balance.kind === 'attribute' && balance.returns === 'INTEGER',
    'attribute balance: INTEGER');
  const sum = feat('sum');
  ok(sum && sum.kind === 'function' && sum.returns === 'INTEGER', 'query sum returns INTEGER');
}

// contracts captured (require/ensure counts)
ok(contracts.require >= 2, `require blocks >= 2 (got ${contracts.require})`);
ok(contracts.ensure >= 2, `ensure blocks >= 2 (got ${contracts.ensure})`);

// not name-only: at least one routine actually carries typed params
ok(features.some((f) => f.params.some((p) => p.type)),
  'signatures carry typed params (not name-only)');

console.log(failed ? `\n${failed} failed` : '\nall eiffel-lang assertions passed');
process.exit(failed ? 1 : 0);
