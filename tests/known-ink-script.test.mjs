// Depth test for the Ink known view: must capture REAL structure (knots with stitches, functions
// WITH params, VAR/CONST with values, includes, diverts) — not just names. Pure (analyzeInk is
// DOM-free). Fixture = the committed sample.ink.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeInk } from '../docs/types/text/known/ink-script/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.ink'), 'utf8');
const facts = analyzeInk(sample);
const { knots, functions, variables, lists, includes, externals, divertTargets, choiceCount, stitchCount } = facts;

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const knot = (n) => knots.find((k) => k.name === n);
const fn = (n) => functions.find((f) => f.name === n);
const v = (n) => variables.find((x) => x.name === n);

// Knots captured as structural units
ok(knots.length >= 8, `knots captured (${knots.length})`);
ok(!!knot('start'), 'knot: start');
ok(!!knot('lighthouse_exterior'), 'knot: lighthouse_exterior');

// Stitches nested under their owning knot (real structure, not flat names)
const inn = knot('village_inn');
ok(inn && inn.stitches.includes('meet_fishermen') && inn.stitches.includes('callum_conversation'),
   'stitches nested under village_inn');
ok(stitchCount >= 3, `stitch count (${stitchCount})`);

// Function WITH params
const clamp = fn('clamp_suspicion');
ok(clamp && clamp.params.length === 3 && clamp.params[0] === 'val' && clamp.params[2] === 'max_val',
   'function clamp_suspicion(val, min_val, max_val) with params');
// the function header must NOT be misread as a knot
ok(!knot('clamp_suspicion'), 'function not double-counted as a knot');

// VAR with value
const susp = v('suspicion');
ok(susp && susp.kind === 'VAR' && susp.value === '0', 'VAR suspicion = 0');
const name = v('playerName');
ok(name && name.value === '"Alex"', 'VAR playerName = "Alex" (value preserved)');

// Includes
ok(includes.includes('prologue.ink') && includes.includes('characters.ink'), 'INCLUDE files');

// Choices and diverts (real edges)
ok(choiceCount >= 8, `choices counted (${choiceCount})`);
ok(divertTargets.includes('lighthouse_exterior') && divertTargets.includes('END'),
   'divert targets captured (incl. END)');

// Sanity: not name-only — at least one knot carries stitches and one fn carries params
ok(knots.some((k) => k.stitches.length) && functions.some((f) => f.params.length),
   'structure carries stitches + typed-ish params (not name-only)');

console.log(failed ? `\n${failed} failed` : '\nall ink-script assertions passed');
process.exit(failed ? 1 : 0);
