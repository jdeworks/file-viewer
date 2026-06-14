import { parseIni } from './renderer.js';

export function extract(intake) {
  const sections = parseIni(intake.text || '');
  const pairs = sections.reduce((n, s) => n + s.pairs.length, 0);
  const named = sections.filter((s) => s.name).length;
  return [
    { label: 'Keys', value: String(pairs) },
    { label: 'Sections', value: String(named) },
  ];
}
