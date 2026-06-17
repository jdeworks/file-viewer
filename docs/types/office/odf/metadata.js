// ODF metadata: document kind + counts, read from content.xml (and meta.xml if present).
import { openOdf } from './odflib.js';

export async function extract(intake) {
  try {
    const { contentXml, metaXml, kind, imageCount } = await openOdf(intake, { loadImages: false });
    const doc = new DOMParser().parseFromString(contentXml, 'application/xml');
    const meta = metaXml ? new DOMParser().parseFromString(metaXml, 'application/xml') : null;
    const text = (local) => {
      if (!meta) return '';
      const el = [...meta.getElementsByTagName('*')].find((n) => n.localName === local);
      return el ? (el.textContent || '').trim() : '';
    };
    const stat = meta ? [...meta.getElementsByTagName('*')].find((n) => n.localName === 'document-statistic') : null;
    const attr = (name) => stat && (stat.getAttribute('meta:' + name) || stat.getAttribute(name));
    const rows = [
      { label: 'Kind', value: kind === 'presentation' ? 'Presentation (.odp)' : 'Text document (.odt)' },
    ];
    const add = (label, value) => { if (value != null && value !== '') rows.push({ label, value: String(value) }); };
    add('Title', text('title'));
    add('Creator', text('initial-creator') || text('creator'));
    add('Language', text('language'));
    add('Generator', text('generator'));
    add('Created', text('creation-date'));
    add('Modified', text('date'));
    const count = (local) => [...doc.getElementsByTagName('*')].filter((n) => n.localName === local).length;
    if (kind === 'presentation') add('Slides', attr('page-count') || count('page'));
    else {
      add('Pages', attr('page-count'));
      add('Words', attr('word-count'));
      add('Characters', attr('character-count'));
      add('Paragraphs', attr('paragraph-count') || count('p'));
      add('Headings', count('h'));
    }
    add('Tables', attr('table-count'));
    add('Images', attr('image-count') || imageCount);
    return rows;
  } catch (e) {
    return [{ label: 'OpenDocument', value: 'unreadable' }];
  }
}
