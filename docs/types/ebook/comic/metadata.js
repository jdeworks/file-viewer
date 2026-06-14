// Comic metadata: container kind + page count (cheap — counts image entries without decoding).
import { archiveKind } from './comiclib.js';

export async function extract(intake) {
  const kind = archiveKind(intake.bytes);
  return [
    { label: 'Container', value: kind === 'zip' ? 'CBZ (zip)' : kind === 'rar' ? 'CBR (rar)' : kind === '7z' ? 'CB7 (7-zip)' : 'unknown' },
    { label: 'Size', value: (intake.size / 1024).toFixed(1) + ' KB' },
  ];
}
