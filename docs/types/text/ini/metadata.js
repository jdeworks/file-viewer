import { parseIni } from './renderer.js';

export function extract(intake) {
  const text = intake.text || '';
  const sections = parseIni(text);
  const pairs = sections.reduce((n, s) => n + s.pairs.length, 0);
  const named = sections.filter((s) => s.name).length;
  const comments = text.split(/\r?\n/).filter((l) => /^\s*[#;]/.test(l)).length;
  const keys = new Set();
  let duplicates = 0;
  for (const s of sections) {
    for (const p of s.pairs) {
      const key = (s.name || '') + '\0' + p.key;
      if (keys.has(key)) duplicates++;
      keys.add(key);
    }
  }
  return [
    { label: 'Keys', value: String(pairs) },
    { label: 'Sections', value: String(named) },
    { label: 'Comments', value: String(comments) },
    { label: 'Duplicate keys', value: String(duplicates) },
  ];
}
