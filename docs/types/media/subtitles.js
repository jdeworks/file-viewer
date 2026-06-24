// Subtitle sidecar overlay (P7, Tier 1, no lib, display only).
//
// Parses a .srt or .vtt sidecar into timed cues and renders them as a positioned <div> overlay
// on top of the <video>. We render our own overlay (rather than a native <track>) so it works
// uniformly across browsers without a same-origin VTT fetch and styles cleanly over the element.
// Burn-in (writing subtitles into a new file) is Tier 2 and out of scope here.

// Parse "HH:MM:SS,mmm" / "HH:MM:SS.mmm" / "MM:SS.mmm" → seconds. Returns NaN on garbage.
export function parseTimestamp(s) {
  const m = /^(?:(\d+):)?(\d{1,2}):(\d{1,2})[.,](\d{1,3})$/.exec(s.trim());
  if (!m) return NaN;
  const [, h, mm, ss, ms] = m;
  return (h ? +h * 3600 : 0) + +mm * 60 + +ss + +(ms.padEnd(3, '0')) / 1000;
}

// Parse an SRT or WebVTT string → [{ start, end, text }] sorted by start.
// Tolerates either "," or "." in timestamps, optional cue numbers, and a "WEBVTT" header.
export function parseSubtitles(raw) {
  const text = String(raw).replace(/^﻿/, '').replace(/\r\n?/g, '\n').replace(/^WEBVTT[^\n]*\n/, '');
  const cues = [];
  for (const block of text.split(/\n\n+/)) {
    const lines = block.split('\n').filter((l) => l.trim() !== '');
    if (!lines.length) continue;
    // Optional cue id and cue settings may precede timing.
    const i = lines.findIndex((line) => line.includes('-->'));
    if (i < 0) continue;
    const [a, b] = lines[i].split('-->');
    const start = parseTimestamp((a || '').trim());
    const end = parseTimestamp((b || '').trim().split(/\s+/)[0]);
    if (Number.isNaN(start) || Number.isNaN(end) || end < start) continue;
    const body = lines.slice(i + 1).join('\n').trim();
    if (body) cues.push({ start, end, text: body });
  }
  return cues.sort((x, y) => x.start - y.start);
}

// Mount a subtitle overlay over `videoEl` driven by its timeupdate. Returns a controller with
// load(text) to (re)parse a sidecar and destroy() to tear listeners + DOM down.
export function mountSubtitles(host, videoEl) {
  const overlay = document.createElement('div');
  overlay.className = 'media-sub-overlay';
  overlay.hidden = true;
  host.appendChild(overlay);

  let cues = [];
  let cur = -1;

  function render() {
    const t = videoEl.currentTime;
    // Linear scan is fine: subtitle counts are small and timeupdate fires ~4×/s.
    let idx = -1;
    for (let i = 0; i < cues.length; i++) { if (t >= cues[i].start && t <= cues[i].end) { idx = i; break; } }
    if (idx === cur) return;
    cur = idx;
    if (idx < 0) { overlay.hidden = true; overlay.textContent = ''; return; }
    overlay.hidden = false;
    overlay.innerHTML = '';
    for (const line of cues[idx].text.split('\n')) {
      const span = document.createElement('span');
      span.className = 'media-sub-line';
      span.textContent = line.replace(/<[^>]+>/g, '');     // strip any inline VTT/SRT markup
      overlay.appendChild(span);
    }
  }

  const onTime = () => render();
  videoEl.addEventListener('timeupdate', onTime);
  videoEl.addEventListener('seeked', onTime);

  return {
    load(text) { cues = parseSubtitles(text); cur = -1; render(); return cues.length; },
    cueCount: () => cues.length,
    destroy() {
      videoEl.removeEventListener('timeupdate', onTime);
      videoEl.removeEventListener('seeked', onTime);
      overlay.remove();
    },
  };
}

// Build a small drop/browse control to load an .srt/.vtt sidecar into a subtitle controller.
// `ctl` is a mountSubtitles() controller. Returns the control element.
export function buildSubtitleLoader(ctl) {
  const wrap = document.createElement('label');
  wrap.className = 'media-sub-loader';
  const span = document.createElement('span');
  span.textContent = '💬 Subtitles';
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.srt,.vtt,text/vtt,application/x-subrip';
  const note = document.createElement('span');
  note.className = 'media-sub-note';

  async function load(file) {
    if (!file) return;
    try {
      const n = ctl.load(await file.text());
      note.textContent = n ? n + ' cues' : 'no cues found';
    } catch { note.textContent = 'could not read file'; }
  }
  input.addEventListener('change', () => load(input.files && input.files[0]));
  wrap.addEventListener('dragover', (e) => { e.preventDefault(); wrap.classList.add('drag'); });
  wrap.addEventListener('dragleave', () => wrap.classList.remove('drag'));
  wrap.addEventListener('drop', (e) => {
    e.preventDefault(); wrap.classList.remove('drag');
    load(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]);
  });
  wrap.append(span, input, note);
  return wrap;
}
