// JSON exports: convert to YAML (via vendored js-yaml) or download a pretty / minified copy.
import { downloadBlob } from '../../../core/exports.js';
import { loadGlobal, vendor } from '../../../core/script-loader.js';
import { parseJsonLike } from './jsonparse.js';

export function getExports(intake) {
  const base = (intake.filename || 'data').replace(/\.[^.]+$/, '');
  const parse = () => parseJsonLike(intake.text || 'null').data;
  return [
    { label: 'Download as YAML', run: async () => {
      const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
      downloadBlob(jsyaml.dump(parse(), { indent: 2, lineWidth: 100 }), base + '.yaml', 'application/yaml');
    } },
    { label: 'Download pretty JSON', run: () => downloadBlob(JSON.stringify(parse(), null, 2), base + '.json', 'application/json') },
    { label: 'Download minified JSON', run: () => downloadBlob(JSON.stringify(parse()), base + '.min.json', 'application/json') },
  ];
}
