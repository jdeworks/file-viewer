// Depth test for the Elvish known view: must capture REAL structure — functions WITH their lambda
// arg names (the `{|args|}`), var declarations, use imports, and `edit:` set bindings — not just
// names. Pure (analyzeElvish is DOM-free). Fixture = the committed sample.elv.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeElvish } from '../docs/types/text/known/elvish-script/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.elv'), 'utf8');
const { uses, functions, vars, sets, editBindings } = analyzeElvish(sample);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const fn = (n) => functions.find((f) => f.name === n);
const argNames = (f) => (f ? f.args.map((a) => a.name) : []);

// use imports
ok(uses.includes('str') && uses.includes('path') && uses.includes('re'), 'use imports: str, path, re');

// function WITH its positional lambda arg name (the {|name|})
const greet = fn('greet');
ok(greet && argNames(greet).includes('name'), 'fn greet captures positional arg `name`');

const deploy = fn('deploy');
ok(deploy && argNames(deploy).includes('env'), 'fn deploy captures positional arg `env`');

// function WITH an option arg (&release=$false)
const build = fn('build');
const rel = build && build.args.find((a) => a.name === 'release');
ok(rel && rel.kind === 'option' && rel.default === '$false', 'fn build captures option `&release=$false`');

// at least one function actually carries args (not name-only)
ok(functions.some((f) => f.args.length > 0), 'functions carry lambda args (not name-only)');

// var declarations
ok(vars.some((v) => v.name === 'project-root' && v.kind === 'var'), 'var declaration project-root');
ok(vars.some((v) => v.name === 'branch'), 'nested var declaration branch');

// set + edit: binding
ok(sets.some((s) => s.name === 'edit:prompt'), 'set edit:prompt captured');
ok(editBindings.includes('edit:prompt'), 'edit: binding flagged');

console.log(failed ? `\n${failed} failed` : '\nall elvish-script assertions passed');
process.exit(failed ? 1 : 0);
