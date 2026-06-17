// Media Editor panel — expands the transcoder panel into a full operation suite.
// Imported by renderer.js when ffmpeg is enabled. Returns a {el, revoke()} object.
// The panel is always appended to the host; it starts hidden and reveals itself when
// the user opens it (or when the format likely needs conversion).
//
// Phase 2 ops: Trim, Extract Audio, Mute, Screenshot, Downscale, Volume, Speed, Convert WebM
// Phase 3 ops: Loudness Normalize, GIF Export, WebP Export, Thumbnail Strip, Remove Metadata,
//              Embed Subtitles, Concatenate, Replace Audio
// All ffmpeg args are delegated to runOperation() in transcoder.js.

import { loadFfmpeg, runOperation } from './transcoder.js';
import {
  ADVANCED_SINGLE_OPS, MULTI_FILE_OPS, MULTI_FILE_OP_IDS,
  buildAdvancedInputsFor, collectAdvancedParams, buildSecondaryDropZone,
} from './editor-advanced.js';

// Format seconds → HH:MM:SS
function fmtTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

// Validate and normalise an HH:MM:SS string; returns null on bad input.
function parseTimestamp(s) {
  const m = (s || '').trim().match(/^(\d{2}):(\d{2}):(\d{2})$/);
  if (!m) return null;
  return m[1] + ':' + m[2] + ':' + m[3];
}

function makeInput(placeholder, cls) {
  const el = document.createElement('input');
  el.type = 'text';
  el.placeholder = placeholder;
  el.className = cls || 'media-ed-ts';
  el.pattern = '[0-9]{2}:[0-9]{2}:[0-9]{2}';
  return el;
}

function makeBtn(text, cls) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = text;
  b.className = cls || 'media-ed-btn';
  return b;
}

const OPERATIONS = [
  { id: 'trim',        label: 'Trim' },
  { id: 'audio',       label: 'Extract Audio' },
  { id: 'mute',        label: 'Mute Video' },
  { id: 'screenshot',  label: 'Screenshot' },
  { id: 'downscale',   label: 'Downscale' },
  { id: 'volume',      label: 'Volume' },
  { id: 'speed',       label: 'Speed' },
  { id: 'webm',        label: 'Convert WebM' },
  // Phase 3 — single-file
  ...ADVANCED_SINGLE_OPS,
  // Phase 3 — multi-file
  ...MULTI_FILE_OPS,
];

// Build contextual inputs for each operation. Returns a DOM element (or null if none needed).
// `mediaEl` is the <video>/<audio> element (for "use current position" buttons).
function buildInputsFor(opId, mediaEl) {
  const wrap = document.createElement('div');
  wrap.className = 'media-ed-ctx';

  if (opId === 'trim') {
    const startIn = makeInput('HH:MM:SS');
    const endIn   = makeInput('HH:MM:SS');
    const useStart = makeBtn('Use current', 'media-ed-use-pos');
    const useEnd   = makeBtn('Use current', 'media-ed-use-pos');
    useStart.addEventListener('click', () => { if (mediaEl) startIn.value = fmtTime(mediaEl.currentTime); });
    useEnd.addEventListener('click',   () => { if (mediaEl) endIn.value   = fmtTime(mediaEl.currentTime); });
    const preciseLabel = document.createElement('label');
    preciseLabel.className = 'media-ed-precise';
    const preciseChk = document.createElement('input');
    preciseChk.type = 'checkbox';
    preciseChk.name = 'precise';
    preciseLabel.append(preciseChk, document.createTextNode(' Precise (re-encode, slower)'));
    const startGroup = document.createElement('div');
    startGroup.className = 'media-ed-ts-group';
    startGroup.append(document.createTextNode('Start '), startIn, useStart);
    const endGroup = document.createElement('div');
    endGroup.className = 'media-ed-ts-group';
    endGroup.append(document.createTextNode('End '), endIn, useEnd);
    wrap.append(startGroup, endGroup, preciseLabel);
    wrap.dataset.op = 'trim';
    return wrap;
  }

  if (opId === 'audio') {
    const mp3Label = document.createElement('label');
    const mp3Radio = document.createElement('input');
    mp3Radio.type = 'radio'; mp3Radio.name = 'audio-fmt'; mp3Radio.value = 'mp3'; mp3Radio.checked = true;
    mp3Label.append(mp3Radio, document.createTextNode(' MP3'));
    const oggLabel = document.createElement('label');
    const oggRadio = document.createElement('input');
    oggRadio.type = 'radio'; oggRadio.name = 'audio-fmt'; oggRadio.value = 'ogg';
    oggLabel.append(oggRadio, document.createTextNode(' OGG'));
    const row = document.createElement('div');
    row.className = 'media-ed-radio-row';
    row.append(document.createTextNode('Format: '), mp3Label, oggLabel);
    wrap.append(row);
    wrap.dataset.op = 'audio';
    return wrap;
  }

  if (opId === 'screenshot') {
    const tsIn = makeInput('HH:MM:SS');
    const usePos = makeBtn('Use current', 'media-ed-use-pos');
    usePos.addEventListener('click', () => { if (mediaEl) tsIn.value = fmtTime(mediaEl.currentTime); });
    const row = document.createElement('div');
    row.className = 'media-ed-ts-group';
    row.append(document.createTextNode('Timestamp '), tsIn, usePos);
    wrap.append(row);
    wrap.dataset.op = 'screenshot';
    return wrap;
  }

  if (opId === 'downscale') {
    const resolutions = [['1280:720', '720p'], ['854:480', '480p'], ['640:360', '360p']];
    const row = document.createElement('div');
    row.className = 'media-ed-radio-row';
    row.append(document.createTextNode('Resolution: '));
    resolutions.forEach(([val, label], i) => {
      const lbl = document.createElement('label');
      const radio = document.createElement('input');
      radio.type = 'radio'; radio.name = 'res'; radio.value = val;
      if (i === 0) radio.checked = true;
      lbl.append(radio, document.createTextNode(' ' + label));
      row.append(lbl);
    });
    wrap.append(row);
    wrap.dataset.op = 'downscale';
    return wrap;
  }

  if (opId === 'volume') {
    const slider = document.createElement('input');
    slider.type = 'range'; slider.min = '0.1'; slider.max = '3'; slider.step = '0.1'; slider.value = '1';
    slider.className = 'media-ed-vol-slider';
    const valDisplay = document.createElement('span');
    valDisplay.className = 'media-ed-vol-val';
    valDisplay.textContent = '1.0x';
    slider.addEventListener('input', () => { valDisplay.textContent = parseFloat(slider.value).toFixed(1) + 'x'; });
    const row = document.createElement('div');
    row.className = 'media-ed-radio-row';
    row.append(document.createTextNode('Volume: '), slider, valDisplay);
    wrap.append(row);
    wrap.dataset.op = 'volume';
    return wrap;
  }

  if (opId === 'speed') {
    const row = document.createElement('div');
    row.className = 'media-ed-radio-row';
    row.append(document.createTextNode('Speed: '));
    [['0.5', '0.5x'], ['2', '2x']].forEach(([val, label], i) => {
      const lbl = document.createElement('label');
      const radio = document.createElement('input');
      radio.type = 'radio'; radio.name = 'speed'; radio.value = val;
      if (i === 0) radio.checked = true;
      lbl.append(radio, document.createTextNode(' ' + label));
      row.append(lbl);
    });
    wrap.append(row);
    wrap.dataset.op = 'speed';
    return wrap;
  }

  // mute, webm: no contextual inputs
  // Phase 3 single-file ops (gif, webp need timestamp inputs; rest need nothing)
  // Multi-file ops: handled via secondary drop zone in buildEditorPanel
  if (!MULTI_FILE_OP_IDS.has(opId)) {
    return buildAdvancedInputsFor(opId, mediaEl);
  }
  return null;
}

// Gather operation params from the contextual inputs element.
function collectParams(ctxEl) {
  if (!ctxEl) return {};
  const op = ctxEl.dataset.op;
  if (op === 'trim') {
    const inputs = ctxEl.querySelectorAll('input[type="text"]');
    const precise = ctxEl.querySelector('input[name="precise"]');
    return { start: inputs[0]?.value || '', end: inputs[1]?.value || '', precise: precise?.checked || false };
  }
  if (op === 'audio') {
    const checked = ctxEl.querySelector('input[name="audio-fmt"]:checked');
    return { format: checked?.value || 'mp3' };
  }
  if (op === 'screenshot') {
    const ts = ctxEl.querySelector('input[type="text"]');
    return { ts: ts?.value || '' };
  }
  if (op === 'downscale') {
    const checked = ctxEl.querySelector('input[name="res"]:checked');
    return { res: checked?.value || '1280:720' };
  }
  if (op === 'volume') {
    const slider = ctxEl.querySelector('input[type="range"]');
    return { level: slider?.value || '1' };
  }
  if (op === 'speed') {
    const checked = ctxEl.querySelector('input[name="speed"]:checked');
    return { rate: checked?.value || '0.5' };
  }
  // Phase 3 advanced ops (gif, webp have timestamp inputs)
  return collectAdvancedParams(ctxEl);
}

// Build and return the full editor panel element. `mediaEl` is the native <video>/<audio>.
// `intake` is the file descriptor from the renderer. `onNewUrl` is called with (blobUrl, filename)
// after a successful operation so the caller can update the player.
export function buildEditorPanel(intake, mediaEl, onNewUrl) {
  const baseName = (intake.filename || 'output').replace(/\.[^.]+$/, '');
  let currentOp = null;
  let currentCtx = null;
  let ffInstance = null;   // held so we can call exit() on cancel
  const blobUrls = [];     // all blob URLs created here — revoked by revoke()

  // Root container
  const panel = document.createElement('div');
  panel.className = 'media-ed-panel';

  // Header
  const header = document.createElement('div');
  header.className = 'media-ed-header';
  header.textContent = 'Media Editor';

  // Operation buttons grid
  const opGrid = document.createElement('div');
  opGrid.className = 'media-ed-ops';
  const opBtns = {};
  for (const { id, label } of OPERATIONS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'media-ed-op';
    b.textContent = label;
    b.dataset.op = id;
    b.addEventListener('click', () => selectOp(id));
    opBtns[id] = b;
    opGrid.appendChild(b);
  }

  // Contextual inputs area
  const ctxArea = document.createElement('div');
  ctxArea.className = 'media-ed-ctx-area';
  ctxArea.hidden = true;

  // Secondary file drop zone (multi-file ops)
  const secondaryArea = document.createElement('div');
  secondaryArea.className = 'media-ed-secondary-area';
  secondaryArea.hidden = true;
  let secondaryDropZone = null;   // { el, getFile() } — rebuilt when op changes

  // Divider
  const divider = document.createElement('hr');
  divider.className = 'media-ed-divider';

  // Run / Cancel row
  const actionRow = document.createElement('div');
  actionRow.className = 'media-ed-actions';
  const runBtn  = makeBtn('Run', 'media-ed-run');
  const cancelBtn = makeBtn('Cancel', 'media-ed-cancel');
  cancelBtn.hidden = true;
  actionRow.append(runBtn, cancelBtn);

  // Progress area
  const progressArea = document.createElement('div');
  progressArea.className = 'media-ed-progress-area';
  progressArea.hidden = true;
  const progressBar  = document.createElement('progress');
  progressBar.max = 100; progressBar.value = 0; progressBar.className = 'media-ed-progress';
  const progressPct  = document.createElement('span');
  progressPct.className = 'media-ed-pct';
  progressPct.textContent = '0%';
  const progressMsg  = document.createElement('span');
  progressMsg.className = 'media-ed-msg';
  progressMsg.textContent = 'Working…';
  progressArea.append(progressBar, progressPct, progressMsg);

  // Result area (download link)
  const resultArea = document.createElement('div');
  resultArea.className = 'media-ed-result';
  resultArea.hidden = true;

  panel.append(header, opGrid, ctxArea, secondaryArea, divider, actionRow, progressArea, resultArea);

  function selectOp(id) {
    currentOp = id;
    // Update button active states
    for (const [oid, btn] of Object.entries(opBtns)) {
      btn.classList.toggle('active', oid === id);
    }
    // Build contextual inputs (single-file ops)
    ctxArea.innerHTML = '';
    currentCtx = buildInputsFor(id, mediaEl);
    if (currentCtx) {
      ctxArea.appendChild(currentCtx);
      ctxArea.hidden = false;
    } else {
      ctxArea.hidden = true;
    }
    // Build secondary drop zone for multi-file ops
    secondaryArea.innerHTML = '';
    secondaryDropZone = null;
    if (MULTI_FILE_OP_IDS.has(id)) {
      const opDef = MULTI_FILE_OPS.find((o) => o.id === id);
      if (opDef) {
        secondaryDropZone = buildSecondaryDropZone(opDef, () => { /* file selected */ });
        secondaryArea.appendChild(secondaryDropZone.el);
        secondaryArea.hidden = false;
      }
    } else {
      secondaryArea.hidden = true;
    }
    // Reset result area
    resultArea.hidden = true;
    resultArea.innerHTML = '';
    // Reset progress
    progressArea.hidden = true;
    progressBar.value = 0;
    progressPct.textContent = '0%';
    progressMsg.textContent = 'Working…';
    // Show run button
    runBtn.hidden = false;
    cancelBtn.hidden = true;
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
    const sizeMB = (sizeBytes / 1048576).toFixed(1);
    resultArea.innerHTML = '';
    const msg = document.createElement('span');
    msg.className = 'media-ed-done';
    msg.textContent = 'Done — ' + sizeMB + ' MB';
    const dlLink = document.createElement('a');
    dlLink.href = url;
    dlLink.download = filename;
    dlLink.className = 'media-tx-download';
    dlLink.textContent = 'Download ' + filename;
    resultArea.append(msg, dlLink);
    resultArea.hidden = false;
  }

  function showError(msg) {
    resultArea.innerHTML = '';
    const err = document.createElement('span');
    err.className = 'media-ed-error';
    err.textContent = 'Error: ' + msg;
    resultArea.appendChild(err);
    resultArea.hidden = false;
  }

  // Shows error with raw ffmpeg stderr in a <pre> for debugging (Phase 3).
  function showErrorWithDetail(msg) {
    resultArea.innerHTML = '';
    const lines = msg.split('\n');
    const headline = lines[0];
    const detail   = lines.slice(1).join('\n').trim();
    const err = document.createElement('span');
    err.className = 'media-ed-error';
    err.textContent = 'Error: ' + headline;
    resultArea.appendChild(err);
    if (detail) {
      const pre = document.createElement('pre');
      pre.className = 'media-ed-error-detail';
      pre.textContent = detail;
      resultArea.appendChild(pre);
    }
    resultArea.hidden = false;
  }

  async function run() {
    if (!currentOp) { showError('Select an operation first.'); return; }
    const params = collectParams(currentCtx);

    // Validate timestamp inputs
    if (currentOp === 'trim') {
      const start = parseTimestamp(params.start);
      const end   = parseTimestamp(params.end);
      if (!start || !end) { showError('Enter valid timestamps (HH:MM:SS) for start and end.'); return; }
      params.start = start; params.end = end;
    }
    if (currentOp === 'screenshot') {
      const ts = parseTimestamp(params.ts);
      if (!ts) { showError('Enter a valid timestamp (HH:MM:SS) for the screenshot.'); return; }
      params.ts = ts;
    }
    if (currentOp === 'gif' || currentOp === 'webp') {
      const start = parseTimestamp(params.start);
      const end   = parseTimestamp(params.end);
      if (!start || !end) { showError('Enter valid timestamps (HH:MM:SS) for start and end.'); return; }
      params.start = start; params.end = end;
    }

    // Validate secondary file for multi-file ops
    if (MULTI_FILE_OP_IDS.has(currentOp)) {
      const secondaryFile = secondaryDropZone?.getFile();
      if (!secondaryFile) { showError('Drop or browse a secondary file before running.'); return; }
      params.secondary = secondaryFile;
    }

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

      const { url, filename, bytes } = await runOperation(ff, currentOp, params, intake);
      blobUrls.push(url);

      // For ops that produce playable media, offer to play the result
      const nonPlayable = new Set(['screenshot', 'thumbstrip', 'gif', 'webp']);
      if (!nonPlayable.has(currentOp)) onNewUrl(url);

      showResult(url, filename, bytes);
    } catch (err) {
      if (err?.message?.includes('ffmpeg exit')) {
        showError('Operation cancelled.');
      } else {
        showErrorWithDetail(err.message || String(err));
      }
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

  return {
    el: panel,
    revoke() {
      for (const u of blobUrls) { try { URL.revokeObjectURL(u); } catch { /* ignore */ } }
      blobUrls.length = 0;
    },
  };
}
