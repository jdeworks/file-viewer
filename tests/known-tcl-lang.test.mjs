// Depth test for the Tcl known view: must capture REAL structure — proc parameter names (with
// defaults/varargs), namespace grouping, package require/provide, sources — not just names.
// Pure (analyzeTcl is DOM-free). Fixture = the committed sample.tcl.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeTcl } from '../docs/types/text/known/tcl-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.tcl'), 'utf8');
const { packages, procs, namespaces, variables, sources } = analyzeTcl(sample);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const proc = (n) => procs.find((p) => p.name === n);
const ns = (n) => namespaces.find((x) => x.name === n);

// --- proc params with correct names ---
const hello = proc('::app::sayHello');
ok(hello && hello.params.length === 1 && hello.params[0].name === 'name', '::app::sayHello param "name"');
const parse = proc('::app::parseConfig');
ok(parse && parse.params.length === 1 && parse.params[0].name === 'data', '::app::parseConfig param "data"');
const load = proc('::app::loadConfig');
ok(load && load.params[0] && load.params[0].name === 'path', '::app::loadConfig param "path"');

// --- namespace-qualified names + grouping ---
ok(proc('::app::init') && proc('::app::init').namespace === '::app', '::app::init grouped under ::app');
const app = ns('::app');
ok(app && app.procs.length >= 4, '::app namespace groups its procs');
ok(app && app.procs.some((p) => p.simpleName === 'sayHello'), '::app group includes simpleName sayHello');
const ui = ns('::app::ui');
ok(ui && ui.procs.some((p) => p.simpleName === 'buildWindow'), '::app::ui groups buildWindow');
ok(app && app.variables.some((v) => v.name === 'version'), '::app namespace variable "version" captured');

// --- packages require/provide ---
ok(packages.require.some((p) => p.name === 'Tcl') && packages.require.some((p) => p.name === 'Tk'), 'package require Tcl + Tk');
ok(packages.provide.some((p) => p.name === 'SampleApp' && p.ver === '1.0'), 'package provide SampleApp 1.0');

// --- sources ---
ok(sources.includes('lib/utils.tcl') && sources.includes('lib/network.tcl'), 'source includes captured');

// --- proc bodies must NOT leak as top-level procs/vars (brace-depth aware) ---
ok(procs.length === 5, 'exactly 5 procs (no body-command false positives)');
ok(variables.some((v) => v.name === 'configPath' && !v.namespace), 'global variable configPath');
ok(!variables.some((v) => v.name === 'frame'), 'inner proc-body "set frame" not leaked as variable');

// --- not name-only: procs carry params ---
ok(procs.some((p) => p.params.length > 0), 'procs carry params (not name-only)');

// --- synthetic check: defaults + varargs parsing ---
const syn = analyzeTcl('proc ::math::scale {a b {c 1} args} { expr {$a*$b} }');
const sp = syn.procs[0].params;
ok(sp.length === 4 && sp[0].name === 'a' && sp[2].name === 'c' && sp[2].default === '1' && sp[3].varargs,
  'default param {c 1} → c=1 and args varargs');

console.log(failed ? `\n${failed} failed` : '\nall tcl-lang assertions passed');
process.exit(failed ? 1 : 0);
