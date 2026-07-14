export async function runAudioChainChecks(ctx) {
  const { page, pass, fail } = ctx;

  // ── P8a: PURE BS.1770 integrated LUFS on a synthesized buffer (no ffmpeg/decode) ──
  // A 1 kHz sine targeted to −23 dB RMS should read ≈ −23 LUFS (K-weighting is near-flat
  // at 1 kHz; tolerance ±1 LU). Also verify the noise-floor/RMS math.
  const lufs = await page.evaluate(async () => {
    const { integratedLufs } = await import('./types/media/loudness.js');
    const { integratedRms, samplePeak, estimatedTruePeak, noiseFloor, edgeSilence } = await import('./types/media/qc.js');
    const fs = 48000, n = fs * 4;
    const amp = Math.pow(10, (-23 + 3.0103) / 20);   // 1 kHz sine at −23 dB RMS
    const sine = new Float32Array(n);
    for (let i = 0; i < n; i++) sine[i] = amp * Math.sin(2 * Math.PI * 1000 * i / fs);
    // Buffer with a 1 s leading silence then a 0.3-amp tone → known head silence + floor.
    const gapped = new Float32Array(n);
    for (let i = 0; i < n; i++) gapped[i] = i < fs ? 0 : 0.3 * Math.sin(2 * Math.PI * 440 * i / fs);
    const nf = noiseFloor(gapped, fs);
    const es = edgeSilence(gapped, fs);
    return {
      lufs: integratedLufs([sine], fs),
      rms: integratedRms(sine), peak: samplePeak(sine), truePeak: estimatedTruePeak(sine),
      floorDb: nf.db, head: es.head,
    };
  });
  if (Math.abs(lufs.lufs - (-23)) <= 1) pass('P8a: BS.1770 LUFS on −23 dB sine ≈ −23 LUFS (' + lufs.lufs.toFixed(2) + ', ±1 LU)'); else fail('lufs: ' + lufs.lufs);
  if (Math.abs(lufs.rms - (-23)) < 0.1 && Math.abs(lufs.peak - (-20)) < 0.2) pass('P8b: RMS/peak math correct on synthesized sine'); else fail('rms/peak: ' + JSON.stringify(lufs));
  if (lufs.truePeak >= lufs.peak && Math.abs(lufs.truePeak - lufs.peak) < 0.2) pass('P8b: estimated true peak stays near sample peak on aligned sine'); else fail('truePeak: ' + JSON.stringify(lufs));
  if (lufs.floorDb === -Infinity || lufs.floorDb < -100) pass('P8b: noise floor finds the silent window (−∞ for true silence)'); else fail('noise floor: ' + lufs.floorDb);
  if (Math.abs(lufs.head - 1) < 0.05) pass('P8b: edge-silence detects the 1 s leading gap'); else fail('head silence: ' + lufs.head);

  // ── P8c/P8e: PURE ACX arg builder → mono/44.1k/192k + honest spacing semantics ──
  const acxArgs = await page.evaluate(async () => {
    const { buildAcxExportArgs, buildAcxFilterChain, silenceRemoveFilter } = await import('./types/media/transcoder.js');
    return {
      args: buildAcxExportArgs('input.mp3', 'out.mp3').join(' '),
      chain: buildAcxFilterChain(),
      explicitSpacing: buildAcxFilterChain({
        silence: { thresholdDb: -50, minSilenceSec: 0.4 },
        pad: { headSec: 0.75, tailSec: 2 },
      }),
      silence: silenceRemoveFilter(),
    };
  });
  if (/-ac 1/.test(acxArgs.args) && /-ar 44100/.test(acxArgs.args) && /-c:a libmp3lame -b:a 192k/.test(acxArgs.args))
    pass('P8e: ACX arg builder forces mono / 44.1 kHz / MP3 192 k'); else fail('acx args: ' + acxArgs.args);
  if (/loudnorm=I=-20:TP=-3:LRA=11/.test(acxArgs.chain)
    && !/silenceremove=|apad=/.test(acxArgs.chain))
    pass('P8c/P8e: ACX-targeted chain preserves source room tone by default'); else fail('acx chain: ' + acxArgs.chain);
  if (/silenceremove=/.test(acxArgs.explicitSpacing) && /apad=pad_dur=/.test(acxArgs.explicitSpacing)
    && /stop_periods=1/.test(acxArgs.silence))
    pass('P8c: optional edge spacing is explicit and does not collapse internal pauses'); else fail('spacing: ' + JSON.stringify(acxArgs));

  // Verify the ffmpeg `-af` chain the export will run, via the PURE builder (no ffmpeg load).
  const chain = await page.evaluate(async () => {
    const { buildAudioFilterChain } = await import('./types/media/transcoder.js');
    const freqs = [60, 120, 250, 500, 1000, 2000, 4000, 8000, 12000];
    return buildAudioFilterChain(
      { freqs, gains: [0, 3, 0, 0, -2, 0, 0, 0, 0], hpf: 80, lpf: 16000, lufsTarget: -16 },
      { fadeIn: 2, fadeOut: 3, duration: 60 },
    );
  });
  const chainOk = /^highpass=f=80:p=2,equalizer=f=120:t=q:w=1\.2:g=\+3,.*equalizer=f=1000:t=q:w=1\.2:g=-2,lowpass=f=16000:p=2,afade=t=in:st=0:d=2,afade=t=out:st=57:d=3,loudnorm=I=-16:TP=-1\.5:LRA=11$/.test(chain);
  if (chainOk) pass('P1: ffmpeg -af chain correct order (HPF→bands→LPF→fades→loudnorm)'); else fail('af chain: ' + chain);

  // ── P4: dynamics filter ordering ── afftdn → agate → acompressor → eq → alimiter.
  // PURE builder again (no ffmpeg). Dynamics fields are OPTIONAL, so the chain above
  // (without `dynamics`) stays byte-identical; with them, the mastering order holds.
  const dynChain = await page.evaluate(async () => {
    const { buildAudioFilterChain } = await import('./types/media/transcoder.js');
    const freqs = [60, 120, 250, 500, 1000, 2000, 4000, 8000, 12000];
    return buildAudioFilterChain({
      freqs, gains: [0, 0, 0, 0, 2, 0, 0, 0, 0], hpf: 80, lpf: 16000,
      dynamics: {
        denoise: { enabled: true, strength: 12 },
        gate: { enabled: true, threshold: -50, ratio: 2 },
        comp: { enabled: true, threshold: -24, ratio: 4, makeup: 6 },
        limiter: { enabled: true, ceiling: -1 },
      },
    }, {});
  });
  const idx = (s) => dynChain.indexOf(s);
  const dynOrderOk = idx('afftdn') >= 0 && idx('agate') > idx('afftdn')
    && idx('acompressor') > idx('agate') && idx('equalizer') > idx('acompressor')
    && idx('lowpass') > idx('equalizer') && idx('alimiter') > idx('lowpass')
    && idx('highpass') === 0;
  if (dynOrderOk) pass('P4: dynamics chain order (HPF→afftdn→agate→acompressor→EQ→LPF→alimiter)'); else fail('dyn chain: ' + dynChain);
  // Compressor threshold dB→linear (−24 dB ≈ 0.06) and a denoise strength land in the args.
  if (/acompressor=threshold=0\.06:ratio=4/.test(dynChain) && /afftdn=nr=12/.test(dynChain) && /agate=/.test(dynChain) && /alimiter=limit=/.test(dynChain))
    pass('P4: dynamics emit acompressor/afftdn/agate/alimiter with params'); else fail('dyn params: ' + dynChain);
  // No `dynamics` → output is byte-identical to the pre-P4 chain (existing assertion above stays green).
  const noDyn = await page.evaluate(async () => {
    const { buildAudioFilterChain } = await import('./types/media/transcoder.js');
    return buildAudioFilterChain({ freqs: [60], gains: [0], hpf: 80 }, {});
  });
  if (noDyn === 'highpass=f=80:p=2') pass('P4: chain without dynamics keeps minimal HPF-only output'); else fail('no-dyn chain: ' + noDyn);
}
