import { parseTOML } from './toml.js';

export function extract(intake) {
  let data;
  try { data = parseTOML(intake.text || ''); } catch { return [{ label: 'Valid TOML', value: 'no' }]; }
  let nodes = 0, maxDepth = 0;
  (function walk(v, d) {
    nodes++; if (d > maxDepth) maxDepth = d;
    if (v && typeof v === 'object' && !(v instanceof Date)) for (const k of Object.keys(v)) walk(v[k], d + 1);
  })(data, 0);
  return [
    { label: 'Valid TOML', value: 'yes' },
    { label: 'Top-level keys', value: String(Object.keys(data).length) },
    { label: 'Total nodes', value: String(nodes) },
    { label: 'Max depth', value: String(maxDepth) },
  ];
}
