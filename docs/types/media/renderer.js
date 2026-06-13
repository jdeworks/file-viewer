// Audio/video preview: a native <audio>/<video> element rendered directly in the preview
// pane (NOT the sandboxed iframe). The bytes are served from a blob: URL the browser
// streams from — no base64 inflation, efficient seeking, no real size ceiling (big
// audiobooks/video stream off the File handle and are never read into memory). Media bytes
// can't execute script, so rendering them in the parent document is safe; the sandboxed
// iframe is reserved for untrusted *markup*.
//
// Upgrades for long-form listening: resume where you left off (persistence), a sleep timer
// (auto-pause after N minutes, with a short fade), and Media Session metadata so OS/lock-screen
// controls show the track and work.
import { mediaInfo, blobUrl } from './medialib.js';
import { loadState, saveState, clearState } from '../../core/persistence.js';
import { showIosAudioHint, hideIosAudioHint } from '../../core/ios-audio.js';

const SLEEP_OPTIONS = [0, 5, 15, 30, 45, 60];   // minutes; 0 = off
const PLAYABLE = /\.(mp3|wav|m4a|m4b|aac|oga|ogg|opus|flac|weba|mp4|m4v|webm|ogv|mov|mkv)$/i;
// Set true just before a playlist navigation reloads the app → the NEXT render auto-plays.
// (Module-level so it survives the re-render; the initial folder-open never sets it.)
let pendingAutoplay = false;

// Build a playlist of the sibling media files in the current folder (if any), with the file we
// just opened as the current track. Returns null when there's no folder or no siblings.
function buildPlaylist(intake, folder) {
  if (!folder || !folder.files || folder.files.length < 2) return null;
  const items = folder.files.filter((f) => PLAYABLE.test(f.path || f.file?.name || ''));
  if (items.length < 2) return null;
  const index = items.findIndex((f) => f.file === intake.file
    || (f.file && f.file.name === intake.filename && f.file.size === intake.size));
  if (index < 0) return null;
  return { items, index };
}

export async function render(intake, ctx = {}) {
  const info = mediaInfo(intake);
  const playlist = buildPlaylist(intake, ctx.folder);
  const host = document.createElement('div');
  host.className = 'media-doc media-' + (info.kind || 'audio');
  if (!info.kind) {
    host.innerHTML = '<p class="media-note">Unsupported media file.</p>';
    return { parentNode: host };
  }
  const url = blobUrl(intake, info.mime);
  const el = document.createElement(info.kind === 'video' ? 'video' : 'audio');
  el.className = 'media-view';
  el.controls = true;
  el.preload = 'metadata';
  el.src = url;
  if (info.kind === 'video') el.setAttribute('playsinline', '');

  const name = document.createElement('div');
  name.className = 'media-name';
  name.textContent = intake.filename;

  // ── Sleep timer control ──
  const tools = document.createElement('div');
  tools.className = 'media-tools';
  const sleepWrap = document.createElement('label');
  sleepWrap.className = 'media-sleep';
  sleepWrap.innerHTML = '<span>⏱ Sleep</span>';
  const sleepSel = document.createElement('select');
  for (const m of SLEEP_OPTIONS) {
    const o = document.createElement('option');
    o.value = String(m);
    o.textContent = m === 0 ? 'Off' : m + ' min';
    sleepSel.appendChild(o);
  }
  sleepWrap.appendChild(sleepSel);
  const sleepNote = document.createElement('span');
  sleepNote.className = 'media-sleep-note';
  tools.append(sleepWrap, sleepNote);

  // ── Folder playlist (when the file is part of a multi-track folder) ──
  let shuffle = false;
  if (playlist) {
    const pl = document.createElement('div');
    pl.className = 'media-playlist';
    const prev = btn('⏮', 'Previous track');
    const posLabel = document.createElement('span');
    posLabel.className = 'media-track-pos';
    posLabel.textContent = (playlist.index + 1) + ' / ' + playlist.items.length;
    const next = btn('⏭', 'Next track');
    const shuf = document.createElement('label');
    shuf.className = 'media-shuffle';
    shuf.innerHTML = '<input type="checkbox"> 🔀';
    shuf.querySelector('input').addEventListener('change', (e) => { shuffle = e.target.checked; });
    prev.addEventListener('click', () => go(-1));
    next.addEventListener('click', () => go(1));
    pl.append(prev, posLabel, next, shuf);
    tools.appendChild(pl);
  }
  function go(dir) {
    if (!playlist) return;
    let i;
    if (shuffle && dir > 0) { do { i = Math.floor(Math.random() * playlist.items.length); } while (playlist.items.length > 1 && i === playlist.index); }
    else { i = playlist.index + dir; if (i < 0 || i >= playlist.items.length) return; }
    pendingAutoplay = true;
    ctx.folder.open(playlist.items[i].file);          // app reloads → renderer re-runs for the new track
  }

  if (info.kind === 'audio') host.append(name, el, tools);
  else host.append(el, name, tools);

  // ── Resume position ──
  const saved = loadState(intake);
  el.addEventListener('loadedmetadata', () => {
    if (saved && saved.kind === 'media' && saved.time > 0 && saved.time < el.duration - 2) {
      el.currentTime = saved.time;
    }
  }, { once: true });
  let lastSave = 0;
  el.addEventListener('timeupdate', () => {
    const now = el.currentTime;
    if (Math.abs(now - lastSave) < 5) return;      // throttle writes
    lastSave = now;
    saveState(intake, { kind: 'media', time: now, duration: el.duration || 0 });
  });
  el.addEventListener('ended', () => {
    clearState(intake);                  // this track finished — forget its position
    if (playlist) { go(1); return; }     // auto-advance to the next track (or a random one if shuffling)
    cancelSleep();
  });

  // ── Sleep timer ──
  let sleepId = null, sleepAt = 0, tickId = null;
  function cancelSleep() {
    if (sleepId) { clearTimeout(sleepId); sleepId = null; }
    if (tickId) { clearInterval(tickId); tickId = null; }
    sleepNote.textContent = '';
    el.volume = 1;
  }
  function armSleep(minutes) {
    cancelSleep();
    if (!minutes) return;
    sleepAt = performance.now() + minutes * 60000;
    sleepId = setTimeout(() => {
      const fade = setInterval(() => {                // brief fade, then pause
        el.volume = Math.max(0, el.volume - 0.1);
        if (el.volume <= 0.01) { clearInterval(fade); el.pause(); el.volume = 1; sleepSel.value = '0'; cancelSleep(); }
      }, 120);
    }, minutes * 60000);
    tickId = setInterval(() => {
      const left = Math.max(0, sleepAt - performance.now());
      const mm = Math.floor(left / 60000), ss = Math.floor((left % 60000) / 1000);
      sleepNote.textContent = 'pausing in ' + mm + ':' + String(ss).padStart(2, '0');
    }, 1000);
  }
  sleepSel.addEventListener('change', () => armSleep(parseInt(sleepSel.value, 10) || 0));

  // ── Media Session (OS / lock-screen metadata + controls) ──
  if ('mediaSession' in navigator && typeof MediaMetadata !== 'undefined') {
    try {
      navigator.mediaSession.metadata = new MediaMetadata({ title: intake.filename, artist: '', album: '' });
      navigator.mediaSession.setActionHandler('play', () => el.play());
      navigator.mediaSession.setActionHandler('pause', () => el.pause());
      navigator.mediaSession.setActionHandler('seekbackward', (d) => { el.currentTime = Math.max(0, el.currentTime - (d.seekOffset || 10)); });
      navigator.mediaSession.setActionHandler('seekforward', (d) => { el.currentTime = Math.min(el.duration || 1e9, el.currentTime + (d.seekOffset || 10)); });
    } catch { /* not all actions supported everywhere */ }
  }

  // Autoplay only when we arrived via a playlist advance/next/prev (not the initial open).
  // Best-effort: browsers may block autoplay until the user has interacted with the page.
  if (pendingAutoplay) { pendingAutoplay = false; el.play().catch(() => { /* autoplay blocked */ }); }

  // iOS-only opt-in: for AUDIO, suggest Add-to-Home-Screen so playback survives a screen lock.
  // No-op off iOS / when standalone / once dismissed.
  if (info.kind === 'audio') showIosAudioHint(); else hideIosAudioHint();

  // parentNode = render outside the sandbox; revoke frees the blob + timers when the preview changes.
  return {
    parentNode: host,
    revoke: () => { cancelSleep(); hideIosAudioHint(); URL.revokeObjectURL(url); },
  };
}

function btn(label, title) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  b.title = title;
  b.className = 'media-track-btn';
  return b;
}
