// Media Editor panel — expands the transcoder panel into a full operation suite.
// Imported by renderer.js when ffmpeg is enabled. Returns a {el, revoke()} object.
// The panel is always appended to the host; it starts hidden and reveals itself when
// the user opens it (or when the format likely needs conversion).
//
// Phase 2 ops: Trim, Extract Audio, Mute, Screenshot, Downscale, Volume, Speed, Convert WebM
// Phase 3 ops: Loudness Normalize, GIF Export, WebP Export, Thumbnail Strip, Remove Metadata,
//              Embed Subtitles, Concatenate, Replace Audio
// All ffmpeg args are delegated to runOperation() in transcoder.js.

import { cancelFfmpeg, formatFfmpegError, loadFfmpeg, runOperation } from './transcoder.js';
import {
  ADVANCED_SINGLE_OPS, MULTI_FILE_OPS, MULTI_FILE_OP_IDS, buildSecondaryDropZone,
} from './editor-advanced.js';
import { toTrimTime, parseTimestamp, parseTrimInputText, makeBtn } from './editor-helpers.js';
import { buildInputsFor, collectParams } from './editor-inputs.js';
import { buildWorkingCopyButton } from './media-working-copy.js';

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

// Build and return the full editor panel element. `mediaEl` is the native <video>/<audio>.
// `intake` is the file descriptor from the renderer. `onNewUrl` is called with (blobUrl, filename)
// after a successful operation so the caller can update the player.
export function buildEditorPanel(intake, mediaEl, onNewUrl, options = {}) {
  const baseName = (intake.filename || 'output').replace(/\.[^.]+$/, '');
  let currentOp = null;
  let currentCtx = null;
  let ffInstance = null;   // held so we can call exit() on cancel
  const blobUrls = [];     // all blob URLs created here — revoked by revoke()
  // Additive editing: ops run against `workingIntake`, which starts as the original file but can be
  // swapped to a previous result so changes stack (trim → convert → …) without ever touching the
  // original on disk. chainDepth counts how many edits are baked into the current working input.
  let workingIntake = intake;
  let chainDepth = 0;

  // Root container
  const panel = document.createElement('div');
  panel.className = 'media-ed-panel';

  // Header
  const header = document.createElement('div');
  header.className = 'media-ed-header';
  header.textContent = 'Media Editor';

  // Working-source bar — shown only when ops are chained onto a previous result.
  const sourceBar = document.createElement('div');
  sourceBar.className = 'media-ed-source';
  sourceBar.hidden = true;
  const sourceLabel = document.createElement('span');
  sourceLabel.className = 'media-ed-source-name';
  const resetBtn = makeBtn('Reset to original', 'media-ed-source-reset');
  resetBtn.addEventListener('click', () => { setWorkingIntake(intake, 0); });
  sourceBar.append(sourceLabel, resetBtn);

  function setWorkingIntake(next, depth) {
    workingIntake = next;
    chainDepth = depth;
    if (depth > 0) {
      sourceLabel.textContent = `Chained: ${next.filename} · ${depth} edit${depth > 1 ? 's' : ''} applied (original untouched)`;
      sourceBar.hidden = false;
    } else {
      sourceBar.hidden = true;
    }
  }

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

  panel.append(header, sourceBar, opGrid, ctxArea, secondaryArea, divider, actionRow, progressArea, resultArea);

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

  function prefillTrim({ start, end } = {}) {
    selectOp('trim');
    if (!currentCtx) return;
    const inputs = currentCtx.querySelectorAll('input[type="text"]');
    if (!inputs.length) return;

    const startSecs = Number.isFinite(start) ? start : parseTrimInputText(start);
    const endSecs = Number.isFinite(end) ? end : parseTrimInputText(end);
    const startVal = toTrimTime(startSecs);
    const endVal = toTrimTime(endSecs);
    if (startVal) inputs[0].value = startVal;
    if (endVal) inputs[1].value = endVal;
  }

  function showResult(output, { chainable = false } = {}) {
    const { url, filename, bytes: sizeBytes, blob } = output;
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
    // Additive editing: feed this result back in as the working input so the next op stacks on it.
    if (chainable) {
      const chainBtn = makeBtn('Continue editing this result →', 'media-ed-chain');
      chainBtn.addEventListener('click', async () => {
        chainBtn.disabled = true;
        try {
          setWorkingIntake({ file: blob, filename }, chainDepth + 1);
          if (currentOp) selectOp(currentOp); // fresh op state on the new working source
        } catch { showError('Could not load the result to continue editing.'); }
      });
      resultArea.append(chainBtn);
    }
    const workingCopyButton = buildWorkingCopyButton(output, options.workingCopy);
    if (workingCopyButton) resultArea.append(workingCopyButton);
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
      // One-sided trim is allowed: an empty start means "from the beginning" and an empty end means
      // "to the end of the media". At least one bound must be given, and any value typed must parse.
      const hasStart = (params.start || '').trim() !== '';
      const hasEnd = (params.end || '').trim() !== '';
      if (!hasStart && !hasEnd) { showError('Enter a start, an end, or both (HH:MM:SS) to trim.'); return; }
      const start = hasStart ? parseTimestamp(params.start) : '00:00:00';
      const end = hasEnd ? parseTimestamp(params.end) : toTrimTime(Math.ceil(mediaEl?.duration || 0));
      if (hasStart && !start) { showError('Enter a valid start timestamp (HH:MM:SS).'); return; }
      if (hasEnd && !end) { showError('Enter a valid end timestamp (HH:MM:SS).'); return; }
      if (!end) { showError('Enter an end timestamp (HH:MM:SS) — the media duration is unknown.'); return; }
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

      const output = await runOperation(ff, currentOp, params, workingIntake);
      blobUrls.push(output.url);

      // For ops that produce playable media, offer to play the result AND chain further edits onto it.
      const nonPlayable = new Set(['screenshot', 'thumbstrip', 'gif', 'webp']);
      const playable = !nonPlayable.has(currentOp);
      if (playable) onNewUrl(output.url);

      showResult(output, { chainable: playable });
    } catch (err) {
      showErrorWithDetail(formatFfmpegError(err));
    } finally {
      ffInstance = null;
      setRunning(false);
      runBtn.hidden = false;
      cancelBtn.hidden = true;
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
  cancelBtn.addEventListener('click', cancel);

  return {
    el: panel,
    prefillTrim,
    revoke() {
      for (const u of blobUrls) { try { URL.revokeObjectURL(u); } catch { /* ignore */ } }
      blobUrls.length = 0;
    },
  };
}
