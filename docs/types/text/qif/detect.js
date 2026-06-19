// QIF (Quicken Interchange Format): starts with !Type: or !Account or !Option
// https://en.wikipedia.org/wiki/Quicken_Interchange_Format

export function detect(intake) {
  const { filename, textSample } = intake;
  const ext = filename ? filename.split('.').pop().toLowerCase() : '';
  const isQifExt = ext === 'qif' || ext === 'qfx';

  if (!textSample) return isQifExt ? 0.4 : 0;

  const s = textSample.trimStart();
  if (s.startsWith('!Type:') || s.startsWith('!type:')) {
    return isQifExt ? 0.99 : 0.95;
  }
  if (s.startsWith('!Account') || s.startsWith('!account') || s.startsWith('!Option')) {
    return isQifExt ? 0.99 : 0.90;
  }
  return isQifExt ? 0.5 : 0;
}
