// Depth test for the Ada known view: must capture subprogram SIGNATURES (typed params + return type),
// not just names. Pure (analyzeAda is DOM-free). Fixture = the committed sample.ads.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeAda } from '../docs/types/text/known/ada-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.ads'), 'utf8');
const { unitName, withs, procedures, functions, types, pragmas } = analyzeAda(sample);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const proc = (n) => procedures.find((p) => p.name === n);
const func = (n) => functions.find((f) => f.name === n);

ok(unitName === 'Sample_Collections', 'package name');
ok(withs.includes('Ada.Strings.Unbounded') && withs.length >= 3, 'with clauses');

// multi-line function signature: Create_Element(Name : String; Priority : Priority_Level) return Element_Id
const ce = func('Create_Element');
ok(ce && ce.returns === 'Element_Id', 'Create_Element return type = Element_Id');
ok(ce && ce.params.length === 2 && /Name/.test(ce.params[0].names) && ce.params[0].type === 'String'
   && ce.params[0].mode === 'in', 'Create_Element first param: Name : in String');
ok(ce && ce.params[1].type === 'Priority_Level', 'Create_Element second param typed Priority_Level');

// function with shared-name params: Distance(A, B : Point_Record) return Float
const dist = func('Distance');
ok(dist && dist.returns === 'Float' && /A, B/.test(dist.params[0].names) && dist.params[0].type === 'Point_Record', 'Distance(A, B : Point_Record) return Float');

// procedure with in out mode
const su = proc('Update_Status');
ok(su && su.params.length === 2 && su.params[0].type === 'Element_Id', 'Update_Status typed params');

// types with kinds
ok(types.some((t) => t.name === 'Status_Type' && t.kind === 'enum'), 'enum type Status_Type');
ok(types.some((t) => t.name === 'Point_Record' && t.kind === 'record'), 'record type Point_Record');
ok(types.some((t) => t.name === 'Matrix' && t.kind === 'array'), 'array type Matrix');
ok(pragmas.includes('Pure'), 'pragma captured');

// not name-only: at least one subprogram actually carries typed params
ok([...procedures, ...functions].some((s) => s.params.some((p) => p.type)), 'signatures carry typed params (not name-only)');

console.log(failed ? `\n${failed} failed` : '\nall ada-lang assertions passed');
process.exit(failed ? 1 : 0);
