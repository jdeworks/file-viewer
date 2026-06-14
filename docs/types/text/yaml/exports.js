// YAML exports: convert to JSON (via vendored js-yaml → JSON.stringify). Multi-document YAML uses
// the first document.
import { downloadBlob } from '../../../core/exports.js';
import { loadGlobal, vendor } from '../../../core/script-loader.js';

export function getExports(intake) {
  const base = (intake.filename || 'data').replace(/\.[^.]+$/, '');
  return [
    { label: 'Download as JSON', run: async () => {
      const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
      const data = jsyaml.load(intake.text || '');
      downloadBlob(JSON.stringify(data, null, 2), base + '.json', 'application/json');
    } },
  ];
}
