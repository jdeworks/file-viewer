const EXT_CORE = {
  '.nes': 'fceumm',
  '.sfc': 'snes9x', '.smc': 'snes9x',
  '.gb': 'gambatte', '.gbc': 'gambatte',
  '.gba': 'mgba',
  '.gen': 'genesis_plus_gx', '.smd': 'genesis_plus_gx',
  '.a26': 'stella2014',
};

export function detect(intake) {
  if (!intake.isBinary) return 0;
  const ext = '.' + intake.filename.split('.').pop().toLowerCase();
  if (EXT_CORE[ext]) return 0.92;
  // NES magic: 4E 45 53 1A
  const b = intake.bytes;
  if (b[0] === 0x4e && b[1] === 0x45 && b[2] === 0x53 && b[3] === 0x1a) return 0.98;
  return 0;
}

export { EXT_CORE };
