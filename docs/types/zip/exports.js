// Archive exports: download a CSV listing all files in the archive.
// Uses the same JSZip load path as ziplib.js — no new dependencies.
import { downloadBlob } from '../../core/exports.js';
import { readZip, listCentralDirectory } from './ziplib.js';

function toCsv(rows) {
  return rows.map((r) => r.map((v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"').join(',')).join('\n');
}

export async function getExports(intake) {
  const base = (intake.filename || 'archive').replace(/\.[^.]+$/, '');
  return [{
    label: 'Export file listing as CSV',
    run: async () => {
      const rows = [['Name', 'Size (bytes)', 'Compressed Size (bytes)', 'Date Modified', 'Comment']];

      let files;
      try {
        // Prefer JSZip — it gives us dates and comments directly from the zip object.
        const z = await readZip(intake);
        const zip = z.zip;
        zip.forEach((path, entry) => {
          const d = entry._data || {};
          rows.push([
            path,
            d.uncompressedSize ?? '',
            d.compressedSize ?? '',
            entry.date ? entry.date.toISOString() : '',
            entry.comment || '',
          ]);
        });
        files = null; // already populated
      } catch {
        // Fall back to our own central-directory parser (works for encrypted zips too).
        const cd = listCentralDirectory(intake.bytes);
        files = cd ? cd.files : [];
      }

      if (files) {
        for (const f of files) {
          rows.push([
            f.name,
            f.uncompressedSize ?? '',
            f.compressedSize ?? '',
            f.date ? f.date.toISOString() : '',
            '',
          ]);
        }
      }

      downloadBlob(toCsv(rows), base + '-listing.csv', 'text/csv');
    },
  }];
}
