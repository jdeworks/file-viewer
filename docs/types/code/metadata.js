import { languageFor } from './langmap.js';

export function extract(intake) {
  const text = intake.text || '';
  const lines = text.split('\n');
  const nonEmpty = lines.filter((l) => l.trim()).length;
  return [
    { label: 'Language', value: languageFor(intake) },
    { label: 'Lines', value: String(lines.length) },
    { label: 'Non-empty lines', value: String(nonEmpty) },
    { label: 'Characters', value: String(text.length) },
  ];
}
