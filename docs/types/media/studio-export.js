// P1 + P3 — "Export processed audio" and baked fade controls for the Media Studio.
//
// P1: bakes the LIVE Spectrum & EQ graph (9-band EQ, HPF/LPF, LUFS-normalize target)
//     into a downloadable audio file via ffmpeg.wasm. Settings are read straight off the
//     shared WebAudio graph (audio-graph.js getSettings()), which both this panel and the
//     EQ panel reference through the SAME media element — so the export always reflects
//     whatever the user is currently hearing.
// P3: audio fade-in / fade-out (afade) compose into the same render; video fade-to/from
//     black (fade) is a separate op. Cross-clip crossfade/xfade is STUBBED — it needs the
//     multi-track timeline (P5/P6), which isn't built.
//
// This module owns ONLY the export/fade UI; the ffmpeg work lives in transcoder.js
// (buildAudioFilterChain + the bakeAudio / videofade ops). Kept separate from editor.js
// so neither file sprawls past the LOC cap.

import { loadGlobal, vendor } from '../../core/script-loader.js';
import { getGraph } from './audio-graph.js';
import { cancelFfmpeg, formatFfmpegError, loadFfmpeg, runOperation, runAcxChapterExports, buildAudioFilterChain, buildAcxFilterChain, buildVideoExportFilterChain } from './transcoder.js';
import { chapterFilename } from './chapters.js';
import {
  EXPORT_PRESETS, presetById, resolveExportParams, resolveExportAudioSettings, buildAdvancedOverrides,
} from './export-presets.js';
import {
  VIDEO_LOOKS,
  VIDEO_TRANSFORMS,
  buildSubtitleBurnControls,
  buildVideoTransformControls,
  optionLabel,
} from './export-video-controls.js';
import {
  buildPresetCards,
  formatPresetName,
} from './export-preset-cards.js';
import {
  acxChainOptions,
  buildAudioSummary,
  buildVideoSummary,
  collectFades,
  collectVideoTransform,
} from './export-summary.js';
import { buildChapterZipControls, chaptersReady, chapterZipFilename } from './export-chapters.js';
import { buildExportProgress } from './export-progress.js';
import { renderStageCompare, summarizeMasteringStages } from './mastering-stages.js';

function mkBtn(text, cls) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = text;
  b.className = cls || 'media-ed-btn';
  return b;
}

function numInput(value, cls) {
  const el = document.createElement('input');
  el.type = 'number';
  el.min = '0';
  el.max = '60';
  el.step = '0.5';
  el.value = String(value);
  el.className = cls || 'media-ed-fade-input';
  return el;
}

// Read the live studio settings off the shared graph for `mediaEl`. Returns null when
// no WebAudio graph exists (e.g. WebAudio unavailable) → caller falls back to a flat bake.
function readLiveSettings(mediaEl) {
  const graph = getGraph(mediaEl);
  return graph ? graph.getSettings() : null;
}

// Build the Export + Fades panel. `kind` is 'audio' | 'video'.
// `intake` is the file descriptor; `mediaEl` the native element (for live settings + duration).
// Returns { el, revoke() }.
export function buildExportPanel(intake, mediaEl, kind, options = {}) {
  const blobUrls = [];
  let ffInstance = null;
  const isAudio = kind === 'audio';
  let chapters = Array.isArray(options.chapters) ? options.chapters : [];

  const panel = document.createElement('div');
  panel.className = 'media-ed-panel media-export-panel';

  const head = document.createElement('div');
  head.className = 'media-export-headline';
  const header = document.createElement('div');
  header.className = 'media-ed-header';
  header.textContent = kind === 'video' ? 'Export & Fades (video)' : 'Export processed audio';
  const headStatus = document.createElement('div');
  headStatus.className = 'media-export-head-status';
  headStatus.textContent = isAudio ? 'Profile: Podcast MP3' : 'Video export profile';
  head.append(header, headStatus);
  panel.appendChild(head);

  // ── Export-preset picker + workflow cards (audio only) ──
  const presetSel = document.createElement('select');
  presetSel.className = 'sp-preset-sel media-export-preset';
  const availablePresets = EXPORT_PRESETS.filter((p) => p.kind !== 'video' || kind === 'video');
  for (const p of availablePresets) {
    const o = document.createElement('option');
    o.value = p.id;
    o.textContent = p.label;
    presetSel.append(o);
  }
  presetSel.value = kind === 'video' ? 'web-mp4-720p' : 'podcast-mp3';

  const presetRow = document.createElement('div');
  presetRow.className = 'media-ed-radio-row media-export-select-row';
  presetRow.append(document.createTextNode('Preset '), presetSel);

  const presetCardState = (() => {
    if (!isAudio) return null;
    const workflowPresetIds = ['podcast-mp3', 'podcast-cleanup-mp3', 'acx-mp3', 'custom'];
    return buildPresetCards({
      availablePresets,
      workflowPresetIds,
      onPresetSelected(presetId) {
        if (presetSel.value === presetId) return;
        presetSel.value = presetId;
        presetSel.dispatchEvent(new Event('change'));
      },
    });
  })();
  if (presetCardState) panel.appendChild(presetCardState.el);
  panel.appendChild(presetRow);

  // ── Fade controls (shared by audio + video) ──
  const fadeRow = document.createElement('div');
  fadeRow.className = 'media-ed-fade-row';
  const fadeInLabel = document.createElement('label');
  const fadeInInput = numInput(0, 'media-ed-fade-in');
  fadeInLabel.append(document.createTextNode('Fade in (s) '), fadeInInput);
  const fadeOutLabel = document.createElement('label');
  const fadeOutInput = numInput(0, 'media-ed-fade-out');
  fadeOutLabel.append(document.createTextNode('Fade out (s) '), fadeOutInput);
  fadeRow.append(fadeInLabel, fadeOutLabel);
  panel.appendChild(fadeRow);

  let transformSel = null;
  let lookSel = null;
  if (!isAudio) {
    const videoControls = buildVideoTransformControls();
    transformSel = videoControls.transformSel;
    lookSel = videoControls.lookSel;
    panel.appendChild(videoControls.row);
  }

  // ── Advanced overrides (still advanced/custom) ──
  const advanced = buildAdvancedOverrides();
  const advWrap = document.createElement('div');
  advWrap.className = 'media-export-adv-wrap';
  const advNote = document.createElement('div');
  advNote.className = 'media-export-adv-note';
  advNote.textContent = 'Custom mode: manual container, bitrate, sample-rate, channel, and loudness settings.';
  advWrap.append(advNote, advanced.el);
  panel.appendChild(advWrap);

  const summary = document.createElement('div');
  summary.className = 'media-export-summary';
  const stageCompare = document.createElement('div');
  stageCompare.className = 'sp-stage-compare media-export-stage-compare';
  panel.appendChild(stageCompare);
  panel.appendChild(summary);

  function currentPreset() { return presetById(presetSel.value); }
  function syncPresetCards() {
    const preset = currentPreset();
    if (presetCardState) presetCardState.sync(preset.id);
    const label = formatPresetName(preset);
    if (isAudio) headStatus.textContent = `Profile: ${label}`;
  }

  function syncAdvancedVisibility() {
    const preset = currentPreset();
    const isCustom = preset.id === 'custom';
    advanced.el.hidden = !isCustom;
    advNote.hidden = !isCustom;
    syncPresetCards();
  }

  // ── Action row ──
  let subtitleBurnFile = null;
  let subtitleBurnBtn = null;
  let subtitleBurnStatus = null;
  if (!isAudio) {
    const burnControls = buildSubtitleBurnControls(mkBtn, async (file, status) => {
      subtitleBurnFile = null;
      if (!file) {
        status.textContent = 'Choose .srt or .vtt; export starts on burn-in.';
        return;
      }
      const ext = (file.name.includes('.') ? file.name.split('.').pop() : '').toLowerCase();
      if (ext !== 'srt' && ext !== 'vtt') {
        status.textContent = 'Use an .srt or .vtt subtitle file.';
        return;
      }
      try {
        const text = await file.text();
        subtitleBurnFile = file;
        const lines = text.split(/\r?\n/).filter((line) => /-->/.test(line)).length;
        status.textContent = file.name + (lines ? ` loaded (${lines} cue${lines === 1 ? '' : 's'}).` : ' loaded.');
      } catch {
        status.textContent = 'Could not read subtitle file.';
      }
    });
    subtitleBurnBtn = burnControls.button;
    subtitleBurnStatus = burnControls.status;
    panel.appendChild(burnControls.el);
  }

  const actionRow = document.createElement('div');
  actionRow.className = 'media-ed-actions';
  const runBtn = mkBtn(kind === 'video' ? 'Export video' : 'Export processed audio', 'media-ed-run media-export-run');
  const cancelBtn = mkBtn('Cancel', 'media-ed-cancel');
  cancelBtn.hidden = true;
  actionRow.append(runBtn, cancelBtn);
  panel.appendChild(actionRow);

  const chapterControls = isAudio ? buildChapterZipControls(mkBtn) : null;
  const chapterBtn = chapterControls?.button || null;
  if (chapterControls?.el) panel.appendChild(chapterControls.el);

  // Cross-clip transitions are now wired through the modular Timeline/Mix surfaces.
  const stub = document.createElement('p');
  stub.className = 'media-export-stub media-ed-note';
  if (kind === 'video') {
    stub.append(document.createTextNode('Dissolve / crossfade (xfade) between two clips lives in the modular '));
    const lnk = document.createElement('button');
    lnk.type = 'button';
    lnk.className = 'media-tl-open';
    lnk.textContent = 'Timeline';
    lnk.addEventListener('click', () => {
      const doc = panel.closest('.media-doc');
      const tab = doc?.querySelector('.media-mode-tab[data-mode="timeline"]');
      tab?.click();
      doc?.querySelector('.media-mode-panel[data-mode="timeline"] .mmx-video-source')
        ?.scrollIntoView({ behavior: 'smooth' });
    });
    stub.append(lnk, document.createTextNode(' — add a second clip there to bake it.'));
  } else {
    stub.textContent = 'Crossfade (acrossfade) between two clips lives in the Multi-track mixer — add a second lane there to crossfade.';
  }
  panel.appendChild(stub);

  // ── Progress + result ──
  const progress = buildExportProgress();
  const { progressArea, resultArea } = progress;
  panel.appendChild(progressArea);
  panel.appendChild(resultArea);

  // Resolve the chosen preset + (when Custom) the override controls into concrete
  // export params, with the preset's loudness target merged into the live EQ settings.
  function resolveParams() {
    const ext = (intake.filename || '').split('.').pop().toLowerCase();
    return resolveExportParams(currentPreset(), advanced.read(), ext);
  }

  // Refresh the summary so the user sees what is baked:
  // live tune chain fragments (EQ/HPF/LPF/dynamics/fades) + resolved preset target.
  function refreshSummary() {
    if (!summary) return;
    const preset = currentPreset();
    const p = resolveParams();
    const s = readLiveSettings(mediaEl) || {};
    const fades = collectFades(mediaEl, fadeInInput, fadeOutInput);
    const eqSettings = resolveExportAudioSettings(p, s);
    renderStageCompare(stageCompare, summarizeMasteringStages(eqSettings, p));
    const chain = p.acxChain
      ? buildAcxFilterChain(acxChainOptions(p))
      : buildAudioFilterChain(eqSettings, fades);
    if (isAudio) {
      summary.textContent = buildAudioSummary(preset, p, s, fades, chain);
    } else {
      const videoTransform = collectVideoTransform(transformSel, lookSel);
      const vf = buildVideoExportFilterChain(p.video || {}, videoTransform);
      summary.textContent = buildVideoSummary({
        preset,
        resolvedParams: p,
        settings: s,
        fades,
        videoTransform,
        audioFilterChain: chain,
        videoFilterChain: vf,
        videoLookLabel: (value) => optionLabel(VIDEO_LOOKS, value),
        videoTransformLabel: (value) => optionLabel(VIDEO_TRANSFORMS, value),
      });
    }
  }

  fadeInInput.addEventListener('input', refreshSummary);
  fadeOutInput.addEventListener('input', refreshSummary);
  transformSel?.addEventListener('change', refreshSummary);
  lookSel?.addEventListener('change', refreshSummary);
  presetSel.addEventListener('change', () => {
    syncAdvancedVisibility();
    refreshSummary();
  });
  advanced.onChange(refreshSummary);

  function setRunning(running) {
    runBtn.disabled = running;
    if (subtitleBurnBtn) subtitleBurnBtn.disabled = running;
    runBtn.hidden = running;
    cancelBtn.hidden = !running;
    progress.setRunning(running);
  }

  function showResult(url, filename, sizeBytes) {
    progress.showResult(url, filename, sizeBytes);
  }

  function syncChapterExport() {
    chapterControls?.sync(chapters);
  }

  function showError(msg) {
    progress.showError(msg);
  }

  async function run() {
    setRunning(true);
    progress.clearResult();
    try {
      const ff = await loadFfmpeg(({ ratio }) => {
        progress.setProgressRatio(ratio, 'Encoding…');
      });
      ffInstance = ff;
      progress.setProgressRatio(0, 'Encoding…');

      const settings = readLiveSettings(mediaEl) || {};
      const fades = collectFades(mediaEl, fadeInInput, fadeOutInput);
      const p = resolveParams();
      const chainSettings = resolveExportAudioSettings(p, settings);

      let result;
      if (p.kind === 'video' && p.video) {
        result = await runOperation(ff, 'webvideo', {
          settings: chainSettings, fades, video: p.video, container: p.container,
          bitrate: p.bitrate, sampleRate: p.sampleRate, channels: p.channels,
          lufsTarget: p.lufsTarget, truePeak: p.truePeak, transform: collectVideoTransform(transformSel, lookSel),
        }, intake);
      } else if (p.acxChain) {
        result = await runOperation(ff, 'acxExport', acxChainOptions(p), intake);
      } else {
        result = await runOperation(ff, 'bakeAudio', {
          settings: chainSettings, fades, container: p.container, format: p.container,
          bitrate: p.bitrate, sampleRate: p.sampleRate, channels: p.channels,
          lufsTarget: p.lufsTarget, truePeak: p.truePeak, cbr: p.cbr,
        }, intake);
      }
      blobUrls.push(result.url);
      showResult(result.url, result.filename, result.bytes);
    } catch (err) {
      showError(formatFfmpegError(err));
    } finally {
      ffInstance = null;
      setRunning(false);
      runBtn.hidden = false;
      cancelBtn.hidden = true;
    }
  }

  async function runSubtitleBurn() {
    if (!subtitleBurnFile) {
      if (subtitleBurnStatus) subtitleBurnStatus.textContent = 'Choose an SRT or VTT subtitle file first.';
      showError('Choose an SRT or VTT subtitle file first.');
      return;
    }
    setRunning(true);
    progress.clearResult();
    try {
      const ff = await loadFfmpeg(({ ratio }) => {
        progress.setProgressRatio(ratio, 'Burning subtitles…');
      });
      ffInstance = ff;
      progress.setProgressRatio(0, 'Burning subtitles…');
      const result = await runOperation(ff, 'subtitleBurn', { secondary: subtitleBurnFile }, intake);
      blobUrls.push(result.url);
      if (subtitleBurnStatus) subtitleBurnStatus.textContent = 'Burn-in complete.';
      showResult(result.url, result.filename, result.bytes);
    } catch (err) {
      if (subtitleBurnStatus) subtitleBurnStatus.textContent = 'Burn-in failed.';
      showError(formatFfmpegError(err));
    } finally {
      ffInstance = null;
      setRunning(false);
      runBtn.hidden = false;
      cancelBtn.hidden = true;
    }
  }

  async function runChapterZip() {
    if (!chaptersReady(chapters)) {
      syncChapterExport();
      return;
    }
    setRunning(true);
    if (chapterBtn) chapterBtn.disabled = true;
    progress.clearResult();
    try {
      const p = resolveExportParams(presetById('acx-mp3'), {}, 'mp3');
      let currentChapter = 0;
      const ff = await loadFfmpeg(({ ratio }) => {
        const pct = Math.round((((currentChapter + (ratio || 0)) / Math.max(1, chapters.length))) * 100);
        progress.setProgressRatio(Math.min(1, pct / 100), `Encoding chapter ${Math.min(currentChapter + 1, chapters.length)} / ${chapters.length}…`);
      });
      ffInstance = ff;
      const files = await runAcxChapterExports(ff, intake, chapters, {
        ...acxChainOptions(p),
        onChapterStart(index) {
          currentChapter = index;
          progress.setProgressRatio(0, `Encoding chapter ${index + 1} / ${chapters.length}…`);
        },
      });
      progress.setProgressRatio(0.95, 'Packaging ZIP…');
      const JSZip = await loadGlobal(vendor('jszip/jszip.min.js'), 'JSZip');
      const zip = new JSZip();
      files.forEach((file) => {
        zip.file(chapterFilename(intake.filename || 'audio', chapters[file.index], file.index), file.bytes);
      });
      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }, (meta) => {
        const pct = Math.round(95 + ((meta.percent || 0) * 0.05));
        progress.setProgressRatio(Math.min(1, pct / 100));
      });
      const url = URL.createObjectURL(blob);
      blobUrls.push(url);
      showResult(url, chapterZipFilename(intake.filename), blob.size);
    } catch (err) {
      showError(formatFfmpegError(err));
    } finally {
      ffInstance = null;
      setRunning(false);
      runBtn.hidden = false;
      cancelBtn.hidden = true;
      syncChapterExport();
    }
  }

  async function cancel() {
    if (ffInstance) {
      try { cancelFfmpeg(ffInstance); } catch { /* ignore */ }
      ffInstance = null;
    }
    progress.setProgressRatio(0, 'Cancelled.');
    setRunning(false);
    runBtn.hidden = false;
    cancelBtn.hidden = true;
  }

  runBtn.addEventListener('click', run);
  subtitleBurnBtn?.addEventListener('click', runSubtitleBurn);
  chapterBtn?.addEventListener('click', runChapterZip);
  cancelBtn.addEventListener('click', cancel);

  // Keep the summary fresh when the panel is shown (EQ may have changed since build).
  panel.addEventListener('pointerenter', refreshSummary);
  mediaEl.addEventListener('media-graph-change', refreshSummary);
  syncAdvancedVisibility();
  syncChapterExport();
  refreshSummary();

  return {
    el: panel,
    updateChapters(nextChapters) {
      chapters = Array.isArray(nextChapters) ? nextChapters : [];
      syncChapterExport();
    },
    revoke() {
      for (const u of blobUrls) {
        try { URL.revokeObjectURL(u); } catch { /* ignore */ }
      }
      blobUrls.length = 0;
      mediaEl.removeEventListener('media-graph-change', refreshSummary);
    },
  };
}
