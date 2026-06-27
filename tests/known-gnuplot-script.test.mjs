// Depth test for the gnuplot known view: must capture REAL structure — function defs WITH params,
// set options as key/value, plot commands with targets/modifiers, variables and includes — not just
// names. Pure (analyzeGnuplot is DOM-free). Fixture = the committed sample.gnuplot.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeGnuplot } from '../docs/types/text/known/gnuplot-script/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.gnuplot'), 'utf8');
const { sets, variables, functions, plots, loads, terminal, output } = analyzeGnuplot(sample);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const setOpt = (o) => sets.find((s) => s.option === o);
const fn = (n) => functions.find((f) => f.name === n);
const vr = (n) => variables.find((v) => v.name === n);

// terminal + output extracted specially
ok(terminal === 'pngcairo', 'terminal = pngcairo');
ok(output === 'plot.png', 'output = plot.png');

// set options captured as key/value (not just name)
const xl = setOpt('xlabel');
ok(xl && /Time/.test(xl.value), 'set xlabel key/value carries "Time (days)"');
ok(setOpt('title') && /Temperature over Time/.test(setOpt('title').value), 'set title key/value');
ok(sets.length >= 8, 'many set options captured');

// function definitions WITH their params and bodies
const f = fn('f');
ok(f && f.params.length === 1 && f.params[0] === 'x', 'function f has param x');
ok(f && /sin/.test(f.body), 'function f body carries expression (sin)');
const env = fn('envelope');
ok(env && env.params.length === 2 && env.params[1] === 'k', 'envelope(x, k) — two params');

// variables (scalar assignments), distinct from functions
ok(vr('a') && vr('a').value === '5', 'variable a = 5');
ok(vr('period') && vr('period').value === '24.0', 'variable period = 24.0');
ok(!functions.some((x) => x.name === 'a'), 'scalar a not misclassified as a function');

// plot commands with targets + modifiers
const s1 = plots.find((p) => p.target === 'data.csv' && p.using === '1:2');
ok(s1 && s1.kind === 'plot' && s1.with === 'lines' && s1.title === 'Sensor 1', 'plot data.csv using 1:2 with lines title "Sensor 1"');
ok(plots.some((p) => p.target === 'f(x)' && p.title === 'model'), 'plot of function f(x) title "model"');
const sp = plots.find((p) => p.kind === 'splot');
ok(sp && sp.target === 'grid.dat' && sp.using === '1:2:3', 'splot grid.dat using 1:2:3 (;-separated command)');

// includes via load/call
ok(loads.some((l) => l.cmd === 'load' && l.file === 'common.gp'), 'load common.gp');
ok(loads.some((l) => l.cmd === 'call' && l.file === 'finish.gp'), 'call finish.gp');

console.log(failed ? `\n${failed} failed` : '\nall gnuplot-script assertions passed');
process.exit(failed ? 1 : 0);
