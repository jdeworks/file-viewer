// Real-time video → ASCII WebM recorder, WITH the source audio muxed in.
//
// Why not the seek-based videoFrameStream path? A <video> seeked frame-by-frame (paused)
// produces no audio, and the converter's wall-clock doesn't track real time, so a captured
// audio track would drift. So instead we PLAY the video in real time and record the ASCII
// canvas + the source audio together — the same MediaRecorder pattern the webcam easter egg
// uses. Conversion runs off requestVideoFrameCallback and DROPS frames when the worker can't
// keep up: audio stays in sync (it's real-time) and the video just gets choppier.
//
// Audio is routed through an AudioContext MediaStreamDestination so we get an audio track
// WITHOUT connecting to the speakers — nothing plays aloud during the (possibly long) export.

import { ensureAsciiFont } from './render.js';

const now = () => (typeof performance !== 'undefined' ? performance.now() : 0);

// recordVideoToAscii(file, { engine, fps, signal, onProgress, onPreview }) → Promise<Blob>
// `engine` is a ready ASCII engine (renderMode 'bitmap'); we drive its frames here.
export async function recordVideoToAscii(file, { engine, fps = 30, signal, onProgress, onPreview } = {}) {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.playsInline = true; video.preload = 'auto'; video.src = url;
  // NOT muted: createMediaElementSource needs decoded audio. It re-routes the element's
  // output to our graph, so the element itself stays silent regardless.

  const out = document.createElement('canvas');             // the ASCII canvas we record
  const octx = out.getContext('2d');
  let ac = null, recorder = null, recStream = null;
  const chunks = [];
  let inFlight = false, running = false, lastPreview = 0;

  // Convert the current source frame to ASCII and draw it onto the recorded canvas. The
  // in-flight guard drops frames rather than queueing when the worker lags.
  async function convertFrame() {
    if (inFlight) return;
    inFlight = true;
    try {
      engine.grabFrame();
      const drawable = await engine.convertFrame('bitmap');
      if (!drawable) return;
      if (out.width !== drawable.width || out.height !== drawable.height) { out.width = drawable.width; out.height = drawable.height; }
      octx.clearRect(0, 0, out.width, out.height);
      octx.drawImage(drawable, 0, 0);
      drawable.close?.();
      const t = now();
      if (onPreview && t - lastPreview > 400) { lastPreview = t; onPreview(out); }
    } finally { inFlight = false; }
  }

  const cleanup = () => {
    try { recStream?.getTracks().forEach((t) => t.stop()); } catch { /* ignore */ }
    try { ac?.close(); } catch { /* ignore */ }
    URL.revokeObjectURL(url);
  };

  try {
    await new Promise((res, rej) => {
      video.addEventListener('loadedmetadata', res, { once: true });
      video.addEventListener('error', () => rej(new Error('video failed to load')), { once: true });
    });
    await ensureAsciiFont();                                // canvas measureText needs the mono font
    engine.setSource(video);

    if (!out.captureStream) throw new Error('Recording is not supported by this browser.');
    // A first conversion gives the canvas real dimensions before captureStream samples it.
    await convertFrame();
    recStream = out.captureStream(fps);
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      await ac.resume?.();                                  // a suspended context passes no samples
      const srcNode = ac.createMediaElementSource(video);
      const dest = ac.createMediaStreamDestination();
      srcNode.connect(dest);                                // audio → recording only (not speakers)
      dest.stream.getAudioTracks().forEach((t) => recStream.addTrack(t));
    } catch { /* no audio track / unsupported → silent video, still valid */ }

    const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
      .find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || 'video/webm';
    recorder = new MediaRecorder(recStream, { mimeType: mime });
    recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    const stopped = new Promise((res) => { recorder.onstop = res; });

    function tick() {
      if (!running) return;
      convertFrame();
      const dur = video.duration || 0;
      if (dur && onProgress) onProgress(Math.min(0.99, video.currentTime / dur));
      if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(tick);
      else requestAnimationFrame(tick);
    }

    const ended = new Promise((res) => {
      video.addEventListener('ended', res, { once: true });
      if (signal) signal.addEventListener('abort', res, { once: true });
    });
    await video.play();                                     // start playback before recording
    recorder.start(1000);
    running = true;
    if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(tick);
    else requestAnimationFrame(tick);

    await ended;
    running = false;
    if (signal?.aborted) { recorder.stop(); await stopped; throw new DOMException('aborted', 'AbortError'); }
    await convertFrame();                                   // draw the final frame so the tail isn't dropped
    recorder.stop();
    await stopped;
    onProgress?.(1);
    return new Blob(chunks, { type: mime });
  } finally {
    cleanup();
  }
}
