// Depth test for the Factor known view: must capture REAL structure — word definitions WITH their
// stack-effect signature `( in -- out )` (Factor's type signature) and TUPLE slots, not just names.
// Pure (analyzeFactor is DOM-free). Fixture = the committed sample.factor.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeFactor } from '../docs/types/text/known/factor-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.factor'), 'utf8');
const { using, inVocab, words, generics, tuples, constants, symbols } = analyzeFactor(sample);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const word = (n) => words.find((w) => w.name === n);
const tuple = (n) => tuples.find((t) => t.name === n);

// USING: vocabularies captured
ok(using.includes('math') && using.includes('sequences') && using.length >= 3, 'USING: imports captured');
// IN: current vocab
ok(inVocab === 'demo', 'IN: vocab = demo');

// word WITH its stack effect (the load-bearing signature, not name-only)
const sq = word('square');
ok(sq && sq.effect === 'n -- n^2', 'square has stack effect ( n -- n^2 )');
const sos = word('sum-of-squares');
ok(sos && sos.effect === 'a b -- n', 'sum-of-squares has effect ( a b -- n )');
const main = word('main');
ok(main && main.effect === '--', 'main has empty effect ( -- )');

// at least one word actually carries a stack effect (not name-only)
ok(words.some((w) => w.effect && /--/.test(w.effect)), 'words carry stack-effect signatures');

// TUPLE definitions with slots
const pt = tuple('point');
ok(pt && pt.slots.length === 2 && pt.slots.includes('x') && pt.slots.includes('y'), 'tuple point has slots x y');
ok(tuple('rect') && tuple('rect').slots.includes('origin'), 'tuple rect has slots');

// CONSTANT / SYMBOL
ok(constants.some((c) => c.name === 'max-iterations' && c.value === '1000'), 'constant max-iterations = 1000');
ok(symbols.includes('+done+'), 'symbol +done+ captured');

// inline fixture: GENERIC:, SYMBOLS:, tuple inheritance — features the sample lacks
const fx = analyzeFactor(`USING: math kernel ;
IN: myvocab
GENERIC: area ( shape -- n )
SYMBOLS: foo bar baz ;
: add2 ( x -- y ) 2 + ;
TUPLE: circle < shape radius ;`);
ok(fx.using.includes('math') && fx.inVocab === 'myvocab', 'fixture USING + IN');
ok(fx.generics.includes('area'), 'GENERIC: area captured');
ok(fx.symbols.includes('foo') && fx.symbols.includes('baz') && fx.symbols.length === 3, 'SYMBOLS: multi captured');
ok(fx.words.some((w) => w.name === 'add2' && w.effect === 'x -- y'), 'fixture word add2 effect');
const circle = fx.tuples.find((t) => t.name === 'circle');
ok(circle && circle.parent === 'shape' && circle.slots.includes('radius'), 'tuple inheritance ( circle < shape )');

console.log(failed ? `\n${failed} failed` : '\nall factor-lang assertions passed');
process.exit(failed ? 1 : 0);
