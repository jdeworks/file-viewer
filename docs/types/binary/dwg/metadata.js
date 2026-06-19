const VERSION_MAP = {
  AC1006: 'R10', AC1009: 'R11/R12', AC1012: 'R13', AC1014: 'R14',
  AC1015: '2000', AC1018: '2004', AC1021: '2007', AC1024: '2010',
  AC1027: '2013', AC1032: '2018', AC1035: '2023',
};

export function extractMetadata(intake) {
  const b = intake.bytes;
  if (!b || b.length < 6) return {};
  const versionStr = new TextDecoder('ascii', { fatal: false }).decode(b.slice(0, 6));
  if (!versionStr.startsWith('AC')) return {};
  const acadVersion = VERSION_MAP[versionStr];
  return {
    Format: 'AutoCAD DWG',
    'Version': versionStr,
    ...(acadVersion ? { 'AutoCAD version': `AutoCAD ${acadVersion}` } : {}),
    'File size': `${b.length} bytes`,
  };
}
