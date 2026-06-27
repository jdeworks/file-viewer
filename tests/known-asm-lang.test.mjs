// Depth test for the Assembly known view: must capture REAL structure — sections, code labels
// (the "functions"), data definitions WITH their directive + value, macros, and an opcode
// histogram (top mnemonics) — not just a flat line count. Pure (analyzeAsm is DOM-free).
// Fixture = the committed NASM sample.asm.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeAsm } from '../docs/types/text/known/asm-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.asm'), 'utf8');
const { flavor, sections, labels, dataDefs, directives, macros, externs, globals, topMnemonics, instrCount } = analyzeAsm(sample);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };

ok(flavor === 'NASM', `flavor detected as NASM (got ${flavor})`);

// sections / segments
ok(sections.includes('.data') && sections.includes('.bss') && sections.includes('.text'), 'sections .data/.bss/.text captured');

// labels = the "functions" (local .loop/.done must be excluded)
ok(labels.includes('_start'), 'entry label _start captured');
ok(labels.includes('factorial') && labels.includes('add_ints') && labels.includes('zero_buffer'), 'procedure labels captured');
ok(!labels.includes('.loop') && !labels.includes('.done'), 'local labels (.loop/.done) excluded');

// data definitions WITH directive + value
const msg = dataDefs.find((d) => d.name === 'msg');
ok(msg && msg.directive === 'db' && /Hello, World!/.test(msg.value), 'data def msg: db "Hello, World!", 10 (directive + value)');
const num = dataDefs.find((d) => d.name === 'num');
ok(num && num.directive === 'dq' && num.value === '42', 'data def num: dq 42');
const buffer = dataDefs.find((d) => d.name === 'buffer');
ok(buffer && buffer.directive === 'resb' && buffer.value === '64', 'data def buffer: resb 64');
const msglen = dataDefs.find((d) => d.name === 'msglen');
ok(msglen && msglen.directive === 'equ' && /\$ - msg/.test(msglen.value), 'data def msglen: equ $ - msg');

// symbols
ok(globals.includes('_start'), 'global _start captured');
ok(externs.includes('printf') && externs.includes('exit'), 'externs printf/exit captured');

// macros
ok(macros.includes('PRINT'), 'macro PRINT captured');

// directives (BITS 64 etc.)
ok(directives.some((d) => d.name === 'bits' && d.value === '64'), 'directive BITS 64 captured');

// opcode histogram — non-empty, sorted desc, macro invocation excluded
ok(topMnemonics.length > 0, 'top-mnemonics list is non-empty');
ok(topMnemonics[0].op === 'mov', `most-used mnemonic is mov (got ${topMnemonics[0].op})`);
ok(topMnemonics.every((m, i, a) => i === 0 || a[i - 1].count >= m.count), 'mnemonics sorted by count desc');
ok(!topMnemonics.some((m) => m.op === 'print'), 'macro invocation (PRINT) not counted as an instruction');
ok(instrCount >= 20, `instruction count is real (got ${instrCount})`);

console.log(failed ? `\n${failed} failed` : '\nall asm-lang assertions passed');
process.exit(failed ? 1 : 0);
