import { hasExtension, mimeMatches } from '../../../core/detect.js';

// CSV/TSV: extension/MIME are strong; otherwise look for consistent delimiter counts
// across the first lines (so we don't misfire on prose).
export function detect(intake) {
  if (intake.isBinary) return 0;
  if (hasExtension(intake, 'csv', 'tsv')) return 0.95;
  if (mimeMatches(intake, 'csv', 'tab-separated')) return 0.9;

  const lines = (intake.textSample || '').split('\n').filter((l) => l.trim()).slice(0, 10);
  if (lines.length < 2) return 0;
  for (const delim of [',', '\t', ';']) {
    const counts = lines.map((l) => l.split(delim).length - 1);
    if (counts[0] >= 1 && counts.every((c) => c === counts[0])) return 0.55;  // consistent columns
  }
  return 0;
}
