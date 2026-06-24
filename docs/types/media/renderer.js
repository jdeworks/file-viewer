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
import { makeTogglePanel } from './panel-toggle.js';
import { buildSpeedPresets, buildVideoExtras, attachShortcuts, buildCoverArt, buildChapterList } from './playback-extras.js';
import { mountSubtitles, buildSubtitleLoader } from './subtitles.js';

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

function fmtTimeValue(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mm = String(minutes % 60).padStart(2, '0');
    return `${hours}:${mm}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
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
  name.className = info.kind === 'audio' ? 'media-workspace-title' : 'media-name';
  name.textContent = intake.filename;

  let workspaceTime = null;
  let audioWorkspace = null;
  let waveformSurface = null;
  let audioModes = null;
  let modePanelWrap = null;
  let coverEl = null;
  if (info.kind === 'audio') {
    workspaceTime = document.createElement('div');
    workspaceTime.className = 'media-workspace-time';
    workspaceTime.textContent = '0:00 / --:--';

    const workspaceHead = document.createElement('div');
    workspaceHead.className = 'media-workspace-head';
    workspaceHead.append(name, workspaceTime);

    const mediaSurface = document.createElement('div');
    mediaSurface.className = 'media-audio-surface';
    mediaSurface.append(el);

    waveformSurface = document.createElement('div');
    waveformSurface.className = 'media-waveform-surface';

    const workspaceBody = document.createElement('div');
    workspaceBody.className = 'media-workspace-body';
    workspaceBody.append(mediaSurface, waveformSurface);

    audioWorkspace = document.createElement('div');
    audioWorkspace.className = 'media-workspace media-audio-workspace';
    audioWorkspace.append(workspaceHead, workspaceBody);

    audioModes = document.createElement('div');
    audioModes.className = 'media-audio-modes';
    modePanelWrap = document.createElement('div');
    modePanelWrap.className = 'media-audio-mode-panels media-wv-wrap';
    audioModes.append(modePanelWrap);
  }

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

  let timelineWrap = null;
  const panels = [];      // toggle-panel controllers to tear down on revoke

  const setWorkspaceTime = () => {
    if (!workspaceTime) return;
    const now = fmtTimeValue(el.currentTime) || '0:00';
    const dur = fmtTimeValue(el.duration) || '--:--';
    workspaceTime.textContent = `${now} / ${dur}`;
  };

  // ── P6: Video timeline (2-lane) + transitions + visual trim ──
  // Video-only, opt-in (ffmpeg). CPU-lazy: mounts on first toggle; no ffmpeg/thumbnail
  // work until a transition / "Thumbnails" runs. Closing the panel tears it down.
  if (info.kind === 'video' && enableFfmpeg) {
    const tp = makeTogglePanel({
      label: 'Video timeline', panelClass: 'media-tl-panel',
      mount: async (panel) => {
        const { mountTimeline } = await import('./timeline.js');
        return mountTimeline(panel, intake, el, (newUrl) => {
          if (transcodedUrl) URL.revokeObjectURL(transcodedUrl);
          transcodedUrl = newUrl; el.src = newUrl; el.load();
          el.play().catch(() => { /* autoplay blocked */ });
        });
      },
    });
    timelineWrap = tp.wrap; panels.push(tp);
  }

  if (info.kind === 'audio') {
    const { mountWaveform } = await import('./waveform.js');
    const file = intake.file || new File([intake.bytes || new Uint8Array()], intake.filename || 'audio');
    const wv = await mountWaveform(waveformSurface, file);
    if (wv) panels.push({ destroy() { wv.destroy(); } });

    const sp = makeTogglePanel({
      label: 'Spectrum & EQ', panelClass: 'media-sp-panel',
      mount: async (panel) => (await import('./spectrum.js')).mountSpectrumPanel(panel, el),
    });
    modePanelWrap.append(sp.wrap); panels.push(sp);

    // ── P4: Dynamics — compressor + limiter live; gate + de-noise baked on export.
    const dyn = makeTogglePanel({
      label: 'Dynamics', panelClass: 'media-dyn-panel',
      mount: async (panel) => (await import('./dynamics.js')).mountDynamicsPanel(panel, el),
    });
    modePanelWrap.append(dyn.wrap); panels.push(dyn);

    // ── P8: Audiobook QC (ACX) — read-only pass/fail card + one-click ACX export.
    // CPU-lazy: nothing decodes / loads ffmpeg until Run QC / Export for ACX is clicked.
    const qc = makeTogglePanel({
      label: 'Audiobook QC (ACX)', panelClass: 'media-qc-toggle-panel',
      mount: async (panel) => (await import('./qc-ui.js')).mountAcxQcPanel(panel, intake, el),
    });
    modePanelWrap.append(qc.wrap); panels.push(qc);

    // ── Multi-track mixer ("swim lanes") — decode + transport only on first open.
    const mx = makeTogglePanel({
      label: 'Multi-track mixer', panelClass: 'media-mx-panel',
      mount: async (panel) => (await import('./mixer-ui.js')).mountMixer(panel, intake),
    });
    modePanelWrap.append(mx.wrap); panels.push(mx);
  }

  // ── P7: Tier-1 playback quick wins (no lib, live only) ──
  // Speed presets (both); PiP + frame-step (video); cover art + chapter list from ID3.
  const extras = document.createElement('div');
  extras.className = 'media-extras';
  extras.appendChild(buildSpeedPresets(el));
  let subCtl = null, coverRevoke = null;
  if (info.kind === 'video') {
    extras.appendChild(buildVideoExtras(el));
    subCtl = mountSubtitles(host, el);
    extras.appendChild(buildSubtitleLoader(subCtl));
  }
  // Keyboard shortcuts scoped to the (focusable) host; removed on teardown.
  host.tabIndex = 0;
  const detachKeys = attachShortcuts(host, el, { kind: info.kind });
  // One-time ID3 read (audio) → cover art + chapters. CPU-cheap head-slice parse.
  let chapterList = null;
  if (info.kind === 'audio' && intake.file && typeof intake.file.slice === 'function') {
    try {
      const head = new Uint8Array(await intake.file.slice(0, 512 * 1024).arrayBuffer());
      const tags = parseId3(head);
      if (tags?.cover) { const c = buildCoverArt(tags.cover); if (c) { coverEl = c.el; coverRevoke = c.revoke; } }
      if (tags?.chapters) chapterList = buildChapterList(tags.chapters, el);
    } catch { /* tag-less / unreadable — skip */ }
  }

  if (info.kind === 'audio') {
    if (coverEl) audioWorkspace.querySelector('.media-workspace-head')?.prepend(coverEl);
    host.append(audioWorkspace, tools, extras, audioModes);
  } else {
    host.append(el, name, tools, extras);
  }
  if (chapterList) host.append(chapterList);
  if (videoStudio) host.append(videoStudio.mixer);
  if (timelineWrap) host.append(timelineWrap);
  host.append(hintPanel);
  if (editorPanel) host.append(editorPanel);
  if (exportPanel) host.append(exportPanel);
  if (trackListEl) host.append(trackListEl);

  // ── Resume position ──
  const saved = loadState(intake);
  el.addEventListener('loadedmetadata', () => {
    setWorkspaceTime();
    if (saved && saved.kind === 'media' && saved.time > 0 && saved.time < el.duration - 2) {
      el.currentTime = saved.time;
    }
  }, { once: true });
  let lastSave = 0;
  let lastPlaybackTime = null;
  let continuousPlaybackMs = 0;
  el.addEventListener('timeupdate', () => {
    setWorkspaceTime();
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
      for (const p of panels) p.destroy();
      if (subCtl) { subCtl.destroy(); subCtl = null; }
      if (coverRevoke) { coverRevoke(); coverRevoke = null; }
      detachKeys();
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
