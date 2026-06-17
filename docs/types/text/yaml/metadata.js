import { loadGlobal, vendor } from '../../../core/script-loader.js';

export async function extract(intake) {
  const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
  let docs;
  try { docs = jsyaml.loadAll(intake.text || ''); } catch { return [{ label: 'Valid YAML', value: 'no' }]; }
  let nodes = 0, maxDepth = 0, mappings = 0, sequences = 0;
  (function walk(v, d) {
    nodes++; if (d > maxDepth) maxDepth = d;
    if (Array.isArray(v)) sequences++;
    else if (v && typeof v === 'object' && !(v instanceof Date)) mappings++;
    if (v && typeof v === 'object' && !(v instanceof Date)) for (const k of Object.keys(v)) walk(v[k], d + 1);
  })(docs.length === 1 ? docs[0] : docs, 0);
  const root = docs.length > 1 ? 'stream (' + docs.length + ' docs)' : (Array.isArray(docs[0]) ? 'sequence' : (docs[0] === null || docs[0] === undefined ? 'null' : typeof docs[0]));
  const out = [
    { label: 'Valid YAML', value: 'yes' },
    { label: 'Documents', value: String(docs.length) },
    { label: 'Root', value: root },
    { label: 'Total nodes', value: String(nodes) },
    { label: 'Max depth', value: String(maxDepth) },
    { label: 'Mappings', value: String(mappings) },
    { label: 'Sequences', value: String(sequences) },
  ];
  const first = docs[0];
  addKnownYamlRows(out, first, intake.filename || '');
  return out;
}

function addKnownYamlRows(out, data, filename) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return;
  if (/(^|\/)(docker-)?compose(\.\w+)?\.ya?ml$/i.test(filename)) {
    out.push({ label: 'Services', value: String(Object.keys(data.services || {}).length) });
    out.push({ label: 'Volumes', value: String(Object.keys(data.volumes || {}).length) });
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
