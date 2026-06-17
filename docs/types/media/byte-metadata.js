const MPEG_BITRATES = {
  '1-1': [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448],
  '1-2': [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384],
  '1-3': [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  '2-1': [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256],
  '2-2': [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
  '2-3': [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
};
const SAMPLE_RATES = {
  1: [44100, 48000, 32000],
  2: [22050, 24000, 16000],
  2.5: [11025, 12000, 8000],
};
const LAYERS = { 1: 'Layer I', 2: 'Layer II', 3: 'Layer III' };
const CHANNEL_MODES = ['Stereo', 'Joint stereo', 'Dual channel', 'Mono'];
const WAVE_FORMATS = {
  1: 'PCM',
  3: 'IEEE float',
  6: 'A-law',
  7: 'mu-law',
  0xfffe: 'Extensible',
};

const ascii = (b, o, n) => {
  if (!b || o + n > b.length) return '';
  let s = '';
  for (let i = 0; i < n; i++) s += String.fromCharCode(b[o + i]);
  return s;
};

const u16le = (b, o) => b[o] | (b[o + 1] << 8);
const u32le = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
const u32be = (b, o) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
const syncsafe = (b, o) => (b[o] << 21) | (b[o + 1] << 14) | (b[o + 2] << 7) | b[o + 3];

export function parseMediaContainer(bytes) {
  if (!bytes || bytes.length < 12) return [];
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WAVE') return parseWave(bytes);
  if (ascii(bytes, 4, 4) === 'ftyp') return parseIsoBmff(bytes);
  const mp3 = parseMp3(bytes);
  return mp3 ? mp3 : [];
}

function parseWave(bytes) {
  let o = 12;
  let fmt = null;
  let dataBytes = null;
  while (o + 8 <= bytes.length && o < 512 * 1024) {
    const id = ascii(bytes, o, 4);
    const len = u32le(bytes, o + 4);
    const data = o + 8;
    if (len > bytes.length - data) break;
    if (id === 'fmt ' && len >= 16) {
      fmt = {
        format: u16le(bytes, data),
        channels: u16le(bytes, data + 2),
        sampleRate: u32le(bytes, data + 4),
        byteRate: u32le(bytes, data + 8),
        bits: u16le(bytes, data + 14),
      };
    } else if (id === 'data') {
      dataBytes = len;
      break;
    }
    o = data + len + (len % 2);
  }
  if (!fmt) return [];
  const rows = [
    { label: 'Audio codec', value: WAVE_FORMATS[fmt.format] || ('Format #' + fmt.format) },
    { label: 'Channels', value: String(fmt.channels) },
    { label: 'Sample rate', value: fmt.sampleRate.toLocaleString() + ' Hz' },
  ];
  if (fmt.bits) rows.push({ label: 'Bit depth', value: fmt.bits + '-bit' });
  if (fmt.byteRate) rows.push({ label: 'Byte rate', value: Math.round(fmt.byteRate / 1024).toLocaleString() + ' KiB/s' });
  if (dataBytes != null) rows.push({ label: 'Audio data', value: dataBytes.toLocaleString() + ' bytes' });
  return rows;
}

function parseIsoBmff(bytes) {
  if (bytes.length < 16) return [];
  const boxSize = u32be(bytes, 0);
  const end = Math.min(bytes.length, boxSize > 16 ? boxSize : 16);
  const major = ascii(bytes, 8, 4).trim();
  const minor = u32be(bytes, 12);
  const brands = [];
  for (let o = 16; o + 4 <= end && o < 80; o += 4) {
    const brand = ascii(bytes, o, 4).trim();
    if (brand) brands.push(brand);
  }
  const rows = [];
  if (major) rows.push({ label: 'Major brand', value: major });
  if (Number.isFinite(minor)) rows.push({ label: 'Brand version', value: String(minor) });
  if (brands.length) rows.push({ label: 'Compatible brands', value: [...new Set(brands)].join(', ') });
  return rows;
}

function parseMp3(bytes) {
  let o = 0;
  if (ascii(bytes, 0, 3) === 'ID3' && bytes.length >= 10) o = 10 + syncsafe(bytes, 6);
  const end = Math.min(bytes.length - 4, o + 4096);
  for (; o <= end; o++) {
    if (bytes[o] !== 0xff || (bytes[o + 1] & 0xe0) !== 0xe0) continue;
    const versionBits = (bytes[o + 1] >> 3) & 0x03;
    const layerBits = (bytes[o + 1] >> 1) & 0x03;
    const bitrateIndex = (bytes[o + 2] >> 4) & 0x0f;
    const sampleIndex = (bytes[o + 2] >> 2) & 0x03;
    const channelMode = (bytes[o + 3] >> 6) & 0x03;
    if (versionBits === 1 || layerBits === 0 || bitrateIndex === 0 || bitrateIndex === 15 || sampleIndex === 3) continue;
    const version = versionBits === 3 ? 1 : versionBits === 2 ? 2 : 2.5;
    const layer = 4 - layerBits;
    const tableVersion = version === 1 ? 1 : 2;
    const bitrate = MPEG_BITRATES[tableVersion + '-' + layer]?.[bitrateIndex];
    const sampleRate = SAMPLE_RATES[version]?.[sampleIndex];
    if (!bitrate || !sampleRate) continue;
    return [
      { label: 'Audio codec', value: 'MPEG ' + version + ' ' + LAYERS[layer] },
      { label: 'Bitrate', value: bitrate + ' kbps' },
      { label: 'Sample rate', value: sampleRate.toLocaleString() + ' Hz' },
      { label: 'Channels', value: CHANNEL_MODES[channelMode] },
    ];
  }
  return null;
}
