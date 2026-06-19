export async function extractMetadata(intake) {
  const text = intake.text || '';
  const msh = text.split(/\r\n|\n|\r/).find((l) => l.startsWith('MSH|'));
  const fields = msh ? msh.split('|') : [];
  const segs = (text.match(/^[A-Z]{2,3}\|/gm) || []).length;
  const result = [
    { label: 'Format', value: 'HL7 v2.x' },
    { label: 'Version', value: fields[11] || null },
    { label: 'Message Type', value: fields[8]?.replace(/\^/g, ' / ') || null },
    { label: 'Sending App', value: fields[2] || null },
    { label: 'Receiving App', value: fields[4] || null },
    { label: 'Segments', value: segs ? String(segs) : null },
  ].filter((f) => f.value);
  return { fields: result };
}
