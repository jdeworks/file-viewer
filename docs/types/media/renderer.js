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
import { parseId3 } from './id3.js';
import { likelyNeedsTranscode, transcode } from './transcoder.js';
import { recordStage5MediaPlayback } from '../../games/metagame/viewer-actions.js';

// Lazily import editor.js (and its transcoder.js dep) only when ffmpeg is enabled.
// This prevents a stale SW-cached transcoder.js from breaking the entire preview.
let _editorModule = null;
async function getEditorPanel() {
  if (!_editorModule) _editorModule = await import('./editor.js');
  return _editorModule.buildEditorPanel;
}

const SLEEP_OPTIONS = [0, 5, 15, 30, 45, 60];   // minutes; 0 = off
const PLAYABLE = /\.(mp3|wav|m4a|m4b|aac|oga|ogg|opus|flac|weba|mp4|m4v|webm|ogv|mov|mkv)$/i;
// Set true just before a playlist navigation reloads the app → the NEXT render auto-plays.
// (Module-level so it survives the re-render; the initial folder-open never sets it.)
let pendingAutoplay = false;

// Lazily read each track's ID3 tag (from a head slice — ID3v2 sits at the file start) and upgrade
// its label to "Title — Artist". Best-effort: unreadable / tag-less files keep their filename.
async function enrichTrackTags(labels) {
  for (const { item, label } of labels) {
    const f = item.file;
    if (!f || typeof f.slice !== 'function') continue;
    try {
      const head = new Uint8Array(await f.slice(0, 256 * 1024).arrayBuffer());
      const tags = parseId3(head);
      if (tags && (tags.title || tags.artist)) label.textContent = [tags.title, tags.artist].filter(Boolean).join(' — ');
    } catch { /* keep the filename */ }
  }
}

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
  let wvController = null;
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

  // Resolve ffmpeg setting early so video controls and the pill can reference it.
  const enableFfmpeg = !!ctx.settings?.enableFfmpeg;

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

  // ── Video studio (filters + audio mixer) ──
  // Lazy-loaded so the audio-only path never pays for it. The mixer routes the
  // <video>'s audio through the shared WebAudio EQ/analyser graph (audio-graph.js).
  let videoStudio = null;
  if (info.kind === 'video') {
    const { buildVideoStudio } = await import('./video-studio.js');
    videoStudio = buildVideoStudio(el);
    tools.appendChild(videoStudio.controls);
  }

  // ── FFmpeg status pill ──
  const ffmpegPill = document.createElement('button');
  ffmpegPill.type = 'button';
  ffmpegPill.className = 'media-ffmpeg-pill' + (enableFfmpeg ? ' media-ffmpeg-pill--on' : '');
  ffmpegPill.textContent = enableFfmpeg ? '🎬 Editor: on' : '🎬 Editor: off';
  ffmpegPill.title = enableFfmpeg
    ? 'Media editor active — scroll down to edit'
    : 'Enable media transcoding in Settings → Advanced to unlock trim/convert';
  ffmpegPill.addEventListener('click', () => {
    if (enableFfmpeg && editorPanel) editorPanel.scrollIntoView({ behavior: 'smooth' });
  });
  tools.appendChild(ffmpegPill);

  // ── Folder playlist (when the file is part of a multi-track folder) ──
  let shuffle = false;
  let trackListEl = null;
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

    // ── Album/track list: every track, current highlighted, click-to-play. Labels start as
    // filenames and are upgraded with ID3 title/artist read lazily off each File (folder album).
    trackListEl = document.createElement('div');
    trackListEl.className = 'media-tracklist';
    const labels = [];
    playlist.items.forEach((item, i) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'media-track' + (i === playlist.index ? ' current' : '');
      const n = document.createElement('span'); n.className = 'media-track-n'; n.textContent = String(i + 1);
      const label = document.createElement('span'); label.className = 'media-track-label';
      label.textContent = (item.path || item.file?.name || 'track').split('/').pop();
      // Gain slider (mixer): per-track volume preset, persisted in localStorage.
      const gainKey = 'fv:gain:' + (item.path || item.file?.name || String(i));
      const gainVal = parseInt(localStorage.getItem(gainKey) ?? '100', 10);
      const gainSlider = document.createElement('input');
      gainSlider.type = 'range'; gainSlider.min = '0'; gainSlider.max = '200';
      gainSlider.value = String(gainVal); gainSlider.className = 'media-gain-slider';
      gainSlider.title = 'Track volume (0–200%)';
      gainSlider.addEventListener('input', () => {
        const v = parseInt(gainSlider.value, 10);
        localStorage.setItem(gainKey, String(v));
        if (i === playlist.index) {
          import('./waveform.js').then(({ connectGain }) => {
            const g = connectGain(el); if (g) g.gain.value = v / 100;
          });
        }
      });
      row.append(n, label, gainSlider);
      row.addEventListener('click', () => goTo(i));
      trackListEl.appendChild(row);
      labels.push({ item, label });
    });
    enrichTrackTags(labels);   // fire-and-forget ID3 enrichment

    // Apply the current track's saved gain immediately.
    const curItem = playlist.items[playlist.index];
    const curKey = 'fv:gain:' + (curItem.path || curItem.file?.name || String(playlist.index));
    const curGain = parseInt(localStorage.getItem(curKey) ?? '100', 10);
    if (curGain !== 100) {
      import('./waveform.js').then(({ connectGain }) => {
        const g = connectGain(el); if (g) g.gain.value = curGain / 100;
      });
    }
  }
  function goTo(i) {
    if (!playlist || i < 0 || i >= playlist.items.length || i === playlist.index) return;
    pendingAutoplay = true;
    ctx.folder.open(playlist.items[i].file);          // app reloads → renderer re-runs for the new track
  }
  function go(dir) {
    if (!playlist) return;
    let i;
    if (shuffle && dir > 0) { do { i = Math.floor(Math.random() * playlist.items.length); } while (playlist.items.length > 1 && i === playlist.index); }
    else { i = playlist.index + dir; if (i < 0 || i >= playlist.items.length) return; }
    goTo(i);
  }

  // ── Media editor / transcoding panel (ffmpeg.wasm opt-in) ──
  // When ffmpeg is enabled: full editor panel (Phase 2). Provides trim, extract
  // audio, mute, screenshot, downscale, volume, speed, and WebM conversion.
  // When disabled: show a plain hint for formats that can't play natively.
  // (enableFfmpeg is declared earlier so video controls can reference it.)
  const needsConvert = likelyNeedsTranscode(intake);

  // Legacy hint panel — shown only when ffmpeg is disabled but the file needs conversion.
  const hintPanel = document.createElement('div');
  hintPanel.className = 'media-tx-panel';
  hintPanel.hidden = true;

  function showConvertHint() {
    hintPanel.innerHTML = '<span class="media-tx-icon">🎬</span>'
      + '<span class="media-tx-msg">This format may not play natively. '
      + (enableFfmpeg
        ? 'Use the <strong>Media Editor</strong> below to convert it.'
        : 'Enable <strong>Media transcoding</strong> in <em>Settings → Advanced</em>'
          + ' to convert it (~23 MB download on first use).')
      + '</span>';
    hintPanel.hidden = false;
  }
  if (needsConvert) showConvertHint();
  el.addEventListener('error', () => { if (hintPanel.hidden) showConvertHint(); }, { once: true });

  // Full editor panel (Phase 2) — always built when ffmpeg is enabled.
  let editorPanel = null;
  let editorRevoke = null;
  let exportPanel = null;       // P1/P3 export + fades panel
  let exportRevoke = null;
  let transcodedUrl = null;  // revoked on cleanup

  if (enableFfmpeg) {
    const buildEditorPanel = await getEditorPanel();
    const editor = buildEditorPanel(intake, el, (newUrl) => {
      if (transcodedUrl) URL.revokeObjectURL(transcodedUrl);
      transcodedUrl = newUrl;
      el.src = newUrl;
      el.load();
      el.play().catch(() => { /* autoplay blocked */ });
    });
    editorPanel = editor.el;
    editorRevoke = editor.revoke;

    // P1 (export processed/EQ'd audio) + P3 (baked fades). Reads the live EQ graph.
    const { buildExportPanel } = await import('./studio-export.js');
    const exp = buildExportPanel(intake, el, info.kind);
    exportPanel = exp.el;
    exportRevoke = exp.revoke;
  }

  let waveformWrap = null;
  let spController = null;
  if (info.kind === 'audio') {
    const wvWrap = document.createElement('div');
    wvWrap.className = 'media-wv-wrap';
    const wvToggle = document.createElement('button');
    wvToggle.type = 'button';
    wvToggle.className = 'media-wv-toggle';
    wvToggle.textContent = '▶ Show waveform';
    const wvPanel = document.createElement('div');
    wvPanel.className = 'media-wv-panel';
    wvPanel.hidden = true;
    wvWrap.append(wvToggle, wvPanel);
    waveformWrap = wvWrap;
    wvToggle.addEventListener('click', async () => {
      wvPanel.hidden = !wvPanel.hidden;
      wvToggle.textContent = wvPanel.hidden ? '▶ Show waveform' : '▼ Hide waveform';
      if (wvPanel.hidden) { wvController?.destroy(); wvController = null; return; }
      if (!wvPanel.hidden && !wvController) {
        const { mountWaveform } = await import('./waveform.js');
        const file = intake.file || new File([intake.bytes || new Uint8Array()], intake.filename || 'audio');
        wvController = await mountWaveform(wvPanel, file);
      }
    });

    // ── Spectrum & EQ panel ───────────────────────────────────────────────
    const spWrap = document.createElement('div');
    spWrap.className = 'media-wv-wrap';
    const spToggle = document.createElement('button');
    spToggle.type = 'button';
    spToggle.className = 'media-wv-toggle';
    spToggle.textContent = '▶ Spectrum & EQ';
    const spPanel = document.createElement('div');
    spPanel.className = 'media-sp-panel';
    spPanel.hidden = true;
    spWrap.append(spToggle, spPanel);
    spToggle.addEventListener('click', async () => {
      spPanel.hidden = !spPanel.hidden;
      spToggle.textContent = spPanel.hidden ? '▶ Spectrum & EQ' : '▼ Spectrum & EQ';
      if (spPanel.hidden) { spController?.destroy(); spController = null; return; }
      if (!spController) {
        const { mountSpectrumPanel } = await import('./spectrum.js');
        spController = mountSpectrumPanel(spPanel, el);
      }
    });
    wvWrap.append(spWrap);
  }

  if (info.kind === 'audio') host.append(name, el, waveformWrap, tools);
  else host.append(el, name, tools);
  if (videoStudio) host.append(videoStudio.mixer);
  host.append(hintPanel);
  if (editorPanel) host.append(editorPanel);
  if (exportPanel) host.append(exportPanel);
  if (trackListEl) host.append(trackListEl);

  // ── Resume position ──
  const saved = loadState(intake);
  el.addEventListener('loadedmetadata', () => {
    if (saved && saved.kind === 'media' && saved.time > 0 && saved.time < el.duration - 2) {
      el.currentTime = saved.time;
    }
  }, { once: true });
  let lastSave = 0;
  let lastPlaybackTime = null;
  let continuousPlaybackMs = 0;
  el.addEventListener('timeupdate', () => {
    const now = el.currentTime;
    if (lastPlaybackTime !== null && !el.paused && !el.seeking) {
      const delta = Math.max(0, Math.min(1.5, now - lastPlaybackTime));
      continuousPlaybackMs += delta * 1000;
      recordStage5MediaPlayback({
        file: intake.filename,
        continuousMs: continuousPlaybackMs,
        active: true,
        seeking: false,
      });
    }
    lastPlaybackTime = now;
    if (Math.abs(now - lastSave) < 5) return;      // throttle writes
    lastSave = now;
    saveState(intake, { kind: 'media', time: now, duration: el.duration || 0 });
  });
  el.addEventListener('pause', () => { lastPlaybackTime = null; continuousPlaybackMs = 0; });
  el.addEventListener('seeking', () => { lastPlaybackTime = null; continuousPlaybackMs = 0; });
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
    revoke: () => {
      cancelSleep();
      hideIosAudioHint();
      URL.revokeObjectURL(url);
      if (transcodedUrl) URL.revokeObjectURL(transcodedUrl);
      if (editorRevoke) editorRevoke();
      if (exportRevoke) exportRevoke();
      if (wvController) { wvController.destroy(); wvController = null; }
      if (spController) { spController.destroy(); spController = null; }
      if (videoStudio) { videoStudio.destroy(); videoStudio = null; }
    },
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
