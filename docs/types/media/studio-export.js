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
import { loadFfmpeg, runOperation, buildAudioFilterChain } from './transcoder.js';
import { describeDynamics } from './audio-filters.js';
import {
  EXPORT_PRESETS, presetById, resolveExportParams, describeParams, buildAdvancedOverrides,
} from './export-presets.js';

function mkBtn(text, cls) {
  const b = document.createElement('button');
  b.type = 'button'; b.textContent = text; b.className = cls || 'media-ed-btn';
  return b;
}

function numInput(value, cls) {
  const el = document.createElement('input');
  el.type = 'number'; el.min = '0'; el.max = '60'; el.step = '0.5';
  el.value = String(value); el.className = cls || 'media-ed-fade-input';
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
export function buildExportPanel(intake, mediaEl, kind) {
  const blobUrls = [];
  let ffInstance = null;

  const panel = document.createElement('div');
  panel.className = 'media-ed-panel media-export-panel';

  const header = document.createElement('div');
  header.className = 'media-ed-header';
  header.textContent = kind === 'video' ? 'Export & Fades (video)' : 'Export processed audio';
  panel.appendChild(header);

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

  // ── P2: export-preset picker + advanced overrides + the live-EQ summary ──
  // Presets relevant to this source: audio sources get the audio presets; video sources
  // also get the video presets (MP4 720p / WebM). "Custom" reveals the override controls.
  const presetSel = document.createElement('select');
  presetSel.className = 'sp-preset-sel media-export-preset';
  EXPORT_PRESETS
    .filter((p) => p.kind !== 'video' || kind === 'video')
    .forEach((p) => { const o = document.createElement('option'); o.value = p.id; o.textContent = p.label; presetSel.append(o); });
  presetSel.value = kind === 'video' ? 'web-mp4-720p' : 'podcast-mp3';

  const presetRow = document.createElement('div');
  presetRow.className = 'media-ed-radio-row';
  presetRow.append(document.createTextNode('Preset '), presetSel);
  panel.appendChild(presetRow);

  // Advanced overrides — shown only when "Custom" is selected (always built; just hidden).
  const advanced = buildAdvancedOverrides();
  panel.appendChild(advanced.el);

  const summary = document.createElement('div');
  summary.className = 'media-export-summary';
  panel.appendChild(summary);

  function currentPreset() { return presetById(presetSel.value); }
  function syncAdvancedVisibility() {
    advanced.el.hidden = currentPreset().id !== 'custom';
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
    lnk.type = 'button'; lnk.className = 'media-tl-open'; lnk.textContent = 'Video timeline';
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
  progressArea.className = 'media-ed-progress-area'; progressArea.hidden = true;
  const progressBar = document.createElement('progress');
  progressBar.max = 100; progressBar.value = 0; progressBar.className = 'media-ed-progress';
  const progressPct = document.createElement('span'); progressPct.className = 'media-ed-pct'; progressPct.textContent = '0%';
  const progressMsg = document.createElement('span'); progressMsg.className = 'media-ed-msg'; progressMsg.textContent = 'Working…';
  progressArea.append(progressBar, progressPct, progressMsg);
  panel.appendChild(progressArea);

  const resultArea = document.createElement('div');
  resultArea.className = 'media-ed-result'; resultArea.hidden = true;
  panel.appendChild(resultArea);

  // Resolve the chosen preset + (when Custom) the override controls into concrete
  // export params, with the preset's loudness target merged into the live EQ settings.
  function resolveParams() {
    const ext = (intake.filename || '').split('.').pop().toLowerCase();
    return resolveExportParams(currentPreset(), advanced.read(), ext);
  }

  // Refresh the summary so the user sees exactly what will be baked — preset/overrides
  // (container/bitrate/sr/channels/loudness) ON TOP of the live-EQ `-af` chain.
  function refreshSummary() {
    if (!summary) return;
    const preset = currentPreset();
    const p = resolveParams();
    const s = readLiveSettings(mediaEl) || {};
    const fades = collectFades();
    // Merge the preset's loudness target so the chain preview matches what bakeAudio emits.
    const eqSettings = (p.lufsTarget !== null && p.lufsTarget !== undefined)
      ? { ...s, lufsTarget: p.lufsTarget, truePeak: p.truePeak } : s;
    const chain = buildAudioFilterChain(eqSettings, fades);
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
  fadeInInput.addEventListener('input', refreshSummary);
  fadeOutInput.addEventListener('input', refreshSummary);
  presetSel.addEventListener('change', () => { syncAdvancedVisibility(); refreshSummary(); });
  advanced.onChange(refreshSummary);

  function collectFades() {
    return {
      fadeIn: Math.max(0, parseFloat(fadeInInput.value) || 0),
      fadeOut: Math.max(0, parseFloat(fadeOutInput.value) || 0),
      duration: isFinite(mediaEl.duration) ? mediaEl.duration : 0,
    };
  }

  function setRunning(running) {
    runBtn.disabled = running; runBtn.hidden = running;
    cancelBtn.hidden = !running; progressArea.hidden = !running;
    if (running) { progressBar.value = 0; progressPct.textContent = '0%'; progressMsg.textContent = 'Loading ffmpeg…'; }
  }

  function showResult(url, filename, sizeBytes) {
    resultArea.innerHTML = '';
    const msg = document.createElement('span');
    msg.className = 'media-ed-done';
    msg.textContent = 'Done — ' + (sizeBytes / 1048576).toFixed(1) + ' MB';
    const dl = document.createElement('a');
    dl.href = url; dl.download = filename; dl.className = 'media-tx-download';
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
    err.className = 'media-ed-error'; err.textContent = 'Error: ' + lines[0];
    resultArea.appendChild(err);
    const detail = lines.slice(1).join('\n').trim();
    if (detail) { const pre = document.createElement('pre'); pre.className = 'media-ed-error-detail'; pre.textContent = detail; resultArea.appendChild(pre); }
    resultArea.hidden = false;
  }

  async function run() {
    setRunning(true);
    resultArea.hidden = true; resultArea.innerHTML = '';
    try {
      const ff = await loadFfmpeg(({ ratio }) => {
        const pct = Math.round((ratio || 0) * 100);
        progressBar.value = pct; progressPct.textContent = pct + '%'; progressMsg.textContent = 'Encoding…';
      });
      ffInstance = ff;
      progressMsg.textContent = 'Encoding…';

      const settings = readLiveSettings(mediaEl) || {};
      const fades = collectFades();
      const p = resolveParams();

      let result;
      if (p.kind === 'video' && p.video) {
        // P2: web-video preset (MP4 720p / WebM) — re-encode video + audio with the
        // live-EQ chain + fades applied to the audio track.
        result = await runOperation(ff, 'webvideo', {
          settings, fades, video: p.video, container: p.container,
          bitrate: p.bitrate, sampleRate: p.sampleRate, channels: p.channels,
          lufsTarget: p.lufsTarget, truePeak: p.truePeak,
        }, intake);
      } else {
        result = await runOperation(ff, 'bakeAudio', {
          settings, fades, container: p.container, format: p.container,
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
      runBtn.hidden = false; cancelBtn.hidden = true;
    }
  }

  async function cancel() {
    if (ffInstance) { try { ffInstance.exit(); } catch { /* ignore */ } ffInstance = null; }
    setRunning(false); runBtn.hidden = false; cancelBtn.hidden = true;
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
      for (const u of blobUrls) { try { URL.revokeObjectURL(u); } catch { /* ignore */ } }
      blobUrls.length = 0;
    },
  };
}
