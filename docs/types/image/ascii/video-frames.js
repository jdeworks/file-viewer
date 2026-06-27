// Decode an input file into a uniform list of frames for the ASCII converter:
//   { width, height, kind:'gif'|'video', frames:[{ canvas, delayMs }] }
// GIF reuses the existing gifuct decoder; video samples frames at a chosen fps via the
// seek→seeked→drawImage pattern (same approach as docs/core/ocr/frames.js).
import { decodeGifFrames } from '../gif-decode.js';

// Animated/!animated GIF → per-frame canvases with their real delays.
export async function gifFrames(bytes) {
  const { width, height, frames } = await decodeGifFrames(bytes);
  return { width, height, kind: 'gif', frames };
}

// Sample a <video> at `fps`, capped at `maxFrames` (thinned evenly if longer).
export async function videoFrames(file, { fps = 12, maxFrames = 600, signal, onProgress } = {}) {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.muted = true; video.preload = 'auto'; video.src = url;
  try {
    await new Promise((res, rej) => {
      video.addEventListener('loadedmetadata', res, { once: true });
      video.addEventListener('error', () => rej(new Error('video failed to load')), { once: true });
    });
    const duration = video.duration || 0;
    const w = video.videoWidth || 1, h = video.videoHeight || 1;
    let times = [];
    for (let t = 0; t < duration; t += 1 / fps) times.push(t);
    if (!times.length) times = [0];
    if (times.length > maxFrames) {
      const step = times.length / maxFrames;
      times = Array.from({ length: maxFrames }, (_, i) => times[Math.floor(i * step)]);
    }
    const delayMs = Math.round(1000 / fps);
    const frames = [];
    for (let i = 0; i < times.length; i++) {
      if (signal?.aborted) throw new DOMException('aborted', 'AbortError');
      await seekTo(video, times[i]);
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d', { willReadFrequently: true }).drawImage(video, 0, 0, w, h);
      frames.push({ canvas: c, delayMs });
      onProgress?.({ done: i + 1, total: times.length, phase: 'decode' });
    }
    return { width: w, height: h, kind: 'video', frames };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function seekTo(video, t) {
  return new Promise((res, rej) => {
    const onSeeked = () => { cleanup(); res(); };
    const onErr = () => { cleanup(); rej(new Error('seek failed')); };
    const cleanup = () => { video.removeEventListener('seeked', onSeeked); video.removeEventListener('error', onErr); };
    video.addEventListener('seeked', onSeeked, { once: true });
    video.addEventListener('error', onErr, { once: true });
    video.currentTime = Math.min(t, video.duration || t);
  });
}
