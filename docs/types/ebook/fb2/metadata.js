// FB2 metadata: title, author, language, and section count — read straight from the XML.
export async function extract(intake) {
  const doc = new DOMParser().parseFromString(intake.text || '', 'application/xml');
  const t = (tag, ctx = doc) => { const el = ctx.getElementsByTagName(tag)[0]; return el ? (el.textContent || '').trim() : ''; };
  const ti = doc.getElementsByTagName('title-info')[0];
  const author = ti && ti.getElementsByTagName('author')[0];
  const authorName = author ? [...author.children].map((c) => (c.textContent || '').trim()).filter(Boolean).join(' ') : '';
  const rows = [
    { label: 'Title', value: t('book-title') || '(untitled)' },
    { label: 'Author', value: authorName || '—' },
    { label: 'Language', value: t('lang') || '—' },
    { label: 'Sections', value: String(doc.getElementsByTagName('section').length) },
    { label: 'Images', value: String(doc.getElementsByTagName('binary').length) },
  ];
  return rows;
}
