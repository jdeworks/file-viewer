export function extract(intake) {
  let patterns = 0, negated = 0, directories = 0, anchored = 0, wildcards = 0, sections = 0;
  for (const raw of (intake.text || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#')) { sections++; continue; }
    patterns++;
    if (line.startsWith('!')) negated++;
    if (line.endsWith('/')) directories++;
    if (line.startsWith('/')) anchored++;
    if (/[*?[]/.test(line)) wildcards++;
  }
  return [
    { label: 'Patterns', value: String(patterns) },
    { label: 'Sections', value: String(sections) },
    { label: 'Negations', value: String(negated) },
    { label: 'Directory-only', value: String(directories) },
    { label: 'Anchored', value: String(anchored) },
    { label: 'Wildcards', value: String(wildcards) },
  ];
}
