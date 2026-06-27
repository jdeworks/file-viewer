// Small pure DOM/time helpers shared by the Media Editor panel (editor.js). Kept in their own
// module so editor.js stays under the LOC cap; no ffmpeg or heavy deps.

// Format seconds → HH:MM:SS
export function fmtTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

export function toTrimTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) return null;
  return fmtTime(sec);
}

// Validate and normalise an HH:MM:SS string; returns null on bad input.
export function parseTimestamp(s) {
  const m = (s || '').trim().match(/^(\d{2}):(\d{2}):(\d{2})$/);
  if (!m) return null;
  return m[1] + ':' + m[2] + ':' + m[3];
}

export function parseTrimInputText(s) {
  const m = (s || '').trim().match(/^(\d+):(\d{2}):(\d{2})$/);
  if (!m) return null;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

export function makeInput(placeholder, cls) {
  const el = document.createElement('input');
  el.type = 'text';
  el.placeholder = placeholder;
  el.className = cls || 'media-ed-ts';
  el.pattern = '[0-9]{2}:[0-9]{2}:[0-9]{2}';
  return el;
}

export function makeBtn(text, cls) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = text;
  b.className = cls || 'media-ed-btn';
  return b;
}
