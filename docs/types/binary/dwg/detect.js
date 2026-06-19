// AutoCAD DWG files start with "AC" followed by a 4-digit version number.
// Known versions: AC1006 (R10), AC1009 (R11/12), AC1012 (R13), AC1014 (R14),
// AC1015 (2000), AC1018 (2004), AC1021 (2007), AC1024 (2010), AC1027 (2013),
// AC1032 (2018), AC1035 (2023)
const DWG_MAGIC = [0x41, 0x43]; // 'AC'

export function detect(intake) {
  const { filename, bytes: b } = intake;
  const ext = filename ? filename.split('.').pop().toLowerCase() : '';
  const isDwgExt = ext === 'dwg';

  if (!b || b.length < 6) return isDwgExt ? 0.6 : 0;

  const hasMagic = b[0] === DWG_MAGIC[0] && b[1] === DWG_MAGIC[1];
  // version chars should be digits or letters: AC10xx / AC10xx
  const isVersionBytes = hasMagic &&
    b[2] >= 0x30 && b[2] <= 0x39 && // '0'-'9'
    b[3] >= 0x30 && b[3] <= 0x39;

  if (isDwgExt) return isVersionBytes ? 0.99 : hasMagic ? 0.85 : 0.65;
  return isVersionBytes ? 0.96 : hasMagic ? 0.70 : 0;
}
