// Depth test for the Zsh known view: must capture REAL structure (functions with
// detected positional params + locals, aliases, setopt options, exports/variables),
// not just names. Pure (analyzeZsh is DOM-free). Fixture = the committed sample.zsh.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeZsh } from '../docs/types/text/known/zsh-script/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.zsh'), 'utf8');
const r = analyzeZsh(sample);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const fn = (n) => r.functions.find((x) => x.name === n);

// --- functions: both `function name()` and posix `name()` forms ---------------
ok(r.functions.length >= 6, `parsed functions (${r.functions.length})`);

const mkcd = fn('mkcd');
ok(mkcd && mkcd.form === 'function', 'mkcd parsed from `function` form');
ok(mkcd && mkcd.positionals.includes('$1'), 'mkcd detects positional $1');
ok(mkcd && mkcd.locals.includes('dir'), 'mkcd detects local `dir`');

const backup = fn('backup');
ok(backup && backup.form === 'posix', 'backup parsed from posix `name()` form');
ok(backup && backup.positionals.includes('$1') && backup.positionals.includes('$2'),
  'backup detects positionals $1 and $2 (incl. ${2:-default})');
ok(backup && backup.positionals.includes('$@'), 'backup detects $@ (all args)');
ok(backup && backup.locals.includes('src') && backup.locals.includes('dest') && backup.locals.includes('count'),
  'backup detects locals src, dest, count (local + typeset)');

const deploy = fn('deploy');
ok(deploy && deploy.positionals.includes('$1') && deploy.positionals.includes('$2'),
  'deploy detects positionals $1, $2');

// brace-depth awareness: ${#BUFFER} (length) must NOT be read as positional $#
const fzf = fn('fzf-history-widget');
ok(fzf && !fzf.positionals.includes('$#'), 'fzf widget: ${#BUFFER} not misread as $#');
ok(fzf && fzf.locals.includes('cmd'), 'fzf widget detects local `cmd`');

// brace-depth: inner commands of a function body are not parsed as top-level functions
ok(!fn('mkdir') && !fn('vcs_info') && !fn('cp'), 'function-body commands not misparsed as functions');

// --- aliases ------------------------------------------------------------------
const al = (n) => r.aliases.find((a) => a.name === n);
ok(r.aliases.length >= 3, `aliases parsed (${r.aliases.length})`);
ok(al('ll') && al('ll').value === 'ls -lah', "alias ll = 'ls -lah'");
ok(al('gs') && al('gs').value === 'git status', 'alias gs = git status (quote-stripped)');

// --- setopt / unsetopt options ------------------------------------------------
const opt = (n) => r.options.find((o) => o.name === n);
ok(opt('AUTO_CD') && opt('AUTO_CD').enabled === true, 'setopt AUTO_CD (enabled)');
ok(opt('EXTENDED_GLOB') && opt('EXTENDED_GLOB').enabled === true, 'setopt EXTENDED_GLOB on same line');
ok(opt('BEEP') && opt('BEEP').enabled === false, 'unsetopt BEEP (disabled)');

// --- exports ------------------------------------------------------------------
const exp = (n) => r.exports.find((e) => e.name === n);
ok(exp('EDITOR') && exp('EDITOR').value === 'nvim', 'export EDITOR=nvim');
ok(exp('PATH') && /HOME\/bin/.test(exp('PATH').value), 'export PATH (with value)');

// --- variables (scope: local / typeset / array) -------------------------------
const v = (n) => r.variables.find((x) => x.name === n);
ok(v('HISTFILE') && v('HISTFILE').scope === 'local', 'local HISTFILE has scope=local');
ok(v('HISTSIZE') && v('HISTSIZE').scope === 'typeset', 'typeset -i HISTSIZE has scope=typeset');
ok(v('plugins') && v('plugins').array === true, 'plugins=( … ) detected as array');
ok(r.arrays.includes('plugins') && r.arrays.includes('fpath_additions'), 'arrays captured');

// --- other constructs ---------------------------------------------------------
ok(r.autoloads.includes('compinit') && r.autoloads.includes('vcs_info'), 'autoloads captured (flags stripped)');
ok(r.sources.length >= 2, `source/. inclusions captured (${r.sources.length})`);
ok(r.bindkeys.some((b) => b.key === '^R' && b.widget === 'fzf-history-widget'), 'bindkey ^R → fzf-history-widget');
ok(r.zleWidgets.includes('fzf-history-widget'), 'zle -N widget captured');
ok(r.compdefs.length >= 2, `compdef completions captured (${r.compdefs.length})`);

// --- not name-only: functions carry detected per-construct detail --------------
ok(r.functions.some((x) => x.positionals.length > 0 || x.locals.length > 0),
  'functions carry detected positionals/locals (not name-only)');

console.log(failed ? `\n${failed} failed` : '\nall zsh-script assertions passed');
process.exit(failed ? 1 : 0);
