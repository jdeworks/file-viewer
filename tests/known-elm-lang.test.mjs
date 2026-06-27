// Depth test for the Elm known view: must capture REAL structure — function type SIGNATURES (params +
// return), record type aliases with typed fields, and custom types with their variants — not just names.
// Pure (analyzeElm is DOM-free). Fixture = the committed sample.elm.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeElm } from '../docs/types/text/known/elm-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.elm'), 'utf8');
const { module: mod, exposing, imports, functions, aliases, customTypes, ports, teaType } = analyzeElm(sample);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const fn = (n) => functions.find((f) => f.name === n);
const alias = (n) => aliases.find((a) => a.name === n);
const ct = (n) => customTypes.find((t) => t.name === n);

// module + exposing
ok(mod === 'Main', 'module name = Main');
ok(exposing.includes('main'), 'module exposes main');

// imports (with `as` alias and `exposing`)
ok(imports.some((i) => i.name === 'Browser'), 'import Browser');
ok(imports.some((i) => i.name === 'Html.Attributes' && i.alias === 'Attr'), 'import Html.Attributes as Attr');
ok(imports.some((i) => i.name === 'Html' && i.exposing.includes('Html') && i.exposing.includes('div')), 'import Html exposing (...) parsed');

// function SIGNATURES: update : Msg -> Model -> Model
const update = fn('update');
ok(update && update.params.length === 2 && update.params[0] === 'Msg' && update.params[1] === 'Model', 'update params [Msg, Model]');
ok(update && update.returns === 'Model', 'update returns Model');

// view : Model -> Html Msg  (return is a 2-token applied type, kept intact)
const view = fn('view');
ok(view && view.params.length === 1 && view.params[0] === 'Model' && view.returns === 'Html Msg', 'view : Model -> Html Msg');

// record type alias with TYPED fields: Model = { count : Int, label : String }
const model = alias('Model');
ok(model && model.fields.length === 2, 'Model alias has 2 fields');
ok(model && model.fields[0].name === 'count' && model.fields[0].type === 'Int', 'Model.count : Int');
ok(model && model.fields[1].name === 'label' && model.fields[1].type === 'String', 'Model.label : String');

// custom type with VARIANTS: Msg = Increment | Decrement | Reset
const msg = ct('Msg');
ok(msg && msg.variants.length === 3, 'Msg has 3 variants');
ok(msg && msg.variants.map((v) => v.name).join(',') === 'Increment,Decrement,Reset', 'Msg variants named');

// TEA architecture detected
ok(teaType === 'Browser.sandbox', 'TEA type = Browser.sandbox');

// not name-only: at least one function actually carries a parsed multi-param signature
ok(functions.some((f) => f.params.length >= 1 && f.returns), 'signatures carry params + return (not name-only)');

console.log(failed ? `\n${failed} failed` : '\nall elm-lang assertions passed');
process.exit(failed ? 1 : 0);
