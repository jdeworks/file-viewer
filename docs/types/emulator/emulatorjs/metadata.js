import { EXT_CORE } from './detect.js';

const CORE_NAMES = {
  fceumm: 'NES / Famicom', snes9x: 'Super Nintendo', gambatte: 'Game Boy / GBC',
  mgba: 'Game Boy Advance', genesis_plus_gx: 'Sega Genesis / Mega Drive', stella2014: 'Atari 2600',
};

export async function extractMetadata(intake) {
  const ext = '.' + intake.filename.split('.').pop().toLowerCase();
  const core = EXT_CORE[ext];
  const b = intake.bytes;
  const result = { System: CORE_NAMES[core] || 'Unknown', 'Size': (b.length / 1024).toFixed(0) + ' KB' };
  // NES: parse iNES header
  if (b[0] === 0x4e && b[1] === 0x45 && b[2] === 0x53 && b[3] === 0x1a) {
    result['PRG ROM'] = b[4] + ' × 16KB';
    result['CHR ROM'] = b[5] + ' × 8KB';
    result['Mapper'] = ((b[6] >> 4) | (b[7] & 0xF0)).toString();
  }
  return result;
}
