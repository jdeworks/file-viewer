const FORMATS = { wOFF: 'WOFF', wOF2: 'WOFF2', OTTO: 'OpenType (CFF)', true: 'TrueType', ttcf: 'TrueType Collection' };

export function extract(intake) {
  const b = intake.bytes || new Uint8Array();
  let format = 'unknown';
  if (b.length >= 4) {
    const sig = String.fromCharCode(b[0], b[1], b[2], b[3]);
    if (FORMATS[sig]) format = FORMATS[sig];
    else if (b[0] === 0x00 && b[1] === 0x01 && b[2] === 0x00 && b[3] === 0x00) format = 'TrueType';
  }
  return [
    { label: 'Format', value: format },
    { label: 'Size', value: (intake.size / 1024).toFixed(1) + ' KB' },
  ];
}
