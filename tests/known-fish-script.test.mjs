// Depth test for the Fish known view: must capture REAL structure — function argument-names + flags
// (the closest thing to a signature), and set vars WITH their scope/export — not just names.
// Pure (analyzeFish is DOM-free). Fixture = the committed docs/examples/sample.fish.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeFish } from '../docs/types/text/known/fish-script/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.fish'), 'utf8');
const { functions, variables, aliases, abbrs, sources } = analyzeFish(sample);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const fn = (n) => functions.find((f) => f.name === n);
const v = (n) => variables.find((x) => x.name === n);

// Functions captured by name.
ok(functions.length >= 4, `functions found (${functions.length})`);
ok(!!fn('greet') && !!fn('mkcd') && !!fn('fish_prompt'), 'plain functions captured');

// Function with --description carries its description (real structure, not just a name).
const deploy = fn('deploy');
ok(deploy && deploy.description === 'Deploy to a target environment', 'deploy carries its --description');

// Event-handler function: --on-event captured.
const onExit = fn('on_exit');
ok(onExit && onExit.onEvent === 'fish_exit', 'on_exit --on-event fish_exit captured');

// set vars WITH scope + export flag.
const path = v('PATH');
ok(path && path.scope === 'global' && path.exported === true, 'set -gx PATH → scope=global, exported');
const editor = v('EDITOR');
ok(editor && editor.scope === 'global' && editor.exported === false, 'set -g EDITOR → scope=global, not exported');
const projectRoot = v('project_root');
ok(projectRoot && projectRoot.scope === 'local', 'set -l project_root → scope=local');

// aliases with targets, abbrs, sources.
ok(aliases.some((a) => a.name === 'll' && /ls -la/.test(a.target)), 'alias ll → "ls -la"');
ok(abbrs.some((a) => a.name === 'gco' && /git checkout/.test(a.expansion)), 'abbr gco → git checkout');
ok(sources.some((s) => /local\.fish$/.test(s)), 'source inclusion captured');

// Inline-fixture cross-check: a function header with --argument-names yields argNames.
const inline = analyzeFish("function greet --argument-names name --description 'hi'\n  echo $argv\nend\nset -gx FOO bar\nabbr -a g git");
const ig = inline.functions.find((f) => f.name === 'greet');
ok(ig && ig.argNames.length === 1 && ig.argNames[0] === 'name', '--argument-names parsed into argNames[]');
ok(ig && ig.description === 'hi', 'inline --description parsed');
ok(inline.variables.some((x) => x.name === 'FOO' && x.scope === 'global' && x.exported), 'inline set -gx FOO global+export');

// Not name-only: at least one function actually carries args or a description.
ok(functions.some((f) => f.argNames.length || f.description || f.onEvent), 'functions carry real structure (not name-only)');

console.log(failed ? `\n${failed} failed` : '\nall fish-script assertions passed');
process.exit(failed ? 1 : 0);
