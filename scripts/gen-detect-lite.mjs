import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REGISTRY } from '../docs/core/registry.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const registryPath = path.join(root, 'docs/core/registry.js');
const outPath = path.join(root, 'docs/core/detect-lite.generated.json');

function unique(values) {
  return [...new Set(values.filter(Boolean).map((v) => String(v).toLowerCase()))].sort();
}

function literalArgs(source, fnName) {
  const out = [];
  const re = new RegExp(`${fnName}\\s*\\([^)]*\\)`, 'g');
  for (const call of source.matchAll(re)) {
    const args = call[0];
    for (const m of args.matchAll(/['"]([^'"]+)['"]/g)) out.push(m[1]);
  }
  return out;
}

function importsFromRegistry(source) {
  const imports = new Map();
  for (const m of source.matchAll(/^import\s+(\w+)\s+from\s+'([^']+)';$/gm)) imports.set(m[1], m[2]);
  const array = source.match(/export const REGISTRY = \[([\s\S]*?)\];/);
  if (!array) throw new Error('Could not find REGISTRY array');
  return array[1].split(',').map((s) => s.trim()).filter(Boolean).map((name) => {
    const importPath = imports.get(name);
    if (!importPath) throw new Error(`Missing import for ${name}`);
    return path.dirname(path.resolve(path.dirname(registryPath), importPath));
  });
}

const registrySource = await readFile(registryPath, 'utf8');
const typeDirs = importsFromRegistry(registrySource);
if (typeDirs.length !== REGISTRY.length) throw new Error('Registry parse/import length mismatch');

const types = [];
for (let i = 0; i < REGISTRY.length; i++) {
  const type = REGISTRY[i];
  const source = await readFile(path.join(typeDirs[i], 'detect.js'), 'utf8');
  const extensions = unique(literalArgs(source, 'hasExtension').map((ext) => ext.replace(/^\./, '')));
  const mimes = unique(literalArgs(source, 'mimeMatches'));
  types.push({
    id: type.id,
    label: type.label,
    group: type.group || '',
    extensions,
    mimes,
    capabilities: {
      rawView: !!type.capabilities?.rawView,
      preview: !!type.capabilities?.preview,
      diff: !!type.capabilities?.diff,
      screenshot: !!type.capabilities?.screenshot,
    },
  });
}

await writeFile(outPath, JSON.stringify({ version: 1, types }, null, 0) + '\n');
console.log(`detect-lite.generated.json: ${types.length} types`);
