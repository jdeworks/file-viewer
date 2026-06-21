// PURE ffmpeg audio-filter-string builders (no ffmpeg, no DOM) so they can be
// unit-tested directly. Extracted from transcoder.js to keep that file under the
// LOC cap once the P4 dynamics filters (compressor / limiter / gate / de-noise)
// landed. transcoder.js re-exports these so existing import paths keep working.

const round = (n) => Math.round(n * 100) / 100;

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

// ── Canonical audio filter chain ──────────────────────────────────────────────
//
// Builds the audio filter list in the mastering order the roadmap specifies:
//   highpass → afftdn (de-noise) → agate (gate) → acompressor (comp)
//     → equalizer bands → lowpass → alimiter (limiter) → fade-in → fade-out → loudnorm
//
// settings: { freqs, gains(dB), hpf, lpf, lufsTarget, truePeak,
//             dynamics:{ comp?, limiter?, gate?, denoise? } }
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
  if (isFinite(hpf) && hpf > 20) out.push('highpass=f=' + Math.round(hpf));

  const dyn = settings.dynamics || {};
  const dn = denoiseFilter(dyn.denoise); if (dn) out.push(dn);
  const gate = gateFilter(dyn.gate); if (gate) out.push(gate);
  const comp = compressorFilter(dyn.comp); if (comp) out.push(comp);

  const gains = Array.isArray(settings.gains) ? settings.gains : [];
  const freqs = Array.isArray(settings.freqs) ? settings.freqs : [];
  gains.forEach((g, i) => {
    const gain = Number(g);
    const freq = Number(freqs[i]);
    if (!isFinite(gain) || !isFinite(freq) || Math.abs(gain) < 0.1) return;
    out.push('equalizer=f=' + Math.round(freq) + ':width_type=o:width=1:g=' + r(gain));
  });

  const lpf = Number(settings.lpf);
  if (isFinite(lpf) && lpf < 20000) out.push('lowpass=f=' + Math.round(lpf));

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
