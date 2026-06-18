import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { REGISTRY } from '../docs/core/registry.js';
import { descriptorsFor } from '../docs/core/settings-schema.js';

const OUT = new URL('../docs/core/settings-defaults.generated.json', import.meta.url);

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
  const text = await readFile(url, 'utf8');
  return JSON.parse(text || '{}');
}

async function generatedEntry(type) {
  const descriptors = descriptorsFor(type);
  const defaults = defaultsFor(descriptors);
  const declared = type.settings?.presets || [{ id: 'default', label: 'Default', url: type.settingsUrl }];
  const presets = [];

  for (const preset of declared) {
    const json = await readJson(preset.url);
    presets.push({
      id: preset.id,
      label: preset.label || json.label || preset.id,
      values: { ...defaults, ...knownOnly(json.values, descriptors) },
    });
  }

  return { defaults, presets };
}

const types = {};
for (const type of REGISTRY) {
  types[type.id] = await generatedEntry(type);
}

const payload = {
  version: 1,
  generatedBy: 'scripts/gen-settings-defaults.mjs',
  types,
};

await writeFile(OUT, JSON.stringify(payload, null, 0) + '\n');
console.log(`settings-defaults.generated.json: ${Object.keys(types).length} types -> ${join('docs/core', 'settings-defaults.generated.json')}`);
