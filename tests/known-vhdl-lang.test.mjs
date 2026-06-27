// Depth test for the VHDL known view: must capture REAL hardware structure — entity ports with
// mode+type (not just names), generics with types/defaults, architecture signals. Pure
// (analyzeVHDL is DOM-free). Fixture = the committed sample.vhd.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeVHDL } from '../docs/types/text/known/vhdl-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.vhd'), 'utf8');
const { libraries, uses, entities, architectures } = analyzeVHDL(sample);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const ent = (n) => entities.find((e) => e.name === n);
const arch = (n) => architectures.find((a) => a.name === n);

// library / use clauses
ok(libraries.includes('IEEE'), 'library IEEE');
ok(uses.some((u) => /STD_LOGIC_1164/i.test(u)) && uses.length >= 3, 'use clauses captured');

// entity counter4bit: generic + typed/ranged ports with modes
const c = ent('counter4bit');
ok(!!c, 'entity counter4bit found');
ok(c && c.generics.length === 1 && c.generics[0].name === 'WIDTH'
   && /integer/i.test(c.generics[0].type) && c.generics[0].default === '4',
   'generic WIDTH : integer := 4');
ok(c && c.ports.length === 5, 'counter4bit has 5 ports');
const clk = c && c.ports.find((p) => p.name === 'clk');
ok(clk && clk.mode === 'in' && /STD_LOGIC/i.test(clk.type), 'port clk : in STD_LOGIC');
const count = c && c.ports.find((p) => p.name === 'count');
ok(count && count.mode === 'out' && /STD_LOGIC_VECTOR\(3 downto 0\)/i.test(count.type),
   'port count : out STD_LOGIC_VECTOR(3 downto 0) (ranged type)');

// second entity adder8bit with shared-style ports
const a8 = ent('adder8bit');
ok(a8 && a8.ports.length === 5, 'entity adder8bit has 5 ports');
ok(a8 && a8.ports.find((p) => p.name === 'a').mode === 'in'
   && /STD_LOGIC_VECTOR\(7 downto 0\)/i.test(a8.ports.find((p) => p.name === 'a').type),
   'adder8bit port a : in STD_LOGIC_VECTOR(7 downto 0)');

// architecture behavioral of counter4bit: signals + processes
const beh = arch('behavioral');
ok(beh && beh.entity === 'counter4bit', 'architecture behavioral of counter4bit');
ok(beh && beh.signals.length === 3, 'behavioral declares 3 signals');
ok(beh && beh.signals.find((s) => s.name === 'count_reg')
   && /STD_LOGIC_VECTOR\(3 downto 0\)/i.test(beh.signals.find((s) => s.name === 'count_reg').type),
   'signal count_reg typed STD_LOGIC_VECTOR(3 downto 0)');
ok(beh && beh.processes === 2, 'behavioral has 2 processes');

const df = arch('dataflow');
ok(df && df.entity === 'adder8bit' && df.signals.some((s) => s.name === 'temp'),
   'architecture dataflow of adder8bit with signal temp');

// not name-only: ports carry mode + type, not just a name
ok(entities.every((e) => e.ports.every((p) => p.mode && p.type))
   && entities.some((e) => e.ports.length),
   'ports carry mode + type (not name-only)');

console.log(failed ? `\n${failed} failed` : '\nall vhdl-lang assertions passed');
process.exit(failed ? 1 : 0);
