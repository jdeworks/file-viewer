// Video-frame OCR — sample a <video> at a fixed interval (live is too slow), OCR each frame, and
// return timestamped subtitle cues. Reuses the standard seek→'seeked'→drawImage capture pattern.
// Sequential (one frame at a time), AbortSignal-cancelable, with a progress callback. Consecutive
// frames with identical text are merged into a single cue (so a caption shown for 6 s at a 2 s
// interval becomes one cue, not three). Serialize the cues with ./subtitles.js.
import { recognize } from './engine.js';

// Sample timestamps (seconds) across a clip: 0, interval, 2·interval, … strictly inside the duration.
export function sampleTimes(durationSec, intervalSec) {
  const out = [];
  if (!(durationSec > 0) || !(intervalSec > 0)) return out;
  for (let t = 0; t < durationSec - 1e-3; t += intervalSec) out.push(Math.round(t * 1000) / 1000);
  return out;
}

function seekAndCapture(video, t, maxWidth) {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      try {
        const vw = video.videoWidth || 0, vh = video.videoHeight || 0;
        const scale = Math.min(1, (maxWidth || 1280) / (vw || 1));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(vw * scale));
        c.height = Math.max(1, Math.round(vh * scale));
        c.getContext('2d', { willReadFrequently: true }).drawImage(video, 0, 0, c.width, c.height);
        resolve(c);
      } catch (e) { reject(e); }
    };
    video.addEventListener('seeked', onSeeked, { once: true });
    try { video.currentTime = t; } catch (e) { video.removeEventListener('seeked', onSeeked); reject(e); }
  });
}

// Turn per-frame samples [{ time, text, confidence }] into cues [{ start, end, text, confidence }]:
// drop empty frames; a cue ends at the next sample's time (last = +intervalSec); consecutive identical
// text is merged into one cue. Pure (no DOM) so it is unit-testable on its own.
export function mergeCues(raw, intervalSec) {
  const cues = [];
  for (let i = 0; i < raw.length; i++) {
    const r = raw[i];
    if (!r.text) continue;
    const end = (i + 1 < raw.length) ? raw[i + 1].time : r.time + intervalSec;
    const last = cues[cues.length - 1];
    if (last && last.text === r.text && Math.abs(last.end - r.time) < 1e-3) last.end = end;   // merge consecutive
    else cues.push({ start: r.time, end, text: r.text, confidence: r.confidence });
  }
  return cues;
}

// OCR a sequence of already-decoded frames into cues. Source-agnostic: each frame is
// { time:seconds, source:canvas|ImageData|Blob|HTMLImageElement }. Use this for GIF frames (from the
// image lane's "Split frames" decoder — each frame carries its own delay → real timestamps) or any
// other pre-extracted frames. opts: { digits?, whitelist?, intervalSec?, signal?, onProgress? }.
export async function ocrFrames(frames, opts = {}) {
  const { digits, whitelist, signal, onProgress } = opts;
  const raw = [];
  for (let i = 0; i < frames.length; i++) {
    if (signal?.aborted) break;
    const { text, confidence } = await recognize(frames[i].source, { digits, whitelist });
    raw.push({ time: frames[i].time, text: text.replace(/\s+/g, ' ').trim(), confidence });
    onProgress?.({ index: i, total: frames.length, time: frames[i].time });
  }
  // last cue's end: caller interval, else the mean inter-frame gap, else 1s.
  const span = frames.length > 1 ? (frames[frames.length - 1].time - frames[0].time) / (frames.length - 1) : 1;
  return mergeCues(raw, opts.intervalSec || span || 1);
}

// OCR a video into cues [{ start, end, text, confidence }].
// opts: { intervalSec=2, digits?, whitelist?, maxWidth?, signal?, onProgress? }.
export async function ocrVideo(video, opts = {}) {
  const { intervalSec = 2, digits, whitelist, maxWidth, signal, onProgress } = opts;
  const times = sampleTimes(video.duration, intervalSec);
  const raw = [];
  for (let i = 0; i < times.length; i++) {
    if (signal?.aborted) break;
    const canvas = await seekAndCapture(video, times[i], maxWidth);
    const { text, confidence } = await recognize(canvas, { digits, whitelist });
    raw.push({ time: times[i], text: text.replace(/\s+/g, ' ').trim(), confidence });
    onProgress?.({ index: i, total: times.length, time: times[i] });
  }
  return mergeCues(raw, intervalSec);
}
