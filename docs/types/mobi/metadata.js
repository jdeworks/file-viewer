// MOBI metadata: title + record/compression facts read from the container headers.
import { parsePalmDB } from './mobilib.js';

export async function extract(intake) {
  const bytes = intake.bytes;
  const td = (b) => new TextDecoder('utf-8', { fatal: false }).decode(b);
  const name = bytes.length >= 32 ? td(bytes.subarray(0, 32)).replace(/\0+$/, '') : '';
  const rows = [{ label: 'PalmDB name', value: name || '—' }];
  try {
    const records = parsePalmDB(bytes);
    const dv = new DataView(records[0].buffer, records[0].byteOffset, records[0].byteLength);
    const compression = dv.getUint16(0, false);
    const encryption = dv.getUint16(12, false);
    rows.push({ label: 'Records', value: String(records.length) });
    rows.push({ label: 'Compression', value: compression === 2 ? 'PalmDOC' : compression === 1 ? 'none' : compression === 17480 ? 'HUFF/CDIC' : String(compression) });
    rows.push({ label: 'DRM', value: encryption ? 'protected' : 'none' });
  } catch { /* leave the name row */ }
  return rows;
}
