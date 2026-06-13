// TOML exports: convert to JSON via the hand-rolled TOML parser.
import { downloadBlob } from '../../core/exports.js';
import { parseTOML } from './toml.js';

export function getExports(intake) {
  const base = (intake.filename || 'data').replace(/\.[^.]+$/, '');
  return [
    { label: 'Download as JSON', run: () => downloadBlob(JSON.stringify(parseTOML(intake.text || ''), null, 2), base + '.json', 'application/json') },
  ];
}
