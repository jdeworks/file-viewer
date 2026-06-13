import { patchStats } from './renderer.js';

export function extract(intake) {
  const s = patchStats(intake.text || '');
  return [
    { label: 'Files', value: String(s.files) },
    { label: 'Hunks', value: String(s.hunks) },
    { label: 'Added', value: '+' + s.added },
    { label: 'Removed', value: '−' + s.removed },
  ];
}
