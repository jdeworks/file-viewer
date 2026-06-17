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
    const m = b.metadata || {};
    const add = (label, value) => { if (value) out.push({ label, value: String(value) }); };
    add('Language', m.language);
    add('Publisher', m.publisher);
    add('Date', m.date);
    add('Identifier', m.identifier);
    add('Rights', m.rights);
    return out;
  } catch (e) {
    return [{ label: 'E-book', value: 'unreadable' }];
  }
}
