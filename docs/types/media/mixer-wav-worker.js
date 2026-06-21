// P5 — WAV encoder Worker. Receives interleaved-ready channel Float32Arrays and
// writes a 16-bit PCM WAV (hand-written 44-byte RIFF/fmt/data header — no library).
// Kept off the main thread so encoding a multi-minute mixdown never janks the UI.
//
// Message in:  { channels: Float32Array[], sampleRate, length }
//   channels: one Float32Array per channel (mono = 1, stereo = 2), each `length` samples.
// Message out: { ok:true, buffer:ArrayBuffer } | { ok:false, error }
// The output ArrayBuffer is transferred back (zero-copy).

self.onmessage = (e) => {
  try {
    const { channels, sampleRate, length } = e.data;
    const numCh = channels.length;
    const bytesPerSample = 2;                       // 16-bit
    const blockAlign = numCh * bytesPerSample;
    const dataSize = length * blockAlign;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // ── RIFF header ──
    writeStr(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);         // file size - 8
    writeStr(view, 8, 'WAVE');
    // ── fmt chunk ──
    writeStr(view, 12, 'fmt ');
    view.setUint32(16, 16, true);                   // PCM fmt chunk size
    view.setUint16(20, 1, true);                    // audio format = 1 (PCM)
    view.setUint16(22, numCh, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true); // byte rate
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);                   // bits per sample
    // ── data chunk ──
    writeStr(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Interleave + clamp + convert to 16-bit signed.
    let off = 44;
    for (let i = 0; i < length; i++) {
      for (let c = 0; c < numCh; c++) {
        let s = channels[c][i];
        s = s < -1 ? -1 : s > 1 ? 1 : s;            // clamp
        view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        off += 2;
      }
    }
    self.postMessage({ ok: true, buffer }, [buffer]);
  } catch (err) {
    self.postMessage({ ok: false, error: (err && err.message) || String(err) });
  }
};

function writeStr(view, offset, str) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}
