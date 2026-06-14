// Audio/video helpers. A native <audio>/<video> element plays the file from a blob: URL in the
// parent preview pane (the opaque-origin sandbox can't reach blob:). No decoding, no third-party
// lib — the browser streams it straight off disk via the File handle (see blobUrl).
const VIDEO = {
  mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', ogv: 'video/ogg',
  mov: 'video/quicktime', mkv: 'video/x-matroska',
  // Formats that need ffmpeg.wasm transcoding (not natively playable in most browsers).
  avi: 'video/x-msvideo', wmv: 'video/x-ms-wmv', flv: 'video/x-flv',
  ts: 'video/mp2t', m2ts: 'video/mp2t', m2v: 'video/mpeg',
  asf: 'video/x-ms-asf', divx: 'video/divx', vob: 'video/dvd',
  '3gp': 'video/3gpp', f4v: 'video/x-f4v',
};
const AUDIO = {
  mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4', m4b: 'audio/mp4',
  aac: 'audio/aac', oga: 'audio/ogg', ogg: 'audio/ogg', opus: 'audio/ogg',
  flac: 'audio/flac', weba: 'audio/webm',
  // Formats that need ffmpeg.wasm transcoding.
  wma: 'audio/x-ms-wma', rm: 'audio/vnd.rn-realaudio', rmvb: 'audio/vnd.rn-realaudio',
};

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

// Blob URL the browser streams from — no base64 inflation, efficient seeking, no practical size
// ceiling. Prefer the original File handle (disk-backed: a multi-GB audiobook is never read into
// memory); fall back to the in-memory bytes for examples/paste. The element lives in the parent
// preview pane (not the sandboxed iframe), which can't reach blob: URLs.
// Caller must URL.revokeObjectURL(url) when done.
export function blobUrl(intake, mime) {
  if (intake.file) return URL.createObjectURL(intake.file);
  return URL.createObjectURL(new Blob([intake.bytes], { type: mime }));
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
