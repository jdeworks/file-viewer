import { loadGlobal, vendor } from '../../../core/script-loader.js';

export async function extract(intake) {
  const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
  let docs;
  try { docs = jsyaml.loadAll(intake.text || ''); } catch { return [{ label: 'Valid YAML', value: 'no' }]; }
  let nodes = 0, maxDepth = 0;
  (function walk(v, d) {
    nodes++; if (d > maxDepth) maxDepth = d;
    if (v && typeof v === 'object' && !(v instanceof Date)) for (const k of Object.keys(v)) walk(v[k], d + 1);
  })(docs.length === 1 ? docs[0] : docs, 0);
  const root = docs.length > 1 ? 'stream (' + docs.length + ' docs)' : (Array.isArray(docs[0]) ? 'sequence' : (docs[0] === null || docs[0] === undefined ? 'null' : typeof docs[0]));
  return [
    { label: 'Valid YAML', value: 'yes' },
    { label: 'Documents', value: String(docs.length) },
    { label: 'Root', value: root },
    { label: 'Total nodes', value: String(nodes) },
    { label: 'Max depth', value: String(maxDepth) },
  ];
}
