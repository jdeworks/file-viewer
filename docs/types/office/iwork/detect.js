const EXTS = { '.pages': 'Pages', '.numbers': 'Numbers', '.keynote': 'Keynote' };

export function detect(intake) {
  if (!intake.isBinary) return 0;
  const ext = '.' + (intake.filename || '').split('.').pop().toLowerCase();
  if (!EXTS[ext]) return 0;
  // must have ZIP magic: 50 4B 03 04
  const b = intake.bytes;
  if (b.length < 4 || b[0] !== 0x50 || b[1] !== 0x4B || b[2] !== 0x03 || b[3] !== 0x04) return 0;
  return 0.92;
}

export { EXTS };
