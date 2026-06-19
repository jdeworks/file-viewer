import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { REGISTRY } from '../docs/core/registry.js';
import { KNOWN } from '../docs/known/registry.js';

const VALID_PREVIEW_DEPTHS  = new Set(['rich', 'basic', 'partial', 'structure-only', 'metadata-only', 'none']);
const VALID_METADATA_DEPTHS = new Set(['rich', 'basic', 'partial', 'none']);
const VALID_EDIT_CAPS       = new Set(['full', 'basic', 'none']);
const VALID_EXPORT_CAPS     = new Set(['transform', 'download', 'none']);
const VALID_TEST_COVERAGE   = new Set(['smoke+unit', 'smoke', 'unit-only', 'none']);
const VALID_SAMPLE_SOURCES  = new Set(['real-world', 'derived', 'synthetic', 'partial-fixture']);

const compatibility = JSON.parse(await readFile(new URL('../docs/examples/compatibility.json', import.meta.url), 'utf8'));
const examples = JSON.parse(await readFile(new URL('../docs/examples/index.json', import.meta.url), 'utf8'));
const catalogFiles = new Set(examples.map((entry) => entry.file));

assert.equal(compatibility.version, 2);
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
  assert.ok(VALID_PREVIEW_DEPTHS.has(row.previewDepth), `invalid previewDepth for type ${type.id}`);
  assert.ok(VALID_METADATA_DEPTHS.has(row.metadataDepth), `invalid metadataDepth for type ${type.id}`);
  assert.ok(VALID_EDIT_CAPS.has(row.editCapability), `invalid editCapability for type ${type.id}`);
  assert.ok(VALID_EXPORT_CAPS.has(row.exportCapability), `invalid exportCapability for type ${type.id}`);
  assert.ok(VALID_TEST_COVERAGE.has(row.testCoverage), `invalid testCoverage for type ${type.id}`);
  assert.ok(VALID_SAMPLE_SOURCES.has(row.sampleSource), `invalid sampleSource for type ${type.id}`);
  assert.equal(typeof row.needsRealWorldSample, 'boolean', `needsRealWorldSample must be boolean for type ${type.id}`);
  assert.ok(row.fileExamplesSlug === null || typeof row.fileExamplesSlug === 'string', `fileExamplesSlug must be string or null for type ${type.id}`);
  assert.ok(Array.isArray(row.securityLimitations), `securityLimitations must be array for type ${type.id}`);
  assert.ok(Array.isArray(row.knownParserGaps), `knownParserGaps must be array for type ${type.id}`);
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
  assert.ok(VALID_PREVIEW_DEPTHS.has(row.previewDepth), `invalid previewDepth for known file ${known.id}`);
  assert.ok(VALID_METADATA_DEPTHS.has(row.metadataDepth), `invalid metadataDepth for known file ${known.id}`);
  assert.ok(VALID_EDIT_CAPS.has(row.editCapability), `invalid editCapability for known file ${known.id}`);
  assert.ok(VALID_EXPORT_CAPS.has(row.exportCapability), `invalid exportCapability for known file ${known.id}`);
  assert.ok(VALID_TEST_COVERAGE.has(row.testCoverage), `invalid testCoverage for known file ${known.id}`);
  assert.ok(VALID_SAMPLE_SOURCES.has(row.sampleSource), `invalid sampleSource for known file ${known.id}`);
  assert.equal(typeof row.needsRealWorldSample, 'boolean', `needsRealWorldSample must be boolean for known file ${known.id}`);
  assert.ok(Array.isArray(row.securityLimitations), `securityLimitations must be array for known file ${known.id}`);
  assert.ok(Array.isArray(row.knownParserGaps), `knownParserGaps must be array for known file ${known.id}`);
}

const extraTypeRows = Object.keys(compatibility.types).filter((id) => !REGISTRY.some((type) => type.id === id));
assert.deepEqual(extraTypeRows, [], 'compatibility has rows for unregistered types');

const extraKnownRows = Object.keys(compatibility.knownFiles).filter((id) => !KNOWN.some((known) => known.id === id));
assert.deepEqual(extraKnownRows, [], 'compatibility has rows for unknown known-file enhancers');

console.log('example compatibility: ok');
