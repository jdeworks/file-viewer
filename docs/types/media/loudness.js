// P8a — Mastering-grade integrated loudness (ITU-R BS.1770 / EBU R128), PURE.
//
// No ffmpeg, no DOM, no WebAudio — operates over a plain Float32Array (one channel,
// or pre-summed) at a given sample rate. Implements:
//   1. K-weighting pre-filter (two biquads): a high-shelf (~+4 dB above ~1.5 kHz)
//      followed by a high-pass (~38 Hz "RLB" stage).
//   2. Mean-square of 400 ms blocks (75 % overlap → 100 ms hop).
//   3. Two-stage gating: absolute gate at −70 LUFS, then a relative gate at −10 LU
//      below the ungated mean → integrated loudness.
//
// Coefficients are derived from the published BS.1770-4 analog prototypes via the
// bilinear transform at the actual sample rate, so the K-weighting stays correct at
// 44.1 / 48 kHz (the rates the browser typically decodes to).
//
// Unit-testable: feed a known-amplitude sine and assert the integrated LUFS.

const db = (x) => 10 * Math.log10(x);

// ── Biquad (Direct Form I), out-of-place ──────────────────────────────────────
function biquad(samples, b0, b1, b2, a1, a2) {
  const out = new Float32Array(samples.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < samples.length; i++) {
    const x0 = samples[i];
    const y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    out[i] = y0;
    x2 = x1; x1 = x0; y2 = y1; y1 = y0;
  }
  return out;
}

// Stage 1 — high-shelf, +4 dB, f0 ≈ 1681.97 Hz, Q ≈ 0.7071752 (RFC audio-EQ cookbook).
function highShelfCoeffs(fs) {
  const f0 = 1681.974450955533, Q = 0.7071752369554196, gainDb = 3.999843853973347;
  const A = Math.pow(10, gainDb / 40);
  const w0 = 2 * Math.PI * f0 / fs;
  const cw = Math.cos(w0), sw = Math.sin(w0);
  const alpha = sw / (2 * Q);
  const ap1 = A + 1, am1 = A - 1, sqrtA2a = 2 * Math.sqrt(A) * alpha;
  const b0 = A * (ap1 + am1 * cw + sqrtA2a);
  const b1 = -2 * A * (am1 + ap1 * cw);
  const b2 = A * (ap1 + am1 * cw - sqrtA2a);
  const a0 = ap1 - am1 * cw + sqrtA2a;
  const a1 = 2 * (am1 - ap1 * cw);
  const a2 = ap1 - am1 * cw - sqrtA2a;
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
}

// Stage 2 — high-pass ("RLB"), f0 ≈ 38.135 Hz, Q ≈ 0.5003270.
function highPassCoeffs(fs) {
  const f0 = 38.13547087602444, Q = 0.5003270373238773;
  const w0 = 2 * Math.PI * f0 / fs;
  const cw = Math.cos(w0), sw = Math.sin(w0);
  const alpha = sw / (2 * Q);
  const b0 = (1 + cw) / 2, b1 = -(1 + cw), b2 = (1 + cw) / 2;
  const a0 = 1 + alpha, a1 = -2 * cw, a2 = 1 - alpha;
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
}

// Apply the full K-weighting filter to a channel. Returns a new Float32Array.
export function kWeight(samples, fs) {
  const s1 = highShelfCoeffs(fs);
  const s2 = highPassCoeffs(fs);
  const a = biquad(samples, s1[0], s1[1], s1[2], s1[3], s1[4]);
  return biquad(a, s2[0], s2[1], s2[2], s2[3], s2[4]);
}

// Integrated loudness (LUFS) over channels[] (each a Float32Array at fs).
// Channel weights are 1.0 for L/R per BS.1770; mono uses a single channel.
export function integratedLufs(channels, fs) {
  if (!channels || !channels.length || !fs) return -Infinity;
  const weighted = channels.map((ch) => kWeight(ch, fs));
  const blockLen = Math.round(0.4 * fs);          // 400 ms
  const hop = Math.round(0.1 * fs);               // 100 ms (75 % overlap)
  if (blockLen <= 0 || weighted[0].length < blockLen) return -Infinity;

  // Per-block loudness in LKFS from the summed channel mean-squares.
  const blocks = [];
  const n = weighted[0].length;
  for (let start = 0; start + blockLen <= n; start += hop) {
    let z = 0;
    for (const ch of weighted) {
      let s = 0;
      for (let i = start; i < start + blockLen; i++) s += ch[i] * ch[i];
      z += s / blockLen;
    }
    blocks.push(-0.691 + db(z));                  // L = −0.691 + 10·log10(Σ z)
  }
  if (!blocks.length) return -Infinity;

  // Mean of the GATED block mean-squares (averaged in linear z, not in dB).
  const meanZ = (set) => set.reduce((acc, l) => acc + Math.pow(10, (l + 0.691) / 10), 0) / set.length;

  // Stage 1 — absolute gate at −70 LKFS.
  const gate1 = blocks.filter((l) => l > -70);
  if (!gate1.length) return -Infinity;

  // Stage 2 — relative gate at (mean − 10 LU).
  const relGate = -0.691 + db(meanZ(gate1)) - 10;
  const gate2 = blocks.filter((l) => l > -70 && l > relGate);
  if (!gate2.length) return -Infinity;
  return -0.691 + db(meanZ(gate2));
}
