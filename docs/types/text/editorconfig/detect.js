export function detect(intake) {
  if (intake.isBinary) return 0;
  const base = (intake.filename || '').split('/').pop().split('\\').pop().toLowerCase();
  if (base === '.editorconfig') return 0.98;
  // Content: has [*] or [*.ext] section + indent_style or indent_size
  const sample = intake.textSample || '';
  if (/^\[[\*\?!{\w.,\-/]+\]/m.test(sample) && /indent_(style|size)\s*=/m.test(sample)) return 0.8;
  return 0;
}
