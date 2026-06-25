export function parseIntakeMeta(intake) {
  const srcName = intake.filename || 'input';
  const srcExt = (srcName.includes('.') ? srcName.split('.').pop() : 'bin').toLowerCase();
  return {
    srcName,
    srcExt,
    inputName: 'input.' + srcExt,
    base: srcName.replace(/\.[^.]+$/, ''),
  };
}

export async function readIntakeBytes(intake) {
  if (intake.file) return new Uint8Array(await intake.file.arrayBuffer());
  return intake.bytes instanceof Uint8Array
    ? intake.bytes
    : new Uint8Array(intake.bytes.buffer || intake.bytes);
}

export function buildSecondaryInputSpec(file, fallbackExt) {
  const rawName = file?.name || '';
  const ext = rawName.includes('.') ? rawName.split('.').pop() : (fallbackExt || 'bin');
  return {
    name: 'secondary.' + String(ext).toLowerCase(),
    ext: String(ext).toLowerCase(),
  };
}
