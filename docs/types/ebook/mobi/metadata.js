// MOBI metadata: title + record/compression facts read from the container headers.
import { readMobiHeader } from './mobilib.js';

export async function extract(intake) {
  const bytes = intake.bytes;
  const td = (b) => new TextDecoder('utf-8', { fatal: false }).decode(b);
  const name = bytes.length >= 32 ? td(bytes.subarray(0, 32)).replace(/\0+$/, '') : '';
  const rows = [{ label: 'PalmDB name', value: name || '—' }];
  try {
    const header = readMobiHeader(bytes);
    const compression = header.compression;
    const encryption = header.encryption;
    const add = (label, value) => { if (value != null && value !== '') rows.push({ label, value: String(value) }); };
    add('Title', header.fullName);
    add('Records', header.records.length);
    rows.push({ label: 'Compression', value: compression === 2 ? 'PalmDOC' : compression === 1 ? 'none' : compression === 17480 ? 'HUFF/CDIC' : String(compression) });
    rows.push({ label: 'DRM', value: encryption ? 'protected' : 'none' });
    add('MOBI version', header.version);
    add('Text records', header.textRecordCount);
    add('Text length', header.textLength ? Math.round(header.textLength / 1024) + ' KB' : '');
    if (header.firstImageIndex !== 0xffffffff && header.firstImageIndex < header.records.length) {
      add('Image records', header.records.length - header.firstImageIndex);
    }
  } catch { /* leave the name row */ }
  return rows;
}
