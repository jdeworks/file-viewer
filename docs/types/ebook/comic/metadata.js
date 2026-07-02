// Comic metadata: container kind + page count (cheap — counts image entries without decoding).
import { inspectComic } from './comiclib.js';

export async function extract(intake) {
  const info = await inspectComic(intake);
  const kind = info.kind;
  const rows = [
    { label: 'Container', value: kind === 'zip' ? 'CBZ (zip)' : kind === 'rar' ? 'CBR (rar)' : kind === '7z' ? 'CB7 (7-zip)' : kind === 'tar' ? 'CBT (tar)' : 'unknown' },
    { label: 'Size', value: (intake.size / 1024).toFixed(1) + ' KB' },
  ];
  if (info.pages) rows.push({ label: 'Pages', value: String(info.pages.length) });
  if (info.files != null) rows.push({ label: 'Files', value: String(info.files) });
  if (info.pages?.length) {
    rows.push({ label: 'First page', value: info.pages[0].split('/').pop() });
    rows.push({ label: 'Last page', value: info.pages[info.pages.length - 1].split('/').pop() });
  }
  return rows;
}
