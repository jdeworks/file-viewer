// Worklist checker for the known-view enhancement loop. Reads tests/known-view-backlog.txt (ignoring
// # comments / blank lines) and reports the language/code viewers still awaiting a depth pass.
// Exit 0 when the backlog is empty (loop is DONE → stop); exit 1 while items remain (with the list).
// This is the loop's "open task list": the source of truth lives in the repo, not in memory.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const raw = readFileSync(resolve(HERE, 'known-view-backlog.txt'), 'utf8');
const ids = raw.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));

if (ids.length === 0) {
  console.log('✓ known-view backlog EMPTY — all language/code viewers enhanced. Stop the loop.');
  process.exit(0);
}
console.log(`${ids.length} known viewer(s) remaining:`);
console.log('  ' + ids.join(' '));
console.log('\nNext up: ' + ids.slice(0, 3).join(', '));
process.exit(1);
