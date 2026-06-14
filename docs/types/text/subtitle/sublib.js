// Hand-rolled subtitle parser for SubRip (.srt) and WebVTT (.vtt). Normalizes both into a flat
// list of cues: { index, start, end, text } with times in seconds. No dependency.

const TC = /(\d{1,2}):(\d{2}):(\d{2})[.,](\d{1,3})|(\d{1,2}):(\d{2})[.,](\d{1,3})/;   // HH:MM:SS or MM:SS
const ARROW = /-->/;

function toSeconds(m) {
  if (m[1] != null) return (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) + (+m[4]) / 1000;   // HH:MM:SS,mmm
  return (+m[5]) * 60 + (+m[6]) + (+m[7]) / 1000;                                       // MM:SS.mmm
}

function parseTimeLine(line) {
  if (!ARROW.test(line)) return null;
  const [a, b] = line.split(ARROW);
  const ma = a.match(TC), mb = (b || '').match(TC);
  if (!ma || !mb) return null;
  return { start: toSeconds(ma), end: toSeconds(mb) };
}

export function isVtt(text) { return /^﻿?WEBVTT/.test(text || ''); }

export function parseSubtitles(text) {
  const src = (text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = src.split(/\n{2,}/);
  const cues = [];
  let idx = 0;
  for (let block of blocks) {
    const lines = block.split('\n').filter((l, i) => !(i === 0 && /^WEBVTT/.test(l)));   // drop the WEBVTT header
    if (!lines.length) continue;
    let li = 0;
    // SubRip cues start with a numeric index line; skip it. VTT cues may start with an id line.
    let timeIdx = lines.findIndex((l) => ARROW.test(l));
    if (timeIdx < 0) continue;                                  // a comment/NOTE/STYLE block — skip
    const tc = parseTimeLine(lines[timeIdx]);
    if (!tc) continue;
    const textLines = lines.slice(timeIdx + 1);
    // VTT inline tags (<b>, <i>, <c>, <00:00:00.000>) → strip to plain text for display.
    const cueText = textLines.join('\n').replace(/<[^>]+>/g, '').trim();
    cues.push({ index: ++idx, start: tc.start, end: tc.end, text: cueText });
  }
  return cues;
}

export function fmtTime(s) {
  if (!isFinite(s)) return '0:00';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  const mm = (h ? String(m).padStart(2, '0') : m), ss = String(sec).padStart(2, '0');
  return (h ? h + ':' : '') + mm + ':' + ss;
}
