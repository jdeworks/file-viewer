export function metadata(intake) {
  const s = (intake.textSample || '').trimStart();
  const verMatch = s.match(/^##gff-version\s+(\S+)/im);
  if (!verMatch) return {};
  const lines = s.split('\n').filter(l => !l.startsWith('#') && l.includes('\t'));
  const types = {};
  for (const l of lines.slice(0, 200)) {
    const t = l.split('\t')[2];
    if (t) types[t] = (types[t] || 0) + 1;
  }
  return { format: `GFF${verMatch[1]}`, featureTypes: Object.keys(types).length };
}
