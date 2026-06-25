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

import { getGraph } from './audio-graph.js';
import { loadFfmpeg, runOperation, buildAudioFilterChain, buildAcxFilterChain } from './transcoder.js';
import { describeDynamics } from './audio-filters.js';
import {
  EXPORT_PRESETS, presetById, resolveExportParams, resolveExportAudioSettings, describeParams, buildAdvancedOverrides,
} from './export-presets.js';

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
  if (preset.lufsTarget !== null && preset.lufsTarget !== undefined) bits.push(`${preset.lufsTarget} LUFS`);
  if (preset.truePeak !== null && preset.truePeak !== undefined) bits.push(`TP ${preset.truePeak} dBTP`);
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

// Read the live studio settings off the shared graph for `mediaEl`. Returns null when
// no WebAudio graph exists (e.g. WebAudio unavailable) → caller falls back to a flat bake.
function readLiveSettings(mediaEl) {
  const graph = getGraph(mediaEl);
  return graph ? graph.getSettings() : null;
}

// Build the Export + Fades panel. `kind` is 'audio' | 'video'.
// `intake` is the file descriptor; `mediaEl` the native element (for live settings + duration).
// Returns { el, revoke() }.
export function buildExportPanel(intake, mediaEl, kind) {
  const blobUrls = [];
  let ffInstance = null;
  const isAudio = kind === 'audio';

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
    const workflowPresetIds = ['podcast-mp3', 'acx-mp3', 'custom'];
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
  const actionRow = document.createElement('div');
  actionRow.className = 'media-ed-actions';
  const runBtn = mkBtn(kind === 'video' ? 'Export video' : 'Export processed audio', 'media-ed-run media-export-run');
  const cancelBtn = mkBtn('Cancel', 'media-ed-cancel');
  cancelBtn.hidden = true;
  actionRow.append(runBtn, cancelBtn);
  panel.appendChild(actionRow);

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
      if (err?.message?.includes('ffmpeg exit')) showError('Operation cancelled.');
      else showError(err.message || String(err));
    } finally {
      ffInstance = null;
      setRunning(false);
      runBtn.hidden = false;
      cancelBtn.hidden = true;
    }
  }

  async function cancel() {
    if (ffInstance) {
      try { ffInstance.exit(); } catch { /* ignore */ }
      ffInstance = null;
    }
    setRunning(false);
    runBtn.hidden = false;
    cancelBtn.hidden = true;
    progressMsg.textContent = 'Cancelled.';
  }

  runBtn.addEventListener('click', run);
  cancelBtn.addEventListener('click', cancel);

  // Keep the summary fresh when the panel is shown (EQ may have changed since build).
  panel.addEventListener('pointerenter', refreshSummary);
  syncAdvancedVisibility();
  refreshSummary();

  return {
    el: panel,
    revoke() {
      for (const u of blobUrls) {
        try { URL.revokeObjectURL(u); } catch { /* ignore */ }
      }
      blobUrls.length = 0;
    },
  };
}
