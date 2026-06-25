// P8b — ACX QC analyzer (PURE math) + per-metric pass/fail evaluation.
//
// No DOM, no decode, no ffmpeg. Operates on already-decoded channel data
// (Float32Array[] at a sample rate) and produces a metrics object, then maps it to
// ACX pass/fail rows. qc-ui.js owns decoding + rendering; the math lives here so it
// is unit-testable in isolation.
//
// ACX spec (see STUDIO_AUDIOBOOK_QC.md §2):
//   RMS −23…−18 dB · sample peak ≤ −3 dBFS · noise floor ≤ −60 dBFS ·
//   44.1 kHz · mono · head 0.5–1 s · tail 1–5 s.

import { integratedLufs } from './loudness.js';

const dbfs = (lin) => (lin > 0 ? 20 * Math.log10(lin) : -Infinity);

// Mono mix-down (average of channels) for the level/noise-floor scan. ACX is mono,
// and measuring on the mix is the right basis for the RMS/peak/floor checks.
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
// #1 ACX rejection metric. Returns { db, atSec }.
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
    sampleRate: meta.sampleRate || fs,
    channels: meta.channels || channels.length,
    duration: meta.duration || (mono.length / fs),
  };
}

// ── ACX evaluation: metrics → pass/fail rows ──────────────────────────────────
// status: 'pass' | 'warn' | 'fail'. Each row carries a value string + one-line fix.
const f1 = (n) => (isFinite(n) ? n.toFixed(1) : '—');

export function evaluateAcx(m) {
  const rows = [];
  const add = (key, label, status, value, fix) => rows.push({ key, label, status, value, fix });

  // RMS −23…−18; warn within 1 dB of the edge.
  const rmsStatus = (m.rms >= -23 && m.rms <= -18) ? 'pass'
    : ((m.rms >= -24 && m.rms <= -17) ? 'warn' : 'fail');
  add('rms', 'RMS loudness', rmsStatus, f1(m.rms) + ' dB',
    'Target −23…−18 dB RMS — normalize (the ACX export hits −20 LUFS ≈ −20 dB RMS).');

  // Integrated LUFS is not the ACX loudness rule, but the export chain targets it.
  const lufsStatus = (m.lufs >= -21 && m.lufs <= -19) ? 'pass'
    : ((m.lufs >= -23 && m.lufs <= -18) ? 'warn' : 'fail');
  add('lufs', 'Integrated LUFS', lufsStatus, f1(m.lufs) + ' LUFS',
    'Export target is −20 LUFS via loudnorm; ACX acceptance still uses the RMS row.');

  // Peak ≤ −3 dBFS.
  add('peak', 'Sample peak level', m.peak <= -3 ? 'pass' : (m.peak <= -2 ? 'warn' : 'fail'),
    f1(m.peak) + ' dBFS', 'ACX sample peak must be ≤ −3 dBFS — reduce gain or export with a −3 dB ceiling.');

  // Estimated true peak ≤ −3 dBTP. This mirrors the export loudnorm TP target, but
  // remains labelled as an estimate because the browser path is not a certified meter.
  const tp = Number.isFinite(m.truePeak) ? m.truePeak : m.peak;
  add('truePeak', 'Estimated true peak', tp <= -3 ? 'pass' : (tp <= -2 ? 'warn' : 'fail'),
    f1(tp) + ' dBTP', 'Estimated 4× oversampled peak should be ≤ −3 dBTP — export loudnorm/limiting targets TP −3.');

  // Noise floor ≤ −60 dBFS — the #1 rejection reason.
  add('noise', 'Noise floor', m.noiseFloor <= -60 ? 'pass' : (m.noiseFloor <= -55 ? 'warn' : 'fail'),
    f1(m.noiseFloor) + ' dBFS', 'Must be ≤ −60 dBFS — apply de-noise / re-record in a quieter room.');

  // Sample rate 44.1 kHz.
  add('sr', 'Sample rate', m.sampleRate === 44100 ? 'pass' : 'fail',
    (m.sampleRate / 1000) + ' kHz', 'ACX requires 44.1 kHz — the export resamples (-ar 44100).');

  // Mono.
  add('ch', 'Channels', m.channels === 1 ? 'pass' : 'fail',
    m.channels === 1 ? 'mono' : (m.channels === 2 ? 'stereo' : m.channels + ' ch'),
    'ACX requires mono — the export down-mixes (-ac 1).');

  // Head silence 0.5–1 s.
  add('head', 'Head silence', (m.headSilence >= 0.5 && m.headSilence <= 1) ? 'pass'
    : (m.headSilence >= 0.3 && m.headSilence <= 1.5 ? 'warn' : 'fail'),
    f1(m.headSilence) + ' s', 'ACX wants 0.5–1 s of room tone at the head — the export pads/trims it.');

  // Tail silence 1–5 s.
  add('tail', 'Tail silence', (m.tailSilence >= 1 && m.tailSilence <= 5) ? 'pass'
    : (m.tailSilence >= 0.5 && m.tailSilence <= 6 ? 'warn' : 'fail'),
    f1(m.tailSilence) + ' s', 'ACX wants 1–5 s of room tone at the tail — the export pads it.');

  return rows;
}

// Overall verdict: 'pass' (all green), 'warn' (no fails, some amber), or 'fail'.
export function acxVerdict(rows) {
  if (rows.some((r) => r.status === 'fail')) return 'fail';
  if (rows.some((r) => r.status === 'warn')) return 'warn';
  return 'pass';
}
