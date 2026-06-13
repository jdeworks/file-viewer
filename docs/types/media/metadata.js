import { mediaInfo, dataUrl, probe } from './medialib.js';

function fmtDuration(s) {
  if (!isFinite(s) || s <= 0) return null;
  const m = Math.floor(s / 60), sec = Math.round(s % 60);
  return m + ':' + String(sec).padStart(2, '0');
}

export async function extract(intake) {
  const info = mediaInfo(intake);
  const rows = [
    { label: 'Kind', value: info.kind === 'video' ? 'Video' : 'Audio' },
    { label: 'Format', value: info.mime },
  ];
  const p = await probe(info.kind, dataUrl(intake, info.mime));
  if (p) {
    const dur = fmtDuration(p.duration);
    if (dur) rows.push({ label: 'Duration', value: dur });
    if (p.w && p.h) rows.push({ label: 'Dimensions', value: p.w + ' × ' + p.h + ' px' });
  }
  return rows;
}
