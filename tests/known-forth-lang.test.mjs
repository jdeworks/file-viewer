// Depth test for the Forth known view: must capture word definitions WITH their
// stack-effect signature (`( ... -- ... )`, Forth's de-facto signature), plus
// variables and constants (with values). Pure (analyzeForth is DOM-free).
// Fixture = the committed sample.fth.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeForth } from '../docs/types/text/known/forth-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.fth'), 'utf8');
const { words, variables, constants, values, creates, includes } = analyzeForth(sample);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const word = (n) => words.find((w) => w.name === n);

// Word definitions captured by name.
ok(words.length >= 6, `captured word definitions (${words.length})`);

// Word WITH its stack effect — the load-bearing depth requirement.
const sq = word('SQUARE');
ok(sq && sq.effect === 'n -- n*n', 'SQUARE carries stack effect ( n -- n*n )');

const fac = word('FACTORIAL');
ok(fac && fac.effect === 'n -- n!', 'FACTORIAL carries stack effect ( n -- n! )');

// Effect with no outputs still captured.
const cd = word('COUNTDOWN');
ok(cd && cd.effect === 'n --', 'COUNTDOWN carries stack effect ( n -- )');

// Not name-only: at least one word actually carries a `--` stack effect.
ok(words.some((w) => w.effect.includes('--')), 'word definitions carry stack effects (not name-only)');

// VARIABLE.
ok(variables.some((v) => v.name === 'counter'), 'VARIABLE counter captured');

// CONSTANT with its value (the value sits on the stack before CONSTANT).
const ans = constants.find((c) => c.name === 'answer');
ok(ans && ans.value === '42', 'CONSTANT answer = 42 captured with value');

console.log(`\nwords=${words.length} vars=${variables.length} consts=${constants.length} values=${values.length} creates=${creates.length} includes=${includes.length}`);
console.log(failed ? `\n${failed} failed` : '\nall forth-lang assertions passed');
process.exit(failed ? 1 : 0);
