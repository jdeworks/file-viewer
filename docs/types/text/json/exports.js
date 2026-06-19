// JSON exports: convert to CSV, YAML (via vendored js-yaml), or download a pretty / minified copy.
import { downloadBlob } from '../../../core/exports.js';
import { loadGlobal, vendor } from '../../../core/script-loader.js';
import { parseJsonLike } from './jsonparse.js';

// Escape a single CSV cell value.
const csvCell = (v) => {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  return /[,"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

function jsonToCsv(data) {
  // Array of objects → proper table
  if (Array.isArray(data) && data.length && data.every((r) => r !== null && typeof r === 'object' && !Array.isArray(r))) {
    // Build column union: first object's keys first, then any additional keys from later objects
    const seen = new Set();
    const cols = [];
    for (const row of data) { for (const k of Object.keys(row)) { if (!seen.has(k)) { seen.add(k); cols.push(k); } } }
    const header = cols.map(csvCell).join(',');
    const bodyRows = data.map((row) => cols.map((k) => csvCell(Object.prototype.hasOwnProperty.call(row, k) ? row[k] : null)).join(','));
    return [header, ...bodyRows].join('\n') + '\n';
  }
  // Plain object → key/value rows
  if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
    const header = 'key,value';
    const bodyRows = Object.entries(data).map(([k, v]) => [csvCell(k), csvCell(v)].join(','));
    return [header, ...bodyRows].join('\n') + '\n';
  }
  // Scalar or array of non-objects → single column
  const rows = Array.isArray(data) ? data : [data];
  return ['value', ...rows.map((v) => csvCell(v))].join('\n') + '\n';
}

export function getExports(intake) {
  const base = (intake.filename || 'data').replace(/\.[^.]+$/, '');
  const parse = () => parseJsonLike(intake.text || 'null').data;
  return [
    { label: 'Download as CSV', run: () => {
      const data = parse();
      downloadBlob(jsonToCsv(data), base + '.csv', 'text/csv');
    } },
    { label: 'Download as YAML', run: async () => {
      const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
      downloadBlob(jsyaml.dump(parse(), { indent: 2, lineWidth: 100 }), base + '.yaml', 'application/yaml');
    } },
    { label: 'Download pretty JSON', run: () => downloadBlob(JSON.stringify(parse(), null, 2), base + '.json', 'application/json') },
    { label: 'Download minified JSON', run: () => downloadBlob(JSON.stringify(parse()), base + '.min.json', 'application/json') },
  ];
}
