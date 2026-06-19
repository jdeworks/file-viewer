import { parseMusicXml } from './renderer.js';

export async function extractMetadata(intake) {
  const info = parseMusicXml(intake.text || '');
  if (!info) return { fields: [] };
  const fields = [];
  if (info.title) fields.push({ label: 'Title', value: info.title });
  if (info.composer) fields.push({ label: 'Composer', value: info.composer });
  if (info.lyricist) fields.push({ label: 'Lyricist', value: info.lyricist });
  if (info.parts.length) fields.push({ label: 'Instruments', value: info.parts.join(', ') });
  if (info.measures) fields.push({ label: 'Measures', value: String(info.measures) });
  if (info.timeSig) fields.push({ label: 'Time signature', value: info.timeSig });
  if (info.key) fields.push({ label: 'Key', value: info.key });
  if (info.tempo) fields.push({ label: 'Tempo', value: info.tempo });
  if (info.copyright) fields.push({ label: 'Copyright', value: info.copyright });
  return { fields };
}
