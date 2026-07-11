/* global lamejs */

// Dedicated worker for the locally vendored lamejs encoder. Keeping this off the
// UI thread makes multi-minute mix exports cancellable without freezing controls.
importScripts('../../../vendor/lamejs/lame.min.js');

self.onmessage = (event) => {
  const { channels, sampleRate, bitRate } = event.data || {};
  try {
    if (!Array.isArray(channels) || !channels.length || !channels[0]?.byteLength) throw new Error('No PCM samples were supplied.');
    const channelCount = Math.min(2, channels.length);
    const pcm = channels.slice(0, channelCount).map((buffer) => new Float32Array(buffer));
    const encoder = new lamejs.Mp3Encoder(channelCount, sampleRate, bitRate);
    const chunks = [];
    const frameSize = 1152;
    for (let offset = 0; offset < pcm[0].length; offset += frameSize) {
      const end = Math.min(pcm[0].length, offset + frameSize);
      const left = floatToPcm16(pcm[0], offset, end);
      const encoded = channelCount === 2
        ? encoder.encodeBuffer(left, floatToPcm16(pcm[1], offset, end))
        : encoder.encodeBuffer(left);
      if (encoded.length) chunks.push(encoded.slice().buffer);
      if (offset % (frameSize * 64) === 0) self.postMessage({ type: 'progress', value: end / pcm[0].length });
    }
    const tail = encoder.flush();
    if (tail.length) chunks.push(tail.slice().buffer);
    self.postMessage({ type: 'done', chunks }, chunks);
  } catch (error) {
    self.postMessage({ type: 'error', message: error?.message || String(error) });
  }
};

function floatToPcm16(source, start, end) {
  const target = new Int16Array(end - start);
  for (let i = start; i < end; i += 1) {
    const sample = Math.max(-1, Math.min(1, source[i] || 0));
    target[i - start] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return target;
}
