// Depth test for the R known view: must capture function SIGNATURES (param names +
// defaults), library imports, and top-level assignments — not just names. Pure
// (analyzeR is DOM-free). Fixture = the committed sample.R.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeR } from '../docs/types/text/known/r-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.R'), 'utf8');
const { libraries, functions, assignments, classes, sources } = analyzeR(sample);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const fn = (n) => functions.find((f) => f.name === n);
const asn = (n) => assignments.find((a) => a.name === n);

// library / require imports
ok(libraries.includes('stats') && libraries.includes('utils'), 'library() imports captured');
ok(libraries.includes('methods'), 'require() import captured');

// function with named param + default: summarize_vector(x, na.rm = TRUE)
const sv = fn('summarize_vector');
ok(sv && sv.params.length === 2, 'summarize_vector has 2 params');
ok(sv && sv.params[0].name === 'x' && sv.params[0].default == null, 'first param x, no default');
ok(sv && sv.params[1].name === 'na.rm' && sv.params[1].default === 'TRUE', 'param na.rm = TRUE (name + default)');

// function with two defaults: clip(x, lo = 0, hi = 1)
const clip = fn('clip');
ok(clip && clip.params.length === 3, 'clip has 3 params');
ok(clip && clip.params[1].name === 'lo' && clip.params[1].default === '0'
   && clip.params[2].name === 'hi' && clip.params[2].default === '1', 'clip defaults lo=0, hi=1');

// plain function, no defaults: simple_lm(x, y)
const lm = fn('simple_lm');
ok(lm && lm.params.map((p) => p.name).join(',') === 'x,y' && lm.params.every((p) => p.default == null),
   'simple_lm(x, y) no defaults');

// top-level constants captured; inner-body assignments NOT promoted to top level
ok(asn('CONFIDENCE_LEVEL') && asn('CONFIDENCE_LEVEL').value === '0.95', 'constant CONFIDENCE_LEVEL <- 0.95');
ok(asn('SEED') && asn('SEED').kind === 'numeric', 'constant SEED captured as numeric');
ok(!asn('slope') && !asn('x_bar'), 'function-body locals not captured as top-level');

// data assignment kind detection (analysis.r style) — value-kind classifier works
const df = analyzeR('readings <- data.frame(a = 1)\n');
ok(df.assignments[0] && df.assignments[0].kind === 'data.frame', 'data.frame assignment kind');

// not name-only: at least one function carries a param with a default
ok(functions.some((f) => f.params.some((p) => p.default != null)), 'signatures carry defaults (not name-only)');

console.log(failed ? `\n${failed} failed` : '\nall r-lang assertions passed');
process.exit(failed ? 1 : 0);
