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

  // P4 dynamics insert point. makeupGain → dynOut → (analyser + destination). The
  // compressor / limiter nodes are inserted lazily BETWEEN makeupGain and dynOut
  // only when the user enables them (CPU-lazy: no DynamicsCompressorNode allocated
  // for the common "just play it" case). dynOut is a cheap unity gain that gives a
  // stable splice point so we never touch source/destination on reconnect.
  const dynOut = ctx.createGain();
  dynOut.gain.value = 1;

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
  makeupGain.connect(dynOut);               // default: no dynamics inserted
  dynOut.connect(postAnalyser);             // measure the audible signal
  dynOut.connect(ctx.destination);          // and play it

  // ── P4: lazily-built live dynamics (compressor + limiter) ──────────────────
  // The live gate is a light bake-only effect (a true zero-latency gate needs a
  // gain follower that's costly per-sample); de-noise has no real-time WebAudio
  // analog. Both are serialized in getSettings() and applied on export only.
  let compNode = null;     // DynamicsCompressorNode for the compressor (live)
  let limNode = null;      // DynamicsCompressorNode configured as a brickwall limiter
  const comp = { enabled: false, threshold: -24, ratio: 4, attack: 0.003, release: 0.25, knee: 30, makeup: 0 };
  const limiter = { enabled: false, ceiling: -1 };
  const gate = { enabled: false, threshold: -50, ratio: 2, attack: 0.001, release: 0.1 };
  const denoise = { enabled: false, strength: 12 };

  // Re-splice makeupGain → [comp] → [limiter] → dynOut based on which live nodes
  // are enabled. Called whenever a live dynamics enable/bypass toggles.
  function rewireDynamics() {
    try { makeupGain.disconnect(); } catch { /* ignore */ }
    if (compNode) { try { compNode.disconnect(); } catch { /* ignore */ } }
    if (limNode) { try { limNode.disconnect(); } catch { /* ignore */ } }
    const chain = [];
    if (comp.enabled) {
      if (!compNode) compNode = ctx.createDynamicsCompressor();
      applyCompParams();
      chain.push(compNode);
    }
    if (limiter.enabled) {
      if (!limNode) limNode = ctx.createDynamicsCompressor();
      applyLimParams();
      chain.push(limNode);
    }
    let prev = makeupGain;
    for (const node of chain) { prev.connect(node); prev = node; }
    prev.connect(dynOut);
  }
  function applyCompParams() {
    if (!compNode) return;
    compNode.threshold.value = clamp(comp.threshold, -100, 0);
    compNode.ratio.value = clamp(comp.ratio, 1, 20);
    compNode.attack.value = clamp(comp.attack, 0, 1);
    compNode.release.value = clamp(comp.release, 0, 1);
    compNode.knee.value = clamp(comp.knee, 0, 40);
  }
  function applyLimParams() {
    if (!limNode) return;
    // Brickwall: high ratio, fast attack, threshold at the ceiling.
    limNode.threshold.value = clamp(limiter.ceiling, -60, 0);
    limNode.ratio.value = 20;
    limNode.attack.value = 0.001;
    limNode.release.value = 0.05;
    limNode.knee.value = 0;
  }
  function clamp(v, lo, hi) { const n = Number(v); return isFinite(n) ? Math.max(lo, Math.min(hi, n)) : lo; }

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
        dynamics: {
          comp: { ...comp },
          limiter: { ...limiter },
          gate: { ...gate },     // bake-only (applied on export)
          denoise: { ...denoise }, // bake-only (applied on export)
        },
      };
    },

    // ── P4 dynamics API ──────────────────────────────────────────────────────
    // Compressor + limiter are LIVE (WebAudio); gate + de-noise are bake-only and
    // just store their params here so getSettings() can serialize them for ffmpeg.
    getDynamics() {
      return { comp: { ...comp }, limiter: { ...limiter }, gate: { ...gate }, denoise: { ...denoise } };
    },
    // patch is a partial { enabled?, ... } merged into the named section. Live
    // sections (comp/limiter) re-splice the graph; bake-only ones just record.
    setComp(patch) { Object.assign(comp, patch); if (compNode) applyCompParams(); rewireDynamics(); },
    setLimiter(patch) { Object.assign(limiter, patch); if (limNode) applyLimParams(); rewireDynamics(); },
    setGate(patch) { Object.assign(gate, patch); },
    setDenoise(patch) { Object.assign(denoise, patch); },
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
