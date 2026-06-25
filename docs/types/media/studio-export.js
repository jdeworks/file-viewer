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
import { cancelFfmpeg, formatFfmpegError, loadFfmpeg, runOperation, runAcxChapterExports, buildAudioFilterChain, buildAcxFilterChain } from './transcoder.js';
import { chapterFilename } from './chapters.js';
import { describeDynamics } from './audio-filters.js';
import {
  EXPORT_PRESETS, presetById, resolveExportParams, resolveExportAudioSettings, describeParams, buildAdvancedOverrides,
} from './export-presets.js';
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

function formatPresetName(preset) {
  if (!preset?.label) return '';
  return preset.label.split(' (')[0];
}

function formatKhz(rate) {
  const n = Number(rate);
  if (!isFinite(n)) return '';
  return n >= 1000 ? `${n / 1000}k` : `${n} Hz`;
}

function describePresetTarget(preset) {
  const bits = [];
  if (preset.acxChain) bits.push('ACX chain (trim + room-tone pad)');
  bits.push(`container ${preset.container || 'source'}`);
  if (preset.channels) bits.push(preset.channels === 1 ? 'mono' : `${preset.channels} ch`);
  else bits.push('channels match source');
  if (preset.sampleRate) bits.push(formatKhz(preset.sampleRate));
  else bits.push('sample rate match source');
  if (preset.bitrate) bits.push(preset.cbr ? `${preset.bitrate} CBR` : preset.bitrate);
  else bits.push('VBR');
  if (preset.cleanupChain) bits.push('export cleanup chain');
  if (preset.lufsTarget !== null && preset.lufsTarget !== undefined) bits.push(`loudnorm target ${preset.lufsTarget} LUFS`);
  if (preset.truePeak !== null && preset.truePeak !== undefined) bits.push(`loudnorm TP target ${preset.truePeak} dBTP`);
  if (preset.masterBus) bits.push('master bus');
  return bits.join(', ');
}

function describeLiveSummary(settings, fades) {
  const bits = [];
  const activeBands = (settings.gains || []).filter((g) => Math.abs(g) >= 0.1).length;
  if (activeBands) bits.push(`${activeBands} EQ band${activeBands === 1 ? '' : 's'}`);
  if (settings.hpf > 20) bits.push('HPF ' + Math.round(settings.hpf) + 'Hz');
  if (settings.lpf < 20000) bits.push('LPF ' + Math.round(settings.lpf) + 'Hz');
  const dyn = describeDynamics(settings.dynamics);
  if (dyn) bits.push(dyn);
  if (fades.fadeIn > 0) bits.push('fade-in ' + fades.fadeIn + 's');
  if (fades.fadeOut > 0) bits.push('fade-out ' + fades.fadeOut + 's');
  return bits;
}

function acxChainOptions(p) {
  return {
    lufs: p.lufsTarget,
    truePeak: p.truePeak,
    silence: { thresholdDb: -50, minSilenceSec: 0.4 },
    pad: { headSec: 0.75, tailSec: 2 },
  };
}

function zipFilename(base) {
  return String(base || 'audio').replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '') + '_ACX_chapters.zip';
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

  const presetCards = [];
  if (isAudio) {
    const cardWrap = document.createElement('div');
    cardWrap.className = 'media-export-preset-cards';
    const workflowPresetIds = ['podcast-mp3', 'podcast-cleanup-mp3', 'acx-mp3', 'custom'];
    const workflowPresets = workflowPresetIds.map((id) => availablePresets.find((preset) => preset.id === id)).filter(Boolean);
    for (const p of workflowPresets) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'media-export-preset-card';
      card.dataset.preset = p.id;
      const title = document.createElement('div');
      title.className = 'media-export-preset-title';
      title.textContent = formatPresetName(p);
      const detail = document.createElement('div');
      detail.className = 'media-export-preset-detail';
      detail.textContent = p.id === 'custom'
        ? 'Manual container / bitrate / sample rate / channels / loudness.'
        : (describeParams(p) || formatPresetName(p));
      card.append(title, detail);
      card.addEventListener('click', () => {
        if (presetSel.value === p.id) return;
        presetSel.value = p.id;
        presetSel.dispatchEvent(new Event('change'));
      });
      presetCards.push(card);
      cardWrap.append(card);
    }
    panel.appendChild(cardWrap);
  }
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
    const label = formatPresetName(preset);
    for (const card of presetCards) {
      const active = card.dataset.preset === preset.id;
      card.classList.toggle('media-export-preset-card--active', active);
      card.setAttribute('aria-pressed', active ? 'true' : 'false');
    }
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
    const burnCard = document.createElement('div');
    burnCard.className = 'media-export-subtitle-card';
    const burnCopy = document.createElement('div');
    burnCopy.className = 'media-export-subtitle-copy';
    const burnTitle = document.createElement('div');
    burnTitle.className = 'media-export-subtitle-title';
    burnTitle.textContent = 'Subtitle burn-in';
    subtitleBurnStatus = document.createElement('div');
    subtitleBurnStatus.className = 'media-export-subtitle-status';
    subtitleBurnStatus.textContent = 'Choose .srt or .vtt; export starts on burn-in.';
    burnCopy.append(burnTitle, subtitleBurnStatus);
    const burnInput = document.createElement('input');
    burnInput.type = 'file';
    burnInput.accept = '.srt,.vtt,text/vtt,application/x-subrip';
    burnInput.className = 'media-ed-file-input media-export-subtitle-input';
    subtitleBurnBtn = mkBtn('Burn in subtitles', 'media-ed-run media-export-subtitle-run');
    burnCard.append(burnCopy, burnInput, subtitleBurnBtn);
    panel.appendChild(burnCard);
    burnInput.addEventListener('change', async () => {
      const file = burnInput.files && burnInput.files[0];
      subtitleBurnFile = null;
      if (!file) {
        subtitleBurnStatus.textContent = 'Choose .srt or .vtt; export starts on burn-in.';
        return;
      }
      const ext = (file.name.includes('.') ? file.name.split('.').pop() : '').toLowerCase();
      if (ext !== 'srt' && ext !== 'vtt') {
        subtitleBurnStatus.textContent = 'Use an .srt or .vtt subtitle file.';
        return;
      }
      try {
        const text = await file.text();
        subtitleBurnFile = file;
        const lines = text.split(/\r?\n/).filter((line) => /-->/.test(line)).length;
        subtitleBurnStatus.textContent = file.name + (lines ? ` loaded (${lines} cue${lines === 1 ? '' : 's'}).` : ' loaded.');
      } catch {
        subtitleBurnStatus.textContent = 'Could not read subtitle file.';
      }
    });
  }

  const actionRow = document.createElement('div');
  actionRow.className = 'media-ed-actions';
  const runBtn = mkBtn(kind === 'video' ? 'Export video' : 'Export processed audio', 'media-ed-run media-export-run');
  const cancelBtn = mkBtn('Cancel', 'media-ed-cancel');
  cancelBtn.hidden = true;
  actionRow.append(runBtn, cancelBtn);
  panel.appendChild(actionRow);

  let chapterWrap = null;
  let chapterBtn = null;
  let chapterStatus = null;
  if (isAudio) {
    chapterWrap = document.createElement('div');
    chapterWrap.className = 'media-export-chapter-card';
    const chapterCopy = document.createElement('div');
    chapterCopy.className = 'media-export-chapter-copy';
    const chapterTitle = document.createElement('div');
    chapterTitle.className = 'media-export-chapter-title';
    chapterTitle.textContent = 'Chapter ACX ZIP';
    const chapterDetail = document.createElement('div');
    chapterDetail.className = 'media-export-chapter-detail';
    chapterDetail.textContent = 'Exports one ACX MP3 per chapter and packages them as a ZIP.';
    chapterCopy.append(chapterTitle, chapterDetail);
    chapterBtn = mkBtn('Export chapter ACX ZIP', 'media-ed-run media-export-chapter-run');
    chapterStatus = document.createElement('div');
    chapterStatus.className = 'media-export-chapter-status';
    chapterWrap.append(chapterCopy, chapterBtn, chapterStatus);
    panel.appendChild(chapterWrap);
  }

  // Cross-clip transitions are now WIRED (P6 video timeline / P5 audio mixer). This line is
  // no longer a "coming" stub — it points the user at the panel that does the cross-clip work.
  // (For video: dissolve/xfade + mux-music live in the Video timeline; for audio: the
  // multi-track mixer crossfades clips on its lanes.)
  const stub = document.createElement('p');
  stub.className = 'media-export-stub media-ed-note';
  if (kind === 'video') {
    stub.append(document.createTextNode('Dissolve / crossfade (xfade) between two clips lives in the '));
    const lnk = document.createElement('button');
    lnk.type = 'button';
    lnk.className = 'media-tl-open';
    lnk.textContent = 'Video timeline';
    lnk.addEventListener('click', () => {
      const wrap = panel.closest('.media-doc')?.querySelector('.media-tl-panel');
      const toggle = wrap?.previousElementSibling;
      if (toggle && wrap?.hidden) toggle.click();
      wrap?.scrollIntoView({ behavior: 'smooth' });
    });
    stub.append(lnk, document.createTextNode(' (below) — drop a second clip there to bake it.'));
  } else {
    stub.textContent = 'Crossfade (acrossfade) between two clips lives in the Multi-track mixer — add a second lane there to crossfade.';
  }
  panel.appendChild(stub);

  // ── Progress + result ──
  const progressArea = document.createElement('div');
  progressArea.className = 'media-ed-progress-area';
  progressArea.hidden = true;
  const progressBar = document.createElement('progress');
  progressBar.max = 100;
  progressBar.value = 0;
  progressBar.className = 'media-ed-progress';
  const progressPct = document.createElement('span');
  progressPct.className = 'media-ed-pct';
  progressPct.textContent = '0%';
  const progressMsg = document.createElement('span');
  progressMsg.className = 'media-ed-msg';
  progressMsg.textContent = 'Working…';
  progressArea.append(progressBar, progressPct, progressMsg);
  panel.appendChild(progressArea);

  const resultArea = document.createElement('div');
  resultArea.className = 'media-ed-result';
  resultArea.hidden = true;
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
    const fades = collectFades();
    const eqSettings = resolveExportAudioSettings(p, s);
    renderStageCompare(stageCompare, summarizeMasteringStages(eqSettings, p));
    const chain = p.acxChain
      ? buildAcxFilterChain(acxChainOptions(p))
      : buildAudioFilterChain(eqSettings, fades);
    if (isAudio) {
      const liveBits = describeLiveSummary(s, fades);
      const targetBits = describePresetTarget(p);
      const presetName = formatPresetName(preset);
      const processLabel = p.acxChain ? 'dedicated ACX chain' : (liveBits.join(', ') || 'flat');
      summary.textContent = `Profile ${presetName}: live chain = ${processLabel}
Output = ${targetBits}
Provenance = -af "${chain || 'none'}"`;
    } else {
      const bits = [];
      const desc = describeParams(p);
      if (desc) bits.push(desc);
      const active = (s.gains || []).filter((g) => Math.abs(g) >= 0.1).length;
      if (active) bits.push(active + ' EQ band' + (active === 1 ? '' : 's'));
      if (s.hpf > 20) bits.push('HPF ' + Math.round(s.hpf) + 'Hz');
      if (s.lpf < 20000) bits.push('LPF ' + Math.round(s.lpf) + 'Hz');
      const dyn = describeDynamics(s.dynamics);
      if (dyn) bits.push(dyn);
      if (fades.fadeIn > 0) bits.push('fade-in ' + fades.fadeIn + 's');
      if (fades.fadeOut > 0) bits.push('fade-out ' + fades.fadeOut + 's');
      const label = preset.id === 'custom' ? 'Custom' : preset.label.split(' (')[0];
      summary.textContent = 'Will bake: ' + label
        + (bits.length ? ' — ' + bits.join(', ') : '')
        + (chain ? '  —  -af "' + chain + '"' : '');
    }
  }

  fadeInInput.addEventListener('input', refreshSummary);
  fadeOutInput.addEventListener('input', refreshSummary);
  presetSel.addEventListener('change', () => {
    syncAdvancedVisibility();
    refreshSummary();
  });
  advanced.onChange(refreshSummary);

  function collectFades() {
    return {
      fadeIn: Math.max(0, parseFloat(fadeInInput.value) || 0),
      fadeOut: Math.max(0, parseFloat(fadeOutInput.value) || 0),
      duration: isFinite(mediaEl.duration) ? mediaEl.duration : 0,
    };
  }

  function setRunning(running) {
    runBtn.disabled = running;
    if (subtitleBurnBtn) subtitleBurnBtn.disabled = running;
    runBtn.hidden = running;
    cancelBtn.hidden = !running;
    progressArea.hidden = !running;
    if (running) {
      progressBar.value = 0;
      progressPct.textContent = '0%';
      progressMsg.textContent = 'Loading ffmpeg…';
    }
  }

  function showResult(url, filename, sizeBytes) {
    resultArea.innerHTML = '';
    const msg = document.createElement('span');
    msg.className = 'media-ed-done';
    msg.textContent = 'Done — ' + (sizeBytes / 1048576).toFixed(1) + ' MB';
    const dl = document.createElement('a');
    dl.href = url;
    dl.download = filename;
    dl.className = 'media-tx-download';
    dl.textContent = 'Download ' + filename;
    resultArea.append(msg, dl);
    resultArea.hidden = false;
    // Auto-trigger the download so the export is one click (the link stays for re-download).
    dl.click();
  }

  function chaptersReady() {
    return chapters.length > 0
      && chapters.every((chapter) => Number.isFinite(Number(chapter.start))
        && Number.isFinite(Number(chapter.end))
        && Number(chapter.end) > Number(chapter.start));
  }

  function syncChapterExport() {
    if (!chapterWrap || !chapterBtn || !chapterStatus) return;
    const count = chapters.length;
    chapterWrap.hidden = count === 0;
    if (!count) return;
    const ready = chaptersReady();
    chapterBtn.disabled = !ready;
    chapterStatus.textContent = ready
      ? `${count} chapter${count === 1 ? '' : 's'} ready; output is mono 44.1 kHz MP3 192k CBR.`
      : 'Waiting for media duration before chapter ZIP export.';
  }

  function showError(msg) {
    resultArea.innerHTML = '';
    const lines = String(msg).split('\n');
    const err = document.createElement('span');
    err.className = 'media-ed-error';
    err.textContent = 'Error: ' + lines[0];
    resultArea.appendChild(err);
    const detail = lines.slice(1).join('\n').trim();
    if (detail) {
      const pre = document.createElement('pre');
      pre.className = 'media-ed-error-detail';
      pre.textContent = detail;
      resultArea.append(pre);
    }
    resultArea.hidden = false;
  }

  async function run() {
    setRunning(true);
    resultArea.hidden = true;
    resultArea.innerHTML = '';
    try {
      const ff = await loadFfmpeg(({ ratio }) => {
        const pct = Math.round((ratio || 0) * 100);
        progressBar.value = pct;
        progressPct.textContent = pct + '%';
        progressMsg.textContent = 'Encoding…';
      });
      ffInstance = ff;
      progressMsg.textContent = 'Encoding…';

      const settings = readLiveSettings(mediaEl) || {};
      const fades = collectFades();
      const p = resolveParams();
      const chainSettings = resolveExportAudioSettings(p, settings);

      let result;
      if (p.kind === 'video' && p.video) {
        result = await runOperation(ff, 'webvideo', {
          settings: chainSettings, fades, video: p.video, container: p.container,
          bitrate: p.bitrate, sampleRate: p.sampleRate, channels: p.channels,
          lufsTarget: p.lufsTarget, truePeak: p.truePeak,
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
    resultArea.hidden = true;
    resultArea.innerHTML = '';
    try {
      const ff = await loadFfmpeg(({ ratio }) => {
        const pct = Math.round((ratio || 0) * 100);
        progressBar.value = pct;
        progressPct.textContent = pct + '%';
        progressMsg.textContent = 'Burning subtitles…';
      });
      ffInstance = ff;
      progressMsg.textContent = 'Burning subtitles…';
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
    if (!chaptersReady()) {
      syncChapterExport();
      return;
    }
    setRunning(true);
    if (chapterBtn) chapterBtn.disabled = true;
    resultArea.hidden = true;
    resultArea.innerHTML = '';
    try {
      const p = resolveExportParams(presetById('acx-mp3'), {}, 'mp3');
      let currentChapter = 0;
      const ff = await loadFfmpeg(({ ratio }) => {
        const pct = Math.round((((currentChapter + (ratio || 0)) / Math.max(1, chapters.length))) * 100);
        progressBar.value = Math.min(100, pct);
        progressPct.textContent = progressBar.value + '%';
        progressMsg.textContent = `Encoding chapter ${Math.min(currentChapter + 1, chapters.length)} / ${chapters.length}…`;
      });
      ffInstance = ff;
      const files = await runAcxChapterExports(ff, intake, chapters, {
        ...acxChainOptions(p),
        onChapterStart(index) {
          currentChapter = index;
          progressMsg.textContent = `Encoding chapter ${index + 1} / ${chapters.length}…`;
        },
      });
      progressMsg.textContent = 'Packaging ZIP…';
      const JSZip = await loadGlobal(vendor('jszip/jszip.min.js'), 'JSZip');
      const zip = new JSZip();
      files.forEach((file) => {
        zip.file(chapterFilename(intake.filename || 'audio', chapters[file.index], file.index), file.bytes);
      });
      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }, (meta) => {
        const pct = Math.round(95 + ((meta.percent || 0) * 0.05));
        progressBar.value = Math.min(100, pct);
        progressPct.textContent = progressBar.value + '%';
      });
      const url = URL.createObjectURL(blob);
      blobUrls.push(url);
      showResult(url, zipFilename(intake.filename), blob.size);
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
    setRunning(false);
    runBtn.hidden = false;
    cancelBtn.hidden = true;
    progressMsg.textContent = 'Cancelled.';
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
