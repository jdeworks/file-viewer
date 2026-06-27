// Depth test for the Wolfram Language known view: must parse pattern-based definitions into real
// parameters (name + head-type constraint + default), plus usage messages, package context, Needs,
// options & attributes — NOT just function names. Pure (analyzeWolfram is DOM-free).
// Fixture = the committed docs/examples/sample.wl.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeWolfram } from '../docs/types/text/known/wolfram-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.wl'), 'utf8');
const { packageContext, needs, functions, usages, options, attributes } = analyzeWolfram(sample);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const fn = (n) => functions.find((f) => f.name === n);

// package context + imports
ok(packageContext === 'VectorTools`', 'BeginPackage context = VectorTools`');
ok(needs.includes('Developer`'), 'Needs["Developer`"] captured');
ok(needs.includes('GeneralUtilities`'), 'BeginPackage dependency context captured');

// usage messages (public exports)
ok(usages.some((u) => u.name === 'normalize'), 'usage message for normalize');
ok(usages.some((u) => u.name === 'dotProduct' && /dot product/i.test(u.text)), 'usage text captured');

// pattern params: dotProduct[a_List, b_List] := ...
const dp = fn('dotProduct');
ok(dp && dp.params.map((p) => p.name).join(',') === 'a,b', 'dotProduct param names a, b parsed from pattern');
ok(dp && dp.params[0].type === 'List' && dp.params[1].type === 'List', 'dotProduct params typed _List');
ok(dp && dp.delayed === true, 'dotProduct uses SetDelayed (:=)');
ok(dp && dp.exported === true, 'dotProduct flagged public (has ::usage)');

// defaults: scale[v_List, factor_:1]
const sc = fn('scale');
ok(sc && sc.params[1].name === 'factor' && sc.params[1].default === '1', 'scale factor_:1 default parsed');

// pattern test + defaults: clamp[x_?NumericQ, lo_:0, hi_:1]
const cl = fn('clamp');
ok(cl && cl.params[0].name === 'x' && cl.params[0].test === 'NumericQ', 'clamp x_?NumericQ test parsed');
ok(cl && cl.params[1].default === '0' && cl.params[2].default === '1', 'clamp lo/hi defaults parsed');
ok(cl && cl.exported === false, 'clamp flagged private (no ::usage)');

// Set (immediate, not delayed): magnitude[v_List] = ...
const mg = fn('magnitude');
ok(mg && mg.delayed === false && mg.params[0].type === 'List', 'magnitude uses Set (=) with _List param');

// plain assignments (data =, plot =) must NOT be parsed as functions
ok(!fn('data') && !fn('plot'), 'plain value assignments excluded from definitions');

// options & attributes
ok(options.some((o) => o.symbol === 'normalize' && o.names.includes('Tolerance')), 'Options[normalize] names captured');
ok(attributes.some((a) => a.symbol === 'dotProduct' && a.items.includes('Listable')), 'SetAttributes captured');

// not name-only: definitions carry parsed pattern params (types/defaults/tests)
ok(functions.length >= 5 && functions.some((f) => f.params.some((p) => p.type || p.default || p.test)),
  'definitions carry parsed pattern params (not name-only)');

console.log(failed ? `\n${failed} failed` : '\nall wolfram-lang assertions passed');
process.exit(failed ? 1 : 0);
