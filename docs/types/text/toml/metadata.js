import { parseTOML } from './toml.js';

export function extract(intake) {
  let data;
  try { data = parseTOML(intake.text || ''); } catch { return [{ label: 'Valid TOML', value: 'no' }]; }
  let nodes = 0, maxDepth = 0, tables = 0, arrays = 0;
  (function walk(v, d) {
    nodes++; if (d > maxDepth) maxDepth = d;
    if (Array.isArray(v)) arrays++;
    else if (v && typeof v === 'object' && !(v instanceof Date)) tables++;
    if (v && typeof v === 'object' && !(v instanceof Date)) for (const k of Object.keys(v)) walk(v[k], d + 1);
  })(data, 0);
  const out = [
    { label: 'Valid TOML', value: 'yes' },
    { label: 'Top-level keys', value: String(Object.keys(data).length) },
    { label: 'Total nodes', value: String(nodes) },
    { label: 'Max depth', value: String(maxDepth) },
    { label: 'Tables', value: String(tables) },
    { label: 'Arrays', value: String(arrays) },
  ];
  if (/(^|\/)Cargo\.toml$/i.test(intake.filename || '')) {
    const deps = ['dependencies', 'dev-dependencies', 'build-dependencies']
      .reduce((n, k) => n + Object.keys(data[k] || {}).length, 0);
    out.push({ label: 'Package', value: (data.package && data.package.name) || '—' });
    out.push({ label: 'Dependencies', value: String(deps) });
  }
  return out;
}
