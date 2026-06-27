// Depth test for the Verilog/SystemVerilog known view: must capture typed PORTS (direction + width),
// parameters, internal signals and behavior — not just module names. Pure (analyzeVerilog is DOM-free).
// Fixture = the committed sample.v.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeVerilog } from '../docs/types/text/known/verilog/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.v'), 'utf8');
const { modules } = analyzeVerilog(sample);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const mod = (n) => modules.find((m) => m.name === n);
const port = (m, n) => (m ? m.ports.find((p) => p.name === n) : null);

ok(modules.length === 2, `two modules parsed (got ${modules.length})`);

// ── counter: ANSI-style typed port header ──
const counter = mod('counter');
ok(!!counter, 'module counter found');
ok(counter && counter.ports.length === 5, `counter has 5 ports (got ${counter && counter.ports.length})`);

const clk = port(counter, 'clk');
ok(clk && clk.dir === 'input' && clk.type === 'wire', 'port clk: input wire');

const count = port(counter, 'count');
ok(count && count.dir === 'output' && count.type === 'reg' && count.width === '[3:0]',
  'port count: output reg [3:0] (direction + type + width)');

const overflow = port(counter, 'overflow');
ok(overflow && overflow.dir === 'output' && overflow.type === 'wire', 'port overflow: output wire');

// parameters: parameter WIDTH=4, localparam MAX_COUNT=...
ok(counter && counter.parameters.some((p) => p.name === 'WIDTH' && !p.local && p.value === '4'),
  'parameter WIDTH = 4');
ok(counter && counter.parameters.some((p) => p.name === 'MAX_COUNT' && p.local),
  'localparam MAX_COUNT captured');

// behavior: one always block (with sensitivity), one continuous assign
ok(counter && counter.always.length === 1 && /posedge clk/.test(counter.always[0].sensitivity),
  'counter: 1 always block with posedge clk sensitivity');
ok(counter && counter.assigns === 1, `counter: 1 continuous assign (got ${counter && counter.assigns})`);

// ── mux2to1: internal signals ──
const mux = mod('mux2to1');
ok(!!mux, 'module mux2to1 found');
ok(mux && mux.ports.length === 4, `mux2to1 has 4 ports (got ${mux && mux.ports.length})`);
ok(mux && mux.signals.length === 3 && mux.signals.every((s) => s.type === 'wire'),
  'mux2to1: 3 internal wire signals (nsel/sel_a/sel_b)');
ok(mux && mux.signals.some((s) => s.name === 'nsel'), 'internal signal nsel captured');
ok(mux && mux.assigns === 4, `mux2to1: 4 continuous assigns (got ${mux && mux.assigns})`);

// ── not name-only: ports carry real direction + at least one width, not just names ──
const allPorts = modules.flatMap((m) => m.ports);
ok(allPorts.every((p) => p.dir === 'input' || p.dir === 'output' || p.dir === 'inout'),
  'every port carries a real direction (not name-only)');
ok(allPorts.some((p) => p.width), 'at least one port carries a bit-width range');

console.log(failed ? `\n${failed} failed` : '\nall verilog assertions passed');
process.exit(failed ? 1 : 0);
