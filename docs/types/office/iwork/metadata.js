import { EXTS } from './detect.js';

export async function extractMetadata(intake) {
  const ext = '.' + (intake.filename || '').split('.').pop().toLowerCase();
  const typeName = EXTS[ext] || 'iWork Document';
  return {
    label: typeName,
    fields: [
      { label: 'Type', value: 'Apple ' + typeName },
      { label: 'Size', value: (intake.size / 1024).toFixed(1) + ' KB' },
      { label: 'Format', value: 'ZIP / IWA (iWork Archive)' },
    ],
  };
}
