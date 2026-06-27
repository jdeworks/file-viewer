// Depth test for the Clojure known view: must capture REAL structure (namespace, requires with
// aliases, function defs WITH param vectors + arity, defs, records/protocols, multi-arity), not a
// flat name list. Pure (analyzeClojure is DOM-free). Fixture = the committed sample.clj.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeClojure } from '../docs/types/text/known/clojure-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.clj'), 'utf8');
const { namespace, requires, functions, defs, macros, protocols, records } = analyzeClojure(sample);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const fn = (n) => functions.find((f) => f.name === n);

// namespace + requires (with :as alias)
ok(namespace === 'myapp.core', 'namespace = myapp.core');
const strReq = requires.find((r) => r.ns === 'clojure.string');
ok(strReq && strReq.alias === 'str', 'require clojure.string :as str');
ok(requires.some((r) => r.ns === 'clojure.set'), 'require clojure.set');

// defn with a real param vector (names + arity)
const add = fn('add');
ok(add && add.params.length === 2 && add.params[0] === 'a' && add.params[1] === 'b', 'defn add captures params [a b]');
ok(add && add.arity === 2 && !add.variadic, 'defn add arity = 2, not variadic');

// variadic defn: (defn -main [& args] ...)
const main = fn('-main');
ok(main && main.variadic && main.params.includes('args'), '-main is variadic with rest arg');

// single-arg fns
ok(fn('greet-person') && fn('greet-person').params[0] === 'person', 'greet-person [person]');
ok(fn('process-items') && fn('process-items').arity === 1, 'process-items arity 1');

// defs / vars (def + defonce)
ok(defs.some((d) => d.name === 'app-version'), 'def app-version captured');
ok(defs.some((d) => d.name === 'request-count'), 'defonce request-count captured');

// defmacro with params
const wl = macros.find((m) => m.name === 'with-logging');
ok(wl && wl.variadic && wl.params.includes('label'), 'defmacro with-logging [label & body]');

// defrecord with fields
const person = records.find((r) => r.name === 'Person');
ok(person && person.kind === 'defrecord' && person.fields.join(' ') === 'name age email', 'defrecord Person [name age email]');

// defprotocol with methods
const greetable = protocols.find((p) => p.name === 'Greetable');
ok(greetable && greetable.methods.some((me) => me.name === 'greet') && greetable.methods.some((me) => me.name === 'farewell'),
  'defprotocol Greetable has greet + farewell methods');

// structure, not name-only: at least one function carries named params
ok(functions.some((f) => f.params.length > 0), 'functions carry param names (not name-only)');

// multi-arity detection on an inline fixture
const multi = analyzeClojure('(ns t)\n(defn area\n  ([r] (* 3.14 r r))\n  ([w h] (* w h)))');
const area = multi.functions.find((f) => f.name === 'area');
ok(area && area.multiArity && area.arities.length === 2, 'multi-arity defn detected (area: [r] and [w h])');

console.log(failed ? `\n${failed} failed` : '\nall clojure-lang assertions passed');
process.exit(failed ? 1 : 0);
