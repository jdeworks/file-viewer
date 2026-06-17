import { loadGlobal, vendor } from '../../../../core/script-loader.js';

const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'];

export async function extract(intake) {
  let spec;
  try { spec = await parseSpec(intake); } catch { return [{ label: 'OpenAPI', value: 'unreadable' }]; }
  const info = spec.info || {};
  const paths = spec.paths && typeof spec.paths === 'object' ? spec.paths : {};
  let operations = 0;
  for (const p of Object.keys(paths)) for (const method of METHODS) if (paths[p] && paths[p][method]) operations++;
  return [
    ...(info.title ? [{ label: 'API title', value: info.title }] : []),
    ...((spec.openapi || spec.swagger) ? [{ label: 'Spec version', value: spec.openapi || spec.swagger }] : []),
    ...(info.version ? [{ label: 'API version', value: info.version }] : []),
    { label: 'Paths', value: String(Object.keys(paths).length) },
    { label: 'Operations', value: String(operations) },
  ];
}

async function parseSpec(intake) {
  const text = intake.text || '';
  try { return JSON.parse(text); } catch { /* try YAML */ }
  const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
  return jsyaml.load(text);
}
