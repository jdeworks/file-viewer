export async function extractMetadata(intake) {
  const text = intake.text || '';
  const tunes = (text.match(/^X:\s*\d/gm) || []).length;
  const get = (rx) => text.match(rx)?.[1]?.trim() || null;
  const fields = [
    { label: 'Format', value: 'ABC Music Notation' },
    { label: 'Tunes', value: tunes ? String(tunes) : null },
    { label: 'First Title', value: get(/^T:\s*(.+)/m) },
    { label: 'Composer', value: get(/^C:\s*(.+)/m) },
    { label: 'Key', value: get(/^K:\s*(\S+)/m) },
    { label: 'Meter', value: get(/^M:\s*(\S+)/m) },
  ].filter((f) => f.value);
  return { fields };
}
