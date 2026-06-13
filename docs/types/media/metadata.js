import { mediaInfo, blobUrl, probe } from './medialib.js';
import { parseId3 } from './id3.js';

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
  const url = blobUrl(intake, info.mime);
  const p = await probe(info.kind, url);
  URL.revokeObjectURL(url);
  if (p) {
    const dur = fmtDuration(p.duration);
    if (dur) rows.push({ label: 'Duration', value: dur });
    if (p.w && p.h) rows.push({ label: 'Dimensions', value: p.w + ' × ' + p.h + ' px' });
  }
  // ID3 tags for audio (the tag is at the file start, present even for streamed large files).
  if (info.kind === 'audio') {
    const tag = parseId3(intake.bytes);
    if (tag) {
      const add = (label, v) => { if (v) rows.push({ label, value: v }); };
      add('Title', tag.title); add('Artist', tag.artist); add('Album', tag.album);
      add('Year', tag.year); add('Track', tag.track); add('Genre', tag.genre);
    }
  }
  return rows;
}
