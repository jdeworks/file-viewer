export async function extractMetadata(intake) {
  const text = intake.text || '';
  const get = (rx) => text.match(rx)?.[1]?.replace(/<[^>]+>/g, '').trim() || null;
  const countTag = (t) => (text.match(new RegExp(`<${t}[\\s>]`, 'g')) || []).length;
  const fields = [
    { label: 'Format', value: 'KML (Keyhole Markup Language)' },
    { label: 'Name', value: get(/<name[^>]*>([^<]+)<\/name>/) },
    { label: 'Placemarks', value: String(countTag('Placemark') || '') || null },
    { label: 'Folders', value: String(countTag('Folder') || '') || null },
    { label: 'Network Links', value: String(countTag('NetworkLink') || '') || null },
  ].filter((f) => f.value);
  return { fields };
}
