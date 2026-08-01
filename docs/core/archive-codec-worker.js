const CHUNK_BYTES = 64 * 1024;
const MAX_OUTPUT_BYTES = 64 * 1024 * 1024;

function boundedCollector(maxOutputBytes) {
  const chunks = [];
  let current = new Uint8Array(Math.min(CHUNK_BYTES, maxOutputBytes));
  let currentLength = 0;
  let total = 0;

  const appendByte = (byte) => {
    if (total >= maxOutputBytes) throw new Error('Decompressed stream exceeds the in-browser output limit.');
    if (currentLength === current.length) {
      chunks.push(current);
      current = new Uint8Array(Math.min(CHUNK_BYTES, maxOutputBytes - total));
      currentLength = 0;
    }
    current[currentLength++] = byte;
    total++;
  };

  const append = (value) => {
    const bytes = value instanceof Uint8Array ? value : new Uint8Array(value || 0);
    if (total + bytes.length > maxOutputBytes) {
      throw new Error('Decompressed stream exceeds the in-browser output limit.');
    }
    let offset = 0;
    while (offset < bytes.length) {
      const length = Math.min(current.length - currentLength, bytes.length - offset);
      current.set(bytes.subarray(offset, offset + length), currentLength);
      currentLength += length;
      total += length;
      offset += length;
      if (currentLength === current.length && total < maxOutputBytes) {
        chunks.push(current);
        current = new Uint8Array(Math.min(CHUNK_BYTES, maxOutputBytes - total));
        currentLength = 0;
      }
    }
  };

  const finish = () => {
    if (currentLength > 0) chunks.push(current.subarray(0, currentLength));
    const result = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  };

  return { append, appendByte, finish };
}

async function collectStream(stream, maxOutputBytes) {
  const collector = boundedCollector(maxOutputBytes);
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      collector.append(value);
    }
  } finally {
    reader.releaseLock();
  }
  return collector.finish();
}

async function decompressBzip2(bytes, maxOutputBytes) {
  const { default: Bunzip } = await import('../vendor/libarchive/seek-bzip.js');
  const collector = boundedCollector(maxOutputBytes);
  Bunzip.decode(bytes, { writeByte: collector.appendByte }, true);
  return collector.finish();
}

async function decompressXz(bytes, maxOutputBytes) {
  await import('../vendor/libarchive/xz-decompress.js');
  const XzReadableStream = globalThis['xz-decompress']?.XzReadableStream;
  if (typeof XzReadableStream !== 'function') throw new Error('XZ decoder failed to load.');
  return collectStream(new XzReadableStream(new Blob([bytes]).stream()), maxOutputBytes);
}

let zstdDecoderPromise = null;
async function zstdDecoder() {
  if (!zstdDecoderPromise) {
    zstdDecoderPromise = import('../vendor/libarchive/zstddec-stream.js').then(async ({ ZSTDDecoder }) => {
      const decoder = new ZSTDDecoder();
      await decoder.init();
      return decoder;
    });
  }
  return zstdDecoderPromise;
}

async function decompressZstd(bytes, maxOutputBytes) {
  const decoder = await zstdDecoder();
  const collector = boundedCollector(maxOutputBytes);
  for (const chunk of decoder.decodeStreaming([bytes])) collector.append(chunk);
  return collector.finish();
}

self.onmessage = async ({ data }) => {
  const { id, format } = data || {};
  try {
    const bytes = new Uint8Array(data.bytes);
    const maxOutputBytes = Math.max(1, Math.min(
      MAX_OUTPUT_BYTES,
      Number(data.maxOutputBytes) || 0,
    ));
    let result;
    if (format === 'bz2') result = await decompressBzip2(bytes, maxOutputBytes);
    else if (format === 'xz') result = await decompressXz(bytes, maxOutputBytes);
    else if (format === 'zst') result = await decompressZstd(bytes, maxOutputBytes);
    else throw new Error(`Unsupported standalone stream format: ${format || 'unknown'}`);
    self.postMessage({ id, bytes: result.buffer }, [result.buffer]);
  } catch (error) {
    self.postMessage({
      id,
      error: {
        name: error?.name || 'Error',
        message: error?.message || String(error),
      },
    });
  }
};
