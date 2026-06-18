import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { REGISTRY } from '../docs/core/registry.js';
import { descriptorsFor } from '../docs/core/settings-schema.js';

const generated = JSON.parse(await readFile(new URL('../docs/core/settings-defaults.generated.json', import.meta.url), 'utf8'));

function defaultsFor(descriptors) {
  return Object.fromEntries(descriptors.map((d) => [d.key, d.default]));
}

function knownOnly(values, descriptors) {
  const keys = new Set(descriptors.map((d) => d.key));
  const out = {};
  for (const [key, value] of Object.entries(values || {})) {
    if (keys.has(key)) out[key] = value;
  }
  return out;
}

async function readJson(url) {
  return JSON.parse(await readFile(url, 'utf8') || '{}');
}

assert.equal(generated.version, 1);
assert.deepEqual(Object.keys(generated.types), REGISTRY.map((t) => t.id));

for (const type of REGISTRY) {
  const entry = generated.types[type.id];
  assert.ok(entry, 'missing generated settings for ' + type.id);

  const descriptors = descriptorsFor(type);
  const defaults = defaultsFor(descriptors);
  assert.deepEqual(Object.keys(entry.defaults).sort(), descriptors.map((d) => d.key).sort(), type.id + ' default keys');
  assert.deepEqual(entry.defaults, defaults, type.id + ' defaults');

  const declared = type.settings?.presets || [{ id: 'default', label: 'Default', url: type.settingsUrl }];
  assert.deepEqual(entry.presets.map((p) => p.id), declared.map((p) => p.id), type.id + ' preset ids');

  for (let i = 0; i < declared.length; i += 1) {
    const preset = declared[i];
    const json = await readJson(preset.url);
    const expected = { ...defaults, ...knownOnly(json.values, descriptors) };
    const got = entry.presets[i];
    assert.equal(got.label, preset.label || json.label || preset.id, type.id + ' preset label ' + preset.id);
    assert.deepEqual(Object.keys(got.values).sort(), descriptors.map((d) => d.key).sort(), type.id + ' preset keys ' + preset.id);
    assert.deepEqual(got.values, expected, type.id + ' preset values ' + preset.id);
  }
}

assert.ok(generated.types.markdown.presets.some((p) => p.id === 'compact'), 'markdown compact preset generated');
console.log('settings defaults: ok');
