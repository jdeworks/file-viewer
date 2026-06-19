export function extractMetadata(intake) {
  const b = intake.bytes;
  if (!b || b.length < 128) return {};
  const headerText = new TextDecoder('ascii', { fatal: false }).decode(b.slice(0, 116)).replace(/\x00/g, '').trim();
  if (!headerText.startsWith('MATLAB 5.0 MAT-file')) return {};
  const isLE = b[126] === 0x49;
  return {
    Format: 'MATLAB MAT-file v5',
    Endianness: isLE ? 'Little-endian' : 'Big-endian',
    Header: headerText.length > 60 ? headerText.slice(0, 60) + '…' : headerText,
    'File size': `${b.length} bytes`,
  };
}
