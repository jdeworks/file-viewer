export async function extractMetadata(intake) {
  const lines = (intake.text || '').split(/\r?\n/);
  const rules = lines.filter((l) => l.trim() && !l.trim().startsWith('#'));
  return {
    'Rules': rules.length,
    'Comments': lines.filter((l) => l.trim().startsWith('#')).length,
    'Negations': rules.filter((l) => l.trim().startsWith('!')).length,
    'Directories': rules.filter((l) => l.trim().endsWith('/')).length,
  };
}
