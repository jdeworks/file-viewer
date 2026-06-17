export function extractMetadata(intake) {
  const text = intake.text || '';
  let keyCount = 0;
  const keys = new Set();
  // Quick scan for "key" = patterns
  const re = /^"((?:[^"\\]|\\.)*)"\s*=/gm;
  let m;
  while ((m = re.exec(text)) !== null) { keys.add(m[1]); keyCount++; }
  return {
    format: intake.filename?.endsWith('.stringsdict') ? 'StringsDict (plural rules)' : 'Strings (localization)',
    keyCount,
    uniqueKeys: keys.size,
  };
}
