// Subtitle/transcript serializers for OCR cues. A cue is { start, end, text, confidence? } with
// start/end in SECONDS — the same shape docs/types/media/subtitles.js PARSES (this is the missing
// inverse: writers). Self-contained (no lane import). Outputs SubRip, WebVTT, plain timestamped text,
// and JSON. SRT uses a comma before milliseconds, WebVTT a period.
const pad = (n, w = 2) => String(Math.max(0, Math.floor(n))).padStart(w, '0');

function clock(sec, sep) {
  const s = Math.max(0, sec);
  const whole = Math.floor(s);
  const ms = Math.round((s - whole) * 1000);
  return pad(whole / 3600) + ':' + pad((whole % 3600) / 60) + ':' + pad(whole % 60) + sep + pad(ms, 3);
}
export const fmtSRT = (s) => clock(s, ',');
export const fmtVTT = (s) => clock(s, '.');

export function toSRT(cues) {
  return cues.map((c, i) => (i + 1) + '\n' + fmtSRT(c.start) + ' --> ' + fmtSRT(c.end) + '\n' + c.text + '\n').join('\n');
}
export function toVTT(cues) {
  return 'WEBVTT\n\n' + cues.map((c) => fmtVTT(c.start) + ' --> ' + fmtVTT(c.end) + '\n' + c.text + '\n').join('\n');
}
export function toText(cues) {
  return cues.map((c) => '[' + fmtVTT(c.start).slice(0, 8) + '] ' + c.text).join('\n') + (cues.length ? '\n' : '');
}
export function toJSON(cues) {
  return JSON.stringify(cues.map((c) => ({
    start: Math.round(c.start * 1000) / 1000,
    end: Math.round(c.end * 1000) / 1000,
    text: c.text,
    confidence: c.confidence != null ? Math.round(c.confidence) : undefined,
  })), null, 2);
}

// Trigger a download of serialized cues (lanes may use this or their own download path).
export function download(filename, text, mime = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type: mime + ';charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
