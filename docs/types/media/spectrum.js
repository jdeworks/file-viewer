/**
 * Spectrum analyzer + 9-band EQ panel for the audio renderer.
 * Lazy-loaded when the user opens the "Spectrum & EQ" panel.
 *
 * Signal chain: <audio> → HPF → 9×BiquadFilter → LPF → Analyser → destination
 * Algorithm ported from narratu/eq-engine.ts + SpectrumAnalyzer.tsx.
 *
 * CPU policy: RAF loop starts only when the panel is visible AND audio is playing.
 * The AudioContext is created on first panel open (user-gesture required anyway).
 */

// ── Band config (matches Narratu eq-types.ts) ──────────────────────────────
const EQ_FREQS = [60, 120, 250, 500, 1000, 2000, 4000, 8000, 12000];
const EQ_LABELS = ['Sub', 'Bass', 'Low-mid', 'Mid', 'Upper-mid', 'Presence', 'Sibilance', 'Air', 'Ultra'];

// ── Presets ────────────────────────────────────────────────────────────────
const PRESETS = [
  { id: 'flat',      name: 'Flat',         gains: [0,0,0,0,0,0,0,0,0],          hpf: 20,  lpf: 20000 },
  { id: 'broadcast', name: 'Broadcast',    gains: [0,0,1,-2,0,2,3,1,-1],        hpf: 80,  lpf: 20000 },
  { id: 'warmth',    name: 'Warmth',       gains: [0,2,1,-1,0,0,-1,0,0],        hpf: 60,  lpf: 20000 },
  { id: 'deess-m',   name: 'De-ess (M)',   gains: [0,1,1,0,0,1,2,-3,-1],        hpf: 80,  lpf: 20000 },
  { id: 'deess-f',   name: 'De-ess (F)',   gains: [0,0,1,0,0,2,2,-2,-3],        hpf: 80,  lpf: 20000 },
  { id: 'bass-cut',  name: 'Bass rolloff', gains: [0,0,0,0,0,0,0,0,0],          hpf: 100, lpf: 20000 },
  { id: 'air',       name: 'Presence+Air', gains: [0,0,-1,-1,0,2,2,3,1],        hpf: 80,  lpf: 20000 },
  { id: 'podcast',   name: 'Podcast',      gains: [0,0,1,-1,0,1,2,1,0],         hpf: 80,  lpf: 18000 },
];

// Band zone colors for energy bars (Narratu EqComparisonChart palette)
const ZONE_COLORS = ['#e07050','#ff9800','#ffc107','#8bc34a','#4caf50','#00bcd4','#2196f3','#9c27b0','#ab47bc'];

const GRID_FREQS = [60, 120, 250, 500, 1000, 2000, 4000, 8000, 12000];
const BAR_COUNT = 80;

function fToX(f, w) { return (Math.log10(f / 20) / Math.log10(1000)) * w; }

// ── EQ Engine ─────────────────────────────────────────────────────────────
function createEqEngine() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();

  const eqNodes = EQ_FREQS.map((freq, i) => {
    const node = ctx.createBiquadFilter();
    node.type = i === 0 ? 'lowshelf' : i === EQ_FREQS.length - 1 ? 'highshelf' : 'peaking';
    node.frequency.value = freq;
    node.Q.value = 1.2;
    node.gain.value = 0;
    return node;
  });

  const hpf = ctx.createBiquadFilter();
  hpf.type = 'highpass'; hpf.frequency.value = 20; hpf.Q.value = 0.707;
  const lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass'; lpf.frequency.value = 20000; lpf.Q.value = 0.707;

  const analyser = ctx.createAnalyser();
  analyser.fftSize = 4096;
  analyser.smoothingTimeConstant = 0.75;

  let src = null;
  const savedGains = new Array(9).fill(0);

  function buildChain() {
    if (!src) return;
    try { src.disconnect(); } catch {}
    src.connect(hpf);
    eqNodes.reduce((prev, node) => { prev.connect(node); return node; }, hpf);
    eqNodes[eqNodes.length - 1].connect(lpf);
    lpf.connect(analyser);
    analyser.connect(ctx.destination);
  }

  return {
    connect(audio) {
      if (src) { try { src.disconnect(); } catch {} }
      src = ctx.createMediaElementSource(audio);
      if (ctx.state === 'suspended') ctx.resume();
      buildChain();
    },
    setBandGain(i, g) { if (i >= 0 && i < eqNodes.length) { savedGains[i] = g; eqNodes[i].gain.value = g; } },
    setAllGains(gains) { gains.forEach((g, i) => { savedGains[i] = g; if (eqNodes[i]) eqNodes[i].gain.value = g; }); },
    setHpf(f) { hpf.frequency.value = Math.max(20, Math.min(500, f)); },
    setLpf(f) { lpf.frequency.value = Math.max(5000, Math.min(20000, f)); },
    getAnalyser() { return analyser; },
    getGains() { return [...savedGains]; },
    destroy() { try { ctx.close(); } catch {} },
  };
}

// ── Spectrum canvas draw ───────────────────────────────────────────────────
function drawSpectrum(canvas, analyserNode, gains) {
  const c = canvas.getContext('2d');
  if (!c) return;
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = w * dpr; canvas.height = h * dpr;
  c.scale(dpr, dpr);

  const sr = analyserNode.context.sampleRate;
  const maxFreq = Math.min(sr / 2, 20000);
  const bufLen = analyserNode.frequencyBinCount;
  const data = new Float32Array(bufLen);
  analyserNode.getFloatFrequencyData(data);

  c.fillStyle = '#0d0d0d'; c.fillRect(0, 0, w, h);

  // Grid lines
  c.font = `${Math.round(8 * dpr) / dpr}px ui-monospace,monospace`;
  for (const f of GRID_FREQS) {
    const x = fToX(f, w);
    c.strokeStyle = '#1e1e1e'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke();
    c.fillStyle = '#555';
    c.fillText(f < 1000 ? String(f) : `${f / 1000}k`, x + 2, h - 3);
  }

  // Spectrum bars
  for (let i = 0; i < BAR_COUNT; i++) {
    const fLo = 20 * Math.pow(1000, i / BAR_COUNT);
    const fHi = 20 * Math.pow(1000, (i + 1) / BAR_COUNT);
    const bLo = Math.floor(fLo / (sr / analyserNode.fftSize));
    const bHi = Math.max(bLo + 1, Math.floor(fHi / (sr / analyserNode.fftSize)));
    let sum = 0, cnt = 0;
    for (let b = bLo; b < bHi && b < bufLen; b++) { sum += data[b]; cnt++; }
    const db = cnt > 0 ? sum / cnt : -100;
    const norm = Math.max(0, (db + 80) / 55);
    const x1 = fToX(fLo, w), x2 = fToX(fHi, w);
    const bw = Math.max(1, x2 - x1 - 0.5);
    const bh = norm * h;
    const hue = 200 - (i / BAR_COUNT) * 200;
    c.fillStyle = `hsl(${hue},65%,${Math.round(25 + norm * 30)}%)`;
    c.fillRect(x1, h - bh, bw, bh);
  }

  // EQ curve overlay
  if (gains && gains.some(g => Math.abs(g) > 0.1)) {
    c.strokeStyle = '#4a9eff99'; c.lineWidth = 1.5; c.beginPath();
    for (let i = 0; i <= 200; i++) {
      const freq = 20 * Math.pow(1000, i / 200);
      let totalDb = 0;
      for (let e = 0; e < EQ_FREQS.length; e++) {
        const g = gains[e] || 0;
        if (Math.abs(g) < 0.1) continue;
        if (e === 0) { const r = freq / EQ_FREQS[e]; totalDb += g / (1 + r * r); }
        else if (e === EQ_FREQS.length - 1) { const r = EQ_FREQS[e] / freq; totalDb += g / (1 + r * r); }
        else {
          const f0 = EQ_FREQS[e], Q = 1.2;
          const r = (freq / f0) - (f0 / freq); totalDb += g / (1 + (Q * r) * (Q * r));
        }
      }
      const y = h / 2 - (totalDb / 15) * (h / 2);
      if (i === 0) c.moveTo(fToX(freq, w), y); else c.lineTo(fToX(freq, w), y);
    }
    c.stroke();
  }
}

// ── Band energy meter (8 named zones) ─────────────────────────────────────
function drawBandEnergy(canvas, analyserNode) {
  const c = canvas.getContext('2d');
  if (!c) return;
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = w * dpr; canvas.height = h * dpr;
  c.scale(dpr, dpr);

  const sr = analyserNode.context.sampleRate;
  const bufLen = analyserNode.frequencyBinCount;
  const data = new Float32Array(bufLen);
  analyserNode.getFloatFrequencyData(data);

  // Sub/Bass/Low-mid/Mid/Presence/Sibilance/Brilliance/Air zones (Hz ranges)
  const ZONES = [[20,80],[80,250],[250,500],[500,2000],[2000,4000],[4000,6000],[6000,10000],[10000,20000]];
  const ZONE_LABELS = ['Sub','Bass','Low-mid','Mid','Presence','Sibilance','Brilliance','Air'];

  c.fillStyle = '#0d0d0d'; c.fillRect(0, 0, w, h);

  const bw = Math.floor(w / ZONES.length) - 2;
  for (let z = 0; z < ZONES.length; z++) {
    const [lo, hi] = ZONES[z];
    const bLo = Math.floor(lo / (sr / analyserNode.fftSize));
    const bHi = Math.max(bLo + 1, Math.floor(hi / (sr / analyserNode.fftSize)));
    let sum = 0, cnt = 0;
    for (let b = bLo; b < bHi && b < bufLen; b++) { sum += data[b]; cnt++; }
    const db = cnt > 0 ? sum / cnt : -100;
    const norm = Math.max(0, (db + 80) / 55);
    const x = z * (w / ZONES.length);
    const bh = norm * (h - 16);
    c.fillStyle = ZONE_COLORS[z];
    c.globalAlpha = 0.85;
    c.fillRect(x + 1, h - 16 - bh, bw, bh);
    c.globalAlpha = 1;
    c.fillStyle = '#888';
    c.font = `${Math.round(7 * dpr) / dpr}px ui-monospace,monospace`;
    c.textAlign = 'center';
    c.fillText(ZONE_LABELS[z], x + bw / 2, h - 2);
  }
}

// ── LUFS (RMS-based approximation) ────────────────────────────────────────
function measureLufs(analyserNode) {
  const bufLen = analyserNode.frequencyBinCount;
  const data = new Float32Array(bufLen);
  analyserNode.getFloatFrequencyData(data);
  let sumSq = 0;
  for (let i = 0; i < bufLen; i++) {
    const lin = Math.pow(10, data[i] / 20);
    sumSq += lin * lin;
  }
  const rms = Math.sqrt(sumSq / bufLen);
  return 20 * Math.log10(Math.max(rms, 1e-10)) - 0.691;
}

// ── Mount function (called from renderer.js) ──────────────────────────────
export function mountSpectrumPanel(container, audioEl) {
  const engine = createEqEngine();
  let gains = new Array(9).fill(0);
  let rafId = 0;
  let connected = false;
  let abSlot = null; // stored A-slot gains

  // Connect the audio element to the EQ chain
  function ensureConnected() {
    if (!connected) {
      engine.connect(audioEl);
      connected = true;
    }
  }

  // ── DOM ──────────────────────────────────────────────────────────────────
  const wrap = document.createElement('div');
  wrap.className = 'sp-wrap';

  // Spectrum canvas
  const specCanvas = document.createElement('canvas');
  specCanvas.className = 'sp-canvas';
  specCanvas.height = 120;

  // Band energy canvas
  const bandCanvas = document.createElement('canvas');
  bandCanvas.className = 'sp-band-canvas';
  bandCanvas.height = 48;

  // LUFS row
  const lufsRow = document.createElement('div');
  lufsRow.className = 'sp-lufs-row';
  const lufsLabel = document.createElement('span');
  lufsLabel.className = 'sp-lufs-label'; lufsLabel.textContent = 'LUFS';
  const lufsVal = document.createElement('span');
  lufsVal.className = 'sp-lufs-val'; lufsVal.textContent = '—';
  lufsRow.append(lufsLabel, lufsVal);

  // EQ sliders row
  const eqRow = document.createElement('div');
  eqRow.className = 'sp-eq-row';
  const sliders = EQ_FREQS.map((freq, i) => {
    const col = document.createElement('div');
    col.className = 'sp-eq-col';
    const val = document.createElement('span');
    val.className = 'sp-eq-val'; val.textContent = '0';
    const slider = document.createElement('input');
    slider.type = 'range'; slider.min = '-15'; slider.max = '15'; slider.step = '0.5';
    slider.value = '0'; slider.className = 'sp-eq-slider';
    const lbl = document.createElement('span');
    lbl.className = 'sp-eq-lbl';
    lbl.textContent = EQ_LABELS[i];
    slider.addEventListener('input', () => {
      const g = parseFloat(slider.value);
      gains[i] = g;
      val.textContent = g > 0 ? '+' + g : String(g);
      engine.setBandGain(i, g);
    });
    col.append(val, slider, lbl);
    return { slider, val, col };
  });
  sliders.forEach(s => eqRow.append(s.col));

  // HPF / LPF row
  const filterRow = document.createElement('div');
  filterRow.className = 'sp-filter-row';
  const hpfLabel = document.createElement('label');
  hpfLabel.textContent = 'HPF ';
  const hpfInput = document.createElement('input');
  hpfInput.type = 'range'; hpfInput.min = '20'; hpfInput.max = '500'; hpfInput.value = '20';
  hpfInput.className = 'sp-filter-slider';
  const hpfVal = document.createElement('span');
  hpfVal.className = 'sp-filter-val'; hpfVal.textContent = '20Hz';
  hpfInput.addEventListener('input', () => {
    const f = parseInt(hpfInput.value);
    engine.setHpf(f);
    hpfVal.textContent = f + 'Hz';
  });
  const lpfLabel = document.createElement('label');
  lpfLabel.textContent = 'LPF ';
  const lpfInput = document.createElement('input');
  lpfInput.type = 'range'; lpfInput.min = '5000'; lpfInput.max = '20000'; lpfInput.value = '20000';
  lpfInput.className = 'sp-filter-slider';
  const lpfVal = document.createElement('span');
  lpfVal.className = 'sp-filter-val'; lpfVal.textContent = '20kHz';
  lpfInput.addEventListener('input', () => {
    const f = parseInt(lpfInput.value);
    engine.setLpf(f);
    lpfVal.textContent = f >= 1000 ? Math.round(f / 100) / 10 + 'kHz' : f + 'Hz';
  });
  filterRow.append(hpfLabel, hpfInput, hpfVal, lpfLabel, lpfInput, lpfVal);

  // Preset selector + A/B controls
  const presetRow = document.createElement('div');
  presetRow.className = 'sp-preset-row';
  const presetSel = document.createElement('select');
  presetSel.className = 'sp-preset-sel';
  PRESETS.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id; opt.textContent = p.name;
    presetSel.append(opt);
  });
  presetSel.addEventListener('change', () => applyPreset(PRESETS.find(p => p.id === presetSel.value)));

  const storeABtn = document.createElement('button');
  storeABtn.type = 'button'; storeABtn.className = 'sp-ab-btn';
  storeABtn.textContent = 'Store A';
  storeABtn.addEventListener('click', () => {
    abSlot = gains.slice();
    storeABtn.textContent = 'A stored ✓';
    setTimeout(() => { storeABtn.textContent = 'Store A'; }, 1500);
  });

  const recallABtn = document.createElement('button');
  recallABtn.type = 'button'; recallABtn.className = 'sp-ab-btn';
  recallABtn.textContent = 'Recall A';
  recallABtn.addEventListener('click', () => {
    if (!abSlot) return;
    applyGains(abSlot);
  });

  const resetBtn = document.createElement('button');
  resetBtn.type = 'button'; resetBtn.className = 'sp-ab-btn';
  resetBtn.textContent = 'Flat';
  resetBtn.addEventListener('click', () => {
    applyPreset(PRESETS[0]);
    presetSel.value = 'flat';
  });

  presetRow.append(presetSel, storeABtn, recallABtn, resetBtn);

  wrap.append(specCanvas, bandCanvas, lufsRow, eqRow, filterRow, presetRow);
  container.append(wrap);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function applyGains(g) {
    gains = g.slice();
    sliders.forEach((s, i) => {
      s.slider.value = String(g[i] || 0);
      s.val.textContent = g[i] > 0 ? '+' + g[i] : String(g[i] || 0);
    });
    engine.setAllGains(gains);
  }

  function applyPreset(p) {
    if (!p) return;
    applyGains(p.gains);
    hpfInput.value = String(p.hpf);
    hpfVal.textContent = p.hpf + 'Hz';
    engine.setHpf(p.hpf);
    lpfInput.value = String(p.lpf);
    lpfVal.textContent = p.lpf >= 1000 ? Math.round(p.lpf / 100) / 10 + 'kHz' : p.lpf + 'Hz';
    engine.setLpf(p.lpf);
  }

  // ── RAF loop ──────────────────────────────────────────────────────────────
  let lufsTimer = 0;
  function tick() {
    rafId = requestAnimationFrame(tick);
    const analyser = engine.getAnalyser();
    drawSpectrum(specCanvas, analyser, gains);
    drawBandEnergy(bandCanvas, analyser);

    // LUFS update every ~250ms
    lufsTimer++;
    if (lufsTimer % 15 === 0) {
      const lufs = measureLufs(analyser);
      lufsVal.textContent = isFinite(lufs) ? lufs.toFixed(1) + ' LUFS' : '—';
      lufsVal.style.color = lufs < -14 ? 'var(--sp-ok)' : lufs < -6 ? 'var(--sp-warn)' : 'var(--sp-hot)';
    }
  }

  function start() {
    if (rafId) return;
    ensureConnected();
    tick();
  }

  function stop() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  }

  // Start/stop with audio playback
  audioEl.addEventListener('play', start);
  audioEl.addEventListener('pause', stop);
  audioEl.addEventListener('ended', stop);
  if (!audioEl.paused) start();

  return {
    destroy() {
      stop();
      audioEl.removeEventListener('play', start);
      audioEl.removeEventListener('pause', stop);
      audioEl.removeEventListener('ended', stop);
      engine.destroy();
      wrap.remove();
    },
  };
}
