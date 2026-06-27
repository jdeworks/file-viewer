// Depth test for the AWK known view: AWK is dynamically typed, so the load-bearing structure is
// special blocks (BEGIN/END), pattern-action rules WITH their pattern text, and user-defined
// functions WITH their param names/arity — not just names. Pure (analyzeAwk is DOM-free).
// Fixture = the committed docs/examples/sample.awk.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeAwk, parseSignature } from '../docs/types/text/known/awk-script/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.awk'), 'utf8');
const { hasBegin, hasEnd, functions, rules, ruleCount, builtins, printfCount } = analyzeAwk(sample);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const fn = (name) => functions.find((f) => f.name === name);

// Special blocks
ok(hasBegin === true, 'BEGIN block detected');
ok(hasEnd === true, 'END block detected');

// Pattern-action rules: 2 regex rules + 1 every-line block = 3, BEGIN/END/functions excluded
ok(ruleCount === 3, `rule count = 3 (got ${ruleCount})`);
ok(rules.some((r) => r.pattern === '/^#/' && r.kind === 'regex'), 'regex rule pattern /^#/ captured');
ok(rules.some((r) => r.kind === 'regex' && /space/.test(r.pattern)), 'whitespace regex rule captured');
ok(rules.some((r) => r.pattern === '' && r.kind === 'always'), 'every-line (no pattern) rule captured');

// User-defined functions WITH param names + AWK-convention locals (set off by extra spaces)
const pad = fn('pad');
ok(pad && pad.params.includes('s') && pad.params.includes('w'), 'pad() params include s, w');
ok(pad && pad.arity === 2, `pad() arity = 2 (got ${pad && pad.arity})`);
ok(pad && pad.locals.includes('r'), 'pad() local r split from params');
const max = fn('max');
ok(max && max.params.length === 2 && max.params[0] === 'a' && max.params[1] === 'b', 'max(a, b) params captured in order');

// Built-in variable usage
ok(builtins.includes('FS') && builtins.includes('OFS') && builtins.includes('NF'), 'built-ins FS, OFS, NF detected');
ok(!builtins.includes('NR'), 'unused built-in NR not falsely reported');

// printf usage counted
ok(printfCount >= 2, `printf calls counted (got ${printfCount})`);

// Direct parser unit check: locals split on the 2+ space convention
const sig = parseSignature('function join(arr, sep,    out, i)');
ok(sig && sig.params.length === 2 && sig.locals.length === 2, 'parseSignature splits params vs locals');

console.log(failed ? `\n${failed} failed` : '\nall awk-script assertions passed');
process.exit(failed ? 1 : 0);
