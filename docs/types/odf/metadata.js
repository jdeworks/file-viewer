// ODF metadata: document kind + counts, read from content.xml (and meta.xml if present).
import { openOdf } from './odflib.js';

export async function extract(intake) {
  try {
    const { contentXml, kind, images } = await openOdf(intake);
    const doc = new DOMParser().parseFromString(contentXml, 'application/xml');
    const rows = [
      { label: 'Kind', value: kind === 'presentation' ? 'Presentation (.odp)' : 'Text document (.odt)' },
      { label: 'Images', value: String(images.size) },
    ];
    if (kind === 'presentation') rows.push({ label: 'Slides', value: String(doc.getElementsByTagName('draw:page').length) });
    else {
      rows.push({ label: 'Paragraphs', value: String(doc.getElementsByTagName('text:p').length) });
      rows.push({ label: 'Headings', value: String(doc.getElementsByTagName('text:h').length) });
    }
    return rows;
  } catch (e) {
    return [{ label: 'OpenDocument', value: 'unreadable' }];
  }
}
