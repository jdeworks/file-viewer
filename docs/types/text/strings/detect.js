export function detect(intake) {
  if (intake.isBinary) return 0;
  const ext = intake.filename?.toLowerCase().split('.').pop();
  const sample = intake.textSample || '';

  if (ext === 'stringsdict') return 0.95; // Apple plural rules XML

  // .strings format: "key" = "value"; pattern
  const looksLikeStrings = /^\s*(".*?"\s*=\s*".*?"\s*;|\/\*.*?\*\/)/m.test(sample);
  if (looksLikeStrings && ext === 'strings') return 0.97;
  if (looksLikeStrings) return 0.75; // content match, any extension
  if (ext === 'strings') return 0.65;
  return 0;
}
