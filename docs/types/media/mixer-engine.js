// P5 — Multi-track audio mixer ENGINE (no DOM).
//
// Owns the lane data model, the Web Audio realtime transport, the generator
// sources (test tone / pink noise), and the OfflineAudioContext mixdown → WAV.
// mixer-ui.js drives all of this; keeping the audio math here keeps both files
// under the LOC cap and lets the engine be reasoned about in isolation.
//
// CPU policy: NOTHING here allocates an AudioContext or decodes audio until the
// caller actually opens the mixer and adds a lane. The realtime graph is torn
// down on stop()/destroy(); the offline mixdown builds its own short-lived
// OfflineAudioContext and discards it.
//
// Lane model (one object per swim-lane):
//   { id, kind:'clip'|'tone'|'noise', name,
//     buffer:AudioBuffer|null,        // decoded clip (null for live generators)
//     freq, noiseColor,               // generator params
//     offset:Number,                  // start position on the shared timeline (s)
//     gain:Number(0..2), muted, solo,
//     fadeIn:Number(s), fadeOut:Number(s),
//     duration:Number(s) }            // derived (buffer length or a default for generators)

const DEFAULT_GEN_DURATION = 5;   // generators have no intrinsic length; default 5s region.

let _idSeq = 0;
export function nextLaneId() { return 'lane' + (++_idSeq); }

let _ac = null;   // shared realtime AudioContext for the mixer (separate from the EQ graph)
export function getMixerAC() {
  if (!_ac || _ac.state === 'closed') {
    try { _ac = new (window.AudioContext || window.webkitAudioContext)(); }
    catch { return null; }
  }
  return _ac;
}

// Decode an audio File/Blob into an AudioBuffer (full decode — the mixer needs
// the whole clip to mix it). Uses the shared AC; returns null on failure.
export async function decodeFile(file) {
  const ac = getMixerAC();
  if (!ac) return null;
  let buf;
  try { buf = await file.arrayBuffer(); } catch { return null; }
  try { return await ac.decodeAudioData(buf.slice(0)); }
  catch { return null; }
}

// Build a fresh clip lane from a decoded buffer.
export function makeClipLane(name, buffer) {
  return {
    id: nextLaneId(), kind: 'clip', name,
    buffer, freq: 0, noiseColor: 'pink',
    offset: 0, gain: 1, muted: false, solo: false,
    fadeIn: 0, fadeOut: 0,
    duration: buffer ? buffer.duration : 0,
  };
}

// Build a generator lane (test tone or pink noise). No buffer — rendered live.
export function makeGeneratorLane(kind, opts = {}) {
  return {
    id: nextLaneId(), kind,
    name: kind === 'tone' ? (opts.freq || 440) + ' Hz tone' : 'Pink noise',
    buffer: null, freq: opts.freq || 440, noiseColor: opts.noiseColor || 'pink',
    offset: 0, gain: kind === 'noise' ? 0.4 : 0.6, muted: false, solo: false,
    fadeIn: 0, fadeOut: kind === 'noise' ? 0.05 : 0,
    duration: opts.duration || DEFAULT_GEN_DURATION,
  };
}

// A solo on ANY lane silences every non-solo lane.
export function effectiveGain(lane, anySolo) {
  if (lane.muted) return 0;
  if (anySolo && !lane.solo) return 0;
  return lane.gain;
}

// Total timeline length = max(offset + duration) across all lanes.
export function timelineDuration(lanes) {
  let max = 0;
  for (const l of lanes) max = Math.max(max, l.offset + l.duration);
  return max;
}

// ── Realtime transport ────────────────────────────────────────────────────────
//
// Each lane gets its own source node (AudioBufferSourceNode for clips, an
// OscillatorNode for tones, a noise BufferSource for pink noise) → a per-lane
// GainNode (carrying gain + linear-ramped fades) → master GainNode → destination.
// Built fresh on every play (source nodes are one-shot) and torn down on stop.
export class MixerTransport {
  constructor() {
    this.ac = getMixerAC();
    this.master = this.ac ? this.ac.createGain() : null;
    if (this.master) this.master.connect(this.ac.destination);
    this.nodes = [];          // active source nodes (for stop)
    this.playing = false;
    this.startedAt = 0;       // ac.currentTime at play()
    this.startOffset = 0;     // timeline position playback began from (s)
    this._onEnded = null;
  }

  setMasterGain(v) { if (this.master) this.master.gain.value = v; }

  // Current playhead position on the shared timeline (seconds).
  position() {
    if (!this.ac) return this.startOffset;
    if (!this.playing) return this.startOffset;
    return this.startOffset + (this.ac.currentTime - this.startedAt);
  }

  // Build the live graph for `lanes` and start at timeline position `from`.
  play(lanes, from = 0, onEnded) {
    if (!this.ac || !this.master) return;
    this.stop(true);
    const ac = this.ac;
    if (ac.state === 'suspended') ac.resume();
    this.startedAt = ac.currentTime;
    this.startOffset = from;
    this._onEnded = onEnded || null;
    const anySolo = lanes.some((l) => l.solo);
    const total = timelineDuration(lanes);
    const t0 = ac.currentTime;

    for (const lane of lanes) {
      const g = effectiveGain(lane, anySolo);
      if (g <= 0) continue;
      const node = this._buildSource(lane);
      if (!node) continue;
      const gainNode = ac.createGain();
      applyFadeEnvelope(ac, gainNode, lane, g, from, t0);
      node.connect(gainNode);
      gainNode.connect(this.master);

      // When does this lane's region start, relative to the playhead?
      const laneStart = Math.max(0, lane.offset - from);
      const into = Math.max(0, from - lane.offset);    // seconds already elapsed in the region
      if (into >= lane.duration) continue;              // playhead is past this lane
      const remaining = lane.duration - into;
      const when = t0 + laneStart;
      if (lane.kind === 'clip') {
        node.start(when, into, remaining);
      } else if (lane.kind === 'tone') {
        node.start(when); node.stop(when + remaining);
      } else { // noise BufferSource
        node.start(when, into % node.buffer.duration, remaining);
      }
      this.nodes.push(node);
    }

    this.playing = true;
    // Schedule an auto-stop at the end of the timeline.
    const playDur = Math.max(0, total - from);
    this._endTimer = setTimeout(() => {
      this.stop();
      if (this._onEnded) this._onEnded();
    }, (playDur + 0.1) * 1000);
  }

  _buildSource(lane) {
    const ac = this.ac;
    if (lane.kind === 'clip') {
      if (!lane.buffer) return null;
      const src = ac.createBufferSource(); src.buffer = lane.buffer; return src;
    }
    if (lane.kind === 'tone') {
      const osc = ac.createOscillator(); osc.type = 'sine'; osc.frequency.value = lane.freq || 440; return osc;
    }
    // pink noise → a 2s looping noise buffer (cheap, no AudioWorklet needed)
    const src = ac.createBufferSource();
    src.buffer = makeNoiseBuffer(ac, 2, lane.noiseColor);
    src.loop = true;
    return src;
  }

  pause() { this.startOffset = this.position(); this.stop(true); }

  stop(keepOffset = false) {
    if (this._endTimer) { clearTimeout(this._endTimer); this._endTimer = null; }
    for (const n of this.nodes) { try { n.stop(); } catch { /* already stopped */ } try { n.disconnect(); } catch {} }
    this.nodes = [];
    this.playing = false;
    if (!keepOffset) this.startOffset = 0;
  }

  destroy() {
    this.stop();
    try { this.master?.disconnect(); } catch {}
  }
}

// Apply a fade-in / fade-out envelope on a lane's GainNode using linear ramps,
// honouring the playhead `from` (a fade that already elapsed is skipped). `t0`
// is the AudioContext time the transport started.
function applyFadeEnvelope(ac, gainNode, lane, peak, from, t0) {
  const laneStart = Math.max(0, lane.offset - from);
  const into = Math.max(0, from - lane.offset);
  const start = t0 + laneStart;
  const regionEnd = start + (lane.duration - into);
  const fi = lane.fadeIn || 0;
  const fo = lane.fadeOut || 0;

  gainNode.gain.cancelScheduledValues(t0);
  if (fi > 0 && into < fi) {
    // Still inside the fade-in.
    const startLevel = peak * (into / fi);
    gainNode.gain.setValueAtTime(Math.max(0.0001, startLevel), start);
    gainNode.gain.linearRampToValueAtTime(peak, start + (fi - into));
  } else {
    gainNode.gain.setValueAtTime(peak, start);
  }
  if (fo > 0) {
    const foStart = regionEnd - fo;
    if (foStart > start) {
      gainNode.gain.setValueAtTime(peak, Math.max(start, foStart));
    }
    gainNode.gain.linearRampToValueAtTime(0.0001, regionEnd);
  }
}

// Generate a noise buffer. Pink noise via the Paul Kellet approximation; 'white'
// falls back to raw random. Returns an AudioBuffer on the given context.
export function makeNoiseBuffer(ctx, seconds, color = 'pink') {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  if (color === 'white') {
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.96900 * b2 + w * 0.1538520;
    b3 = 0.86650 * b3 + w * 0.3104856;
    b4 = 0.55000 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.0168980;
    d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
    b6 = w * 0.115926;
  }
  return buf;
}

// ── OfflineAudioContext mixdown ────────────────────────────────────────────────
//
// Render all (non-muted, solo-respecting) lanes into a single stereo buffer.
// Mirrors the realtime graph but on an OfflineAudioContext so it runs faster than
// realtime and yields a deterministic AudioBuffer for WAV/MP3 encode.
export async function mixdown(lanes, { sampleRate = 44100 } = {}) {
  const total = timelineDuration(lanes);
  if (total <= 0) throw new Error('Nothing to mix — all lanes are empty.');
  const frames = Math.ceil(total * sampleRate);
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!OAC) throw new Error('OfflineAudioContext unavailable in this browser.');
  const oac = new OAC(2, frames, sampleRate);
  const master = oac.createGain();
  master.connect(oac.destination);
  const anySolo = lanes.some((l) => l.solo);

  for (const lane of lanes) {
    const g = effectiveGain(lane, anySolo);
    if (g <= 0) continue;
    let node;
    if (lane.kind === 'clip') {
      if (!lane.buffer) continue;
      node = oac.createBufferSource(); node.buffer = lane.buffer;
    } else if (lane.kind === 'tone') {
      node = oac.createOscillator(); node.type = 'sine'; node.frequency.value = lane.freq || 440;
    } else {
      node = oac.createBufferSource();
      node.buffer = makeNoiseBuffer(oac, Math.max(2, lane.duration), lane.noiseColor);
    }
    const gainNode = oac.createGain();
    applyFadeEnvelope(oac, gainNode, lane, g, 0, 0);
    node.connect(gainNode); gainNode.connect(master);
    const when = lane.offset;
    if (lane.kind === 'tone') { node.start(when); node.stop(when + lane.duration); }
    else if (lane.kind === 'clip') node.start(when, 0, lane.duration);
    else node.start(when, 0, lane.duration);
  }

  const rendered = await oac.startRendering();
  return rendered;   // AudioBuffer
}

// Encode an AudioBuffer to a 16-bit PCM WAV Blob. Prefers the off-thread Worker
// (mixer-wav-worker.js); if Workers are unavailable (or fail to spawn) it falls
// back to encoding on the main thread so the export still completes.
export async function encodeWav(audioBuffer) {
  const numCh = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  const channels = [];
  for (let c = 0; c < numCh; c++) channels.push(audioBuffer.getChannelData(c));
  const sampleRate = audioBuffer.sampleRate;

  // Try the worker first.
  try {
    const worker = new Worker(new URL('./mixer-wav-worker.js', import.meta.url), { type: 'module' });
    const buffer = await new Promise((resolve, reject) => {
      worker.onmessage = (e) => e.data.ok ? resolve(e.data.buffer) : reject(new Error(e.data.error));
      worker.onerror = (e) => reject(new Error(e.message || 'WAV worker error'));
      // Copy the channel data (transferring the live AudioBuffer's arrays would detach them).
      const copies = channels.map((ch) => ch.slice());
      worker.postMessage({ channels: copies, sampleRate, length }, copies.map((c) => c.buffer));
    });
    worker.terminate();
    return new Blob([buffer], { type: 'audio/wav' });
  } catch {
    return new Blob([encodeWavMainThread(channels, sampleRate, length)], { type: 'audio/wav' });
  }
}

// Main-thread WAV encode fallback (same 44-byte header as the worker).
function encodeWavMainThread(channels, sampleRate, length) {
  const numCh = channels.length;
  const blockAlign = numCh * 2;
  const dataSize = length * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const ws = (o, s) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, 'RIFF'); view.setUint32(4, 36 + dataSize, true); ws(8, 'WAVE');
  ws(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, numCh, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); ws(36, 'data'); view.setUint32(40, dataSize, true);
  let off = 44;
  for (let i = 0; i < length; i++) {
    for (let c = 0; c < numCh; c++) {
      let s = channels[c][i]; s = s < -1 ? -1 : s > 1 ? 1 : s;
      view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true); off += 2;
    }
  }
  return buffer;
}
