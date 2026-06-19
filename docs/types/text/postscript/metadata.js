export async function extractMetadata(intake) {
  const text = intake.text || '';
  const firstLine = text.split('\n')[0] || '';
  const get = (rx) => text.slice(0, 4000).match(rx)?.[1]?.replace(/^\(|\)$/g, '').trim() || null;

  const fields = [
    { label: 'Format', value: /EPSF/i.test(firstLine) ? 'EPS (Encapsulated PostScript)' : 'PostScript' },
    { label: 'DSC Version', value: firstLine.match(/PS-Adobe-([\d.]+)/)?.[1] || null },
    { label: 'Language Level', value: get(/^%%LanguageLevel:\s*(.+)/m) },
    { label: 'Title', value: get(/^%%Title:\s*(.+)/m) },
    { label: 'Creator', value: get(/^%%Creator:\s*(.+)/m) },
    { label: 'Date', value: get(/^%%CreationDate:\s*(.+)/m) },
    { label: 'Pages', value: get(/^%%Pages:\s*(\d+)/m) },
    { label: 'Bounding Box', value: get(/^%%BoundingBox:\s*(.+)/m) },
  ].filter((f) => f.value);

  return { fields };
}
