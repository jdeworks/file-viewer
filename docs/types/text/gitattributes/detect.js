export function detect(intake) {
  if (intake.isBinary) return 0;
  const base = (intake.filename || '').split('/').pop().split('\\').pop().toLowerCase();
  if (base === '.gitattributes') return 0.97;
  // Content heuristic: lines like "*.ext  text eol=lf" or "path binary"
  const sample = intake.textSample || '';
  const kvLines = sample.split('\n').filter(l => {
    const t = l.trim();
    return t && !t.startsWith('#') && /^[^\s]+\s+(text|binary|eol=|diff=|merge=|linguist-|export-)/.test(t);
  });
  if (kvLines.length >= 2) return 0.7;
  return 0;
}
