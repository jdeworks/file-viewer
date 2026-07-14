// P8b — ACX QC analyzer (PURE math) + per-metric pass/fail evaluation.
//
// No DOM, no decode, no ffmpeg. Operates on already-decoded channel data
// (Float32Array[] at a sample rate) and produces a metrics object, then maps it to
// ACX pass/fail rows. qc-ui.js owns decoding + rendering; the math lives here so it
// is unit-testable in isolation.
//
// ACX spec (see STUDIO_AUDIOBOOK_QC.md §2):
//   RMS −23…−18 dB · sample peak ≤ −3 dBFS · noise floor ≤ −60 dBFS ·
//   44.1 kHz · consistent mono OR stereo · MP3 ≥192 kbps CBR · ≤5 s edge spacing.

import { integratedLufs } from './loudness.js';

const dbfs = (lin) => (lin > 0 ? 20 * Math.log10(lin) : -Infinity);

// Mix-down (average of channels) for a stable level/noise-floor scan. ACX accepts
// mono and stereo, while the per-title consistency check must happen across files.
function monoMix(channels) {
  if (channels.length === 1) return channels[0];
  const n = channels[0].length;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (const ch of channels) s += ch[i];
    out[i] = s / channels.length;
  }
  return out;
}

// Integrated RMS (dBFS) over the whole mono mix.
export function integratedRms(mono) {
  if (!mono.length) return -Infinity;
  let sum = 0;
  for (let i = 0; i < mono.length; i++) sum += mono[i] * mono[i];
  return dbfs(Math.sqrt(sum / mono.length));
}

// Sample peak (dBFS). This is sample-domain only.
export function samplePeak(mono) {
  let pk = 0;
  for (let i = 0; i < mono.length; i++) { const a = Math.abs(mono[i]); if (a > pk) pk = a; }
  return dbfs(pk);
}

function cubicSample(mono, i, t) {
  const y0 = mono[Math.max(0, i - 1)] || 0;
  const y1 = mono[i] || 0;
  const y2 = mono[Math.min(mono.length - 1, i + 1)] || 0;
  const y3 = mono[Math.min(mono.length - 1, i + 2)] || 0;
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (
    (2 * y1)
    + (-y0 + y2) * t
    + (2 * y0 - 5 * y1 + 4 * y2 - y3) * t2
    + (-y0 + 3 * y1 - 3 * y2 + y3) * t3
  );
}

// Estimated true peak (dBTP). This is a deterministic browser-only approximation:
// it 4× oversamples the mono mix with cubic interpolation and scans the interpolated
// points plus original samples. It is useful for catching likely inter-sample peaks,
// but it is not a certified BS.1770 true-peak meter.
export function estimatedTruePeak(mono, oversample = 4) {
  if (!mono.length) return -Infinity;
  const factor = Math.max(1, Math.round(oversample));
  let pk = 0;
  for (let i = 0; i < mono.length; i++) {
    const a = Math.abs(mono[i]);
    if (a > pk) pk = a;
    if (factor <= 1 || i >= mono.length - 1) continue;
    for (let step = 1; step < factor; step++) {
      const v = Math.abs(cubicSample(mono, i, step / factor));
      if (v > pk) pk = v;
    }
  }
  return dbfs(pk);
}

// Noise floor: the RMS (dBFS) of the QUIETEST sustained window. Slides a `winSec`
// window (default 0.5 s, 50 % hop) and returns the minimum windowed RMS — this is the
// sustained quiet-window metric. Returns { db, atSec }.
export function noiseFloor(mono, fs, winSec = 0.5) {
  const win = Math.max(1, Math.round(winSec * fs));
  if (mono.length < win) return { db: integratedRms(mono), atSec: 0 };
  const hop = Math.max(1, Math.round(win / 2));
  let best = Infinity, bestAt = 0;
  for (let start = 0; start + win <= mono.length; start += hop) {
    let sum = 0;
    for (let i = start; i < start + win; i++) sum += mono[i] * mono[i];
    const rms = Math.sqrt(sum / win);
    if (rms < best) { best = rms; bestAt = start; }
  }
  return { db: dbfs(best), atSec: bestAt / fs };
}

// Leading / trailing silence duration (s). A sample counts as silence while |x| stays
// below `thresh` (linear). Returns { head, tail }.
export function edgeSilence(mono, fs, thresh = 0.003) {
  let head = 0;
  while (head < mono.length && Math.abs(mono[head]) < thresh) head++;
  let tail = 0;
  for (let i = mono.length - 1; i >= 0 && Math.abs(mono[i]) < thresh; i--) tail++;
  return { head: head / fs, tail: tail / fs };
}

// Full metric set from decoded channels. `meta` carries sampleRate/channels/duration
// (sampleRate may differ from the decode rate if the source was resampled — we report
// the SOURCE sampleRate when provided, else the decode fs).
export function analyzeMetrics(channels, fs, meta = {}) {
  const mono = monoMix(channels);
  const nf = noiseFloor(mono, fs);
  const edges = edgeSilence(mono, fs);
  return {
    rms: integratedRms(mono),
    peak: samplePeak(mono),
    truePeak: estimatedTruePeak(mono),
    lufs: integratedLufs(channels, fs),
    noiseFloor: nf.db,
    noiseFloorAt: nf.atSec,
    headSilence: edges.head,
    tailSilence: edges.tail,
    sampleRate: meta.sourceSampleRate || meta.encoding?.sampleRate || meta.sampleRate || fs,
    channels: meta.sourceChannels || meta.encoding?.channels || meta.channels || channels.length,
    duration: meta.duration || (mono.length / fs),
    encoding: meta.encoding || null,
  };
}

// ── ACX evaluation: metrics → pass/fail rows ──────────────────────────────────
// status: 'pass' | 'warn' | 'fail'. Each row carries a value string + one-line fix.
const f1 = (n) => (isFinite(n) ? n.toFixed(1) : '—');

export function evaluateAcx(m) {
  const rows = [];
  const add = (key, label, status, value, fix, required = true) => rows.push({ key, label, status, value, fix, required });

  // RMS −23…−18; warn within 1 dB of the edge.
  const rmsStatus = (m.rms >= -23 && m.rms <= -18) ? 'pass'
    : ((m.rms >= -24 && m.rms <= -17) ? 'warn' : 'fail');
  add('rms', 'RMS loudness', rmsStatus, f1(m.rms) + ' dB',
    'Target −23…−18 dB RMS — normalize (the ACX export hits −20 LUFS ≈ −20 dB RMS).');

  // Integrated LUFS is not the ACX loudness rule, but the export chain targets it.
  const lufsStatus = (m.lufs >= -21 && m.lufs <= -19) ? 'pass'
    : ((m.lufs >= -23 && m.lufs <= -18) ? 'warn' : 'fail');
  add('lufs', 'Integrated LUFS', lufsStatus, f1(m.lufs) + ' LUFS',
    'Guidance only: the export targets −20 LUFS, while ACX acceptance uses the RMS row.', false);

  // Peak ≤ −3 dBFS.
  add('peak', 'Sample peak level', m.peak <= -3 ? 'pass' : (m.peak <= -2 ? 'warn' : 'fail'),
    f1(m.peak) + ' dBFS', 'ACX sample peak must be ≤ −3 dBFS — reduce gain or export with a −3 dB ceiling.');

  // Estimated true peak ≤ −3 dBTP. This mirrors the export loudnorm TP target, but
  // remains labelled as an estimate because the browser path is not a certified meter.
  const tp = Number.isFinite(m.truePeak) ? m.truePeak : m.peak;
  add('truePeak', 'Estimated true peak', tp <= -3 ? 'pass' : (tp <= -2 ? 'warn' : 'fail'),
    f1(tp) + ' dBTP', 'Guidance only: this 4× browser estimate is not ACX’s sample-peak metric.', false);

  // Noise floor ≤ −60 dBFS — the #1 rejection reason.
  add('noise', 'Noise floor', m.noiseFloor <= -60 ? 'pass' : (m.noiseFloor <= -55 ? 'warn' : 'fail'),
    f1(m.noiseFloor) + ' dBFS', 'Must be ≤ −60 dBFS — apply de-noise / re-record in a quieter room.');

  // Sample rate 44.1 kHz.
  add('sr', 'Sample rate', m.sampleRate === 44100 ? 'pass' : 'fail',
    (m.sampleRate / 1000) + ' kHz', 'ACX requires 44.1 kHz — the export resamples (-ar 44100).');

  // ACX accepts either mono or stereo, but every file in one production must be consistent.
  add('ch', 'Channels', (m.channels === 1 || m.channels === 2) ? 'pass' : 'fail',
    m.channels === 1 ? 'mono' : (m.channels === 2 ? 'stereo' : m.channels + ' ch'),
    'Use mono or stereo consistently across the whole production; this single-file check cannot compare the other chapters.');

  const encoding = m.encoding || {};
  const isMp3 = encoding.container === 'mp3';
  add('format', 'Submission format', isMp3 ? 'pass' : 'fail',
    isMp3 ? 'MP3' : (encoding.codec || encoding.container || 'unknown'),
    'ACX submission files must be MP3. WAV and other sources are valid working masters, not upload files.');
  const bitrateReady = isMp3 && encoding.bitrateKbps >= 192 && encoding.cbr === true;
  const bitrateUnknown = isMp3 && encoding.bitrateKbps >= 192 && encoding.cbr == null;
  add('bitrate', 'MP3 bitrate mode', bitrateReady ? 'pass' : (bitrateUnknown ? 'warn' : 'fail'),
    isMp3
      ? `${encoding.bitrateKbps || 'unknown'} kbps · ${encoding.cbr === true ? 'CBR' : (encoding.cbr === false ? 'VBR' : 'mode unknown')}`
      : 'not MP3',
    'ACX requires 192 kbps or higher constant-bit-rate MP3; export with the ACX-targeted preset.');

  // The current ACX help page recommends 1–5 s at both edges and rejects >5 s.
  // Amplitude analysis can measure quiet spacing, but cannot prove that it is room tone.
  add('head', 'Quiet head spacing', (m.headSilence >= 1 && m.headSilence <= 5) ? 'pass'
    : (m.headSilence > 0 && m.headSilence <= 5 ? 'warn' : 'fail'),
    f1(m.headSilence) + ' s', 'Keep no more than 5 s at the head; 1–5 s is recommended. Listen to confirm it is clean room tone, not digital silence.');

  add('tail', 'Quiet tail spacing', (m.tailSilence >= 1 && m.tailSilence <= 5) ? 'pass'
    : (m.tailSilence > 0 && m.tailSilence <= 5 ? 'warn' : 'fail'),
    f1(m.tailSilence) + ' s', 'Keep no more than 5 s at the tail; 1–5 s is recommended. Listen to confirm it is clean room tone, not digital silence.');

  return rows;
}

// Overall verdict: 'pass' (all green), 'warn' (no fails, some amber), or 'fail'.
export function acxVerdict(rows) {
  const required = rows.filter((row) => row.required !== false);
  if (required.some((r) => r.status === 'fail')) return 'fail';
  if (required.some((r) => r.status === 'warn')) return 'warn';
  return 'pass';
}
