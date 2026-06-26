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
import {
  CHAPTER_SIDECAR_MAX_BYTES,
  findChapterSidecars,
  normalizeChapters,
  parseChapterSidecar,
} from './chapters.js';
import { likelyNeedsTranscode } from './transcoder.js';
import { recordStage5MediaPlayback } from '../../games/metagame/viewer-actions.js';
import { attachShortcuts, buildChapterList, buildCoverArt } from './playback-extras.js';
import { buildMediaWorkspace } from './renderer-workspace.js';
import { buildMediaTools, buildPlaybackExtras } from './renderer-tools.js';
import { mountAudioModePanels, mountVideoModePanels } from './renderer-mode-panels.js';
import { buildAudioListenSurface } from './audio-listen-surface.js';

// Lazily import editor.js (and its transcoder.js dep) only when ffmpeg is enabled.
// This prevents a stale SW-cached transcoder.js from breaking the entire preview.
let _editorModule = null;
async function getEditorPanel() {
  if (!_editorModule) _editorModule = await import('./editor.js');
  return _editorModule.buildEditorPanel;
}

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

function currentFolderPath(intake, folder) {
  const files = Array.isArray(folder?.files) ? folder.files : [];
  const match = files.find((f) => f.file === intake.file
    || (f.file && f.file.name === intake.filename && f.file.size === intake.size));
  return match?.path || intake.filename || '';
}

async function readSidecarChapters(intake, folder) {
  const candidates = findChapterSidecars(folder?.files, currentFolderPath(intake, folder), intake.file);
  for (const candidate of candidates) {
    const file = candidate.file;
    if (!file || typeof file.slice !== 'function') continue;
    if (Number.isFinite(file.size) && file.size > CHAPTER_SIDECAR_MAX_BYTES) continue;
    try {
      const bytes = new Uint8Array(await file.slice(0, CHAPTER_SIDECAR_MAX_BYTES + 1).arrayBuffer());
      if (bytes.length > CHAPTER_SIDECAR_MAX_BYTES) continue;
      const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
      const chapters = parseChapterSidecar(text, candidate.path || file.name);
      if (chapters.length) return { chapters, source: candidate.path || file.name };
    } catch { /* unreadable sidecar — try the next candidate */ }
  }
  return null;
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
  if (!info.kind) {
    const host = document.createElement('div');
    host.className = 'media-doc media-' + (info.kind || 'audio');
    host.innerHTML = '<p class="media-note">Unsupported media file.</p>';
    return { parentNode: host };
  }

  const url = blobUrl(intake, info.mime);
  const el = document.createElement(info.kind === 'video' ? 'video' : 'audio');
  el.className = 'media-view';
  el.controls = info.kind === 'video';
  el.preload = 'metadata';
  el.src = url;
  if (info.kind === 'video') el.setAttribute('playsinline', '');

  const listenSurface = info.kind === 'audio' ? buildAudioListenSurface(el, intake) : null;
  const workspace = buildMediaWorkspace(intake, info, el, { audioListenSurface: listenSurface?.el });
  const {
    host,
    workspaceTime,
    modeTabs,
    modePanelWrap,
    audioWorkspace,
    audioModes,
    videoWorkspace,
    videoModes,
  } = workspace;

  const enableFfmpeg = !!ctx.settings?.enableFfmpeg;
  let exportPanel = null;       // P1/P3 export + fades panel

  // One-time ID3 read (audio) -> cover art + chapters. CPU-cheap head-slice parse,
  // done before waveform/export mount so every surface shares the same chapter set.
  let rawChapters = [];
  let chapterSource = '';
  let normalizedChapters = [];
  let chapterList = null;
  let coverEl = null;
  let coverRevoke = null;
  const refreshChapters = () => {
    normalizedChapters = normalizeChapters(rawChapters, Number.isFinite(el.duration) ? el.duration : undefined);
    listenSurface?.setChapters?.(normalizedChapters);
    exportPanel?.updateChapters?.(normalizedChapters);
  };
  if (info.kind === 'audio' && intake.file && typeof intake.file.slice === 'function') {
    try {
      const head = new Uint8Array(await intake.file.slice(0, 512 * 1024).arrayBuffer());
      const tags = parseId3(head);
      if (tags?.cover) {
        const c = buildCoverArt(tags.cover);
        if (c) { coverEl = c.el; coverRevoke = c.revoke; }
      }
      if (tags?.chapters) { rawChapters = tags.chapters; chapterSource = 'embedded ID3'; }
    } catch { /* tag-less / unreadable — skip */ }
    const sidecar = await readSidecarChapters(intake, ctx.folder);
    if (sidecar?.chapters?.length) {
      rawChapters = sidecar.chapters;
      chapterSource = sidecar.source;
    }
  }
  if (Array.isArray(globalThis.__fvMediaTestChapters) && globalThis.__fvMediaTestChapters.length) {
    rawChapters = globalThis.__fvMediaTestChapters;
    chapterSource = 'test fixture';
  }
  refreshChapters();

  // ── FFmpeg status / conversion hint ──
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
  const needsConvert = likelyNeedsTranscode(intake);
  if (needsConvert) showConvertHint();
  el.addEventListener('error', () => { if (hintPanel.hidden) showConvertHint(); }, { once: true });

  // ── Video studio (filters + audio mixer) ──
  // Lazy-loaded so the audio-only path never pays for it. The mixer routes the
  // <video>'s audio through the shared WebAudio EQ/analyser graph (audio-graph.js).
  let videoStudio = null;
  if (info.kind === 'video') {
    const { buildVideoStudio } = await import('./video-studio.js');
    videoStudio = buildVideoStudio(el);
  }

  // ── Media editor / transcoding panel (ffmpeg.wasm opt-in) ──
  // When ffmpeg is enabled: full editor panel (Phase 2). Provides trim, extract
  // audio, mute, screenshot, downscale, volume, speed, and WebM conversion.
  // When disabled: show a plain hint for formats that can't play natively.
  let editorPanel = null;
  let editorController = null;
  let editorRevoke = null;
  let exportRevoke = null;
  let transcodedUrl = null;  // revoked on cleanup

  const applyTranscodedSource = (newUrl) => {
    if (transcodedUrl) URL.revokeObjectURL(transcodedUrl);
    transcodedUrl = newUrl;
    el.src = newUrl;
    el.load();
    el.play().catch(() => { /* autoplay blocked */ });
  };

  if (enableFfmpeg) {
    const buildEditorPanel = await getEditorPanel();
    const editor = buildEditorPanel(intake, el, applyTranscodedSource);
    editorController = editor;
    editorPanel = editor.el;
    editorRevoke = editor.revoke;

    // P1 (export processed/EQ'd audio) + P3 (baked fades). Reads the live EQ graph.
    const { buildExportPanel } = await import('./studio-export.js');
    const exp = buildExportPanel(intake, el, info.kind, { chapters: normalizedChapters });
    exportPanel = exp.el;
    exportRevoke = exp.revoke;
    refreshChapters();
  }
  if (listenSurface) {
    listenSurface.setRegionSelect?.(editorController?.prefillTrim ? ({ start, end }) => {
      editorController.prefillTrim({ start, end });
    } : null);
  }

  const { tools, trackListEl, advanceTrack, cancelSleep } = buildMediaTools({
    intake,
    playlist,
    mediaElement: el,
    enableFfmpeg,
    onNavigateTrack: (item) => {
      pendingAutoplay = true;
      ctx.folder.open(item.file);
    },
    onEditorPanelFocus: () => {
      if (enableFfmpeg && editorPanel) editorPanel.scrollIntoView({ behavior: 'smooth' });
    },
  });

  const extras = buildPlaybackExtras(el, info.kind);
  const panels = [];
  if (listenSurface) panels.push(listenSurface);
  const registerModeController = (controller) => {
    if (!panels.includes(controller)) panels.push(controller);
  };
  const releaseModeController = (controller) => {
    const idx = panels.indexOf(controller);
    if (idx >= 0) panels.splice(idx, 1);
  };

  const setWorkspaceTime = () => {
    if (!workspaceTime) return;
    const now = fmtTimeValue(el.currentTime) || '0:00';
    const dur = fmtTimeValue(el.duration) || '--:--';
    workspaceTime.textContent = `${now} / ${dur}`;
  };

  let audioListenMode = null;
  let subtitleController = null;
  if (info.kind === 'audio') {
    const audioModeData = await mountAudioModePanels({
      modeTabs,
      modePanelWrap,
      mediaElement: el,
      intake,
      tools,
      trackListEl,
      enableFfmpeg,
      exportPanel,
      onRegisterController: registerModeController,
      onReleaseController: releaseModeController,
    });
    audioListenMode = audioModeData.audioListenMode;
  }

  if (info.kind === 'video') {
    const videoModeData = await mountVideoModePanels({
      modeTabs,
      modePanelWrap,
      mediaElement: el,
      host,
      intake,
      tools,
      extras: extras.extras,
      hintPanel,
      enableFfmpeg,
      videoStudio,
      editorPanel,
      exportPanel,
      onRegisterController: registerModeController,
      onReleaseController: releaseModeController,
      onTranscodedSource: applyTranscodedSource,
    });
    subtitleController = videoModeData.subtitleController;
  }

  // Keyboard shortcuts scoped to the (focusable) host; removed on teardown.
  host.tabIndex = 0;
  const detachKeys = attachShortcuts(host, el, { kind: info.kind });
  if (normalizedChapters.length) chapterList = buildChapterList(normalizedChapters, el);
  let chapterSourceEl = null;
  if (normalizedChapters.length && chapterSource) {
    chapterSourceEl = document.createElement('div');
    chapterSourceEl.className = 'media-chapters-source';
    chapterSourceEl.textContent = 'Chapters: ' + chapterSource;
  }

  if (info.kind === 'audio') {
    if (coverEl) audioWorkspace.querySelector('.media-workspace-head')?.prepend(coverEl);
    if (audioListenMode) {
      audioListenMode.panel.append(extras.extras);
      if (chapterSourceEl) audioListenMode.panel.append(chapterSourceEl);
      if (chapterList) audioListenMode.panel.append(chapterList);
    }
    host.append(audioWorkspace, audioModes);
  } else {
    host.append(videoWorkspace, videoModes);
  }
  if (info.kind !== 'video') {
    host.append(hintPanel);
    if (editorPanel) host.append(editorPanel);
  }

  // ── Resume position ──
  const saved = loadState(intake);
  el.addEventListener('loadedmetadata', () => {
    setWorkspaceTime();
    refreshChapters();
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
  el.addEventListener('pause', () => {
    lastPlaybackTime = null;
    continuousPlaybackMs = 0;
  });
  el.addEventListener('seeking', () => {
    lastPlaybackTime = null;
    continuousPlaybackMs = 0;
  });
  el.addEventListener('ended', () => {
    clearState(intake);                  // this track finished — forget its position
    if (playlist) { advanceTrack(1); return; } // auto-advance to the next track (or random if shuffling)
    cancelSleep();
  });

  // ── Media Session (OS / lock-screen metadata + controls) ──
  if ('mediaSession' in navigator && typeof MediaMetadata !== 'undefined') {
    try {
      navigator.mediaSession.metadata = new MediaMetadata({ title: intake.filename, artist: '', album: '' });
      navigator.mediaSession.setActionHandler('play', () => el.play());
      navigator.mediaSession.setActionHandler('pause', () => el.pause());
      navigator.mediaSession.setActionHandler('seekbackward', (d) => {
        el.currentTime = Math.max(0, el.currentTime - (d.seekOffset || 10));
      });
      navigator.mediaSession.setActionHandler('seekforward', (d) => {
        el.currentTime = Math.min(el.duration || 1e9, el.currentTime + (d.seekOffset || 10));
      });
    } catch { /* not all actions supported everywhere */ }
  }

  // Autoplay only when we arrived via a playlist advance/next/prev (not the initial open).
  // Best-effort: browsers may block autoplay until the user has interacted with the page.
  if (pendingAutoplay) {
    pendingAutoplay = false;
    el.play().catch(() => { /* autoplay blocked */ });
  }

  // iOS-only opt-in: for AUDIO, suggest Add-to-Home-Screen so playback survives a screen lock.
  // No-op off iOS / when standalone / once dismissed.
  if (info.kind === 'audio') showIosAudioHint(); else hideIosAudioHint();

  // parentNode = render outside the sandbox; revoke frees blob + timers when the preview changes.
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
      if (subtitleController) {
        subtitleController.destroy();
        subtitleController = null;
      }
      if (coverRevoke) {
        coverRevoke();
        coverRevoke = null;
      }
      detachKeys();
      if (videoStudio) {
        videoStudio.destroy();
        videoStudio = null;
      }
    },
  };
}
