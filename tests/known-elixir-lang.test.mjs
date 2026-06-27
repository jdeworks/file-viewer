// Depth test for the Elixir known view: must capture REAL structure (function param names + arity,
// def vs defp, guards, directives, structs, @spec typespecs, @callback) — not just names.
// Pure (analyzeElixir is DOM-free). Real fixture = the committed sample.ex; an inline fixture covers
// the constructs sample.ex lacks (defstruct / @spec / @callback / defmacro / require).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeElixir } from '../docs/types/text/known/elixir-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.ex'), 'utf8');

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };

// --- real sample: MyApp.Calculator ----------------------------------------
const a = analyzeElixir(sample);
const fn = (n, ar) => a.functions.find((f) => f.name === n && (ar == null || f.arity === ar));

ok(a.modules.some((m) => m.name === 'MyApp.Calculator'), 'module MyApp.Calculator');

const add = fn('add', 2);
ok(add && add.params[0] === 'a' && add.params[1] === 'b', 'def add(a, b): param names captured');
ok(add && add.arity === 2 && add.private === false, 'add/2 public, arity 2');

const vn = fn('validate_number');
ok(vn && vn.private === true, 'defp validate_number marked private');
ok(vn && vn.guard === true, 'validate_number guard (when) detected');

// tuple-pattern params must not be split on inner commas
const fr = fn('format_result', 1);
ok(fr && fr.arity === 1, 'format_result({:ok, val}) arity 1 (paren/brace-aware split)');

// directives: alias / import / use
ok(a.directives.some((d) => d.kind === 'alias' && d.target === 'MyApp.Logger'), 'alias directive');
ok(a.directives.some((d) => d.kind === 'import' && d.target === 'Enum'), 'import directive');
ok(a.directives.some((d) => d.kind === 'use' && d.target === 'GenServer'), 'use directive');

ok(a.functions.some((f) => !f.private) && a.functions.some((f) => f.private), 'both def and defp present');

// --- inline fixture: structs / @spec / @callback / defmacro / require ------
const fixture = `
defmodule Foo do
  @behaviour MyBehaviour
  require Logger
  defstruct [:name, age: 0]

  @callback handle(term) :: :ok

  @spec add(integer, integer) :: integer
  def add(a, b), do: a + b

  defp helper(x) when is_integer(x), do: x * 2

  defmacro my_macro(expr) do
    quote do: unquote(expr)
  end
end
`;
const b = analyzeElixir(fixture);

ok(b.structs.length === 1 && b.structs[0].fields.includes('name') && b.structs[0].fields.includes('age'),
  'defstruct fields [:name, age: 0] → name, age');
const spec = b.typespecs.find((t) => t.kind === 'spec' && t.name === 'add');
ok(spec && spec.params.length === 2 && spec.returns === 'integer', '@spec add(integer, integer) :: integer');
ok(b.callbacks.some((c) => c.name === 'handle'), '@callback handle captured');
ok(b.behaviours.includes('MyBehaviour'), '@behaviour captured');
ok(b.directives.some((d) => d.kind === 'require' && d.target === 'Logger'), 'require directive');
ok(b.macros.some((m) => m.name === 'my_macro' && m.arity === 1), 'defmacro my_macro/1');
ok(b.functions.some((f) => f.name === 'helper' && f.private && f.guard), 'defp helper guard detected');

console.log(failed ? `\n${failed} failed` : '\nall elixir-lang assertions passed');
process.exit(failed ? 1 : 0);
