const MPEG1_LAYER3_BITRATES = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
const MPEG2_LAYER3_BITRATES = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];

function ascii(bytes, offset, length) {
  let value = '';
  for (let i = 0; i < length && offset + i < bytes.length; i += 1) {
    value += String.fromCharCode(bytes[offset + i]);
  }
  return value;
}

function id3PayloadOffset(bytes) {
  if (ascii(bytes, 0, 3) !== 'ID3' || bytes.length < 10) return 0;
  const size = ((bytes[6] & 0x7f) << 21)
    | ((bytes[7] & 0x7f) << 14)
    | ((bytes[8] & 0x7f) << 7)
    | (bytes[9] & 0x7f);
  return Math.min(bytes.length, 10 + size + ((bytes[5] & 0x10) ? 10 : 0));
}

function parseFrameHeader(bytes, offset) {
  if (offset + 4 > bytes.length || bytes[offset] !== 0xff || (bytes[offset + 1] & 0xe0) !== 0xe0) return null;
  const versionBits = (bytes[offset + 1] >> 3) & 0x03;
  const layerBits = (bytes[offset + 1] >> 1) & 0x03;
  const bitrateIndex = (bytes[offset + 2] >> 4) & 0x0f;
  const sampleIndex = (bytes[offset + 2] >> 2) & 0x03;
  if (versionBits === 1 || layerBits !== 1 || bitrateIndex === 0 || bitrateIndex === 15 || sampleIndex === 3) return null;
  const version = versionBits === 3 ? 1 : (versionBits === 2 ? 2 : 2.5);
  const bitrateKbps = (version === 1 ? MPEG1_LAYER3_BITRATES : MPEG2_LAYER3_BITRATES)[bitrateIndex];
  const baseRate = [44100, 48000, 32000][sampleIndex];
  const sampleRate = version === 1 ? baseRate : (version === 2 ? baseRate / 2 : baseRate / 4);
  const padding = (bytes[offset + 2] >> 1) & 1;
  const frameLength = Math.floor((version === 1 ? 144000 : 72000) * bitrateKbps / sampleRate) + padding;
  const channelMode = (bytes[offset + 3] >> 6) & 0x03;
  return {
    version,
    bitrateKbps,
    sampleRate,
    channels: channelMode === 3 ? 1 : 2,
    frameLength,
    hasCrc: (bytes[offset + 1] & 1) === 0,
  };
}

function vbrMarker(bytes, offset, header) {
  const sideInfo = header.version === 1
    ? (header.channels === 1 ? 17 : 32)
    : (header.channels === 1 ? 9 : 17);
  const xing = ascii(bytes, offset + 4 + (header.hasCrc ? 2 : 0) + sideInfo, 4);
  if (xing === 'Xing' || xing === 'Info') return xing;
  return ascii(bytes, offset + 4 + 32, 4) === 'VBRI' ? 'VBRI' : '';
}

function firstFrame(bytes) {
  const start = id3PayloadOffset(bytes);
  for (let offset = start; offset + 4 <= bytes.length; offset += 1) {
    const header = parseFrameHeader(bytes, offset);
    if (!header || offset + header.frameLength > bytes.length) continue;
    const next = parseFrameHeader(bytes, offset + header.frameLength);
    if (next || offset + header.frameLength === bytes.length) return { offset, header };
  }
  return null;
}

function inspectWav(bytes) {
  if (ascii(bytes, 0, 4) !== 'RIFF' || ascii(bytes, 8, 4) !== 'WAVE' || bytes.length < 20) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const id = ascii(bytes, offset, 4);
    const size = view.getUint32(offset + 4, true);
    if (id === 'fmt ' && size >= 16 && offset + 8 + size <= bytes.length) {
      const format = view.getUint16(offset + 8, true);
      return {
        container: 'wav',
        codec: format === 1 ? 'PCM/WAV' : (format === 3 ? 'Float/WAV' : `WAV format ${format}`),
        bitrateKbps: Math.round(view.getUint32(offset + 16, true) * 8 / 1000),
        cbr: true,
        frameCount: 0,
        channels: view.getUint16(offset + 10, true),
        sampleRate: view.getUint32(offset + 12, true),
      };
    }
    offset += 8 + size + (size & 1);
  }
  return { container: 'wav', codec: 'WAV', bitrateKbps: null, cbr: true, frameCount: 0 };
}

export function inspectAcxEncoding(input, filename = '') {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input || 0);
  const first = firstFrame(bytes);
  if (!first) {
    const wav = inspectWav(bytes);
    if (wav) return wav;
    return {
      container: String(filename).split('.').pop()?.toLowerCase() || 'unknown',
      codec: 'unknown',
      bitrateKbps: null,
      cbr: null,
      frameCount: 0,
    };
  }

  const bitrates = new Set();
  const sampleRates = new Set();
  let frameCount = 0;
  let offset = first.offset;
  let marker = vbrMarker(bytes, offset, first.header);
  while (offset + 4 <= bytes.length && frameCount < 512) {
    const header = parseFrameHeader(bytes, offset);
    if (!header || header.frameLength <= 0 || offset + header.frameLength > bytes.length) break;
    bitrates.add(header.bitrateKbps);
    sampleRates.add(header.sampleRate);
    frameCount += 1;
    offset += header.frameLength;
  }
  const cbr = marker === 'Xing' || marker === 'VBRI'
    ? false
    : (frameCount >= 3 ? bitrates.size === 1 : null);
  return {
    container: 'mp3',
    codec: `MPEG ${first.header.version} Layer III`,
    bitrateKbps: bitrates.size === 1 ? [...bitrates][0] : null,
    cbr,
    frameCount,
    sampleRate: sampleRates.size === 1 ? [...sampleRates][0] : first.header.sampleRate,
    channels: first.header.channels,
    vbrMarker: marker || null,
  };
}
