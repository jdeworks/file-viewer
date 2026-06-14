import { parseEpub } from './epublib.js';

export async function extract(intake) {
  try {
    const b = await parseEpub(intake);
    const out = [
      { label: 'Title', value: b.title || '—' },
      { label: 'Author', value: b.creator || '—' },
      { label: 'Chapters', value: String(b.spine.length) },
      { label: 'TOC entries', value: String(b.toc.length) },
    ];
    return out;
  } catch (e) {
    return [{ label: 'E-book', value: 'unreadable' }];
  }
}
