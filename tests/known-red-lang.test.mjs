// Depth test for the Red known view: must capture REAL structure — header fields, function arg words
// (with type hints) and contexts — not just names. Pure (analyzeRed is DOM-free). Fixture = sample.red.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeRed } from '../docs/types/text/known/red-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.red'), 'utf8');
const { header, functions, objects, includes } = analyzeRed(sample);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const fn = (n) => functions.find((f) => f.name === n);

// Header block fields
ok(header && header.Title === 'Demo', 'header Title = "Demo"');
ok(header && header.Author === 'User', 'header Author = "User"');
ok(header && header.Version === '1.0.0', 'header Version = 1.0.0');
ok(header && /Demonstrate/.test(header.Purpose || ''), 'header Purpose captured');

// Functions with arg words + type hints (name: func [name [string!]] ...)
const greet = fn('greet');
ok(greet && greet.kind === 'func', 'greet is a func');
ok(greet && greet.args.length === 1 && greet.args[0].name === 'name', 'greet arg word = name');
ok(greet && greet.args[0].type === 'string!', 'greet arg type hint = string!');

const factorial = fn('factorial');
ok(factorial && factorial.args.length === 1 && factorial.args[0].name === 'n', 'factorial arg word = n');
ok(factorial && factorial.args[0].type === 'integer!', 'factorial arg type hint = integer!');

// Contexts / objects — top level only (inner methods must NOT leak as top-level functions)
ok(objects.some((o) => o.name === 'person' && o.kind === 'context'), 'person is a context');
ok(objects.some((o) => o.name === 'math-utils' && o.kind === 'object'), 'math-utils is an object');
ok(!fn('area') && !fn('circumference'), 'object methods not leaked as top-level functions');

// Not name-only: at least one function actually carries arg words with type hints
ok(functions.some((f) => f.args.some((a) => a.type)), 'functions carry typed arg words (not name-only)');

console.log(failed ? `\n${failed} failed` : '\nall red-lang assertions passed');
process.exit(failed ? 1 : 0);
