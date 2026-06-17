export function detect(intake) {
  if (intake.isBinary) return 0;
  const filename = intake.filename?.toLowerCase() || '';
  const base = filename.split('/').pop().split('\\').pop();

  // Exact matches for .env* filenames — higher priority than INI (0.9)
  if (base === '.env' || base.startsWith('.env.') || base.endsWith('.env')) return 0.95;

  // Content heuristic: majority of non-empty non-comment lines are KEY=VALUE
  const lines = (intake.textSample || '').split('\n').filter((l) => l.trim() && !l.trim().startsWith('#'));
  if (lines.length === 0) return 0;
  const kvLines = lines.filter((l) => /^(?:export\s+)?[A-Z_][A-Z0-9_]*\s*=/.test(l.trim()));
  if (kvLines.length / lines.length >= 0.7 && kvLines.length >= 3) return 0.75;

  return 0;
}
