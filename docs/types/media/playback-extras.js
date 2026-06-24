// P7 Tier-1 playback/UX quick wins (no lib, live only).
//
// All native DOM / MediaElement: Picture-in-picture, ±1-frame stepping, speed presets, keyboard
// shortcuts scoped to the focused media host, an ID3 cover-art thumbnail, and a clickable chapter
// list. Nothing here decodes audio, opens an AudioContext, or writes a file — it only changes
// live playback. Each builder returns a small element (and shortcuts returns a teardown fn).

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const ASSUMED_FPS = 30;     // most web video is 24–30fps; used when the real rate is unknown.

function btn(label, title, cls = 'media-track-btn') {
  const b = document.createElement('button');
  b.type = 'button'; b.textContent = label; b.title = title; b.className = cls;
  return b;
}

// Speed presets (audio + video): a row of buttons that set playbackRate. Highlights the active
// one and reflects external rate changes (native menu / shortcuts).
export function buildSpeedPresets(el) {
  const row = document.createElement('div');
  row.className = 'media-speed-row';
  const buttons = [];
  for (const r of SPEEDS) {
    const b = btn(r + '×', 'Playback speed ' + r + '×', 'media-speed-btn');
    b.dataset.rate = String(r);
    b.addEventListener('click', () => { el.playbackRate = r; });
    row.appendChild(b);
    buttons.push(b);
  }
  const sync = () => buttons.forEach((b) => b.classList.toggle('active', parseFloat(b.dataset.rate) === el.playbackRate));
  el.addEventListener('ratechange', sync);
  sync();
  return row;
}

// Video-only: Picture-in-picture (feature-gated) + ±1-frame step buttons. Returns null when
// neither is applicable so the caller can skip mounting.
export function buildVideoExtras(el) {
  const row = document.createElement('div');
  row.className = 'media-video-extras';
  if (document.pictureInPictureEnabled) {
    const pip = btn('⧉ PiP', 'Picture-in-picture');
    pip.classList.add('media-pip-btn');
    pip.addEventListener('click', () => togglePip(el));
    row.appendChild(pip);
  }
  const fps = () => el.dataset.fps ? parseFloat(el.dataset.fps) : ASSUMED_FPS;
  const back = btn('⏮ −1f', 'Step back one frame');
  back.classList.add('media-frame-back');
  back.addEventListener('click', () => { el.pause(); el.currentTime = Math.max(0, el.currentTime - 1 / fps()); });
  const fwd = btn('+1f ⏭', 'Step forward one frame');
  fwd.classList.add('media-frame-fwd');
  fwd.addEventListener('click', () => { el.pause(); el.currentTime = Math.min(el.duration || 1e9, el.currentTime + 1 / fps()); });
  row.append(back, fwd);
  return row;
}

function togglePip(el) {
  try {
    const pending = document.pictureInPictureElement
      ? document.exitPictureInPicture?.()
      : el.requestPictureInPicture?.();
    Promise.resolve(pending).catch(() => {});
  } catch { /* gesture / unsupported */ }
}

// Keyboard shortcuts scoped to the focused media host (host is made focusable by the caller).
// space=play/pause, ←/→=∓5s, ↑/↓=volume, f=fullscreen, p=PiP, ,/.=frame-step. Ignores keys while
// a text input/textarea/contenteditable is focused. Returns a teardown fn.
export function attachShortcuts(host, el, opts = {}) {
  const isVideo = opts.kind === 'video';
  const fps = () => el.dataset.fps ? parseFloat(el.dataset.fps) : ASSUMED_FPS;
  const onKey = (e) => {
    const t = e.target;
    if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
    let handled = true;
    switch (e.key) {
      case ' ': case 'k': el.paused ? el.play().catch(() => {}) : el.pause(); break;
      case 'ArrowLeft': el.currentTime = Math.max(0, el.currentTime - 5); break;
      case 'ArrowRight': el.currentTime = Math.min(el.duration || 1e9, el.currentTime + 5); break;
      case 'ArrowUp': el.volume = Math.min(1, el.volume + 0.1); break;
      case 'ArrowDown': el.volume = Math.max(0, el.volume - 0.1); break;
      case 'f': if (isVideo) (host.requestFullscreen ? host : el).requestFullscreen?.(); else handled = false; break;
      case 'p': if (isVideo) togglePip(el); else handled = false; break;
      case ',': if (isVideo) { el.pause(); el.currentTime = Math.max(0, el.currentTime - 1 / fps()); } else handled = false; break;
      case '.': if (isVideo) { el.pause(); el.currentTime = Math.min(el.duration || 1e9, el.currentTime + 1 / fps()); } else handled = false; break;
      default: handled = false;
    }
    if (handled) { e.preventDefault(); e.stopPropagation(); }
  };
  host.addEventListener('keydown', onKey);
  return () => host.removeEventListener('keydown', onKey);
}

// ID3 cover art: a thumbnail built from APIC image bytes via a blob URL. Returns
// { el, revoke } or null when there's no embedded art.
export function buildCoverArt(cover) {
  if (!cover || !cover.bytes || !cover.bytes.length) return null;
  const url = URL.createObjectURL(new Blob([cover.bytes], { type: cover.mime || 'image/jpeg' }));
  const img = document.createElement('img');
  img.className = 'media-cover-art';
  img.alt = 'Cover art';
  img.src = url;
  return { el: img, revoke: () => URL.revokeObjectURL(url) };
}

// Chapter list (audio + video): clickable rows that seek the element. Display only.
// `chapters` = [{ start, title }]. Returns the list element, or null when there are none.
export function buildChapterList(chapters, el) {
  if (!chapters || !chapters.length) return null;
  const wrap = document.createElement('div');
  wrap.className = 'media-chapters';
  const head = document.createElement('div');
  head.className = 'media-chapters-head';
  head.textContent = '📑 Chapters';
  wrap.appendChild(head);
  chapters.forEach((c, i) => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'media-chapter';
    const time = document.createElement('span');
    time.className = 'media-chapter-time';
    time.textContent = fmtTime(c.start);
    const label = document.createElement('span');
    label.className = 'media-chapter-label';
    label.textContent = c.title || ('Chapter ' + (i + 1));
    row.append(time, label);
    row.addEventListener('click', () => { el.currentTime = c.start; el.play().catch(() => {}); });
    wrap.appendChild(row);
  });
  return wrap;
}

function fmtTime(s) {
  s = Math.max(0, Math.floor(s));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0'), pad = String(ss).padStart(2, '0');
  return (h ? h + ':' : '') + mm + ':' + pad;
}
