import { parseJsonl } from './renderer.js';

export async function extractMetadata(intake) {
  const { records, errors, lineCount } = parseJsonl(intake.text || '');
  const keyFreq = new Map();
  for (const r of records) {
    if (r && typeof r === 'object' && !Array.isArray(r)) {
      for (const k of Object.keys(r)) keyFreq.set(k, (keyFreq.get(k) || 0) + 1);
    }
  }
  const topKeys = [...keyFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k]) => k);

  const fields = [
    { label: 'Line count', value: String(lineCount) },
    { label: 'Record count', value: String(records.length) },
    { label: 'Unique keys', value: String(keyFreq.size) },
    ...(topKeys.length ? [{ label: 'Common keys', value: topKeys.join(', ') }] : []),
    ...(errors.length ? [{ label: 'Parse errors', value: String(errors.length) }] : []),
  ];
  return { fields };
}
