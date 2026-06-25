// PURE ffmpeg audio-filter-string builders (no ffmpeg, no DOM) so they can be
// unit-tested directly. Extracted from transcoder.js to keep that file under the
// LOC cap once the P4 dynamics filters (compressor / limiter / gate / de-noise)
// landed. transcoder.js re-exports these so existing import paths keep working.

const round = (n) => Math.round(n * 100) / 100;

const DEFAULT_MASTER_BUS = {
  hpfFreq: 65,
  bands: [
    { freq: 120, gain: -1.5, q: 0.5, type: 'peaking' },
    { freq: 3200, gain: -1, q: 0.8, type: 'peaking' },
    { freq: 8000, gain: 1, q: 0.5, type: 'highshelf' },
  ],
  compressor: {
    threshold: -20,
    ratio: 2,
    attack: 0.015,
    release: 0.25,
    knee: 6,
    makeup: 1,
  },
};

export const MASTERING_CLEANUP_PRESETS = {
  'spoken-cleanup': {
    dehum: { enabled: true, hpf: 75, freq: 60, harmonics: [120], width: 8 },
    denoise: { enabled: true, strength: 8 },
    deplosive: { enabled: true, hpf: 90, freq: 120, gain: -2.5, q: 0.9 },
    leveler: { enabled: true, frameMs: 500, gaussianSize: 15, peak: 0.9, maxGain: 8 },
  },
};

// ── P4: dynamics filter-string helpers ───────────────────────────────────────
//
// Each takes a (possibly absent) sub-settings object and returns an ffmpeg filter
// string, or '' when the effect is disabled / unset. All fields are OPTIONAL so a
// settings object without any `dynamics` produces IDENTICAL output to the P1/P2/P3
// chain (the existing chain-order assertions must stay green).

// dB → linear amplitude (0 dB = 1.0). Clamped to a sane floor so a −Inf can't NaN.
function dbToLin(db) {
  return Math.pow(10, Math.max(-120, db) / 20);
}

// De-noise (broadband) → afftdn. strength is the noise-reduction amount in dB
// (afftdn nr, 0.01–97). Bake-only — there is no real-time WebAudio denoiser.
export function denoiseFilter(dn) {
  if (!dn || !dn.enabled) return '';
  const nr = Number(dn.strength);
  if (!isFinite(nr) || nr <= 0) return 'afftdn';
  return 'afftdn=nr=' + round(Math.max(0.01, Math.min(97, nr)));
}

// De-hum → highpass + narrow 50/60 Hz notch filters. The default is US mains
// hum (60 Hz) plus one harmonic (120 Hz); callers can override the base.
export function dehumFilter(dh) {
  if (!dh || !dh.enabled) return '';
  const out = [];
  const hpf = Number(dh.hpf);
  if (isFinite(hpf) && hpf > 20) out.push('highpass=f=' + Math.round(hpf) + ':p=2');

  const base = Number(dh.freq);
  const width = isFinite(Number(dh.width)) ? Math.max(1, Number(dh.width)) : 8;
  const freqs = [];
  if (isFinite(base) && base > 0) freqs.push(base);
  const harmonics = Array.isArray(dh.harmonics) ? dh.harmonics : [];
  for (const harmonic of harmonics) {
    const freq = Number(harmonic);
    if (isFinite(freq) && freq > 0) freqs.push(freq);
  }
  for (const freq of freqs) {
    out.push('bandreject=f=' + Math.round(freq) + ':t=h:w=' + round(width));
  }
  return out.join(',');
}

// De-plosive helper → heuristic low-frequency containment only. It does not try
// to detect plosives or separate speech; it just reduces low-frequency blasts.
export function deplosiveFilter(dp) {
  if (!dp || !dp.enabled) return '';
  const out = [];
  const hpf = Number(dp.hpf);
  if (isFinite(hpf) && hpf > 20) out.push('highpass=f=' + Math.round(hpf) + ':p=2');

  const freq = Number(dp.freq);
  const gain = Number(dp.gain);
  const q = Number(dp.q);
  if (isFinite(freq) && isFinite(gain) && isFinite(q) && gain < 0) {
    out.push('equalizer=f=' + Math.round(freq) + ':t=q:w=' + round(q) + ':g=' + round(gain));
  }
  return out.join(',');
}

// Adaptive leveler → dynaudnorm with conservative caps. This is intentionally
// explicit, not a hidden volume multiplier: peak/maxGain are visible parameters.
export function levelerFilter(lv) {
  if (!lv || !lv.enabled) return '';
  const parts = [];
  const frameMs = Number(lv.frameMs);
  const gaussianSize = Number(lv.gaussianSize);
  const peak = Number(lv.peak);
  const maxGain = Number(lv.maxGain);
  if (isFinite(frameMs)) parts.push('f=' + Math.round(Math.max(10, Math.min(8000, frameMs))));
  if (isFinite(gaussianSize)) {
    let g = Math.round(Math.max(3, Math.min(301, gaussianSize)));
    if (g % 2 === 0) g += 1;
    parts.push('g=' + g);
  }
  if (isFinite(peak)) parts.push('p=' + round(Math.max(0.1, Math.min(0.99, peak))));
  if (isFinite(maxGain)) parts.push('m=' + round(Math.max(1, Math.min(30, maxGain))));
  return parts.length ? 'dynaudnorm=' + parts.join(':') : 'dynaudnorm';
}

function resolveCleanupChainPreset(cleanup) {
  if (!cleanup) return null;
  if (typeof cleanup === 'string') return MASTERING_CLEANUP_PRESETS[cleanup] || null;
  if (cleanup === true) return MASTERING_CLEANUP_PRESETS['spoken-cleanup'];
  return cleanup;
}

export function buildMasteringCleanupFilter(cleanup) {
  const preset = resolveCleanupChainPreset(cleanup);
  if (!preset) return '';
  const out = [];
  const hum = dehumFilter(preset.dehum); if (hum) out.push(hum);
  const dn = denoiseFilter(preset.denoise); if (dn) out.push(dn);
  const plosive = deplosiveFilter(preset.deplosive); if (plosive) out.push(plosive);
  const leveler = levelerFilter(preset.leveler); if (leveler) out.push(leveler);
  return out.join(',');
}

// Noise gate → agate. threshold is in dB (converted to linear 0–1 for ffmpeg).
export function gateFilter(g) {
  if (!g || !g.enabled) return '';
  const parts = [];
  const thDb = Number(g.threshold);
  if (isFinite(thDb)) parts.push('threshold=' + round(dbToLin(thDb)));
  if (isFinite(Number(g.ratio))) parts.push('ratio=' + round(Number(g.ratio)));
  if (isFinite(Number(g.attack))) parts.push('attack=' + round(Number(g.attack)));
  if (isFinite(Number(g.release))) parts.push('release=' + round(Number(g.release)));
  return parts.length ? 'agate=' + parts.join(':') : 'agate';
}

// Compressor → acompressor. threshold/makeup are in dB (threshold → linear).
export function compressorFilter(c) {
  if (!c || !c.enabled) return '';
  const parts = [];
  const thDb = Number(c.threshold);
  if (isFinite(thDb)) parts.push('threshold=' + round(dbToLin(thDb)));
  if (isFinite(Number(c.ratio))) parts.push('ratio=' + round(Number(c.ratio)));
  if (isFinite(Number(c.attack))) parts.push('attack=' + round(Number(c.attack)));
  if (isFinite(Number(c.release))) parts.push('release=' + round(Number(c.release)));
  if (isFinite(Number(c.knee))) parts.push('knee=' + round(Number(c.knee)));
  if (isFinite(Number(c.makeup))) parts.push('makeup=' + round(Number(c.makeup)));
  return parts.length ? 'acompressor=' + parts.join(':') : 'acompressor';
}

// Limiter → alimiter. ceiling is the true-peak limit in dBTP (converted to linear).
export function limiterFilter(l) {
  if (!l || !l.enabled) return '';
  const ceilDb = Number(l.ceiling);
  if (!isFinite(ceilDb)) return 'alimiter';
  return 'alimiter=limit=' + round(dbToLin(ceilDb));
}

// ── Master bus filter builder ────────────────────────────────────────────────
//
// Added for M4 parity: lightweight HPF + 3-shape bus + compressor that applies
// after the main EQ stage. This is export-only in this viewer (no live graph
// gain change outside ffmpeg exports).
export function buildMasterBusFilter(config = {}) {
  const preset = config === true ? DEFAULT_MASTER_BUS : config || {};
  const out = [];

  const hpf = Number(preset.hpfFreq);
  if (isFinite(hpf) && hpf > 20) out.push('highpass=f=' + Math.round(hpf) + ':p=2');

  const bands = Array.isArray(preset.bands) ? preset.bands : [];
  for (const band of bands) {
    const freq = Number(band.freq);
    const gain = Number(band.gain);
    const q = Number(band.q);
    if (!isFinite(freq) || !isFinite(gain) || !isFinite(q) || gain === 0) continue;

    const gainText = `${gain > 0 ? '+' : ''}${round(gain)}`;
    if (band.type === 'highshelf') {
      out.push('treble=g=' + gainText + ':f=' + Math.round(freq) + ':w=' + round(q));
    } else if (band.type === 'lowshelf') {
      out.push('bass=g=' + gainText + ':f=' + Math.round(freq) + ':w=' + round(q));
    } else {
      out.push('equalizer=f=' + Math.round(freq) + ':t=q:w=' + round(q) + ':g=' + gainText);
    }
  }

  const comp = preset.compressor || {};
  const compFilter = buildMasterCompressorFilter({
    enabled: comp.enabled !== false,
    threshold: Number(comp.threshold),
    ratio: Number(comp.ratio),
    attack: Number(comp.attack),
    release: Number(comp.release),
    knee: Number(comp.knee),
    makeup: Number(comp.makeup),
  });
  if (compFilter) out.push(compFilter);

  return out.join(',');
}

function buildMasterCompressorFilter(c = {}) {
  if (!c || !c.enabled) return '';
  const parts = [];
  const thDb = Number(c.threshold);
  if (isFinite(thDb)) parts.push('threshold=' + round(thDb) + 'dB');
  if (isFinite(Number(c.ratio))) parts.push('ratio=' + round(Number(c.ratio)));
  if (isFinite(Number(c.attack))) parts.push('attack=' + Math.round(Number(c.attack) * 1000));
  if (isFinite(Number(c.release))) parts.push('release=' + Math.round(Number(c.release) * 1000));
  if (isFinite(Number(c.knee))) parts.push('knee=' + round(Number(c.knee)));
  if (isFinite(Number(c.makeup))) parts.push('makeup=' + round(Number(c.makeup)));
  return parts.length ? 'acompressor=' + parts.join(':') : 'acompressor';
}

// ── Canonical audio filter chain ──────────────────────────────────────────────
//
// Builds the audio filter list in the mastering order the roadmap specifies:
//   live highpass → export cleanup (de-hum/de-noise/de-plosive/leveler)
//     → live afftdn/gate/compressor → equalizer bands → lowpass → [master-bus]
//     → alimiter (limiter) → fade-in → fade-out → loudnorm
//
// settings: { freqs, gains(dB), hpf, lpf, lufsTarget, truePeak,
//             cleanupChain?, dynamics:{ comp?, limiter?, gate?, denoise? } }
//           (the shape returned by audio-graph.js getSettings()). Any field may be absent.
// fades:    { fadeIn, fadeOut, duration } — seconds.
//
// Conventions:
//   • A band is "active" only when |gain| ≥ 0.1 dB (skips the 9 flat bands).
//   • HPF emitted only when cutoff > 20 Hz; LPF only when cutoff < 20000 Hz.
//   • Dynamics are OPTIONAL — without a `dynamics` object the output is byte-identical
//     to the pre-P4 chain.
export function buildAudioFilterChain(settings = {}, fades = {}) {
  const out = [];
  const r = round;

  const hpf = Number(settings.hpf);
  if (isFinite(hpf) && hpf > 20) out.push('highpass=f=' + Math.round(hpf) + ':p=2');

  const dyn = settings.dynamics || {};
  const cleanup = buildMasteringCleanupFilter(settings.cleanupChain);
  if (cleanup) out.push(cleanup);
  const dn = denoiseFilter(dyn.denoise); if (dn) out.push(dn);
  const gate = gateFilter(dyn.gate); if (gate) out.push(gate);
  const comp = compressorFilter(dyn.comp); if (comp) out.push(comp);

  const gains = Array.isArray(settings.gains) ? settings.gains : [];
  const freqs = Array.isArray(settings.freqs) ? settings.freqs : [];
  gains.forEach((g, i) => {
    const gain = Number(g);
    const freq = Number(freqs[i]);
    if (!isFinite(gain) || !isFinite(freq) || Math.abs(gain) < 0.1) return;
    const gainText = `${gain > 0 ? '+' : ''}${r(gain)}`;
    if (freq <= 80) {
      out.push('bass=g=' + gainText + ':f=' + Math.round(freq) + ':w=0.7');
    } else if (freq >= 10000) {
      out.push('treble=g=' + gainText + ':f=' + Math.round(freq) + ':w=0.5');
    } else {
      out.push('equalizer=f=' + Math.round(freq) + ':t=q:w=1.2:g=' + gainText);
    }
  });

  const lpf = Number(settings.lpf);
  if (isFinite(lpf) && lpf < 20000) out.push('lowpass=f=' + Math.round(lpf) + ':p=2');

  const masterBus = settings.masterBus;
  if (masterBus) {
    const profile = masterBus === true ? DEFAULT_MASTER_BUS : masterBus;
    const masterChain = buildMasterBusFilter(profile);
    if (masterChain) out.push(masterChain);
  }

  const lim = limiterFilter(dyn.limiter); if (lim) out.push(lim);

  const fadeIn = Number(fades.fadeIn);
  if (isFinite(fadeIn) && fadeIn > 0) out.push('afade=t=in:st=0:d=' + r(fadeIn));

  const fadeOut = Number(fades.fadeOut);
  const dur = Number(fades.duration);
  if (isFinite(fadeOut) && fadeOut > 0 && isFinite(dur) && dur > fadeOut) {
    out.push('afade=t=out:st=' + r(dur - fadeOut) + ':d=' + r(fadeOut));
  }

  const lufs = settings.lufsTarget;
  if (lufs !== null && lufs !== undefined && isFinite(Number(lufs))) {
    const tp = isFinite(Number(settings.truePeak)) ? r(Number(settings.truePeak)) : -1.5;
    out.push('loudnorm=I=' + r(Number(lufs)) + ':TP=' + tp + ':LRA=11');
  }

  return out.join(',');
}

// Codec args for the chosen export container. Keyed by output extension.
// opts: { bitrate?:string ('192k'), cbr?:boolean }. PURE (no DOM, no ffmpeg).
export function audioEncodeArgs(format, opts = {}) {
  const bitrate = opts.bitrate || null;
  switch (format) {
    case 'wav':  return { ext: 'wav',  mime: 'audio/wav',  args: ['-c:a', 'pcm_s16le'] };
    case 'flac': return { ext: 'flac', mime: 'audio/flac', args: ['-c:a', 'flac'] };
    case 'm4a':  return { ext: 'm4a',  mime: 'audio/mp4',
      args: ['-c:a', 'aac', '-b:a', bitrate || '192k'] };
    case 'ogg':  return { ext: 'ogg',  mime: 'audio/ogg',
      args: bitrate ? ['-c:a', 'libvorbis', '-b:a', bitrate] : ['-c:a', 'libvorbis', '-q:a', '5'] };
    case 'opus': return { ext: 'opus', mime: 'audio/ogg',
      args: ['-c:a', 'libopus', '-b:a', bitrate || '128k'] };
    case 'mp3':
    default: {
      // CBR via -b:a; otherwise VBR via -q:a 2 (~190 kbps). ACX wants CBR.
      const args = opts.cbr && bitrate
        ? ['-c:a', 'libmp3lame', '-b:a', bitrate]
        : (bitrate ? ['-c:a', 'libmp3lame', '-b:a', bitrate] : ['-c:a', 'libmp3lame', '-q:a', '2']);
      return { ext: 'mp3', mime: 'audio/mpeg', args };
    }
  }
}

// Human-readable summary of the active dynamics (for the export panel summary line).
// Returns '' when nothing is active.
export function describeDynamics(dyn) {
  if (!dyn) return '';
  const bits = [];
  if (dyn.comp && dyn.comp.enabled) bits.push('compressor');
  if (dyn.limiter && dyn.limiter.enabled) bits.push('limiter');
  if (dyn.gate && dyn.gate.enabled) bits.push('gate');
  if (dyn.denoise && dyn.denoise.enabled) bits.push('de-noise');
  return bits.join(', ');
}

// ── P8c/P8e: ACX silence-cut + room-tone + one-click compliant export args ─────
//
// silenceremove trims dead air. We trim the leading silence (start_periods=1) and,
// via the area/all-passing form, also clamp long internal gaps. opts:
//   { thresholdDb?:−50, minSilenceSec?:0.4 }. PURE.
export function silenceRemoveFilter(opts = {}) {
  const thDb = isFinite(Number(opts.thresholdDb)) ? round(Number(opts.thresholdDb)) : -50;
  const dur = isFinite(Number(opts.minSilenceSec)) ? round(Math.max(0.05, Number(opts.minSilenceSec))) : 0.4;
  // Trim leading + trailing dead air; stop_periods=-1 with detection clamps trailing.
  return 'silenceremove=start_periods=1:start_duration=' + dur
    + ':start_threshold=' + thDb + 'dB'
    + ':stop_periods=-1:stop_duration=' + dur + ':stop_threshold=' + thDb + 'dB';
}

// Head/tail room-tone pad via apad + adelay. ACX wants 0.5–1 s head / 1–5 s tail of
// quiet room tone. We synthesize it as silence padding (a true room-tone slice would
// need a second input); apad extends the tail, adelay shifts the head. opts:
//   { headSec?:0.75, tailSec?:2 }. Returns '' when both are 0.
export function roomTonePadFilter(opts = {}) {
  const head = Math.max(0, Number(opts.headSec ?? 0.75));
  const tail = Math.max(0, Number(opts.tailSec ?? 2));
  const parts = [];
  if (head > 0) parts.push('adelay=' + Math.round(head * 1000) + ':all=1');
  if (tail > 0) parts.push('apad=pad_dur=' + round(tail));
  return parts.join(',');
}

// Full ACX `-af` chain: loudnorm (−20 LUFS / −3 dBTP) → silence-cut → room-tone pad.
// opts: { lufs?:−20, truePeak?:−3, silence?:{...}, pad?:{...} }. PURE.
export function buildAcxFilterChain(opts = {}) {
  const lufs = isFinite(Number(opts.lufs)) ? round(Number(opts.lufs)) : -20;
  const tp = isFinite(Number(opts.truePeak)) ? round(Number(opts.truePeak)) : -3;
  const out = ['loudnorm=I=' + lufs + ':TP=' + tp + ':LRA=11'];
  if (opts.silence !== false) out.push(silenceRemoveFilter(opts.silence || {}));
  const pad = roomTonePadFilter(opts.pad || {});
  if (pad) out.push(pad);
  return out.join(',');
}

// Full ffmpeg arg list for the one-click ACX export (P8e). PURE — produces exactly
// `-ac 1 -ar 44100 -c:a libmp3lame -b:a 192k` + the ACX -af chain. inputName/outputName
// are MEMFS paths the caller writes/reads.
export function buildAcxExportArgs(inputName, outputName, opts = {}) {
  return [
    '-i', inputName, '-vn',
    '-af', buildAcxFilterChain(opts),
    '-ac', '1', '-ar', '44100',
    '-c:a', 'libmp3lame', '-b:a', '192k',
    outputName,
  ];
}

export function buildAcxChapterExportArgs(inputName, outputName, chapter, opts = {}) {
  const start = Number(chapter?.start);
  const end = Number(chapter?.end);
  if (!isFinite(start) || start < 0 || !isFinite(end) || end <= start) {
    throw new Error('Chapter export requires a finite start and end.');
  }
  return [
    '-ss', String(round(start)), '-t', String(round(end - start)),
    '-i', inputName, '-vn',
    '-af', buildAcxFilterChain(opts),
    '-ac', '1', '-ar', '44100',
    '-c:a', 'libmp3lame', '-b:a', '192k',
    outputName,
  ];
}
