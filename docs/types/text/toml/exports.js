// TOML exports: convert to JSON or YAML via the hand-rolled TOML parser.
import { downloadBlob } from '../../../core/exports.js';
import { parseTOML } from './toml.js';

// Simple YAML serializer — no external lib, covers TOML-output types (scalars, arrays, objects,
// Dates). Strings are quoted only when they contain YAML-special characters.
const NEEDS_QUOTE = /[:#{}\[\]\n\r,&*?|<>=!%@`'"\\]|^[-?]|^\s|\s$|^(true|false|null|~|\d.*)$/;

function yamlStr(s) {
  if (s === '') return "''";
  if (NEEDS_QUOTE.test(s)) return "'" + s.replace(/'/g, "''") + "'";
  return s;
}

function yamlValue(val, indent) {
  if (val === null || val === undefined) return 'null';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'number') return isFinite(val) ? String(val) : (isNaN(val) ? '.nan' : (val > 0 ? '.inf' : '-.inf'));
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'string') return yamlStr(val);
  if (Array.isArray(val)) {
    if (!val.length) return '[]';
    const simple = val.every((v) => v === null || typeof v !== 'object' || v instanceof Date);
    if (simple && val.length <= 6) {
      const inline = '[' + val.map((v) => yamlValue(v, indent)).join(', ') + ']';
      if (inline.length <= 80) return inline;
    }
    return '\n' + val.map((v) => {
      const vStr = yamlValue(v, indent + '  ');
      if (typeof v === 'object' && v !== null && !(v instanceof Date)) {
        return indent + '-\n' + vStr;
      }
      return indent + '- ' + vStr;
    }).join('\n');
  }
  const entries = Object.entries(val);
  if (!entries.length) return '{}';
  return '\n' + entries.map(([k, v]) => {
    const vStr = yamlValue(v, indent + '  ');
    const keyStr = yamlStr(k);
    if (typeof v === 'object' && v !== null && !(v instanceof Date)) {
      return indent + keyStr + ':' + vStr;
    }
    return indent + keyStr + ': ' + vStr;
  }).join('\n');
}

function toYaml(obj) {
  if (typeof obj !== 'object' || obj === null) return yamlValue(obj, '') + '\n';
  const lines = [];
  for (const [k, v] of Object.entries(obj)) {
    const vStr = yamlValue(v, '  ');
    if (typeof v === 'object' && v !== null && !(v instanceof Date)) {
      lines.push(yamlStr(k) + ':' + vStr);
    } else {
      lines.push(yamlStr(k) + ': ' + vStr);
    }
  }
  return lines.join('\n') + '\n';
}

export function getExports(intake) {
  const base = (intake.filename || 'data').replace(/\.[^.]+$/, '');
  return [
    {
      label: 'Download as JSON',
      run: () => downloadBlob(JSON.stringify(parseTOML(intake.text || ''), null, 2), base + '.json', 'application/json'),
    },
    {
      label: 'Download as YAML',
      run: () => {
        let data;
        try { data = parseTOML(intake.text || ''); } catch { data = {}; }
        downloadBlob(toYaml(data), base + '.yaml', 'text/yaml');
      },
    },
  ];
}
