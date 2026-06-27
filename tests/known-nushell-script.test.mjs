// Depth test for the Nushell known view: must capture command SIGNATURES (typed params + flags),
// exported defs, and let/mut/const bindings — not just names. Pure (analyzeNushell is DOM-free).
// Fixture = the committed sample.nu.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeNushell } from '../docs/types/text/known/nushell-script/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.nu'), 'utf8');
const { commands, variables, uses, aliases } = analyzeNushell(sample);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const cmd = (n) => commands.find((c) => c.name === n);

// command with a typed positional param
const pv = cmd('parse-version');
ok(pv && pv.params.length === 1 && pv.params[0].name === 'version_str' && pv.params[0].type === 'string',
  'parse-version [version_str: string] — typed positional captured');

// multi-line signature with flags: --release (-r) and --target (-t): string = "x86_64"
const build = cmd('build');
const release = build && build.params.find((p) => p.name === '--release');
const target = build && build.params.find((p) => p.name === '--target');
ok(release && release.flag && release.short === '-r', 'build --release (-r) flag + short captured');
ok(target && target.flag && target.type === 'string' && target.default === '"x86_64"',
  'build --target (-t): string = "x86_64" — typed flag with default');

// exported def with positional + boolean flag
const deploy = cmd('deploy');
ok(deploy && deploy.exported, 'deploy is an exported (public) command');
ok(deploy && deploy.params.find((p) => p.name === 'env' && p.type === 'string'), 'deploy env: string positional');
ok(deploy && deploy.params.find((p) => p.name === '--dry-run' && p.flag), 'deploy --dry-run boolean flag');
ok(commands.filter((c) => c.exported).length >= 2, 'at least 2 exported commands');

// bindings: let / mut / const
ok(variables.find((v) => v.name === 'project_root' && v.kind === 'let'), 'let project_root binding');
ok(variables.find((v) => v.name === 'retry_count' && v.kind === 'mut'), 'mut retry_count binding');

// imports + aliases
ok(uses.find((u) => u.module === 'std'), 'use std import');
ok(uses.find((u) => u.module === './utils.nu' && u.items.includes('format-date')), 'use ./utils.nu [format-date, slugify] with items');
ok(aliases.find((a) => a.name === 'll'), 'alias ll captured');

// not name-only: at least one command actually carries a typed param
ok(commands.some((c) => c.params.some((p) => p.type)), 'signatures carry typed params (not name-only)');

console.log(failed ? `\n${failed} failed` : '\nall nushell-script assertions passed');
process.exit(failed ? 1 : 0);
