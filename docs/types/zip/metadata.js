import { readZip, fmtSize, listCentralDirectory, compressionMethodName, imageEntryCount } from './ziplib.js';

function methodSummary(methods) {
  if (!methods || !methods.size) return '';
  return [...methods.entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .map(([method, count]) => compressionMethodName(method) + (count > 1 ? ' (' + count + ')' : ''))
    .join(', ');
}

function latestDate(files) {
  const dates = files.map((f) => f.date).filter(Boolean).map((d) => d.getTime()).filter(Number.isFinite);
  if (!dates.length) return '';
  return new Date(Math.max(...dates)).toISOString().slice(0, 10);
}

export async function extract(intake) {
  let z, cd;
  try { z = await readZip(intake); }
  catch { z = listCentralDirectory(intake.bytes); }     // encrypted/odd zips: fall back to our parser
  if (!z) return [{ label: 'Archive', value: 'unreadable' }];
  cd = listCentralDirectory(intake.bytes);
  const files = cd ? cd.files : z.files;
  const folders = cd ? cd.folders : z.folders;
  const enc = (z.encrypted ? z.encrypted.size : 0) || z.files.filter((f) => f.encrypted).length;
  const rows = [
    { label: 'Container', value: (intake.filename || '').toLowerCase().endsWith('.cbz') ? 'CBZ (zip)' : 'ZIP' },
    { label: 'Files', value: String(files.length) },
    { label: 'Folders', value: String(folders.length) },
    { label: 'Uncompressed', value: fmtSize(z.totalU) },
    { label: 'Packed', value: fmtSize(z.totalC) },
    { label: 'Compression', value: z.ratio + '% smaller' },
  ];
  const methods = methodSummary(cd && cd.methods);
  if (methods) rows.push({ label: 'Methods', value: methods });
  const images = imageEntryCount(files);
  if (images) rows.push({ label: 'Images', value: String(images) });
  const newest = latestDate(files);
  if (newest) rows.push({ label: 'Newest entry', value: newest });
  if (enc) rows.push({ label: 'Encrypted', value: enc + ' password-protected' });
  return rows;
}
