const GB_LOGO = [0xce, 0xed, 0x66, 0x66];
const NES_MAPPERS = { 0: 'NROM', 1: 'MMC1', 4: 'MMC3' };
const GB_CART = {
  0x00: 'ROM only', 0x01: 'MBC1', 0x02: 'MBC1 + RAM', 0x03: 'MBC1 + RAM + Battery',
  0x05: 'MBC2', 0x06: 'MBC2 + Battery', 0x0f: 'MBC3 + Timer + Battery',
  0x10: 'MBC3 + Timer + RAM + Battery', 0x11: 'MBC3', 0x12: 'MBC3 + RAM',
  0x13: 'MBC3 + RAM + Battery', 0x19: 'MBC5', 0x1a: 'MBC5 + RAM',
  0x1b: 'MBC5 + RAM + Battery', 0x1c: 'MBC5 + Rumble', 0x1d: 'MBC5 + Rumble + RAM',
  0x1e: 'MBC5 + Rumble + RAM + Battery',
};
const GB_ROM = { 0x00: '32 KB', 0x01: '64 KB', 0x02: '128 KB', 0x03: '256 KB', 0x04: '512 KB', 0x05: '1 MB', 0x06: '2 MB', 0x07: '4 MB', 0x08: '8 MB' };
const GB_RAM = { 0x00: 'None', 0x01: '2 KB', 0x02: '8 KB', 0x03: '32 KB', 0x04: '128 KB', 0x05: '64 KB' };
const COUNTRY = { 0: 'Japan', 1: 'USA', 2: 'Europe', 3: 'Sweden', 4: 'Finland', 5: 'Denmark', 6: 'France', 7: 'Netherlands', 8: 'Spain', 9: 'Germany', 10: 'Italy', 11: 'China', 12: 'Indonesia', 13: 'Korea' };

function ascii(b, start, len) {
  let s = '';
  for (let i = 0; i < len && start + i < b.length; i++) {
    const c = b[start + i];
    if (!c) break;
    if (c >= 32 && c <= 126) s += String.fromCharCode(c);
  }
  return s.trim();
}

function hex32(b, o) {
  if (o + 3 >= b.length) return '';
  return [b[o], b[o + 1], b[o + 2], b[o + 3]].map((n) => n.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function parseNes(b) {
  if (b.length < 16) return null;
  if (!(b[0] === 0x4e && b[1] === 0x45 && b[2] === 0x53 && b[3] === 0x1a)) return null;
  const mapper = (b[6] >> 4) | (b[7] & 0xf0);
  return {
    format: 'NES',
    title: 'iNES ROM',
    fields: [
      ['PRG-ROM', String(b[4]) + ' bank' + (b[4] === 1 ? '' : 's') + ' (' + (b[4] * 16) + ' KB)'],
      ['CHR-ROM', String(b[5]) + ' bank' + (b[5] === 1 ? '' : 's') + ' (' + (b[5] * 8) + ' KB)'],
      ['Mapper', String(mapper) + (NES_MAPPERS[mapper] ? ' (' + NES_MAPPERS[mapper] + ')' : '')],
      ['Mirroring', (b[6] & 1) ? 'Vertical' : 'Horizontal'],
      ['Battery-backed SRAM', (b[6] & 2) ? 'yes' : 'no'],
    ],
  };
}

function snesHeaderAt(b, off, fallbackType) {
  if (off + 0x20 >= b.length) return null;
  const title = ascii(b, off, 21);
  if (!title) return null;
  const map = b[off + 0x15];
  const romType = (map & 1) ? 'HiROM' : fallbackType;
  const romExp = b[off + 0x17], ramExp = b[off + 0x18], country = b[off + 0x19];
  const pal = [2, 3, 5, 6, 7, 13, 17].includes(country);
  return {
    format: 'SNES',
    title,
    fields: [
      ['ROM type', romType],
      ['ROM size', Number.isFinite(romExp) ? String(1 << Math.max(0, romExp)) + ' KB' : 'unknown'],
      ['SRAM size', ramExp ? String(1 << Math.max(0, ramExp)) + ' KB' : 'None'],
      ['Country/region', String(country) + (COUNTRY[country] ? ' (' + COUNTRY[country] + ')' : '')],
      ['Video mode', pal ? 'PAL' : 'NTSC'],
    ],
  };
}

function parseSnes(b) {
  return snesHeaderAt(b, 0x7fc0, 'LoROM') || snesHeaderAt(b, 0xffc0, 'HiROM')
    || snesHeaderAt(b, 0x81c0, 'LoROM') || snesHeaderAt(b, 0x101c0, 'HiROM');
}

function parseGb(b) {
  if (b.length < 0x150 || !GB_LOGO.every((v, i) => b[0x104 + i] === v)) return null;
  const cgb = b[0x143];
  return {
    format: 'Game Boy',
    title: ascii(b, 0x134, 15) || 'Untitled',
    fields: [
      ['CGB support', cgb === 0xc0 ? 'CGB only' : cgb === 0x80 ? 'CGB compatible' : 'No'],
      ['SGB support', b[0x146] === 0x03 ? 'yes' : 'no'],
      ['Cartridge type', GB_CART[b[0x147]] || '0x' + b[0x147].toString(16).padStart(2, '0')],
      ['ROM size', GB_ROM[b[0x148]] || 'unknown'],
      ['RAM size', GB_RAM[b[0x149]] || 'unknown'],
      ['Destination', b[0x14a] === 0 ? 'Japanese' : 'Non-Japanese'],
    ],
  };
}

function normalizeN64(b) {
  if (b[0] === 0x80 && b[1] === 0x37 && b[2] === 0x12 && b[3] === 0x40) return { bytes: b, endian: '.z64 big-endian' };
  const out = b.slice();
  if (b[0] === 0x37 && b[1] === 0x80 && b[2] === 0x40 && b[3] === 0x12) {
    for (let i = 0; i + 1 < out.length; i += 2) { const t = out[i]; out[i] = out[i + 1]; out[i + 1] = t; }
    return { bytes: out, endian: '.v64 byte-swapped' };
  }
  if (b[0] === 0x40 && b[1] === 0x12 && b[2] === 0x37 && b[3] === 0x80) {
    for (let i = 0; i + 3 < out.length; i += 4) { const a = out[i], c = out[i + 1]; out[i] = out[i + 3]; out[i + 1] = out[i + 2]; out[i + 2] = c; out[i + 3] = a; }
    return { bytes: out, endian: '.n64 little-endian' };
  }
  return null;
}

function parseN64(b) {
  const norm = normalizeN64(b);
  if (!norm || norm.bytes.length < 0x40) return null;
  const n = norm.bytes;
  return {
    format: 'Nintendo 64',
    title: ascii(n, 0x20, 20) || 'Untitled',
    fields: [
      ['Byte order', norm.endian],
      ['Game code', ascii(n, 0x3b, 4) || 'unknown'],
      ['Country code', ascii(n, 0x3e, 1) || 'unknown'],
      ['CRC1', hex32(n, 0x10)],
      ['CRC2', hex32(n, 0x14)],
    ],
  };
}

export function parseRom(bytes) {
  const b = bytes || new Uint8Array();
  return parseNes(b) || parseGb(b) || parseN64(b) || parseSnes(b);
}
