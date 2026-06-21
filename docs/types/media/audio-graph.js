// Shared WebAudio graph for the media "studio" — used by BOTH the audio-only
// Spectrum & EQ panel AND the video studio's audio-mixing panel.
//
// A media element (<audio> or <video>) may only have ONE MediaElementSource ever
// created for it (createMediaElementSource throws on the second call). This module
// is therefore the single owner of that source + the whole processing graph, keyed
// by element in a WeakMap. waveform.js's connectGain() also routes through here so
// the gain slider and the EQ never fight over the source.
//
// Signal chain (so two analysers can show ORIGINAL vs PROCESSED at once):
//
//   source ──┬─────────────────────────────────────────► preAnalyser   (dry / original)
//            │
//            └─► HPF ─► 9×BiquadFilter ─► LPF ─► makeupGain ─┬─► postAnalyser (wet / EQ'd)
//                                                            └─► destination
//
// preAnalyser taps the dry signal and is NOT connected to destination (it only
// measures). postAnalyser sits on the audible wet path. makeupGain applies the
// LUFS-normalization makeup (and the per-track mixer gain).
//
// CPU policy: this module never runs a RAF loop — it just builds nodes. The
// panels drive their own RAF and only while playing + visible.

const EQ_FREQS = [60, 120, 250, 500, 1000, 2000, 4000, 8000, 12000];
const EQ_LABELS = ['Sub', 'Bass', 'Low-mid', 'Mid', 'Upper-mid', 'Presence', 'Sibilance', 'Air', 'Ultra'];

// Per-element graph cache. createMediaElementSource is one-shot per element, so the
// first feature to touch an element wins and every other feature reuses this graph.
const _graphs = new WeakMap();   // mediaEl → graph
let _ac = null;                  // shared AudioContext (one per page is plenty)

function getAC() {
  if (!_ac || _ac.state === 'closed') {
    try { _ac = new (window.AudioContext || window.webkitAudioContext)(); }
    catch { return null; }
  }
  return _ac;
}

// Build (or return the cached) processing graph for a media element.
// Returns null only if WebAudio is unavailable.
export function getGraph(mediaEl) {
  if (_graphs.has(mediaEl)) return _graphs.get(mediaEl);
  const ctx = getAC();
  if (!ctx) return null;

  let source;
  try { source = ctx.createMediaElementSource(mediaEl); }
  catch { return null; }   // already wired some other way — can't recover

  const hpf = ctx.createBiquadFilter();
  hpf.type = 'highpass'; hpf.frequency.value = 20; hpf.Q.value = 0.707;
  const lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass'; lpf.frequency.value = 20000; lpf.Q.value = 0.707;

  const eqNodes = EQ_FREQS.map((freq, i) => {
    const node = ctx.createBiquadFilter();
    node.type = i === 0 ? 'lowshelf' : i === EQ_FREQS.length - 1 ? 'highshelf' : 'peaking';
    node.frequency.value = freq; node.Q.value = 1.2; node.gain.value = 0;
    return node;
  });

  const makeupGain = ctx.createGain();   // LUFS makeup + mixer gain live here
  makeupGain.gain.value = 1;

  const preAnalyser = ctx.createAnalyser();   // dry / original
  preAnalyser.fftSize = 4096; preAnalyser.smoothingTimeConstant = 0.75;
  const postAnalyser = ctx.createAnalyser();  // wet / processed
  postAnalyser.fftSize = 4096; postAnalyser.smoothingTimeConstant = 0.75;

  // Wire it up.
  source.connect(preAnalyser);              // dry tap (measure only)
  source.connect(hpf);                      // wet path
  eqNodes.reduce((prev, node) => { prev.connect(node); return node; }, hpf);
  eqNodes[eqNodes.length - 1].connect(lpf);
  lpf.connect(makeupGain);
  makeupGain.connect(postAnalyser);         // measure the audible signal
  makeupGain.connect(ctx.destination);      // and play it

  const savedGains = new Array(9).fill(0);
  let savedHpf = 20;      // tracked cutoffs (BiquadFilter has no readable "set" history)
  let savedLpf = 20000;
  let lufsTarget = null;  // current LUFS normalization target (dB) or null — set by the EQ panel
  let userGain = 1;       // mixer (per-track volume) component
  let makeup = 1;         // LUFS-normalization component
  function applyGain() { makeupGain.gain.value = userGain * makeup; }

  if (ctx.state === 'suspended') ctx.resume();

  const graph = {
    ctx,
    eqFreqs: EQ_FREQS,
    eqLabels: EQ_LABELS,
    preAnalyser, postAnalyser,
    // Backwards-compatible single-analyser accessor (the wet/processed one).
    getAnalyser() { return postAnalyser; },
    setBandGain(i, g) { if (i >= 0 && i < eqNodes.length) { savedGains[i] = g; eqNodes[i].gain.value = g; } },
    setAllGains(gains) { gains.forEach((g, i) => { savedGains[i] = g; if (eqNodes[i]) eqNodes[i].gain.value = g; }); },
    getGains() { return [...savedGains]; },
    setHpf(f) { savedHpf = Math.max(20, Math.min(500, f)); hpf.frequency.value = savedHpf; },
    setLpf(f) { savedLpf = Math.max(5000, Math.min(20000, f)); lpf.frequency.value = savedLpf; },
    getHpf() { return savedHpf; },
    getLpf() { return savedLpf; },
    // LUFS normalization target (dB) the EQ panel is converging the live makeup to.
    // Stored here (not just in the panel) so the offline export can read it.
    setLufsTarget(t) { lufsTarget = (t === null || t === undefined) ? null : t; },
    getLufsTarget() { return lufsTarget; },
    // Snapshot of the full processing chain for the offline (ffmpeg) bake.
    getSettings() {
      return {
        freqs: [...EQ_FREQS],
        gains: [...savedGains],
        hpf: savedHpf,
        lpf: savedLpf,
        lufsTarget,
      };
    },
    // The mixer gain (per-track volume, 0–2 etc). Multiplies with the LUFS makeup.
    getGainNode() { return makeupGain; },
    setUserGain(g) { userGain = g; applyGain(); },
    getUserGain() { return userGain; },
    // LUFS-normalization makeup (linear multiplier). Kept separate so it composes
    // with the mixer gain rather than overwriting it.
    setMakeupGain(g) { makeup = g; applyGain(); },
    getMakeupGain() { return makeup; },
    resume() { if (ctx.state === 'suspended') ctx.resume(); },
  };
  _graphs.set(mediaEl, graph);
  return graph;
}

export { EQ_FREQS, EQ_LABELS };
