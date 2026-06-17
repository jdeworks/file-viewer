import { parseRom } from './headers.js';

export async function extractMetadata(intake) {
  const rom = parseRom(intake.bytes);
  if (!rom) return { fields: [{ label: 'Format', value: 'Unknown ROM' }] };
  return {
    fields: [
      { label: 'Format', value: rom.format },
      { label: 'Title', value: rom.title },
      ...rom.fields.map(([label, value]) => ({ label, value })),
    ],
  };
}
