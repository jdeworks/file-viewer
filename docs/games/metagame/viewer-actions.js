import { setAction as sharedSetAction } from './action-flags.js';

const STAGE1_FILE = 'Overwriter.frag';
const STAGE2_FILE = 'cipher.txt';
const STAGE2_QUERY = 'PASSAGE';
const STAGE2_RESULT = 'PASSAGE:247';
const SECRET_TXT_FILE = 'secret.txt';
const STAGE5_FILE = 'transmission_hum.mp3';
const STAGE5_REQUIRED_MS = 14000;
const STAGE6_FILE = 'protocols_of_the_entity.epub';
const STAGE3_ASCII_FILE = 'entity_f_verification.png';
const STAGE7_FILE = 'entity_f_verification.png';
const STAGE7_ANCHOR_FILE = 'entity_anchor_0043.txt';

const FALSY_CHEAT_VALUES = new Set(['false', '0', 'no', 'off', '']);
const TRUTHY_CHEAT_VALUES = new Set(['true', '1', 'yes', 'on']);

function basename(path = '') {
  return String(path).split(/[\\/]/).pop();
}

function unquote(value) {
  const trimmed = String(value || '').trim();
  const quote = trimmed[0];
  if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function extractSearchResultText(result) {
  if (typeof result === 'string') return result;
  if (!result || typeof result !== 'object') return '';
  return result.result || result.text || result.value || result.line || result.match || '';
}

export function isSecretTxtFile(file) {
  return basename(file) === SECRET_TXT_FILE;
}

export function recordSecretTxtOpen({ file, setAction = sharedSetAction } = {}) {
  if (!isSecretTxtFile(file)) return false;
  setAction?.(0, 'archivist_breadcrumb_found', {
    source: 'viewer-open',
    file: SECRET_TXT_FILE,
  });
  return true;
}

export function recordStage3AsciiActivation({ file, setAction = sharedSetAction } = {}) {
  if (basename(file) !== STAGE3_ASCII_FILE) return false;
  setAction?.(3, 'ascii_awakening', {
    source: 'ascii-mode',
    file: STAGE3_ASCII_FILE,
  });
  return true;
}

export function isStage1OverwriterFile(file) {
  return basename(file) === STAGE1_FILE;
}

export function parseOverwriterCheat(text) {
  const source = String(text || '');
  const line = source.split(/\r?\n/).find((entry) => /^\s*CHEAT\s*(?:=|$)/i.test(entry));
  if (line === undefined) {
    return { found: false, value: '', disabled: true, truthy: false, known: true };
  }

  const match = line.match(/^\s*CHEAT\s*(?:=\s*(.*))?$/i);
  const rawValue = match ? match[1] || '' : '';
  const value = unquote(rawValue).toLowerCase();
  const disabled = FALSY_CHEAT_VALUES.has(value);
  const truthy = TRUTHY_CHEAT_VALUES.has(value);
  return { found: true, value, disabled, truthy, known: disabled || truthy };
}

export function shouldSetStage1CheatDisabled({ file, text } = {}) {
  return isStage1OverwriterFile(file) && parseOverwriterCheat(text).disabled;
}

export function recordStage1RawEdit({ file, text, setAction = sharedSetAction } = {}) {
  if (!shouldSetStage1CheatDisabled({ file, text })) return false;
  setAction?.(1, 'cheat_disabled', {
    source: 'raw-editor',
    file: STAGE1_FILE,
    value: parseOverwriterCheat(text).value,
  });
  return true;
}

export function isStage2PassageSearchResult({ file, query, result, match } = {}) {
  return basename(file) === STAGE2_FILE
    && query === STAGE2_QUERY
    && extractSearchResultText(result ?? match) === STAGE2_RESULT;
}

export function recordStage2SearchResult({ file, query, result, match, setAction = sharedSetAction } = {}) {
  if (!isStage2PassageSearchResult({ file, query, result, match })) return false;
  setAction?.(2, 'search_passage', {
    source: 'search',
    file: STAGE2_FILE,
    value: STAGE2_QUERY,
    result: STAGE2_RESULT,
  });
  return true;
}

export function isStage5TransmissionHum(file) {
  return basename(file) === STAGE5_FILE;
}

export function shouldSetStage5CounterWave({ file, continuousMs, active = true, seeking = false } = {}) {
  return isStage5TransmissionHum(file)
    && active
    && !seeking
    && Number(continuousMs || 0) >= STAGE5_REQUIRED_MS;
}

export function recordStage5MediaPlayback({ file, continuousMs, active = true, seeking = false, setAction = sharedSetAction } = {}) {
  if (!shouldSetStage5CounterWave({ file, continuousMs, active, seeking })) return false;
  setAction?.(5, 'counter_wave_calibrated', {
    source: 'media-playback',
    file: STAGE5_FILE,
    durationMs: STAGE5_REQUIRED_MS,
    continuousMs: Number(continuousMs || 0),
  });
  return true;
}

export function isStage6CodexFile(file) {
  return basename(file) === STAGE6_FILE;
}

export function recordStage6CodexOpen({ file, setAction = sharedSetAction } = {}) {
  if (!isStage6CodexFile(file)) return false;
  setAction?.(6, 'protocol_ch9_read', {
    source: 'viewer-open',
    file: STAGE6_FILE,
    chapter: 9,
  });
  return true;
}

export function shouldSetStage7ExifContradiction({ file, field, entity } = {}) {
  return basename(file) === STAGE7_FILE
    && String(field || '').toLowerCase() === 'gpsinfo'
    && String(entity || 'F').toUpperCase() === 'F';
}

export function recordStage7MetadataInspection({ file, field, entity = 'F', setAction = sharedSetAction } = {}) {
  if (!shouldSetStage7ExifContradiction({ file, field, entity })) return false;
  setAction?.(7, 'exif_contradiction_found', {
    source: 'viewer-metadata',
    file: STAGE7_FILE,
    field: 'GPSInfo',
    entity: 'F',
  });
  return true;
}

export function isStage7AnchorFile(file) {
  return basename(file) === STAGE7_ANCHOR_FILE;
}

export function recordStage7AnchorOpen({ file, setAction = sharedSetAction } = {}) {
  if (!isStage7AnchorFile(file)) return false;
  setAction?.(7, 'anchor_chain_examined', {
    source: 'viewer-open',
    file: STAGE7_ANCHOR_FILE,
    anchor: 'ENTITY_ANCHOR_0043',
  });
  return true;
}

export function recordMetagameViewerOpen({ file, path, opts = {}, setAction = sharedSetAction } = {}) {
  const target = file || path;
  const results = [
    recordSecretTxtOpen({ file: target, setAction }),
    recordStage6CodexOpen({ file: target, setAction }),
    recordStage7AnchorOpen({ file: target, setAction }),
    recordStage7MetadataInspection({
      file: target,
      field: opts.metadataField || opts.field,
      entity: opts.entity || 'F',
      setAction,
    }),
  ];
  return results.some(Boolean);
}
