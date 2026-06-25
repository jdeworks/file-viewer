import {
  AUDIO_COMPARE_MAX_BYTES,
  VIDEO_COMPARE_HEIGHT,
  VIDEO_COMPARE_MAX_BYTES,
  VIDEO_COMPARE_MAX_FRAMES,
  VIDEO_COMPARE_WIDTH,
  clamp,
} from './compare-ui-constants.js';
import { readPcmWavFirstChannelRange } from './compare-audio.js';

export function canDecodeByBrowser(file) {
  return !file || file.size <= AUDIO_COMPARE_MAX_BYTES;
}

export function readFirstChannel(buffer) {
  if (!buffer || buffer.numberOfChannels < 1) return new Float32Array();
  return buffer.getChannelData(0);
}

export async function readSelectedWavRange(file, sourceRange, label, maxBytes = AUDIO_COMPARE_MAX_BYTES) {
  if (!file) return null;
  return readPcmWavFirstChannelRange(file, sourceRange, {
    label,
    maxBytes,
  });
}

export function toAudioAnalysisFromRange(rangeA, rangeB = null, overlapRanges = null) {
  return {
    channelA: rangeA.channel,
    rateA: rangeA.sampleRate,
    rangeStartA: rangeA.rangeStart,
    channelB: rangeB ? rangeB.channel : null,
    rateB: rangeB?.sampleRate || 0,
    rangeStartB: rangeB?.rangeStart || 0,
    hasB: !!rangeB,
    overlapRanges,
    source: 'wav-range',
    stale: false,
  };
}

export function toAudioAnalysisFromBuffers(bufferA, bufferB = null, overlapRanges = null) {
  return {
    channelA: readFirstChannel(bufferA),
    rateA: bufferA.sampleRate,
    rangeStartA: 0,
    channelB: bufferB ? readFirstChannel(bufferB) : null,
    rateB: bufferB?.sampleRate || 0,
    rangeStartB: 0,
    hasB: !!bufferB,
    overlapRanges,
    source: 'browser-decode',
    stale: false,
  };
}

export async function decodeFile(file) {
  if (!file) return null;
  if (file.size > AUDIO_COMPARE_MAX_BYTES) {
    throw new Error(`${file.name || 'Audio file'} is too large for compare analysis (${(file.size / 1048576).toFixed(1)} MB; limit 24 MB).`);
  }
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) throw new Error('Audio analysis is not available in this browser.');
  const ctx = new AudioContextCtor();
  try {
    const bytes = await file.arrayBuffer();
    return await ctx.decodeAudioData(bytes.slice(0));
  } finally {
    ctx.close?.();
  }
}

export function loadVideoMetadata(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    const cleanup = () => {
      video.removeAttribute('src');
      video.load?.();
      URL.revokeObjectURL(url);
    };
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.addEventListener('loadedmetadata', () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      cleanup();
      resolve(duration);
    }, { once: true });
    video.addEventListener('error', () => {
      cleanup();
      reject(new Error(`${file.name || 'Video file'} could not be opened for metadata.`));
    }, { once: true });
    video.src = url;
    video.load();
  });
}

export async function sampleVideoFrames(file, times, {
  width = VIDEO_COMPARE_WIDTH,
  height = VIDEO_COMPARE_HEIGHT,
  maxBytes = VIDEO_COMPARE_MAX_BYTES,
  maxFrames = VIDEO_COMPARE_MAX_FRAMES,
} = {}) {
  if (!file) return [];
  if (file.size > maxBytes) {
    throw new Error(`${file.name || 'Video file'} is too large for compare analysis (${(file.size / 1048576).toFixed(1)} MB; limit 32 MB).`);
  }
  const video = document.createElement('video');
  const url = URL.createObjectURL(file);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const waitFor = (event) => new Promise((resolve, reject) => {
    const onOk = () => { cleanup(); resolve(); };
    const onError = () => { cleanup(); reject(new Error(`${file.name || 'Video file'} could not be decoded.`)); };
    const cleanup = () => {
      video.removeEventListener(event, onOk);
      video.removeEventListener('error', onError);
    };
    video.addEventListener(event, onOk, { once: true });
    video.addEventListener('error', onError, { once: true });
  });
  try {
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.src = url;
    video.load();
    await waitFor('loadedmetadata');
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    const frames = [];
    for (const rawTime of times.slice(0, maxFrames)) {
      const t = clamp(rawTime, 0, Math.max(0, duration - 0.02));
      video.currentTime = t;
      await waitFor('seeked');
      ctx.drawImage(video, 0, 0, width, height);
      const image = ctx.getImageData(0, 0, width, height);
      frames.push({
        data: new Uint8ClampedArray(image.data),
        width,
        height,
        time: t,
      });
    }
    return frames;
  } finally {
    video.removeAttribute('src');
    video.load?.();
    URL.revokeObjectURL(url);
  }
}
