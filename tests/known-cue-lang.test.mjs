// Depth test for the CUE known view: must capture REAL structure — definitions WITH their typed
// fields (name + type/constraint + optional marker), distinguished from concrete values — not just
// names. Pure (analyzeCue is DOM-free). Fixture = the committed sample.cue, plus a tiny inline
// fixture for the optional-field marker (the sample has no `?` field).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeCue } from '../docs/types/text/known/cue-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.cue'), 'utf8');
const { package: pkg, imports, definitions, fields } = analyzeCue(sample);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const def = (n) => definitions.find((d) => d.name === n);

// package + imports
ok(pkg === 'webservice', 'package name = webservice');
ok(imports.includes('strings') && imports.includes('net'), 'imports captured (strings, net)');

// definitions WITH typed fields
const svc = def('#Service');
ok(svc, 'definition #Service captured');
ok(svc && svc.fields.length === 5, '#Service has 5 fields');
const port = svc && svc.fields.find((f) => f.name === 'port');
ok(port && /int/.test(port.type) && />=1024/.test(port.type), '#Service.port typed `int & >=1024 & <=65535`');
ok(svc && svc.fields.find((f) => f.name === 'name' && /string/.test(f.type)), '#Service.name typed string');

const cfg = def('#Config');
ok(cfg, 'definition #Config captured');
const logLevel = cfg && cfg.fields.find((f) => f.name === 'logLevel');
ok(logLevel && /\|/.test(logLevel.type), '#Config.logLevel keeps disjunction constraint');

// concrete value vs definition: `config: #Config & {...}` is a top-level field, not a definition
ok(fields.some((f) => f.name === 'config'), 'concrete field `config` captured (not a definition)');
ok(!definitions.some((d) => d.name === 'config'), 'concrete `config` not misclassified as definition');

// not name-only: at least one definition field carries a real type/constraint
ok(definitions.some((d) => d.fields.some((f) => f.type)), 'definition fields carry typed constraints (not name-only)');

// optional-field marker — inline fixture (sample.cue has no `?` field)
const inline = `package demo
#Schema: {
	name:  string
	port:  int & >0
	host?: string
}
addr: "0.0.0.0"
`;
const r = analyzeCue(inline);
const schema = r.definitions.find((d) => d.name === '#Schema');
ok(r.package === 'demo', 'inline: package captured');
ok(schema && schema.fields.length === 3, 'inline: #Schema has 3 fields');
const host = schema && schema.fields.find((f) => f.name === 'host');
ok(host && host.optional === true && /string/.test(host.type), 'inline: optional field `host?: string` flagged optional + typed');
ok(schema && schema.fields.find((f) => f.name === 'port' && /int/.test(f.type) && f.optional === false), 'inline: required field `port` typed, not optional');

console.log(failed ? `\n${failed} failed` : '\nall cue-lang assertions passed');
process.exit(failed ? 1 : 0);
