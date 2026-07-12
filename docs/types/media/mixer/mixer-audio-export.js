import { buildDecodedAudioCacheKey } from './mixer-audio-cache.js';
import { buildSchedulePlan, createNoiseBufferForMixer } from './mixer-audio-playback.js';

const MAX_BROWSER_MIX_FRAMES = 48000 * 60 * 20;

export function buildAudioMixExportPlan(project, options = {}) {
  const format = options.format === 'mp3' ? 'mp3' : 'wav';
  const sampleRate = Math.round(options.sampleRate || project.project?.sampleRate || 48000);
  const channels = Math.max(1, Math.min(2, Math.round(options.channels || project.project?.channels || 1)));
  const bitRate = format === 'mp3' ? (channels === 1 ? 128 : 192) : null;
  const plan = buildSchedulePlan(project, 0);
  const durationMs = Math.max(project.project?.durationMs || 0, ...plan.items.map((item) => item.element.timeline.startMs + item.durationMs));
  const frames = Math.ceil((durationMs / 1000) * sampleRate);
  const warnings = [];
  if (!plan.items.length) warnings.push('No audible audio elements are scheduled.');
  if (frames > MAX_BROWSER_MIX_FRAMES) warnings.push('Browser audio render is over the safe duration budget; use ffmpeg/proxy export when available.');
  const provenance = {
    renderPath: 'browser-offline-audio',
    format,
    mime: format === 'mp3' ? 'audio/mpeg' : 'audio/wav',
    encoder: format === 'mp3' ? 'lamejs-1.2.1-worker' : 'pcm-s16le',
    bitRate,
    sampleRate,
    channels,
    durationMs,
    master: {
      gain: project.master?.audio?.gain ?? 1,
      eqPreset: project.master?.audio?.eq?.presetId || 'flat',
    },
    items: plan.items.map((item) => ({
      elementId: item.element.id,
      laneId: item.lane.id,
      assetId: item.element.assetId || null,
      type: item.element.type,
      startMs: item.element.timeline.startMs,
      sourceInMs: item.element.timeline.sourceInMs,
      sourceOutMs: item.element.timeline.sourceOutMs,
      durationMs: item.durationMs,
      gain: item.gain,
      laneGain: item.lane.audio?.gain ?? 1,
      elementGain: item.element.audio?.gain ?? 1,
      fadeInMs: item.element.audio?.fadeInMs ?? 0,
      fadeOutMs: item.element.audio?.fadeOutMs ?? 0,
      laneMuted: !!item.lane.muted,
      laneSolo: !!item.lane.solo,
      roomTone: item.element.audio?.roomTone || null,
      laneEqPreset: item.lane.audio?.eq?.presetId || 'flat',
      elementEqPreset: item.element.audio?.eq?.presetId || 'flat',
    })),
    warnings,
  };
  return {
    kind: 'audio-mix',
    format,
    mime: format === 'mp3' ? 'audio/mpeg' : 'audio/wav',
    bitRate,
    filename: options.filename || `mixdown.${format}`,
    sampleRate,
    channels,
    durationMs,
    frames,
    itemCount: plan.items.length,
    canRenderInBrowser: frames > 0 && frames <= MAX_BROWSER_MIX_FRAMES,
    warnings,
    provenance,
    schedule: plan,
  };
}

export async function renderAudioMixToBuffer(project, { runtimeFiles, cache, sampleRate, channels, format = 'wav', filename, signal } = {}) {
  const plan = buildAudioMixExportPlan(project, { sampleRate, channels, format, filename });
  if (!plan.canRenderInBrowser) throw new Error(plan.warnings[0] || 'Mix cannot be rendered in this browser.');
  throwIfAborted(signal);
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!OAC) throw new Error('OfflineAudioContext unavailable in this browser.');
  const context = new OAC(plan.channels, Math.max(1, plan.frames), plan.sampleRate);
  const master = context.createGain();
  master.gain.value = project.master?.audio?.gain ?? 1;
  master.connect(context.destination);
  let scheduled = 0;
  const skipped = [];
  for (const item of plan.schedule.items) {
    throwIfAborted(signal);
    const source = await createOfflineSource(context, item, project, { runtimeFiles, cache });
    if (!source) {
      skipped.push(item.element.id);
      continue;
    }
    const gain = context.createGain();
    source.node.connect(gain);
    gain.connect(master);
    applyOfflineEnvelope(context, gain, item);
    source.start();
    scheduled += 1;
  }
  if (!scheduled) throw new Error('No mix elements could be decoded for browser export.');
  const rendered = await context.startRendering();
  throwIfAborted(signal);
  return {
    audioBuffer: rendered,
    plan: {
      ...plan,
      provenance: {
        ...plan.provenance,
        scheduled,
        skipped,
        warnings: skipped.length ? [...plan.warnings, `${skipped.length} element(s) could not be decoded for browser export.`] : plan.warnings,
      },
    },
  };
}

export async function renderAudioMixToWav(project, options = {}) {
  const { audioBuffer, plan } = await renderAudioMixToBuffer(project, { ...options, format: 'wav' });
  return { blob: encodeWav(audioBuffer), plan };
}

export async function renderAudioMixToBlob(project, options = {}) {
  const format = options.format === 'mp3' ? 'mp3' : 'wav';
  const { audioBuffer, plan } = await renderAudioMixToBuffer(project, { ...options, format });
  if (format === 'wav') return { blob: encodeWav(audioBuffer), plan };
  const blob = await encodeMp3(audioBuffer, {
    bitRate: plan.bitRate,
    signal: options.signal,
    onProgress: options.onProgress,
  });
  return { blob, plan };
}

export function encodeMp3(audioBuffer, { bitRate, signal, onProgress } = {}) {
  throwIfAborted(signal);
  if (typeof Worker === 'undefined') return Promise.reject(new Error('MP3 worker support is unavailable in this browser.'));
  const channels = [];
  const transfer = [];
  for (let channel = 0; channel < Math.min(2, audioBuffer.numberOfChannels); channel += 1) {
    const copy = new Float32Array(audioBuffer.getChannelData(channel));
    channels.push(copy.buffer);
    transfer.push(copy.buffer);
  }
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./mixer-mp3-worker.js', import.meta.url));
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', onAbort);
      worker.terminate();
      callback(value);
    };
    const onAbort = () => finish(reject, abortError());
    signal?.addEventListener('abort', onAbort, { once: true });
    worker.onerror = (event) => finish(reject, new Error(event.message || 'The local MP3 encoder failed to load.'));
    worker.onmessage = (event) => {
      if (event.data?.type === 'progress') { onProgress?.(event.data.value); return; }
      if (event.data?.type === 'error') { finish(reject, new Error(event.data.message || 'MP3 encoding failed.')); return; }
      if (event.data?.type === 'done') finish(resolve, new Blob(event.data.chunks || [], { type: 'audio/mpeg' }));
    };
    worker.postMessage({ channels, sampleRate: audioBuffer.sampleRate, bitRate: bitRate || (channels.length === 1 ? 128 : 192) }, transfer);
  });
}

function abortError() {
  return new DOMException('Mix export was cancelled.', 'AbortError');
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw abortError();
}

async function createOfflineSource(context, item, project, { runtimeFiles, cache }) {
  if (item.element.type === 'generated' || item.element.audio?.roomTone) return createOfflineGenerated(context, item);
  const asset = project.assets.find((candidate) => candidate.id === item.element.assetId);
  const file = asset ? runtimeFiles?.get(asset.id) : null;
  if (!asset || !file) return null;
  const key = buildDecodedAudioCacheKey({
    projectId: project.project.id,
    asset,
    element: item.element,
    sampleRate: context.sampleRate,
    channels: project.project.channels,
  });
  let buffer = cache?.get(key);
  if (!buffer) {
    const bytes = await file.arrayBuffer();
    buffer = await context.decodeAudioData(bytes.slice(0));
    cache?.set(key, buffer, {
      projectId: project.project.id,
      assetId: asset.id,
      elementId: item.element.id,
      kind: 'decoded',
    });
  }
  const node = context.createBufferSource();
  node.buffer = buffer;
  return {
    node,
    start() {
      node.start(item.delayMs / 1000, item.sourceOffsetMs / 1000, item.durationMs / 1000);
    },
  };
}

function createOfflineGenerated(context, item) {
  const roomTone = item.element.audio?.roomTone || {};
  if (roomTone.kind === 'tone') {
    const node = context.createOscillator();
    node.type = 'sine';
    node.frequency.value = Number(roomTone.frequency) || 440;
    return {
      node,
      start() {
        node.start(item.delayMs / 1000);
        node.stop((item.delayMs + item.durationMs) / 1000);
      },
    };
  }
  const node = context.createBufferSource();
  node.buffer = createNoiseBufferForMixer(context, Math.max(2, item.durationMs / 1000), roomTone.kind || 'pink-noise');
  node.loop = true;
  return {
    node,
    start() {
      node.start(item.delayMs / 1000, item.sourceOffsetMs / 1000, item.durationMs / 1000);
    },
  };
}

function applyOfflineEnvelope(context, gainNode, item) {
  const start = item.delayMs / 1000;
  const end = start + item.durationMs / 1000;
  const fadeIn = Math.max(0, item.element.audio?.fadeInMs || 0) / 1000;
  const fadeOut = Math.max(0, item.element.audio?.fadeOutMs || 0) / 1000;
  gainNode.gain.setValueAtTime(item.gain, start);
  if (fadeIn > 0) {
    gainNode.gain.setValueAtTime(0.0001, start);
    gainNode.gain.linearRampToValueAtTime(item.gain, Math.min(end, start + fadeIn));
  }
  if (fadeOut > 0 && end - fadeOut > start) {
    gainNode.gain.setValueAtTime(item.gain, end - fadeOut);
    gainNode.gain.linearRampToValueAtTime(0.0001, end);
  }
}

export function encodeWav(audioBuffer) {
  const channels = [];
  for (let i = 0; i < audioBuffer.numberOfChannels; i += 1) channels.push(audioBuffer.getChannelData(i));
  return new Blob([encodeWavPcm(channels, audioBuffer.sampleRate, audioBuffer.length)], { type: 'audio/wav' });
}

function encodeWavPcm(channels, sampleRate, length) {
  const channelCount = channels.length;
  const blockAlign = channelCount * 2;
  const dataSize = length * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataSize, true);
  let offset = 44;
  for (let frame = 0; frame < length; frame += 1) {
    for (let channel = 0; channel < channelCount; channel += 1) {
      let sample = channels[channel][frame] || 0;
      sample = Math.max(-1, Math.min(1, sample));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  }
  return buffer;
}

function writeAscii(view, offset, text) {
  for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
}
