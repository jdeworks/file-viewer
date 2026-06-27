// Depth test for the Swift known view: must capture TYPED signatures (params with labels + types,
// return types), type conformances and grouped members — not just names. Pure (analyzeSwift is
// DOM-free). Fixture = the committed docs/examples/sample.swift.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeSwift } from '../docs/types/text/known/swift-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.swift'), 'utf8');
const { imports, types, functions } = analyzeSwift(sample);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const type = (n) => types.find((t) => t.name === n && t.kind !== 'extension');
const allFuncs = [...functions, ...types.flatMap((t) => t.members.methods)];
const fn = (n) => allFuncs.find((f) => f.name === n);

ok(imports.includes('Foundation') && imports.includes('SwiftUI') && imports.includes('Combine'), 'imports captured');

// struct with conformances + typed stored property + computed property
const coord = type('Coordinate');
ok(coord && coord.kind === 'struct', 'Coordinate is a struct');
ok(coord && coord.inherits.includes('Codable') && coord.inherits.includes('Equatable'), 'Coordinate : Codable, Equatable');
ok(coord && coord.members.properties.some((p) => p.name === 'latitude' && p.type === 'Double' && p.kind === 'let'), 'Coordinate.latitude: Double');
ok(coord && coord.members.properties.some((p) => p.name === 'isValid' && p.type === 'Bool' && p.computed), 'Coordinate.isValid computed Bool');

// class with conformance, init with typed param, async method, and a method with a TYPED signature
const vm = type('MapViewModel');
ok(vm && vm.kind === 'class' && vm.inherits.includes('ObservableObject'), 'MapViewModel class : ObservableObject');
ok(vm && vm.members.inits.length === 1 && vm.members.inits[0].params[0]
   && vm.members.inits[0].params[0].name === 'provider' && vm.members.inits[0].params[0].type === 'LocationProvider', 'MapViewModel init(provider: LocationProvider)');

const dist = fn('distance');
ok(dist && dist.returns === 'Double?', 'distance(...) -> Double?');
ok(dist && dist.params.length === 1 && dist.params[0].label === 'to' && dist.params[0].name === 'dest' && dist.params[0].type === 'Coordinate',
   'distance external label "to", internal "dest", type Coordinate');

const fetch = fn('fetchLocation');
ok(fetch && fetch.async && fetch.params.length === 0, 'fetchLocation() is async');

// enum with raw-type + protocol conformances and cases
const tm = type('TransportMode');
ok(tm && tm.kind === 'enum' && tm.inherits.includes('String') && tm.inherits.includes('CaseIterable') && tm.inherits.includes('Codable'), 'TransportMode enum : String, CaseIterable, Codable');
ok(tm && tm.members.cases.length === 4 && tm.members.cases.some((c) => c.name === 'walking'), 'TransportMode has 4 cases incl. walking');

// protocol method requirement carrying async + throws (no body)
const lp = type('LocationProvider');
ok(lp && lp.kind === 'protocol' && lp.members.methods.some((m) => m.name === 'requestPermission' && m.async && m.throws), 'protocol method requestPermission() async throws');

// extension captured as its own entry
ok(types.some((t) => t.kind === 'extension' && t.name === 'Coordinate'), 'extension Coordinate captured');

// property wrappers (attributes) recognised — switch cases inside bodies must NOT leak as enum cases
const otherEnumCases = types.filter((t) => t.kind !== 'enum').reduce((a, t) => a + t.members.cases.length, 0);
ok(otherEnumCases === 0, 'no spurious cases on non-enum types (switch cases not leaked)');

// not name-only: at least one function carries typed params (labels + types)
ok(allFuncs.some((f) => f.params.some((p) => p.type)), 'functions carry typed params (not name-only)');

console.log(failed ? `\n${failed} failed` : '\nall swift-lang assertions passed');
process.exit(failed ? 1 : 0);
