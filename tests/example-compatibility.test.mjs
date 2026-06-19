import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { REGISTRY } from '../docs/core/registry.js';
import { KNOWN } from '../docs/known/registry.js';

const compatibility = JSON.parse(await readFile(new URL('../docs/examples/compatibility.json', import.meta.url), 'utf8'));
const examples = JSON.parse(await readFile(new URL('../docs/examples/index.json', import.meta.url), 'utf8'));
const catalogFiles = new Set(examples.map((entry) => entry.file));

assert.equal(compatibility.version, 1);
assert.ok(compatibility.types && typeof compatibility.types === 'object');
assert.ok(compatibility.knownFiles && typeof compatibility.knownFiles === 'object');

for (const type of REGISTRY) {
  const row = compatibility.types[type.id];
  assert.ok(row, `missing compatibility row for type ${type.id}`);
  assert.equal(row.label, type.label, `label drift for type ${type.id}`);
  assert.ok(Array.isArray(row.sampleFiles) && row.sampleFiles.length, `missing samples for type ${type.id}`);
  assert.ok(row.capabilities && typeof row.capabilities === 'object', `missing capabilities for type ${type.id}`);
  for (const file of row.sampleFiles) {
    assert.ok(catalogFiles.has(file), `type ${type.id} references unknown sample ${file}`);
  }
}

for (const known of KNOWN) {
  const row = compatibility.knownFiles[known.id];
  assert.ok(row, `missing compatibility row for known file ${known.id}`);
  assert.equal(row.label, known.label, `label drift for known file ${known.id}`);
  assert.ok(row.baseType, `missing base type for known file ${known.id}`);
  assert.ok(Array.isArray(row.sampleFiles) && row.sampleFiles.length, `missing sample for known file ${known.id}`);
  for (const file of row.sampleFiles) {
    assert.ok(catalogFiles.has(file), `known file ${known.id} references unknown sample ${file}`);
  }
}

const extraTypeRows = Object.keys(compatibility.types).filter((id) => !REGISTRY.some((type) => type.id === id));
assert.deepEqual(extraTypeRows, [], 'compatibility has rows for unregistered types');

const extraKnownRows = Object.keys(compatibility.knownFiles).filter((id) => !KNOWN.some((known) => known.id === id));
assert.deepEqual(extraKnownRows, [], 'compatibility has rows for unknown known-file enhancers');

console.log('example compatibility: ok');
