import { loadGlobal, vendor } from '../../../core/script-loader.js';

export async function extractMetadata(intake) {
  try {
    const JSZip = await loadGlobal(vendor('jszip/jszip.min.js'), 'JSZip');
    const zip = await JSZip.loadAsync(intake.bytes);
    const files = Object.keys(zip.files).filter((f) => !zip.files[f].dir);
    const hasThumb = files.some((f) => /thumbnail\.png$/i.test(f));
    const hasDocument = files.some((f) => /Document\.archive$/i.test(f));
    return {
      'Format': 'Procreate (iPad)',
      'Archive entries': files.length,
      'Has thumbnail': hasThumb ? 'Yes' : 'No',
      'Has Document.archive': hasDocument ? 'Yes' : 'No',
    };
  } catch { return null; }
}
