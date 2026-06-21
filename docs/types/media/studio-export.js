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

  // ── Audio-only: output format + the live-EQ summary ──
  let formatSel = null;
  let summary = null;
  if (kind === 'audio') {
    const fmtRow = document.createElement('div');
    fmtRow.className = 'media-ed-radio-row';
    formatSel = document.createElement('select');
    formatSel.className = 'sp-preset-sel media-export-fmt';
    [['source', 'Match source (MP3)'], ['mp3', 'MP3'], ['wav', 'WAV (lossless)'], ['m4a', 'M4A / AAC'], ['ogg', 'OGG / Vorbis']]
      .forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; formatSel.append(o); });
    fmtRow.append(document.createTextNode('Format '), formatSel);
    panel.appendChild(fmtRow);

    summary = document.createElement('div');
    summary.className = 'media-export-summary';
    panel.appendChild(summary);
  }

  // ── Action row ──
  const actionRow = document.createElement('div');
  actionRow.className = 'media-ed-actions';
  const runBtn = mkBtn(kind === 'video' ? 'Render fade to black' : 'Export processed audio', 'media-ed-run media-export-run');
  const cancelBtn = mkBtn('Cancel', 'media-ed-cancel');
  cancelBtn.hidden = true;
  actionRow.append(runBtn, cancelBtn);
  panel.appendChild(actionRow);

  // Cross-clip transition stub (crossfade / xfade need the multi-track timeline = P5/P6).
  const stub = document.createElement('p');
  stub.className = 'media-ed-warn media-export-stub';
  stub.textContent = kind === 'video'
    ? 'Dissolve / crossfade (xfade) between two clips needs the multi-track timeline — coming.'
    : 'Crossfade (acrossfade) between two clips needs the multi-track timeline — coming.';
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

  // Refresh the live-EQ summary so the user sees exactly what will be baked.
  function refreshSummary() {
    if (!summary) return;
    const s = readLiveSettings(mediaEl);
    if (!s) { summary.textContent = 'Live EQ unavailable — export will copy the source audio.'; return; }
    const fades = collectFades();
    const chain = buildAudioFilterChain(s, fades);
    const active = (s.gains || []).filter((g) => Math.abs(g) >= 0.1).length;
    const bits = [];
    bits.push(active + ' EQ band' + (active === 1 ? '' : 's'));
    if (s.hpf > 20) bits.push('HPF ' + Math.round(s.hpf) + 'Hz');
    if (s.lpf < 20000) bits.push('LPF ' + Math.round(s.lpf) + 'Hz');
    if (s.lufsTarget !== null && s.lufsTarget !== undefined) bits.push('normalize ' + s.lufsTarget + ' LUFS');
    if (fades.fadeIn > 0) bits.push('fade-in ' + fades.fadeIn + 's');
    if (fades.fadeOut > 0) bits.push('fade-out ' + fades.fadeOut + 's');
    summary.textContent = chain
      ? 'Will bake: ' + bits.join(', ') + '  —  -af "' + chain + '"'
      : 'No EQ/normalize/fade active — export will be a clean re-encode of the source.';
  }
  fadeInInput.addEventListener('input', refreshSummary);
  fadeOutInput.addEventListener('input', refreshSummary);

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

      let result;
      if (kind === 'video') {
        const fades = collectFades();
        if (!(fades.fadeIn > 0) && !(fades.fadeOut > 0)) { showError('Set a fade-in and/or fade-out duration first.'); setRunning(false); runBtn.hidden = false; return; }
        result = await runOperation(ff, 'videofade', fades, intake);
      } else {
        const settings = readLiveSettings(mediaEl) || {};
        const fades = collectFades();
        let format = formatSel.value;
        if (format === 'source') {
          const ext = (intake.filename || '').split('.').pop().toLowerCase();
          format = ['mp3', 'wav', 'm4a', 'ogg'].includes(ext) ? ext : 'mp3';
        }
        result = await runOperation(ff, 'bakeAudio', { settings, fades, format }, intake);
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
  refreshSummary();

  return {
    el: panel,
    revoke() {
      for (const u of blobUrls) { try { URL.revokeObjectURL(u); } catch { /* ignore */ } }
      blobUrls.length = 0;
    },
  };
}
