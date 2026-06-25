const WAV_HEADER_SCAN_BYTES = 256 * 1024;

function fourcc(view, offset) {
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3),
  );
}

function finiteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizePcmArg(n) {
  return Number(Number(n).toFixed(6)).toString();
}

export function buildAudioCompareExtractArgs(inputName, outputName, range = {}) {
  const start = clamp(finiteNumber(range.start, 0), 0, Number.MAX_VALUE);
  const end = clamp(finiteNumber(range.end, start), start, Number.MAX_VALUE);
  const duration = Math.max(0, end - start);
  return ['-ss', normalizePcmArg(start), '-t', normalizePcmArg(duration), '-i', inputName,
    '-map', '0:a:0', '-vn', '-c:a', 'pcm_s16le', outputName];
}

export async function parsePcmWavHeader(blob) {
  if (!blob || blob.size < 44 || typeof blob.slice !== 'function') return null;
  const headerBytes = await blob.slice(0, Math.min(blob.size, WAV_HEADER_SCAN_BYTES)).arrayBuffer();
  const view = new DataView(headerBytes);
  if (view.byteLength < 44 || fourcc(view, 0) !== 'RIFF' || fourcc(view, 8) !== 'WAVE') return null;

  let fmt = null;
  let data = null;
  let offset = 12;
  while (offset + 8 <= view.byteLength) {
    const id = fourcc(view, offset);
    const size = view.getUint32(offset + 4, true);
    const payload = offset + 8;

    if (id === 'fmt ' && size >= 16 && payload + 16 <= view.byteLength) {
      const audioFormat = view.getUint16(payload, true);
      const channels = view.getUint16(payload + 2, true);
      const sampleRate = view.getUint32(payload + 4, true);
      const byteRate = view.getUint32(payload + 8, true);
      const blockAlign = view.getUint16(payload + 12, true);
      const bitsPerSample = view.getUint16(payload + 14, true);
      fmt = { audioFormat, channels, sampleRate, byteRate, blockAlign, bitsPerSample };
    } else if (id === 'data') {
      data = { offset: payload, bytes: Math.min(size, Math.max(0, blob.size - payload)) };
      break;
    }

    if (payload + size > view.byteLength) break;
    offset = payload + size + (size % 2);
  }

  if (!fmt || !data) return null;
  const { audioFormat, channels, sampleRate, blockAlign, bitsPerSample } = fmt;
  const isPcmInt = audioFormat === 1 && (bitsPerSample === 8 || bitsPerSample === 16);
  const isFloat32 = audioFormat === 3 && bitsPerSample === 32;
  const bytesPerSample = bitsPerSample / 8;
  if ((!isPcmInt && !isFloat32) || channels < 1 || sampleRate < 1) return null;
  if (blockAlign !== channels * bytesPerSample || data.bytes < blockAlign) return null;

  const frameCount = Math.floor(data.bytes / blockAlign);
  return {
    container: 'wav',
    audioFormat,
    channels,
    sampleRate,
    bitsPerSample,
    bytesPerSample,
    blockAlign,
    dataOffset: data.offset,
    dataBytes: frameCount * blockAlign,
    frameCount,
    duration: frameCount / sampleRate,
  };
}

export async function readPcmWavFirstChannelRange(blob, range = {}, options = {}) {
  const header = await parsePcmWavHeader(blob);
  if (!header) return null;
  const duration = header.duration;
  const startSeconds = clamp(finiteNumber(range.start, 0), 0, duration);
  const endSeconds = clamp(range.end == null ? duration : finiteNumber(range.end, duration), startSeconds, duration);
  const startFrame = clamp(Math.floor(startSeconds * header.sampleRate), 0, header.frameCount);
  const endFrame = clamp(Math.ceil(endSeconds * header.sampleRate), startFrame, header.frameCount);
  const frameCount = Math.max(0, endFrame - startFrame);
  const byteStart = header.dataOffset + startFrame * header.blockAlign;
  const byteEnd = header.dataOffset + endFrame * header.blockAlign;
  const byteLength = Math.max(0, byteEnd - byteStart);
  const maxBytes = finiteNumber(options.maxBytes, 0);
  if (maxBytes > 0 && byteLength > maxBytes) {
    throw new Error(`${options.label || 'Selected WAV range'} is too large for compare analysis (${(byteLength / 1048576).toFixed(1)} MB; limit ${(maxBytes / 1048576).toFixed(0)} MB).`);
  }
  const bytes = await blob.slice(byteStart, byteEnd).arrayBuffer();
  const view = new DataView(bytes);
  const channel = new Float32Array(frameCount);

  for (let frame = 0; frame < frameCount; frame++) {
    const offset = frame * header.blockAlign;
    if (header.audioFormat === 1 && header.bitsPerSample === 8) {
      channel[frame] = (view.getUint8(offset) - 128) / 128;
    } else if (header.audioFormat === 1 && header.bitsPerSample === 16) {
      channel[frame] = Math.max(-1, view.getInt16(offset, true) / 32768);
    } else if (header.audioFormat === 3 && header.bitsPerSample === 32) {
      channel[frame] = clamp(finiteNumber(view.getFloat32(offset, true), 0), -1, 1);
    }
  }

  return {
    channel,
    sampleRate: header.sampleRate,
    duration,
    rangeStart: startFrame / header.sampleRate,
    rangeEnd: endFrame / header.sampleRate,
    slicedDuration: frameCount / header.sampleRate,
    bytesRead: bytes.byteLength,
    header,
  };
}
