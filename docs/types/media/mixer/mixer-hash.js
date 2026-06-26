import { MIXER_LIMITS } from './mixer-config.js';

export async function hashFileIdentity(file, options = {}) {
  const size = Number(file?.size) || 0;
  const fullHashMaxBytes = options.fullHashMaxBytes ?? MIXER_LIMITS.fullHashMaxBytes;
  if (size <= fullHashMaxBytes) {
    const value = await sha256Hex(await file.arrayBuffer());
    return {
      algorithm: 'sha256-full-v1',
      value,
      byteRanges: [{ start: 0, end: size }],
    };
  }
  const windowBytes = Math.max(1, options.windowBytes ?? MIXER_LIMITS.partialHashWindowBytes);
  const byteRanges = partialByteRanges(size, windowBytes);
  const buffers = [];
  for (const range of byteRanges) {
    buffers.push(new Uint8Array(await file.slice(range.start, range.end).arrayBuffer()));
  }
  const joined = joinBuffers([
    new TextEncoder().encode(`${size}:${file.lastModified || 0}:${file.name || ''}:`),
    ...buffers,
  ]);
  return {
    algorithm: 'sha256-partial-v1',
    value: await sha256Hex(joined),
    byteRanges,
  };
}

export function partialByteRanges(size, windowBytes = MIXER_LIMITS.partialHashWindowBytes) {
  const total = Math.max(0, Number(size) || 0);
  const win = Math.max(1, Math.min(total || 1, Number(windowBytes) || 1));
  if (total <= win * 3) return [{ start: 0, end: total }];
  const middleStart = Math.max(win, Math.floor(total / 2 - win / 2));
  return [
    { start: 0, end: win },
    { start: middleStart, end: Math.min(total, middleStart + win) },
    { start: Math.max(0, total - win), end: total },
  ];
}

async function sha256Hex(buffer) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error('SHA-256 hashing requires crypto.subtle.');
  const digest = await subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function joinBuffers(buffers) {
  const length = buffers.reduce((sum, buffer) => sum + buffer.byteLength, 0);
  const out = new Uint8Array(length);
  let offset = 0;
  for (const buffer of buffers) {
    out.set(buffer, offset);
    offset += buffer.byteLength;
  }
  return out;
}

