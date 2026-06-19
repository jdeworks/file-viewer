export async function extractMetadata(intake) {
  const text = intake.text || '';
  const get = (rx) => text.match(rx)?.[1]?.trim() || null;
  const count = (tag) => (text.match(new RegExp(`<${tag}[\\s>]`, 'g')) || []).length;
  const isDrumkit = /<hydrogen_drumkit>/i.test(text);
  const fields = [
    { label: 'Format', value: isDrumkit ? 'Hydrogen Drumkit' : 'Hydrogen Song' },
    { label: 'Name', value: get(/<name>(.*?)<\/name>/) },
    { label: 'Author', value: get(/<author>(.*?)<\/author>/) },
    { label: 'BPM', value: get(/<bpm>(.*?)<\/bpm>/) },
    { label: 'Instruments', value: String(count('instrument') || '') || null },
    { label: 'Patterns', value: String(count('pattern') || '') || null },
  ].filter((f) => f.value);
  return { fields };
}
