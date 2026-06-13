// Audio/video helpers. We hand the bytes to a native <audio>/<video> element via a
// data: URL inside the sandboxed preview iframe (blob: URLs are unreachable from the
// opaque-origin sandbox). No decoding, no third-party lib — the browser plays it.
const VIDEO = { mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', ogv: 'video/ogg', mov: 'video/quicktime', mkv: 'video/x-matroska' };
const AUDIO = { mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4', aac: 'audio/aac', oga: 'audio/ogg', ogg: 'audio/ogg', opus: 'audio/ogg', flac: 'audio/flac', weba: 'audio/webm' };

export function mediaInfo(intake) {
  const name = (intake.filename || '').toLowerCase();
  const ext = name.includes('.') ? name.split('.').pop() : '';
  const mime = (intake.mimeType || '').toLowerCase();
  if (VIDEO[ext]) return { kind: 'video', mime: VIDEO[ext] };
  if (AUDIO[ext]) return { kind: 'audio', mime: AUDIO[ext] };
  if (mime.startsWith('video/')) return { kind: 'video', mime };
  if (mime.startsWith('audio/')) return { kind: 'audio', mime };
  return { kind: null, mime: 'application/octet-stream' };
}

function bytesToBase64(bytes) {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  return btoa(bin);
}

export function dataUrl(intake, mime) {
  return 'data:' + mime + ';base64,' + bytesToBase64(intake.bytes);
}

// Probe duration (and dimensions for video) off-DOM. Resolves null on failure.
export function probe(kind, url) {
  return new Promise((resolve) => {
    const el = document.createElement(kind === 'video' ? 'video' : 'audio');
    el.preload = 'metadata';
    el.onloadedmetadata = () => resolve({ duration: el.duration, w: el.videoWidth || 0, h: el.videoHeight || 0 });
    el.onerror = () => resolve(null);
    el.src = url;
  });
}
