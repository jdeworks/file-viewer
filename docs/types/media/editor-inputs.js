// Contextual-input builders + param collection for the Media Editor (editor.js). Split out to keep
// editor.js under the LOC cap. `buildInputsFor` returns the per-op controls DOM; `collectParams`
// reads them back. Both are pure module functions (no editor.js closure state).

import { fmtTime, makeInput, makeBtn } from './editor-helpers.js';
import {
  MULTI_FILE_OP_IDS, buildAdvancedInputsFor, collectAdvancedParams,
} from './editor-advanced.js';

// `mediaEl` is the <video>/<audio> element (for "use current position" buttons).
export function buildInputsFor(opId, mediaEl) {
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
    const fmtGroup = document.createElement('div');
    fmtGroup.className = 'media-ed-radio-row';
    const fmtSel = document.createElement('select');
    fmtSel.className = 'media-ed-trim-format';
    [['source', 'Same as source'], ['mp4', 'MP4'], ['webm', 'WebM']].forEach(([value, label]) => {
      const opt = document.createElement('option');
      opt.value = value; opt.textContent = label;
      fmtSel.append(opt);
    });
    fmtGroup.append(document.createTextNode('Output '), fmtSel);
    wrap.append(startGroup, endGroup, fmtGroup, preciseLabel);
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
export function collectParams(ctxEl) {
  if (!ctxEl) return {};
  const op = ctxEl.dataset.op;
  if (op === 'trim') {
    const inputs = ctxEl.querySelectorAll('input[type="text"]');
    const precise = ctxEl.querySelector('input[name="precise"]');
    const format = ctxEl.querySelector('.media-ed-trim-format');
    return { start: inputs[0]?.value || '', end: inputs[1]?.value || '', precise: precise?.checked || false, format: format?.value || 'source' };
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
