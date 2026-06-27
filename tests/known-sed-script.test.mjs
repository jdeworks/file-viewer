// Depth test for the sed known view: must capture REAL command structure — substitution
// pattern/replacement/flags, parsed addresses, labels/branches — not just raw command text.
// Pure (analyzeSed is DOM-free). Fixture = the committed sample.sed.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeSed } from '../docs/types/text/known/sed-script/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.sed'), 'utf8');
const { autoprint, commands, substitutions, transliterations, labels, branches, blocks } = analyzeSed(sample);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };

// shebang is `sed -f` (no -n) → auto-print stays on
ok(autoprint === true, 'auto-print detected as on (no -n)');

// We parsed multiple commands and several substitutions.
ok(commands.length >= 12, `parsed many commands (${commands.length})`);
ok(substitutions.length >= 6, `parsed substitutions (${substitutions.length})`);

// A substitution with a real replacement string + global flag: s/...TIMESTAMP.../[TIMESTAMP]/g
const ts = substitutions.find((s) => s.replacement === '[TIMESTAMP]');
ok(!!ts, 'found ISO-timestamp substitution by replacement');
ok(ts && ts.flags === 'g', 'timestamp substitution flags = g');
ok(ts && /\[0-9\]\\\{4\\\}/.test(ts.pattern), 'timestamp substitution pattern captured');

// A substitution with a multi-char / case flag combo: s/...levels.../\U\1/gI
const lvl = substitutions.find((s) => /gI|gi/i.test(s.flags) && s.replacement === '\\U\\1');
ok(!!lvl, 'found log-level substitution with \\U\\1 replacement and gI flags');

// A delete substitution (empty replacement): s/\r$//
const crlf = substitutions.find((s) => s.pattern === '\\r$');
ok(crlf && crlf.replacement === '', 'CRLF-strip substitution has empty replacement');

// Addressed command: range delete 1,5d
const rangeDel = commands.find((c) => c.cmd === 'd' && c.address === '1,5');
ok(!!rangeDel, 'found range-addressed delete 1,5d');

// Regex-addressed delete: /\[TRACE\]/d
const traceDel = commands.find((c) => c.cmd === 'd' && /TRACE/.test(c.address));
ok(!!traceDel, 'found regex-addressed TRACE delete');

// Transliteration A-Z → a-z
const y = transliterations[0];
ok(y && /ABCDEFGHIJKLMNOPQRSTUVWXYZ/.test(y.from) && /abcdefghijklmnopqrstuvwxyz/.test(y.to), 'transliterate uppercase → lowercase');

// Label + branch wiring: :done defined, b done branches to it
ok(labels.includes('done'), 'label "done" defined');
const branch = branches.find((b) => b.label === 'done');
ok(!!branch && branch.cmd === 'b', 'branch b → label "done"');

// Block grouping captured
ok(blocks >= 1, `block grouping captured (${blocks})`);

// Append command with text body (continuation line consumed, not parsed as a command)
const append = commands.find((c) => c.cmd === 'a' && c.text && c.text.includes('---'));
ok(!!append, 'append command captured its text body ("---")');

// Every command carries a human-readable description.
ok(commands.every((c) => typeof c.desc === 'string' && c.desc.length > 0), 'every command has a description');

// NOT name-only: commands carry parsed detail beyond raw text — substitutions expose
// distinct pattern/replacement/flags fields, and addressed commands carry a parsed address.
ok(substitutions.every((s) => 'pattern' in s && 'replacement' in s && 'flags' in s), 'substitutions carry parsed pattern/replacement/flags (not name-only)');
ok(commands.some((c) => c.address && c.address !== c.raw), 'addressed commands carry a parsed address distinct from raw');

console.log(failed ? `\n${failed} failed` : '\nall sed-script assertions passed');
process.exit(failed ? 1 : 0);
