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

// Replay an image-sequence source `loops + 1` times (loops=0 → single pass, unchanged).
// Used when exporting an animated image (GIF/WebP/APNG) to a WebM video, which — unlike a
// GIF — has no native loop, so the repeats must be baked into the clip. The whole sequence
// is snapshotted to ImageBitmaps up front (imageDecoderFrames reuses ONE canvas, so the
// live source can't be re-iterated; and only with the full count known can index/total be
// numbered cleanly across every baked pass). Image sequences are bounded/small, so
// buffering every frame is acceptable.
export async function* loopFrames(source, loops = 0, { signal } = {}) {
  if (!loops) { yield* source; return; }
  const cache = [];
  for await (const f of source) {
    if (signal?.aborted) throw new DOMException('aborted', 'AbortError');
    cache.push({ bmp: await createImageBitmap(f.canvas), delayMs: f.delayMs });
  }
  const total = cache.length * (loops + 1);
  for (let n = 0; n < total; n++) {
    if (signal?.aborted) throw new DOMException('aborted', 'AbortError');
    const f = cache[n % cache.length];
    yield { canvas: f.bmp, delayMs: f.delayMs, index: n, total };
  }
}

// Async-iterate frames of an animated image (WebP / APNG) via the browser-native
// WebCodecs ImageDecoder — offline, no vendored lib. Static images yield one frame.
// `duration` is microseconds → delayMs. Draws into ONE reused canvas (consumed per step).
export async function* imageDecoderFrames(bytes, type, { signal } = {}) {
  if (typeof ImageDecoder === 'undefined') throw new Error('This browser cannot decode animated ' + (type.split('/')[1] || 'images').toUpperCase() + ' (needs WebCodecs ImageDecoder).');
  const dec = new ImageDecoder({ data: bytes, type });
  await dec.tracks.ready;
  const total = dec.tracks.selectedTrack?.frameCount || 1;
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d', { willReadFrequently: true });
  try {
    for (let i = 0; i < total; i++) {
      if (signal?.aborted) throw new DOMException('aborted', 'AbortError');
      const { image } = await dec.decode({ frameIndex: i });
      if (c.width !== image.displayWidth || c.height !== image.displayHeight) { c.width = image.displayWidth; c.height = image.displayHeight; }
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.drawImage(image, 0, 0);
      const delayMs = Math.max(20, Math.round((image.duration || 100000) / 1000));
      image.close();
      yield { canvas: c, delayMs, index: i, total };
    }
  } finally { dec.close?.(); }
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
