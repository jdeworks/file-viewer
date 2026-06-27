// Depth test for the Lua known view: must capture REAL structure — function param names/arity,
// `:` methods (owner + implicit-self flag), vararg, requires, locals, and module-table assignments,
// not just names. Pure (analyzeLua is DOM-free). Fixture = the committed sample.lua.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeLua } from '../docs/types/text/known/lua-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.lua'), 'utf8');
const { requires, functions, locals, assignments, hasModuleReturn } = analyzeLua(sample);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const fn = (name, owner) => functions.find((f) => f.name === name && (owner === undefined || f.owner === owner));

// requires (require "..." with dotted module paths)
ok(requires.includes('json') && requires.includes('utils.helpers') && requires.includes('socket.http'),
   'requires captured: json, utils.helpers, socket.http');

// global function WITH its param names/arity: greet(who)
const greet = fn('greet');
ok(greet && !greet.local && !greet.owner && greet.params.length === 1 && greet.params[0] === 'who',
   'global function greet(who) — param name captured');

// `:` method WITH owner + method flag (implicit self): Animal:speak()
const speak = fn('speak', 'Animal');
ok(speak && speak.method === true && speak.owner === 'Animal' && speak.params.length === 0,
   'method Animal:speak() — owner + method flag (implicit self)');

// `:` method with params: Animal:new(name, sound)
const anew = fn('new', 'Animal');
ok(anew && anew.method === true && anew.params.length === 2 && anew.params[0] === 'name' && anew.params[1] === 'sound',
   'method Animal:new(name, sound) — param names + arity');

// local function with multiple params: clamp(value, min, max)
const clamp = fn('clamp');
ok(clamp && clamp.local === true && clamp.params.length === 3 && clamp.params[2] === 'max',
   'local function clamp(value, min, max) — local flag + params');

// local variable declaration: config / json
ok(locals.includes('config') && locals.includes('json'), 'local variables captured (config, json)');

// module-table assignment: Animal.__index = Animal
ok(assignments.some((a) => a.owner === 'Animal' && a.field === '__index'),
   'table assignment Animal.__index captured');

// module return table
ok(hasModuleReturn === true, 'module return table detected');

// vararg + implicit-self via an inline fixture (sample has no vararg)
const extra = analyzeLua('local function fmt(prefix, ...) end\nfunction M:run(x) end\nlocal y = require "mod"');
const fmt = extra.functions.find((f) => f.name === 'fmt');
const run = extra.functions.find((f) => f.name === 'run');
ok(fmt && fmt.vararg === true && fmt.params.length === 1 && fmt.params[0] === 'prefix',
   'vararg fn fmt(prefix, ...) — vararg flag set, ... excluded from params');
ok(run && run.method === true && run.owner === 'M', 'inline M:run — owner M + method flag');
ok(extra.requires.includes('mod'), 'require "mod" (no parens) captured');

console.log(failed ? `\n${failed} failed` : '\nall lua-lang assertions passed');
process.exit(failed ? 1 : 0);
