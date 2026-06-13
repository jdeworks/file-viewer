import { readZip, fmtSize, listCentralDirectory } from './ziplib.js';

export async function extract(intake) {
  let z;
  try { z = await readZip(intake); }
  catch { z = listCentralDirectory(intake.bytes); }     // encrypted/odd zips: fall back to our parser
  if (!z) return [{ label: 'Archive', value: 'unreadable' }];
  const enc = (z.encrypted ? z.encrypted.size : 0) || z.files.filter((f) => f.encrypted).length;
  const rows = [
    { label: 'Files', value: String(z.files.length) },
    { label: 'Folders', value: String(z.folders.length) },
    { label: 'Uncompressed', value: fmtSize(z.totalU) },
    { label: 'Compression', value: z.ratio + '% smaller' },
  ];
  if (enc) rows.push({ label: 'Encrypted', value: enc + ' password-protected' });
  return rows;
}
