// Depth test for the Eiffel known view: must capture REAL structure — class name, inheritance,
// creation procedures, routine SIGNATURES (typed args + return type), and attributes with types.
// Pure (analyzeEiffel is DOM-free). No committed .e sample exists in docs/examples, so we use an
// inline fixture; the absolute-path pattern from known-ada-lang.test.mjs is kept for the day one
// lands.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeEiffel } from '../docs/types/text/known/eiffel-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const samplePath = resolve(HERE, '../docs/examples/sample.e');

const FIXTURE = `class ACCOUNT

inherit
    ANY
        redefine
            out
        end

create
    make

feature -- Initialization

    make (initial_balance: INTEGER)
            -- Create account with \`initial_balance'.
        require
            non_negative: initial_balance >= 0
        do
            balance := initial_balance
        ensure
            balance_set: balance = initial_balance
        end

feature -- Access

    balance: INTEGER
            -- Current balance.

    owner: STRING

feature -- Element change

    deposit (amount: INTEGER)
            -- Add \`amount' to balance.
        require
            positive: amount > 0
        do
            balance := balance + amount
        ensure
            increased: balance = old balance + amount
        end

    transfer (other: ACCOUNT; amount: INTEGER)
        do
            other.deposit (amount)
        end

feature -- Status report

    is_empty: BOOLEAN
            -- Is balance zero?
        do
            Result := balance = 0
        end

invariant
    non_negative_balance: balance >= 0

end
`;

const usedReal = existsSync(samplePath);
const source = usedReal ? readFileSync(samplePath, 'utf8') : FIXTURE;
console.log(usedReal ? `(using real sample: ${samplePath})` : '(using inline fixture)');

const { className, deferred, inherits, creators, features, contracts } = analyzeEiffel(source);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const feat = (n) => features.find((f) => f.name === n);

// class + inheritance + creation
ok(className === 'ACCOUNT', `class name = ACCOUNT (got ${className})`);
ok(deferred === false, 'not a deferred class');
ok(inherits.includes('ANY'), `inherits ANY (got [${inherits.join(', ')}])`);
ok(creators.includes('make'), `creation procedure make (got [${creators.join(', ')}])`);

// routine with a typed arg: make (initial_balance: INTEGER)
const make = feat('make');
ok(make && make.kind === 'procedure', 'make is a procedure');
ok(make && make.params.length === 1 && make.params[0].name === 'initial_balance'
  && make.params[0].type === 'INTEGER', 'make (initial_balance: INTEGER) — typed arg');

// procedure with multiple typed args: transfer (other: ACCOUNT; amount: INTEGER)
const transfer = feat('transfer');
ok(transfer && transfer.params.length === 2 && transfer.params[0].type === 'ACCOUNT'
  && transfer.params[1].name === 'amount' && transfer.params[1].type === 'INTEGER',
  'transfer (other: ACCOUNT; amount: INTEGER) — two typed args');

// attribute with a type: balance: INTEGER
const balance = feat('balance');
ok(balance && balance.kind === 'attribute' && balance.returns === 'INTEGER',
  'attribute balance: INTEGER');
const owner = feat('owner');
ok(owner && owner.kind === 'attribute' && owner.returns === 'STRING', 'attribute owner: STRING');

// query (function) with a return type: is_empty: BOOLEAN
const isEmpty = feat('is_empty');
ok(isEmpty && isEmpty.kind === 'function' && isEmpty.returns === 'BOOLEAN',
  'query is_empty: BOOLEAN');

// contracts captured
ok(contracts.require >= 2, `require blocks >= 2 (got ${contracts.require})`);
ok(contracts.ensure >= 2, `ensure blocks >= 2 (got ${contracts.ensure})`);
ok(contracts.invariant >= 1, `invariant present (got ${contracts.invariant})`);

// not name-only: at least one routine actually carries typed params
ok([...features].some((f) => f.params.some((p) => p.type)),
  'signatures carry typed params (not name-only)');

console.log(failed ? `\n${failed} failed` : '\nall eiffel-lang assertions passed');
process.exit(failed ? 1 : 0);
