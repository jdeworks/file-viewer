// Depth test for the Pascal known view: must capture routine SIGNATURES (typed params + return type),
// record types with typed fields, and enums — not just names. Pure (analyzePascal is DOM-free).
// Fixture = the committed docs/examples/sample.pas.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzePascal } from '../docs/types/text/known/pascal-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.pas'), 'utf8');
const { unit, uses, routines, types, consts, vars } = analyzePascal(sample);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const routine = (n) => routines.find((r) => r.name === n || r.name.split('.').pop() === n);
const type = (n) => types.find((t) => t.name === n);

ok(unit === 'Greeter', 'unit name = Greeter');
ok(uses.includes('SysUtils') && uses.includes('Classes') && uses.length >= 3, 'uses clause imports');

// function with typed params + return type: Add(A, B: Integer): Integer
const add = routine('Add');
ok(add && add.kind === 'function' && add.returns === 'Integer', 'function Add returns Integer');
ok(add && add.params.length === 1 && /A, B/.test(add.params[0].names) && add.params[0].type === 'Integer',
   'Add shared-type params A, B: Integer');

// another function with a typed record param + return type: Distance(const P, Q: TPoint): Real
const dist = routine('Distance');
ok(dist && dist.kind === 'function' && dist.returns === 'Real', 'function Distance returns Real');
ok(dist && /P, Q/.test(dist.params[0].names) && dist.params[0].type === 'TPoint' && dist.params[0].mode === 'const',
   'Distance(const P, Q: TPoint)');

// procedure with a typed param: Greet(const Name: string)
const greet = routine('Greet');
ok(greet && greet.kind === 'procedure' && greet.params.length === 1
   && greet.params[0].type === 'string' && greet.params[0].mode === 'const', 'procedure Greet(const Name: string)');

// procedure with no params: ResetCount
const reset = routine('ResetCount');
ok(reset && reset.kind === 'procedure' && reset.params.length === 0, 'procedure ResetCount (no params)');

// constructor captured
ok(routines.some((r) => r.kind === 'constructor'), 'constructor captured');

// record type with typed fields
const point = type('TPoint');
ok(point && point.kind === 'record', 'record type TPoint');
ok(point && point.fields.some((f) => /X, Y/.test(f.names) && f.type === 'Real')
   && point.fields.some((f) => f.type === 'TColor'), 'TPoint fields: X, Y: Real and Color: TColor');

// enum type with values
const color = type('TColor');
ok(color && color.kind === 'enum' && color.fields.map((f) => f.names).join(',') === 'clRed,clGreen,clBlue',
   'enum type TColor (clRed, clGreen, clBlue)');

// class type with parent
const person = type('TPerson');
ok(person && person.kind === 'class' && person.parent === 'TObject', 'class TPerson(TObject)');

// const + var sections
ok(consts.some((c) => c.name === 'MaxItems' && c.value === '100'), 'const MaxItems = 100');
ok(consts.some((c) => c.name === 'Version' && c.type === 'string'), 'const Version: string typed');
ok(vars.some((v) => v.names === 'GlobalCount' && v.type === 'Integer'), 'var GlobalCount: Integer');

// not name-only: at least one routine actually carries typed params
ok(routines.some((r) => r.params.some((p) => p.type)), 'signatures carry typed params (not name-only)');

console.log(failed ? `\n${failed} failed` : '\nall pascal-lang assertions passed');
process.exit(failed ? 1 : 0);
