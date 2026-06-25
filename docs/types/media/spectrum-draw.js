// Spectrum canvas drawing + band-energy meter + LUFS + EQ presets.
// Pure rendering/analysis helpers shared by the audio Spectrum & EQ panel
// (spectrum.js) and the video studio's audio-mixing panel. No DOM wiring here.

// ── EQ presets ───────────────────────────────────────────────────────────────
export const PRESETS = [
  { id: 'flat',             name: 'Flat',                gains: [0,0,0,0,0,0,0,0,0],            hpf: 20,  lpf: 20000 },
  { id: 'acx-standard',     name: 'ACX Standard',        gains: [0,0,0,0,0,0,0,0,0],            hpf: 80,  lpf: 16000, category: 'audiobook', note: 'Audible/Amazon compliant.' },
  { id: 'findaway',         name: 'Findaway Voices',      gains: [0,0,0,0,0,1,2,0,0],            hpf: 80,  lpf: 20000, category: 'audiobook', note: 'Gentle presence lift.' },
  { id: 'intimate-audiobook', name: 'Intimate Audiobook', gains: [0,2,3,0,-1,1,2,0,-2],          hpf: 60,  lpf: 20000, category: 'audiobook', note: 'Warm narrator with bass body.' },
  { id: 'audacity-rolloff',  name: 'Audacity Low Rolloff',gains: [-6,-2,0,0,0,0,0,0,0],         hpf: 80,  lpf: 20000, category: 'audiobook', note: 'Classic speech cleanup.' },
  { id: 'deep-male',        name: 'Deep Male Narrator',  gains: [1,2,1,-2,0,1,3,1,0],          hpf: 80,  lpf: 20000, category: 'male', note: 'Rich baritone with clarity.' },
  { id: 'proximity-fix',    name: 'Proximity Fix',       gains: [-3,-4,-2,0,0,1,2,0,0],        hpf: 100, lpf: 20000, category: 'male', note: 'Close-mic bass reduction.' },
  { id: 'boomy-cleanup',    name: 'Boomy Voice Cleanup', gains: [-2,-3,-3,-1,0,2,3,1,0],        hpf: 100, lpf: 20000, category: 'male', note: 'Aggressive low-end cut.' },
  { id: 'female-clarity',   name: 'Female Clarity',      gains: [0,0,1,-1,0,2,3,2,2],          hpf: 100, lpf: 20000, category: 'female', note: 'Bright articulate presence.' },
  { id: 'thin-body-fix',    name: 'Thin Voice Body Fix', gains: [1,3,3,1,0,0,1,0,0],           hpf: 60,  lpf: 20000, category: 'female', note: 'Adds chest resonance warmth.' },
  { id: 'bbc-broadcast',    name: 'BBC Broadcast',       gains: [0,0,1,-2,0,2,3,1,-1],         hpf: 80,  lpf: 20000, category: 'broadcast', note: 'British broadcast standard.' },
  { id: 'npr-spoken',       name: 'NPR Spoken Word',     gains: [0,0,1,-1,0,1,2,1,0],          hpf: 80,  lpf: 20000, category: 'broadcast', note: 'Clean intimate speech.' },
  { id: 'rode-podcast',     name: 'RODE Podcast',        gains: [0,1,-1,-1,0,2,2,3,1],         hpf: 80,  lpf: 20000, category: 'broadcast', note: 'Warmth + sparkle.' },
  { id: 'radio-drama',      name: 'Radio Drama',         gains: [0,1,2,0,-1,2,3,2,1],          hpf: 80,  lpf: 20000, category: 'broadcast', note: 'Theatrical warmth + clarity.' },
  { id: 'youtube-streaming', name: 'YouTube/Streaming',   gains: [0,0,-2,-2,0,2,3,2,1],         hpf: 80,  lpf: 18000, category: 'broadcast', note: 'Optimized for small speakers.' },
  { id: 'broadcast',        name: 'Broadcast',           gains: [0,0,1,-2,0,2,3,1,-1],         hpf: 80,  lpf: 20000 },
  { id: 'warmth',           name: 'Warmth',              gains: [0,2,1,-1,0,0,-1,0,0],         hpf: 60,  lpf: 20000 },
  { id: 'deess-m',          name: 'De-ess (M)',          gains: [0,1,1,0,0,1,2,-3,-1],         hpf: 80,  lpf: 20000 },
  { id: 'deess-f',          name: 'De-ess (F)',          gains: [0,0,1,0,0,2,2,-2,-3],         hpf: 80,  lpf: 20000 },
  { id: 'bass-cut',         name: 'Bass rolloff',         gains: [0,0,0,0,0,0,0,0,0],           hpf: 100, lpf: 20000 },
  { id: 'air',              name: 'Presence+Air',        gains: [0,0,-1,-1,0,2,2,3,1],         hpf: 80,  lpf: 20000 },
  { id: 'podcast',          name: 'Podcast',             gains: [0,0,1,-1,0,1,2,1,0],          hpf: 80,  lpf: 18000 },
];

// LUFS normalization targets (streaming/broadcast standards).
export const LUFS_TARGETS = [
  { id: 'off',  name: 'Off',          target: null },
  { id: 'sp',   name: '-14 (Spotify)', target: -14 },
  { id: 'pod',  name: '-16 (Podcast)', target: -16 },
  { id: 'ebu',  name: '-23 (EBU R128)', target: -23 },
];

const EQ_FREQS = [60, 120, 250, 500, 1000, 2000, 4000, 8000, 12000];
const ZONE_COLORS = ['#e07050','#ff9800','#ffc107','#8bc34a','#4caf50','#00bcd4','#2196f3','#9c27b0','#ab47bc'];
const GRID_FREQS = [60, 120, 250, 500, 1000, 2000, 4000, 8000, 12000];
const BAR_COUNT = 80;

function fToX(f, w) { return (Math.log10(f / 20) / Math.log10(1000)) * w; }

// Read one analyser's per-bar dB curve (averaged into BAR_COUNT log-spaced bins).
function barCurve(analyserNode, data) {
  const sr = analyserNode.context.sampleRate;
  const bufLen = analyserNode.frequencyBinCount;
  const out = new Float32Array(BAR_COUNT);
  for (let i = 0; i < BAR_COUNT; i++) {
    const fLo = 20 * Math.pow(1000, i / BAR_COUNT);
    const fHi = 20 * Math.pow(1000, (i + 1) / BAR_COUNT);
    const bLo = Math.floor(fLo / (sr / analyserNode.fftSize));
    const bHi = Math.max(bLo + 1, Math.floor(fHi / (sr / analyserNode.fftSize)));
    let sum = 0, cnt = 0;
    for (let b = bLo; b < bHi && b < bufLen; b++) { sum += data[b]; cnt++; }
    out[i] = cnt > 0 ? sum / cnt : -100;
  }
  return out;
}

function prepCanvas(canvas, c) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = w * dpr; canvas.height = h * dpr;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { w, h, dpr };
}

// Draw the spectrum. If preAnalyser is supplied, the ORIGINAL (dry) spectrum is
// overlaid as a translucent line on top of the PROCESSED (wet) filled bars so the
// user sees both at once.
export function drawSpectrum(canvas, postAnalyser, gains, preAnalyser) {
  const c = canvas.getContext('2d');
  if (!c) return;
  const { w, h, dpr } = prepCanvas(canvas, c);

  const postData = new Float32Array(postAnalyser.frequencyBinCount);
  postAnalyser.getFloatFrequencyData(postData);
  const postBars = barCurve(postAnalyser, postData);

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

  // Processed spectrum bars (the wet / EQ'd signal)
  for (let i = 0; i < BAR_COUNT; i++) {
    const fLo = 20 * Math.pow(1000, i / BAR_COUNT);
    const fHi = 20 * Math.pow(1000, (i + 1) / BAR_COUNT);
    const norm = Math.max(0, (postBars[i] + 80) / 55);
    const x1 = fToX(fLo, w), x2 = fToX(fHi, w);
    const bw = Math.max(1, x2 - x1 - 0.5);
    const bh = norm * h;
    const hue = 200 - (i / BAR_COUNT) * 200;
    c.fillStyle = `hsl(${hue},65%,${Math.round(25 + norm * 30)}%)`;
    c.fillRect(x1, h - bh, bw, bh);
  }

  // Original (dry) spectrum overlaid as a bright line — the live A/B compare.
  if (preAnalyser) {
    const preData = new Float32Array(preAnalyser.frequencyBinCount);
    preAnalyser.getFloatFrequencyData(preData);
    const preBars = barCurve(preAnalyser, preData);
    c.strokeStyle = '#ffd24a'; c.lineWidth = 1.5; c.beginPath();
    for (let i = 0; i < BAR_COUNT; i++) {
      const fMid = 20 * Math.pow(1000, (i + 0.5) / BAR_COUNT);
      const norm = Math.max(0, (preBars[i] + 80) / 55);
      const x = fToX(fMid, w), y = h - norm * h;
      if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
    }
    c.stroke();
  }

  // EQ target curve overlay (the filter shape the user dialed in)
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

// ── Band energy meter (8 named zones) ────────────────────────────────────────
export function drawBandEnergy(canvas, analyserNode) {
  const c = canvas.getContext('2d');
  if (!c) return;
  const { w, h, dpr } = prepCanvas(canvas, c);

  const sr = analyserNode.context.sampleRate;
  const bufLen = analyserNode.frequencyBinCount;
  const data = new Float32Array(bufLen);
  analyserNode.getFloatFrequencyData(data);

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

// ── LUFS (RMS-based approximation off an analyser frame) ─────────────────────
export function measureLufs(analyserNode) {
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

export function fmtLufsColor(lufs) {
  return lufs < -14 ? 'var(--sp-ok)' : lufs < -6 ? 'var(--sp-warn)' : 'var(--sp-hot)';
}
