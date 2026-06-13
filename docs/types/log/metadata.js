import { logStats } from './renderer.js';

export function extract(intake) {
  const s = logStats(intake.text || '');
  return [
    { label: 'Lines', value: String(s.lines) },
    { label: 'Errors', value: String(s.error) },
    { label: 'Warnings', value: String(s.warn) },
  ];
}
