// Media Editor — Phase 3 advanced operations.
// Exports multi-file operation descriptors and the secondary drop-zone builder.
// Imported by editor.js; keep this file to UI concerns only (no ffmpeg calls).

// Phase 3 single-file operations (appended to the OPERATIONS list in editor.js).
export const ADVANCED_SINGLE_OPS = [
  { id: 'normalize',  label: 'Loudness Normalize' },
  { id: 'gif',        label: 'GIF Export' },
  { id: 'webp',       label: 'WebP Export' },
  { id: 'thumbstrip', label: 'Thumbnail Strip' },
  { id: 'rmeta',      label: 'Remove Metadata' },
];

// Phase 3 multi-file operations.
export const MULTI_FILE_OPS = [
  { id: 'subtitle',    label: 'Embed Subtitles',  accept: '.srt,.vtt', hint: 'Drop subtitle (.srt/.vtt) here' },
  { id: 'concat',      label: 'Concatenate',      accept: 'video/*',   hint: 'Drop second video here' },
  { id: 'audioreplace',label: 'Replace Audio',    accept: 'audio/*',   hint: 'Drop replacement audio here' },
];

// Set of operation IDs that require a secondary file.
export const MULTI_FILE_OP_IDS = new Set(MULTI_FILE_OPS.map((o) => o.id));

// Build contextual inputs for Phase 3 single-file ops that need them.
// Returns a DOM element, or null if the op needs no inputs.
function makeInput(placeholder) {
  const el = document.createElement('input');
  el.type = 'text';
  el.placeholder = placeholder;
  el.className = 'media-ed-ts';
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

export function buildAdvancedInputsFor(opId, mediaEl) {
  if (opId === 'gif' || opId === 'webp') {
    const wrap = document.createElement('div');
    wrap.className = 'media-ed-ctx';
    wrap.dataset.op = opId;

    const startIn = makeInput('HH:MM:SS');
    const endIn   = makeInput('HH:MM:SS');
    const useStart = makeBtn('Use current', 'media-ed-use-pos');
    const useEnd   = makeBtn('Use current', 'media-ed-use-pos');
    if (mediaEl) {
      useStart.addEventListener('click', () => { startIn.value = fmtTime(mediaEl.currentTime); });
      useEnd.addEventListener('click',   () => { endIn.value   = fmtTime(mediaEl.currentTime); });
    }
    const startGroup = document.createElement('div');
    startGroup.className = 'media-ed-ts-group';
    startGroup.append(document.createTextNode('Start '), startIn, useStart);
    const endGroup = document.createElement('div');
    endGroup.className = 'media-ed-ts-group';
    endGroup.append(document.createTextNode('End '), endIn, useEnd);

    if (opId === 'gif') {
      const warn = document.createElement('p');
      warn.className = 'media-ed-warn';
      warn.textContent = 'GIFs are large — WebP Export is recommended for animated images.';
      wrap.append(startGroup, endGroup, warn);
    } else {
      wrap.append(startGroup, endGroup);
    }
    return wrap;
  }

  // normalize, thumbstrip, rmeta — no contextual inputs needed
  return null;
}

// Collect params from advanced single-file contextual inputs.
export function collectAdvancedParams(ctxEl) {
  if (!ctxEl) return {};
  const op = ctxEl.dataset.op;
  if (op === 'gif' || op === 'webp') {
    const inputs = ctxEl.querySelectorAll('input[type="text"]');
    return { start: inputs[0]?.value || '00:00:00', end: inputs[1]?.value || '00:00:10' };
  }
  return {};
}

// Format seconds → HH:MM:SS (local copy — avoids circular import with editor.js).
function fmtTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

// Build the secondary file drop zone shown when a multi-file operation is active.
// `onFile(file)` is called whenever a valid file is selected/dropped.
// Returns { el, getFile() }.
export function buildSecondaryDropZone(opDef, onFile) {
  let currentFile = null;

  const wrap = document.createElement('div');
  wrap.className = 'media-ed-secondary';

  const label = document.createElement('div');
  label.className = 'media-ed-secondary-label';
  label.textContent = 'Secondary file';

  const zone = document.createElement('div');
  zone.className = 'media-ed-drop-zone';
  zone.setAttribute('role', 'button');
  zone.setAttribute('tabindex', '0');

  const hintText = document.createElement('span');
  hintText.className = 'media-ed-drop-hint';
  hintText.textContent = opDef.hint + '  OR';

  const browseBtn = document.createElement('label');
  browseBtn.className = 'media-ed-browse';
  browseBtn.textContent = 'Browse files';
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = opDef.accept || '*/*';
  fileInput.className = 'media-ed-file-input';
  browseBtn.appendChild(fileInput);

  const dragNote = document.createElement('span');
  dragNote.className = 'media-ed-drag-note';
  dragNote.textContent = '(or drag from the session sidebar)';

  zone.append(hintText, browseBtn, dragNote);

  const status = document.createElement('div');
  status.className = 'media-ed-secondary-status';
  status.hidden = true;

  wrap.append(label, zone, status);

  function accept(file) {
    currentFile = file;
    const sizeMB = (file.size / 1048576).toFixed(1);
    status.textContent = file.name + ' — ' + sizeMB + ' MB';
    status.hidden = false;
    zone.classList.add('has-file');
    onFile(file);
  }

  // Drag and drop
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => { zone.classList.remove('drag-over'); });
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer?.files?.[0];
    if (file) accept(file);
  });

  // File input browse
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) accept(file);
  });

  // Keyboard activation
  zone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
  });

  return {
    el: wrap,
    getFile() { return currentFile; },
  };
}
