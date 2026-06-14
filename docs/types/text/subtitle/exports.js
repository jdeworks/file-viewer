// Subtitle exports: convert between SubRip (.srt) and WebVTT (.vtt) — they share a cue model, so
// conversion is just re-serializing the parsed cues with the right timestamp separator.
import { downloadBlob } from '../../../core/exports.js';
import { parseSubtitles, isVtt } from './sublib.js';

const pad = (n, w = 2) => String(n).padStart(w, '0');
function tc(s, sep) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  const ms = Math.round((s - Math.floor(s)) * 1000);
  return pad(h) + ':' + pad(m) + ':' + pad(sec) + sep + pad(ms, 3);
}
const toSrt = (cues) => cues.map((c, i) => (i + 1) + '\n' + tc(c.start, ',') + ' --> ' + tc(c.end, ',') + '\n' + c.text).join('\n\n') + '\n';
const toVtt = (cues) => 'WEBVTT\n\n' + cues.map((c) => tc(c.start, '.') + ' --> ' + tc(c.end, '.') + '\n' + c.text).join('\n\n') + '\n';

export function getExports(intake) {
  const base = (intake.filename || 'subtitles').replace(/\.[^.]+$/, '');
  const cues = parseSubtitles(intake.text || '');
  if (isVtt(intake.text || '')) {
    return [{ label: 'Download as SubRip (.srt)', run: () => downloadBlob(toSrt(cues), base + '.srt', 'text/plain') }];
  }
  return [{ label: 'Download as WebVTT (.vtt)', run: () => downloadBlob(toVtt(cues), base + '.vtt', 'text/vtt') }];
}
