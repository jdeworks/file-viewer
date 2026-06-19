export function detect(intake) {
  const { filename, textSample } = intake;
  const ext = filename ? filename.split('.').pop().toLowerCase() : '';
  const isStepExt = ext === 'stp' || ext === 'step' || ext === 'p21';

  if (!textSample) return isStepExt ? 0.6 : 0;

  const first = textSample.trimStart().slice(0, 60);
  const hasIsoMagic = first.startsWith('ISO-10303-21;');

  if (isStepExt) return hasIsoMagic ? 0.98 : 0.65;
  return hasIsoMagic ? 0.96 : 0;
}
