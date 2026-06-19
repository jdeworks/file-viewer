// INI exports: convert to JSON (global keys + sections as objects).
import { downloadBlob } from '../../../core/exports.js';
import { parseIni } from './renderer.js';

function iniToJson(text) {
  const sections = parseIni(text || '');
  const out = {};
  for (const s of sections) {
    const target = s.name == null ? 'global' : s.name;
    if (!out[target]) out[target] = {};
    for (const { key, value } of s.pairs) {
      out[target][key] = value;
    }
  }
  return out;
}

export function getExports(intake) {
  const base = (intake.filename || 'data').replace(/\.[^.]+$/, '');
  return [
    {
      label: 'Download as JSON',
      run: () => downloadBlob(JSON.stringify(iniToJson(intake.text || ''), null, 2), base + '.json', 'application/json'),
    },
  ];
}
