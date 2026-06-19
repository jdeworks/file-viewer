// LMMS .mmp: plain XML starting with <lmms-project or <?xml
// LMMS .mmpz: gzip-compressed .mmp (magic: 1f 8b)

export function detect(intake) {
  const { filename, bytes: b, textSample } = intake;
  const ext = filename ? filename.split('.').pop().toLowerCase() : '';
  const isLmmsExt = ext === 'mmp' || ext === 'mmpz';

  if (!b || b.length < 4) return isLmmsExt ? 0.5 : 0;

  // .mmpz: gzip magic
  const isGzip = b[0] === 0x1f && b[1] === 0x8b;
  if (isGzip && ext === 'mmpz') return 0.95;
  if (isGzip && isLmmsExt) return 0.95;

  // .mmp: XML with lmms-project root
  if (textSample) {
    const s = textSample.trimStart();
    if (s.includes('<lmms-project')) return isLmmsExt ? 0.99 : 0.92;
    if (s.includes('<?xml') && isLmmsExt) return 0.80;
  }
  return isLmmsExt ? 0.5 : 0;
}
