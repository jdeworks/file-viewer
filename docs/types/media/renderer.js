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
import { likelyNeedsTranscode, transcode } from './transcoder.js';
import { recordStage5MediaPlayback } from '../../games/metagame/viewer-actions.js';
import { makeTogglePanel } from './panel-toggle.js';
import { buildSpeedPresets, buildVideoExtras, attachShortcuts, buildCoverArt, buildChapterList } from './playback-extras.js';
import { mountSubtitles, buildSubtitleLoader } from './subtitles.js';
import { createWorkspaceModes } from './workspace-modes.js';

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
  name.className = info.kind === 'audio' ? 'media-workspace-title' : 'media-workspace-title media-name';
  name.textContent = intake.filename;

  let workspaceTime = null;
  let audioWorkspace = null;
  let videoWorkspace = null;
  let waveformSurface = null;
  let audioModes = null;
  let videoModes = null;
  let modeTabs = null;
  let modePanelWrap = null;
  let coverEl = null;
  let coverRevoke = null;
  let videoWorkspaceBody = null;
  let subtitleLoader = null;
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
    modeTabs = document.createElement('div');
    modeTabs.className = 'media-mode-tabs';
    modePanelWrap = document.createElement('div');
    modePanelWrap.className = 'media-mode-panels';
    audioModes.append(modeTabs, modePanelWrap);
  }
  if (info.kind === 'video') {
    workspaceTime = document.createElement('div');
    workspaceTime.className = 'media-workspace-time';
    workspaceTime.textContent = '0:00 / --:--';

    const workspaceHead = document.createElement('div');
    workspaceHead.className = 'media-workspace-head';
    workspaceHead.append(name, workspaceTime);

    const mediaSurface = document.createElement('div');
    mediaSurface.className = 'media-video-surface';
    mediaSurface.append(el);

    videoWorkspaceBody = document.createElement('div');
    videoWorkspaceBody.className = 'media-workspace-body';
    videoWorkspaceBody.append(mediaSurface);

    videoWorkspace = document.createElement('div');
    videoWorkspace.className = 'media-workspace media-video-workspace';
    videoWorkspace.append(workspaceHead, videoWorkspaceBody);

    videoModes = document.createElement('div');
    videoModes.className = 'media-video-modes';
    modeTabs = document.createElement('div');
    modeTabs.className = 'media-mode-tabs';
    modePanelWrap = document.createElement('div');
    modePanelWrap.className = 'media-mode-panels';
    videoModes.append(modeTabs, modePanelWrap);
  }

  // Resolve ffmpeg setting early so video controls and the pill can reference it.
  const enableFfmpeg = !!ctx.settings?.enableFfmpeg;
  let exportPanel = null;       // P1/P3 export + fades panel

  // One-time ID3 read (audio) -> cover art + chapters. CPU-cheap head-slice parse,
  // done before waveform/export mount so every surface shares the same chapter set.
  let rawChapters = [];
  let chapterSource = '';
  let normalizedChapters = [];
  let chapterList = null;
  const refreshChapters = () => {
    normalizedChapters = normalizeChapters(rawChapters, Number.isFinite(el.duration) ? el.duration : undefined);
    exportPanel?.updateChapters?.(normalizedChapters);
  };
  if (info.kind === 'audio' && intake.file && typeof intake.file.slice === 'function') {
    try {
      const head = new Uint8Array(await intake.file.slice(0, 512 * 1024).arrayBuffer());
      const tags = parseId3(head);
      if (tags?.cover) { const c = buildCoverArt(tags.cover); if (c) { coverEl = c.el; coverRevoke = c.revoke; } }
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
  let editorController = null;
  let editorRevoke = null;
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

  const panels = [];      // toggle-panel controllers to tear down on revoke

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

  let subCtl = null;
  // ── P7: Tier-1 playback quick wins (no lib, live only) ──
  // Speed presets (both); PiP + frame-step (video); cover art + chapter list from ID3.
  const extras = document.createElement('div');
  extras.className = 'media-extras';
  extras.appendChild(buildSpeedPresets(el));
  if (info.kind === 'video') {
    extras.appendChild(buildVideoExtras(el));
    subCtl = mountSubtitles(host, el);
  }

  let audioListenMode = null;
  if (info.kind === 'audio') {
    const { mountWaveform } = await import('./waveform.js');
    const file = intake.file || new File([intake.bytes || new Uint8Array()], intake.filename || 'audio');
    const wv = await mountWaveform(waveformSurface, file, {
      chapters: normalizedChapters,
      onRegionSelect: editorController?.prefillTrim ? ({ start, end }) => {
        editorController.prefillTrim({ start, end });
      } : null,
    });
    if (wv) panels.push({ destroy() { wv.destroy(); } });

    const audioWorkspaceModes = createWorkspaceModes({
      tabWrap: modeTabs,
      panelWrap: modePanelWrap,
      stickyModes: ['listen', 'export'],
      onRegisterController: registerModeController,
      onReleaseController: releaseModeController,
    });
    const { registerMode: registerAudioMode, setMode: setAudioMode } = audioWorkspaceModes;
    registerAudioMode('listen', 'Listen');
    registerAudioMode('tune', 'Tune', async (panel) => {
      const { PRESETS } = await import('./spectrum-draw.js');
      const { getGraph } = await import('./audio-graph.js');
      const graph = getGraph(el);
      const presetById = new Map(PRESETS.map((p) => [p.id, p]));
      const intentPresets = [
        { presetId: 'flat', label: 'Flat' },
        { presetId: 'broadcast', label: 'Clean speech' },
        { presetId: 'acx-standard', label: 'ACX standard' },
        { presetId: 'podcast', label: 'Podcast' },
        { presetId: 'findaway', label: 'Findaway' },
        { presetId: 'warmth', label: 'Warmth' },
        { presetId: 'air', label: 'Presence/Air' },
        { presetId: 'deess-m', label: 'De-ess' },
        { presetId: 'bass-cut', label: 'Bass rolloff' },
      ];

      const formatLpf = (f) => (f >= 1000 ? `${Math.round(f / 100) / 10}kHz` : `${f}Hz`);
      const matchesPreset = (p) => {
        if (!p) return false;
        const gains = graph.getGains();
        return gains.length === p.gains.length
          && gains.every((v, i) => Math.abs(v - p.gains[i]) <= 0.0001)
          && graph.getHpf() === p.hpf
          && graph.getLpf() === p.lpf;
      };

      if (!graph) {
        const note = document.createElement('div');
        note.className = 'media-tune-note';
        note.textContent = 'Audio processing unavailable for this media.';
        panel.appendChild(note);
        return {
          destroy() {
            note.remove();
          },
        };
      }

      const tuneWrap = document.createElement('div');
      tuneWrap.className = 'media-tune-wrap';

      const intentCard = document.createElement('div');
      intentCard.className = 'media-tune-intent-card';

      const intentHeading = document.createElement('div');
      intentHeading.className = 'media-tune-intent-heading';
      intentHeading.textContent = 'Quick intent tuning';

      const intentStatus = document.createElement('div');
      intentStatus.className = 'media-tune-intent-status';

      const intentRow = document.createElement('div');
      intentRow.className = 'media-tune-intent-row';

      const setActiveIntent = (id) => {
        intentRow.querySelectorAll('.media-tune-intent-btn').forEach((btn) => {
          const isActive = btn.dataset.intent === id;
          btn.classList.toggle('media-tune-intent-btn--active', isActive);
          btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
      };

      const reflectIntent = (preset, id) => {
        const hpf = preset?.hpf ?? graph.getHpf();
        const lpf = preset?.lpf ?? graph.getLpf();
        const label = preset?.name || 'Custom';
        intentStatus.textContent = `Intent: ${label} · HPF ${hpf}Hz · LPF ${formatLpf(lpf)}`;
        setActiveIntent(id);
      };

      const applyPresetIntent = (id) => {
        const preset = presetById.get(id) || PRESETS.find((p) => p.id === 'flat');
        if (!preset) return;
        graph.setAllGains(preset.gains);
        graph.setHpf(preset.hpf);
        graph.setLpf(preset.lpf);
        reflectIntent(preset, id);
      };

      let initialIntent = 'flat';
      const initialPreset = PRESETS.find((p) => matchesPreset(p));
      if (initialPreset) initialIntent = initialPreset.id;
      else initialIntent = null;

      for (const intent of intentPresets) {
        const preset = presetById.get(intent.presetId);
        if (!preset) continue;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'media-tune-intent-btn';
        btn.dataset.intent = intent.presetId;
        btn.textContent = intent.label;
        btn.title = `${intent.label} preset`;
        btn.addEventListener('click', () => applyPresetIntent(intent.presetId));
        intentRow.append(btn);
      }
      const initialPresetState = initialIntent ? PRESETS.find((p) => p.id === initialIntent) : null;
      reflectIntent(initialPresetState, initialIntent);

      const advWrap = document.createElement('div');
      advWrap.className = 'media-tune-advanced';
      const advHeading = document.createElement('div');
      advHeading.className = 'media-tune-advanced-heading';
      advHeading.textContent = 'Advanced controls';

      const sp = makeTogglePanel({
        label: 'Spectrum & EQ',
        panelClass: 'media-sp-panel',
        mount: async (innerPanel) => (await import('./spectrum.js')).mountSpectrumPanel(innerPanel, el),
      });
      const dyn = makeTogglePanel({
        label: 'Dynamics',
        panelClass: 'media-dyn-panel',
        mount: async (innerPanel) => (await import('./dynamics.js')).mountDynamicsPanel(innerPanel, el),
      });
      advWrap.append(advHeading, sp.wrap, dyn.wrap);
      intentCard.append(intentHeading, intentStatus, intentRow);
      tuneWrap.append(intentCard, advWrap);

      if (initialIntent) setActiveIntent(initialIntent);
      panel.append(tuneWrap);
      const tuneDestroy = {
        destroy() {
          sp.destroy();
          dyn.destroy();
        },
      };
      return tuneDestroy;
    });
    registerAudioMode('qc', 'QC', async (panel) => {
      const { mountAcxQcPanel } = await import('./qc-ui.js');
      return mountAcxQcPanel(panel, intake, el);
    });
    registerAudioMode('export', 'Export', async (panel) => {
      if (!enableFfmpeg) {
        const note = document.createElement('div');
        note.className = 'media-ed-note';
        note.innerHTML = 'Enable <strong>Media transcoding</strong> in <strong>Settings → Advanced</strong> '
          + 'to unlock audio export and related audio post-processing.';
        panel.appendChild(note);
        return null;
      }
      if (exportPanel) {
        panel.appendChild(exportPanel);
      }
      return null;
    });
    registerAudioMode('compare', 'Compare', async (panel) => {
      const { mountMediaCompare } = await import('./compare-ui.js');
      return mountMediaCompare(panel, intake, el, 'audio');
    });
    registerAudioMode('mix', 'Mix', async (panel) => {
      const { mountMixer } = await import('./mixer-ui.js');
      return mountMixer(panel, intake);
    });
    audioListenMode = audioWorkspaceModes.states.get('listen');
    audioListenMode.panel.append(tools);
    if (trackListEl) audioListenMode.panel.append(trackListEl);
    void setAudioMode('listen');
  }

  if (info.kind === 'video') {
    const videoWorkspaceModes = createWorkspaceModes({
      tabWrap: modeTabs,
      panelWrap: modePanelWrap,
      stickyModes: ['watch', 'export'],
      onRegisterController: registerModeController,
      onReleaseController: releaseModeController,
    });
    const { registerMode: registerVideoMode, setMode: setVideoMode } = videoWorkspaceModes;

    const buildFfNotEnabledHint = (message = 'Enable <strong>Media transcoding</strong> in <strong>Settings → Advanced</strong> '
      + 'to unlock this feature.') => {
      const note = document.createElement('div');
      note.className = 'media-ed-note';
      note.innerHTML = message;
      return note;
    };

    const videoWatchMode = registerVideoMode('watch', 'Watch');
    registerVideoMode('adjust', 'Adjust', async (panel) => {
      if (videoStudio) {
        panel.append(videoStudio.controls);
        panel.append(videoStudio.mixer);
        return {
          destroy() {
            videoStudio?.destroy();
          },
        };
      }
      return null;
    });
    registerVideoMode('timeline', 'Timeline', async (panel) => {
      if (!enableFfmpeg) {
        panel.append(buildFfNotEnabledHint(
          'Enable <strong>Media transcoding</strong> in <strong>Settings → Advanced</strong> to unlock the timeline tools.',
        ));
        return null;
      }
      const timelineToggle = makeTogglePanel({
        label: 'Video timeline',
        panelClass: 'media-tl-panel',
        mount: async (innerPanel) => {
          const { mountTimeline } = await import('./timeline.js');
          return mountTimeline(innerPanel, intake, el, (newUrl) => {
            if (transcodedUrl) URL.revokeObjectURL(transcodedUrl);
            transcodedUrl = newUrl;
            el.src = newUrl;
            el.load();
            el.play().catch(() => { /* autoplay blocked */ });
          });
        },
      });
      panel.append(timelineToggle.wrap);
      return timelineToggle;
    });
    registerVideoMode('subtitles', 'Subtitles', async (panel) => {
      if (!subtitleLoader) {
        if (!subCtl) subCtl = mountSubtitles(host, el);
        if (subCtl) {
          subtitleLoader = buildSubtitleLoader(subCtl);
        }
      }
      if (subtitleLoader) {
        panel.append(subtitleLoader);
      } else {
        panel.append(buildFfNotEnabledHint('Subtitle loader unavailable for this environment.'));
      }
      return null;
    });
    registerVideoMode('export', 'Export', async (panel) => {
      if (!enableFfmpeg || !exportPanel) {
        panel.append(buildFfNotEnabledHint('Enable <strong>Media transcoding</strong> in <strong>Settings → Advanced</strong> to unlock video export and fades.'));
        return null;
      }
      panel.append(exportPanel);
      if (editorPanel) panel.append(editorPanel);
      return null;
    });
    registerVideoMode('compare', 'Compare', async (panel) => {
      const { mountMediaCompare } = await import('./compare-ui.js');
      return mountMediaCompare(panel, intake, el, 'video');
    });

    if (videoWatchMode) {
      videoWatchMode.panel.append(tools);
      videoWatchMode.panel.append(extras);
      videoWatchMode.panel.append(hintPanel);
    }

    void setVideoMode('watch');
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
    if (audioListenMode) audioListenMode.panel.append(extras);
    if (chapterSourceEl && audioListenMode) audioListenMode.panel.append(chapterSourceEl);
    if (chapterList && audioListenMode) audioListenMode.panel.append(chapterList);
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
