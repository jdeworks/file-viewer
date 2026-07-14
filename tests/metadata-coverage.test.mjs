import assert from 'node:assert/strict';

import { REGISTRY } from '../docs/core/registry.js';
import { getTypeInfo } from '../docs/core/type-info.js';
import { KNOWN } from '../docs/known/registry.generated.js';

const GENERIC_DESCRIPTION = 'used to store or exchange data in a format-specific structure.';

assert.ok(REGISTRY.length >= 140, `expected the complete base registry, got ${REGISTRY.length}`);
assert.equal(new Set(REGISTRY.map((type) => type.id)).size, REGISTRY.length, 'base type ids must be unique');

for (const type of REGISTRY) {
  assert.equal(typeof type.loadMetadata, 'function', `${type.id} has no metadata extractor`);
  const info = getTypeInfo(type);
  assert.ok(info.name && info.name !== 'File format', `${type.id} has no concrete format name`);
  assert.ok(info.description && info.description !== GENERIC_DESCRIPTION, `${type.id} has only generic format purpose text`);
  assert.match(info.href, /^https?:\/\//, `${type.id} has no format-information link`);
}

assert.ok(KNOWN.length >= 880, `expected the complete enhanced-view registry, got ${KNOWN.length}`);
assert.equal(new Set(KNOWN.map((known) => known.id)).size, KNOWN.length, 'enhanced-view ids must be unique');

const fallbackType = REGISTRY.find((type) => type.id === 'raw');
assert.ok(fallbackType, 'raw fallback type is registered');
for (const known of KNOWN) {
  assert.equal(typeof known.loadRenderer, 'function', `${known.id} has no tailored renderer`);
  const info = getTypeInfo(fallbackType, known);
  assert.ok(info.name && info.name !== fallbackType.label, `${known.id} has no concrete enhanced-view name`);
  assert.ok(info.description && info.description !== GENERIC_DESCRIPTION, `${known.id} has no enhanced-view purpose text`);
  assert.match(info.href, /^https?:\/\//, `${known.id} has no format-information link`);
}

console.log(`metadata coverage: ${REGISTRY.length} base types, ${KNOWN.length} enhanced views ok`);
