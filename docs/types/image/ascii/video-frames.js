// Frame sources for the ASCII converter. Both yield frames ONE AT A TIME (an async
// iterator) so the converter can decode→convert→encode→release each frame without ever
// holding the whole clip in memory — that's what lets long videos convert without OOM.
//   • gifFrames  — decode a GIF up front (GIFs are small) and iterate the frames.
//   • videoFrameStream — seek a <video> at `fps` on demand, drawing into ONE reused,
//     size-capped canvas (consumed by the converter before the next seek overwrites it).
import { decodeGifFrames } from '../gif-decode.js';

// Async-iterate a decoded GIF's frames ({ canvas, delayMs, index, total }).
export async function* gifFrames(bytes, { signal } = {}) {
  const { frames } = await decodeGifFrames(bytes);
  for (let i = 0; i < frames.length; i++) {
    if (signal?.aborted) throw new DOMException('aborted', 'AbortError');
    yield { canvas: frames[i].canvas, delayMs: frames[i].delayMs, index: i, total: frames.length };
  }
}

// Stream a video as frames at `fps`. `maxWidth` caps the decode size (the engine works
// at ≤1024 anyway, so full-res decode just wastes memory). No frame-count cap.
export async function* videoFrameStream(file, { fps = 12, maxWidth = 1280, signal } = {}) {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.muted = true; video.preload = 'auto'; video.src = url;
  try {
    await new Promise((res, rej) => {
      video.addEventListener('loadedmetadata', res, { once: true });
      video.addEventListener('error', () => rej(new Error('video failed to load')), { once: true });
    });
    const duration = video.duration || 0;
    const vw = video.videoWidth || 1, vh = video.videoHeight || 1;
    const scale = Math.min(1, maxWidth / Math.max(vw, vh));
    const w = Math.max(1, Math.round(vw * scale)), h = Math.max(1, Math.round(vh * scale));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    const delayMs = Math.round(1000 / fps);
    const total = Math.max(1, Math.ceil(duration * fps));
    for (let i = 0; i < total; i++) {
      if (signal?.aborted) throw new DOMException('aborted', 'AbortError');
      await seekTo(video, i / fps);
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(video, 0, 0, w, h);
      yield { canvas: c, delayMs, index: i, total };   // reused canvas — consumed before the next seek
    }
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
