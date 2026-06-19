import { readZip, fmtSize, listCentralDirectory, compressionMethodName, imageEntryCount } from './ziplib.js';
import { META_KEYS, securityFact } from '../../core/metadata-helpers.js';
import { assessFilenameRisk } from '../../core/generic-metadata.js';

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

export function riskyArchiveEntries(files = []) {
  const risky = [];
  let score = 0;
  for (const file of files) {
    const name = file.name || '';
    const risk = assessFilenameRisk(name);
    if (!risk.score) continue;
    score = Math.max(score, risk.score);
    risky.push({ name, level: risk.level, score: risk.score, warnings: risk.warnings });
  }
  return { score, entries: risky };
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
  const risk = riskyArchiveEntries(files);
  if (risk.score) {
    const high = risk.entries.filter((entry) => entry.score >= 70).length;
    const caution = risk.entries.length - high;
    const sample = risk.entries
      .slice()
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
      .slice(0, 5)
      .map((entry) => `${entry.name} (${entry.level})`)
      .join(', ');
    rows.push(
      securityFact('Archive entry risk', `${high ? `${high} high` : ''}${high && caution ? ', ' : ''}${caution ? `${caution} caution` : ''}`, META_KEYS.archiveRisk),
      securityFact('Archive entry warnings', sample, META_KEYS.archiveWarnings),
    );
  }
  return rows;
}
