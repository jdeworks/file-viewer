function parseFlatHeader(rawText, isBinary, bytes) {
  const kv = {};
  const lines = isBinary && bytes
    ? [String.fromCharCode(...bytes.slice(0, 46080))].flatMap((t) => {
        const rows = [];
        for (let i = 0; i < t.length; i += 80) rows.push(t.slice(i, i + 80));
        return rows;
      })
    : (rawText || '').split('\n');
  for (const raw of lines) {
    const rec = raw.padEnd(80, ' ');
    const kw = rec.slice(0, 8).trim();
    if (kw === 'END') break;
    if (!kw || kw === 'COMMENT' || kw === 'HISTORY') continue;
    const val = rec.slice(10).trim().replace(/^=\s*/, '').replace(/^'(.*?)'$/, (_, s) => s.trim()).split('/')[0].trim();
    kv[kw] = val;
  }
  return kv;
}

export async function extractMetadata(intake) {
  const text = intake.text || '';
  const kv = parseFlatHeader(text, intake.isBinary, intake.bytes);
  const bitpixDesc = { 8: '8-bit uint', 16: '16-bit int', 32: '32-bit int', 64: '64-bit int', '-32': '32-bit float', '-64': '64-bit float' };
  const fields = [
    { label: 'Format', value: 'FITS (Flexible Image Transport System)' },
    { label: 'Object', value: kv.OBJECT || null },
    { label: 'Telescope', value: kv.TELESCOP || null },
    { label: 'Instrument', value: kv.INSTRUME || null },
    { label: 'Observer', value: kv.OBSERVER || null },
    { label: 'Date', value: kv['DATE-OBS'] || kv.DATE || null },
    { label: 'Dimensions', value: [kv.NAXIS1, kv.NAXIS2, kv.NAXIS3].filter(Boolean).join(' × ') || null },
    { label: 'Data Type', value: kv.BITPIX ? (bitpixDesc[kv.BITPIX] || `BITPIX=${kv.BITPIX}`) : null },
    { label: 'Exposure', value: kv.EXPTIME ? `${kv.EXPTIME}s` : null },
  ].filter((f) => f.value);
  return { fields };
}
