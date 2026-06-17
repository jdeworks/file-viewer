import { patchStats } from './renderer.js';

export function extract(intake) {
  const s = patchStats(intake.text || '');
  return [
    { label: 'Files', value: String(s.files) },
    { label: 'Hunks', value: String(s.hunks) },
    { label: 'Added', value: '+' + s.added },
    { label: 'Removed', value: '−' + s.removed },
    { label: 'New files', value: String(s.newFiles) },
    { label: 'Deleted files', value: String(s.deletedFiles) },
    { label: 'Renames', value: String(s.renames) },
  ];
}
