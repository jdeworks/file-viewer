import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { intakeFromBytes } from '../docs/core/intake.js';
import { REGISTRY } from '../docs/core/registry.js';
import { KNOWN } from '../docs/known/registry.js';

const VALID_PREVIEW_DEPTHS  = new Set(['rich', 'basic', 'partial', 'structure-only', 'metadata-only', 'none']);
const VALID_METADATA_DEPTHS = new Set(['rich', 'basic', 'partial', 'none']);
const VALID_EDIT_CAPS       = new Set(['full', 'basic', 'none']);
const VALID_EXPORT_CAPS     = new Set(['transform', 'download', 'none']);
const VALID_TEST_COVERAGE   = new Set(['smoke+unit', 'smoke', 'unit-only', 'none']);
const VALID_SAMPLE_SOURCES  = new Set(['real-world', 'derived', 'synthetic', 'partial-fixture']);
const VALID_REAL_WORLD_QUALITY = new Set(['sourced-or-derived', 'catalog-fixture-set', 'partial-fixture']);

const compatibility = JSON.parse(await readFile(new URL('../docs/examples/compatibility.json', import.meta.url), 'utf8'));
const examples = JSON.parse(await readFile(new URL('../docs/examples/index.json', import.meta.url), 'utf8'));
const catalogFiles = new Set(examples.map((entry) => entry.file));
const examplesByFile = new Map(examples.map((entry) => [entry.file, entry]));
const intakeCache = new Map();

async function intakeFor(file) {
  if (!intakeCache.has(file)) {
    const example = examplesByFile.get(file);
    const bytes = new Uint8Array(await readFile(new URL(`../docs/examples/${file}`, import.meta.url)));
    intakeCache.set(file, intakeFromBytes(bytes, file, example?.mime || ''));
  }
  return intakeCache.get(file);
}

function rankingFor(intake, enableEmulators = false) {
  const ranking = REGISTRY.map((type) => {
    let score = 0;
    try { score = Math.max(0, Math.min(1, type.detect(intake) || 0)); } catch { /* fail closed */ }
    return { type, score };
  }).sort((a, b) => b.score - a.score);
  if (enableEmulators) {
    const emulator = ranking.find((row) => row.type.id === 'emulatorjs' && row.score > 0);
    if (emulator) return [emulator, ...ranking.filter((row) => row !== emulator)];
  }
  if (!ranking[0]?.score) {
    const raw = ranking.find((row) => row.type.id === 'raw');
    if (raw) return [raw, ...ranking.filter((row) => row !== raw)];
  }
  return ranking;
}

function firstKnown(intake, ranking) {
  const type = ranking[0]?.type;
  if (!type) return null;
  for (const known of KNOWN) {
    try { if (known.match(intake, type)) return known; } catch { /* fail closed */ }
  }
  return null;
}

assert.equal(compatibility.version, 3);
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
  assert.ok(VALID_REAL_WORLD_QUALITY.has(row.realWorldQuality), `unreviewed fixture quality for type ${type.id}`);
  assert.equal(row.auditStatus, 'validated', `type ${type.id} has not completed its fixture audit`);
  assert.equal('needsRealWorldSample' in row, false, `type ${type.id} retains an open-ended sample-review flag`);
  assert.ok(row.fileExamplesSlug === null || typeof row.fileExamplesSlug === 'string', `fileExamplesSlug must be string or null for type ${type.id}`);
  assert.ok(Array.isArray(row.securityLimitations), `securityLimitations must be array for type ${type.id}`);
  assert.ok(Array.isArray(row.knownParserGaps), `knownParserGaps must be array for type ${type.id}`);
  const selections = [];
  for (const file of row.sampleFiles) {
    selections.push(rankingFor(await intakeFor(file), type.id === 'emulatorjs')[0]?.type?.id || 'raw');
  }
  assert.ok(selections.includes(type.id), `type ${type.id} has no sample that selects it (got ${selections.join(', ')})`);
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
  assert.ok(VALID_REAL_WORLD_QUALITY.has(row.realWorldQuality), `unreviewed fixture quality for known file ${known.id}`);
  assert.equal(row.auditStatus, 'validated', `known file ${known.id} has not completed its fixture audit`);
  assert.equal('needsRealWorldSample' in row, false, `known file ${known.id} retains an open-ended sample-review flag`);
  assert.ok(Array.isArray(row.securityLimitations), `securityLimitations must be array for known file ${known.id}`);
  assert.ok(Array.isArray(row.knownParserGaps), `knownParserGaps must be array for known file ${known.id}`);
  const selections = [];
  for (const file of row.sampleFiles) {
    const intake = await intakeFor(file);
    selections.push(firstKnown(intake, rankingFor(intake))?.id || 'none');
  }
  assert.ok(selections.includes(known.id), `known file ${known.id} has no sample that selects it (got ${selections.join(', ')})`);
}

for (const example of examples) {
  const provenance = ['source', 'license', 'attribution'].filter((key) => !!example[key]);
  assert.ok(provenance.length === 0 || provenance.length === 3, `${example.file} has incomplete provenance`);
  if (example.knownFile != null) assert.equal(typeof example.knownFile, 'string', `${example.file} has a non-specific knownFile marker`);
}

for (const file of ['Dashboard.tsx', 'server.go', 'worker.rs']) {
  const intake = await intakeFor(file);
  assert.equal(firstKnown(intake, rankingFor(intake)), null, `${file} is intercepted by an unrelated language enhancer`);
}

const extraTypeRows = Object.keys(compatibility.types).filter((id) => !REGISTRY.some((type) => type.id === id));
assert.deepEqual(extraTypeRows, [], 'compatibility has rows for unregistered types');

const extraKnownRows = Object.keys(compatibility.knownFiles).filter((id) => !KNOWN.some((known) => known.id === id));
assert.deepEqual(extraKnownRows, [], 'compatibility has rows for unknown known-file enhancers');

console.log('example compatibility: ok');
