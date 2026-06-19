function hasExtension(intake, ...exts) {
  const name = (intake.filename || '').toLowerCase();
  return exts.some((e) => name.endsWith('.' + e));
}

export function detect(intake) {
  if (intake.isBinary) return 0;
  const sample = (intake.textSample || intake.text || '').slice(0, 1200);
  const lines = sample.split('\n');

  // Counts line is 4th line (index 3): "aaabbblll..." starting with atom/bond counts
  const hasMolCounts = lines.length >= 4 && /^\s*\d+\s+\d+\s+\d+/.test(lines[3]);
  // V2000/V3000 tag
  const hasVersion = /\bV[23]000\b/.test(sample);
  // SDF terminator
  const hasSdfEnd = /^\$\$\$\$$/m.test(sample);
  // M  END is the molfile terminator
  const hasMEnd = /^M\s{2}END/m.test(sample);

  const isMolLike = hasMolCounts || (hasVersion && hasMEnd);

  if (hasExtension(intake, 'sdf', 'sd')) {
    if (isMolLike || hasSdfEnd) return 0.95;
    return 0.5;
  }
  if (hasExtension(intake, 'mol')) {
    if (isMolLike) return 0.95;
    return 0.5;
  }

  if (isMolLike && hasSdfEnd) return 0.85;
  if (isMolLike && hasMEnd) return 0.70;
  return 0;
}
