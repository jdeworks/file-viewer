import { parseJsonLike } from './jsonparse.js';
import { diagnoseDuplicateJsonKeys } from './duplicate-keys.js';

export function extract(intake) {
  const source = intake.sourceText ?? intake.text ?? '';
  const duplicates = diagnoseDuplicateJsonKeys(source);
  let parsed, data, ok = true;
  try { parsed = parseJsonLike(source, ''); data = parsed.data; } catch { ok = false; }
  if (!ok) return [
    { label: 'Valid JSON', value: 'no' },
    ...(duplicates.totalDuplicates ? [{ label: 'Duplicate keys before error', value: String(duplicates.totalDuplicates) }] : []),
  ];
  let nodes = 0, maxDepth = 0, objects = 0, arrays = 0;
  (function walk(v, d) {
    nodes++; if (d > maxDepth) maxDepth = d;
    if (Array.isArray(v)) arrays++;
    else if (v && typeof v === 'object') objects++;
    if (v && typeof v === 'object') for (const k of Object.keys(v)) walk(v[k], d + 1);
  })(data, 0);
  const root = Array.isArray(data) ? 'array' : (data === null ? 'null' : typeof data);
  const out = [
    { label: 'Valid JSON', value: 'yes' },
    { label: 'Parse mode', value: parsed.mode === 'jsonc' ? (parsed.hadBom ? 'JSONC + BOM recovery' : 'JSONC recovery') : parsed.mode === 'bom' ? 'BOM recovery' : 'strict JSON' },
    { label: 'Duplicate keys', value: String(duplicates.totalDuplicates) },
    { label: 'Root type', value: root },
    { label: 'Total nodes', value: String(nodes) },
    { label: 'Max depth', value: String(maxDepth) },
    { label: 'Objects', value: String(objects) },
    { label: 'Arrays', value: String(arrays) },
  ];
  if (data && typeof data === 'object' && !Array.isArray(data)) out.push({ label: 'Top-level keys', value: String(Object.keys(data).length) });
  addKnownJsonRows(out, data, intake.filename || '');
  return out;
}

function addKnownJsonRows(out, data, filename) {
  const name = filename.split('/').pop() || '';
  if (!data || typeof data !== 'object' || Array.isArray(data)) return;
  if (/^package\.json$/i.test(name)) {
    const deps = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']
      .reduce((n, k) => n + Object.keys(data[k] || {}).length, 0);
    out.push({ label: 'Package', value: data.name || '—' });
    out.push({ label: 'Dependencies', value: String(deps) });
    out.push({ label: 'Scripts', value: String(Object.keys(data.scripts || {}).length) });
  }
  if (/^tsconfig(\..*)?\.json$/i.test(name)) {
    const opts = data.compilerOptions || {};
    out.push({ label: 'Compiler options', value: String(Object.keys(opts).length) });
  }
  if (data.openapi || data.swagger) {
    const methods = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']);
    let endpoints = 0;
    for (const item of Object.values(data.paths || {})) {
      for (const key of Object.keys(item || {})) if (methods.has(key.toLowerCase())) endpoints++;
    }
    out.push({ label: 'API title', value: (data.info && data.info.title) || '—' });
    out.push({ label: 'Endpoints', value: String(endpoints) });
  }
}
