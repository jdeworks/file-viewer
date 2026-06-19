// OpenEXR magic: 0x76 0x2F 0x31 0x01
const MAGIC = [0x76, 0x2f, 0x31, 0x01];

export function detect(intake) {
  const { filename, bytes: b } = intake;
  const ext = filename ? filename.split('.').pop().toLowerCase() : '';
  const isExrExt = ext === 'exr';

  if (!b || b.length < 4) return isExrExt ? 0.6 : 0;
  const hasMagic = MAGIC.every((v, i) => b[i] === v);

  if (isExrExt) return hasMagic ? 0.99 : 0.65;
  return hasMagic ? 0.97 : 0;
}
