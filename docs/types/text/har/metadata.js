import { parseHar } from './renderer.js';

export async function extractMetadata(intake) {
  const har = parseHar(intake);
  return {
    fields: [
      { label: 'Entries', value: String(har.entries.length) },
      { label: 'Date', value: har.date || 'unknown' },
      { label: 'Creator', value: har.creator || 'unknown' },
      { label: 'Pages', value: String(har.pages) },
    ],
  };
}
