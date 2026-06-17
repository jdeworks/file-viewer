export async function extractMetadata(intake) {
  const text = intake.text || '';
  let ruleCount = 0, binaryCount = 0, eolCount = 0;
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    ruleCount++;
    if (/\bbinary\b/.test(t)) binaryCount++;
    if (/\b(text|eol=)/.test(t)) eolCount++;
  }
  return {
    'Rules': ruleCount,
    'Binary patterns': binaryCount,
    'Line ending rules': eolCount,
  };
}
