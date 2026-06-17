export function detect(intake) {
  if (intake.isBinary) return 0;

  const name = (intake.filename ?? '').toLowerCase();
  const text = intake.textSample ?? '';

  const hasExt = name.endsWith('.rdp');
  const hasContent = /^full address:s:/im.test(text);

  if (hasExt && hasContent) return 0.95;
  if (hasExt) return 0.7;
  if (hasContent) return 0.6;

  return 0;
}
