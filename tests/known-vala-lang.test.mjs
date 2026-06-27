// Depth test for the Vala known view: must capture TYPED signatures (typed params,
// return type, access/modifiers), typed properties, inheritance, signals, generics —
// not just names. Pure (analyzeVala is DOM-free). Fixture = the committed sample.vala
// plus an inline snippet exercising advanced Vala features.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeVala } from '../docs/types/text/known/vala-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.vala'), 'utf8');

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };

// ---- sample.vala ----------------------------------------------------------
const { usings, namespaces, types, functions } = analyzeVala(sample);
const type = (n) => types.find((t) => t.name === n);

ok(usings.includes('GLib') && usings.includes('Gtk'), 'usings: GLib, Gtk');

const hello = type('Hello');
ok(hello && hello.kind === 'class', 'class Hello detected');
ok(hello && hello.bases.includes('Object'), 'class Hello has base : Object');

// property: public string name { get; set; }
const nameProp = hello && hello.properties.find((p) => p.name === 'name');
ok(nameProp && nameProp.type === 'string', 'property name carries type string');
ok(nameProp && nameProp.access === 'public', 'property name access public');
ok(nameProp && nameProp.accessors.includes('get') && nameProp.accessors.includes('set'), 'property name accessors get/set');

// constructor: public Hello (string name)
const ctor = hello && hello.methods.find((m) => m.isConstructor);
ok(ctor && ctor.name === 'Hello' && ctor.params[0] && ctor.params[0].type === 'string', 'constructor Hello(string name)');

// method: public void greet ()
const greet = hello && hello.methods.find((m) => m.name === 'greet' && !m.isConstructor);
ok(greet && greet.returns === 'void' && greet.access === 'public', 'method greet() -> void, public');

// method: public static int main (string[] args)
const main = hello && hello.methods.find((m) => m.name === 'main');
ok(main && main.returns === 'int' && main.access === 'public', 'main() return int, public');
ok(main && main.modifiers.includes('static'), 'main() is static');
ok(main && main.params.length === 1 && main.params[0].type === 'string[]' && main.params[0].name === 'args', 'main(string[] args) typed param');

// interface with abstract method
const greeter = type('Greeter');
ok(greeter && greeter.kind === 'interface', 'interface Greeter detected');
ok(greeter && greeter.methods.some((m) => m.name === 'greet' && m.modifiers.includes('abstract')), 'interface abstract method greet()');

// enum members
const color = type('Color');
ok(color && color.kind === 'enum', 'enum Color detected');
ok(color && ['RED', 'GREEN', 'BLUE'].every((m) => color.enumMembers.includes(m)), 'enum Color members RED/GREEN/BLUE');

// not name-only: at least one method carries typed params
ok(types.some((t) => t.methods.some((m) => m.params.some((p) => p.type))), 'methods carry typed params (not name-only)');

// ---- advanced inline snippet ---------------------------------------------
const adv = analyzeVala(`
namespace App {
  public struct Point { public int x; public int y; }

  public class Stack<G> : Object, Gee.Iterable<G> {
    public signal void changed (int count);
    private int _size = 0;
    public int size { get; private set; }

    public void push (owned G item, ref int counter) throws IOError {
      _size++;
    }
    public static G map<T> (T input, out bool ok) {
      ok = true;
      return input;
    }
  }

  public errordomain MyError { FOO, BAR }

  void helper (int a, string b = "x") {
    print (b);
  }
}
`);

ok(adv.namespaces.includes('App'), 'namespace App detected');

const point = adv.types.find((t) => t.name === 'Point');
ok(point && point.kind === 'struct' && point.fields.some((f) => f.name === 'x' && f.type === 'int'), 'struct Point with typed field x:int');

const stack = adv.types.find((t) => t.name === 'Stack');
ok(stack && stack.generics === '<G>', 'class Stack generics <G>');
ok(stack && stack.bases.includes('Object') && stack.bases.some((b) => b.startsWith('Gee.Iterable')), 'class Stack bases Object, Gee.Iterable<G>');

const changed = stack && stack.signals.find((s) => s.name === 'changed');
ok(changed && changed.params[0] && changed.params[0].type === 'int', 'signal changed(int count)');

const sizeProp = stack && stack.properties.find((p) => p.name === 'size');
ok(sizeProp && sizeProp.type === 'int', 'property size:int (with private set accessor)');

const push = stack && stack.methods.find((m) => m.name === 'push');
ok(push && push.params[0].mod === 'owned' && push.params[0].type === 'G', 'push() owned G param modifier');
ok(push && push.params[1].mod === 'ref' && push.throws.includes('IOError'), 'push() ref param + throws IOError');

const map = stack && stack.methods.find((m) => m.name === 'map');
ok(map && map.generics === '<T>' && map.modifiers.includes('static') && map.params.some((p) => p.mod === 'out'), 'static map<T>() with out param');

const myErr = adv.types.find((t) => t.name === 'MyError');
ok(myErr && myErr.kind === 'errordomain' && myErr.enumMembers.includes('FOO'), 'errordomain MyError members');

const helper = adv.functions.find((f) => f.name === 'helper');
ok(helper && helper.params.length === 2 && helper.params[1].name === 'b' && helper.params[1].type === 'string', 'namespace function helper(int a, string b) typed params');
ok(helper && helper.params[1].def, 'namespace function helper param has a default value');

console.log(failed ? `\n${failed} failed` : '\nall vala-lang assertions passed');
process.exit(failed ? 1 : 0);
