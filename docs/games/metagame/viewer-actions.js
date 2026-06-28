import { setAction as sharedSetAction } from './action-flags.js';
import { echoTokenFor } from './stages/stage10/echo-token.js';
import { echoVerb, isRealVerb, rawModeMatches, echoIdByFile } from './stages/stage10/echo-verbs.js';

const STAGE1_FILE = 'Overwriter.frag';
const STAGE2_FILE = 'cipher.txt';
const STAGE2_QUERY = 'PASSAGE';
const STAGE2_RESULT = 'PASSAGE:247';
const SECRET_TXT_FILE = 'secret.txt';
const STAGE5_FILE = 'transmission_hum.mp3';
const STAGE5_REQUIRED_MS = 14000;
const STAGE6_FILE = 'protocols_of_the_entity.epub';
const STAGE3_ASCII_FILE = 'entity_f_verification.png';
const STAGE4_BLUEPRINT_FILE = 'recursion_points.json';
const STAGE7_FILE = 'entity_f_verification.jpg';
const STAGE7_ANCHOR_FILE = 'entity_anchor_0043.txt';
// Case 2 (Duplicate Roster) source files — opening each in the real viewer mints one evidence-board
// fact card. fact:route (route_table.csv) is load-bearing: the rule-of-three triad cannot complete
// without it, so the second case can only be solved by a genuine file-open.
const STAGE7_SOURCE_FILES = [
  ['system_spec.json', 'spec_examined'],
  ['route_table.csv', 'route_table_examined'],
  ['access_log.csv', 'access_log_examined'],
  ['comms_transcript.txt', 'comms_examined'],
  // Case 3 (Quorum Ghost) open-minted facts. session_ledger opens to a hint card; its DECISIVE fact is
  // search-gated below (recordStage7Search), so opening the ledger is not enough to solve Case 3.
  ['quorum_spec.json', 'quorum_spec_examined'],
  ['audit_trail.txt', 'audit_examined'],
  ['handshake_log.csv', 'handshake_examined'],
  ['session_ledger.csv', 'ledger_examined'],
];

// Case 3 SEARCH un-cheat: the decisive deduction requires SEARCHING session_ledger.csv (not just
// opening it) for the claimed token; the matching line proves the session is REVOKED.
const STAGE7_SEARCH_FILE = 'session_ledger.csv';
const STAGE7_SEARCH_QUERY = 'S-7741';
const STAGE7_SEARCH_TOKEN = 'REVOKED';

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

export function isStage4BlueprintFile(file) {
  return basename(file) === STAGE4_BLUEPRINT_FILE;
}

// Stage 4 un-cheat: the load-bearing action is fired by ACTUALLY OPENING the tier-3 blueprint file in
// the viewer (a real file-open through openViewerFile → recordMetagameViewerOpen), never by an in-game
// button. Until this fires, The Infinite Loop folds all damage away (see boss.js total-armor gate).
export function recordStage4BlueprintOpen({ file, setAction = sharedSetAction } = {}) {
  if (!isStage4BlueprintFile(file)) return false;
  setAction?.(4, 'recursion_blueprint_read', {
    source: 'viewer-open',
    file: STAGE4_BLUEPRINT_FILE,
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

// Stage 7 boss un-cheat. NOT fired at file-open — it is called from the image metadata renderer
// (docs/types/image/metadata.js) only when the GPS row actually renders in the metadata pane, i.e.
// when the player navigates there and reads Entity F's embedded EXIF. Self-gates on the fixture.
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

export function stage7SourceAction(file) {
  const base = basename(file);
  const match = STAGE7_SOURCE_FILES.find(([name]) => name === base);
  return match ? match[1] : null;
}

export function recordStage7SourceOpen({ file, setAction = sharedSetAction } = {}) {
  const action = stage7SourceAction(file);
  if (!action) return false;
  setAction?.(7, action, { source: 'viewer-open', file: basename(file) });
  return true;
}

export function isStage7SessionSearch({ file, query, result, match } = {}) {
  return basename(file) === STAGE7_SEARCH_FILE
    && String(query || '').toUpperCase().includes(STAGE7_SEARCH_QUERY)
    && extractSearchResultText(result ?? match).toUpperCase().includes(STAGE7_SEARCH_TOKEN);
}

// Load-bearing SEARCH un-cheat for Case 3: fires only when the player actually searches the session
// ledger for the claimed token AND the matched line proves it REVOKED. A bare open does not qualify.
export function recordStage7Search({ file, query, result, match, setAction = sharedSetAction } = {}) {
  if (!isStage7SessionSearch({ file, query, result, match })) return false;
  setAction?.(7, 'session_revoked_found', {
    source: 'search',
    file: STAGE7_SEARCH_FILE,
    value: STAGE7_SEARCH_QUERY,
    result: extractSearchResultText(result ?? match),
  });
  return true;
}

export function stage10EchoMemoryId(file) {
  const base = basename(file);
  const match = base.match(/^([a-z]+)_echo\./);
  return match ? match[1] : null;
}

// Fire the echo for a memory via a genuine real-feature action. Every recorder stamps the per-memory
// token so the Stage-10 subscription can tell a real viewer action from a forged console action
// (verifyEchoToken). One private helper keeps the token/detail shape identical across all verbs.
function fireEcho(id, source, extra, setAction) {
  setAction?.(10, `echo_${id}`, { source, memory: id, token: echoTokenFor(id), ...extra });
  return true;
}

// PLAIN-OPEN echoes only. Memories whose echo is a DISTINCT real-feature gate (raw-mode, diff,
// download, …) are intentionally NOT witnessed by a bare open — opening their artifact is step one;
// the player must then perform the verb (fired by recordStage10EchoRawMode / recordStage10EchoDownload
// from the real feature site). See echo-verbs.js for the per-memory verb map.
export function recordStage10EchoOpen({ file, setAction = sharedSetAction } = {}) {
  const id = stage10EchoMemoryId(file);
  if (!id || isRealVerb(id)) return false;
  return fireEcho(id, 'viewer-open', { file: basename(file) }, setAction);
}

// Raw-pane MODE echoes (genesis → Original, memory → Diff). Called from rawpane.setRawMode when the
// player switches the loaded echo artifact into the required raw mode — a real, distinct app verb.
export function recordStage10EchoRawMode({ file, mode, setAction = sharedSetAction } = {}) {
  const id = stage10EchoMemoryId(file);
  if (!id) return false;
  const spec = echoVerb(id);
  if (!(spec.verb === 'rawmode' || spec.verb === 'diff') || !rawModeMatches(spec, mode)) return false;
  return fireEcho(id, 'raw-mode', { file: basename(file), mode }, setAction);
}

// DOWNLOAD echoes (entropy → salvage the fragment). Called from rawpane.downloadCurrent when the
// player downloads the loaded echo artifact.
export function recordStage10EchoDownload({ file, setAction = sharedSetAction } = {}) {
  const id = stage10EchoMemoryId(file);
  if (!id || echoVerb(id).verb !== 'download') return false;
  return fireEcho(id, 'download', { file: basename(file) }, setAction);
}

// SEARCH echoes (syntax → ask the precise question). Called from searchViewerFile when the player
// searches the loaded echo artifact. Load-bearing un-cheat: fires ONLY when the searched query
// matches the memory's decisive query AND the matched line actually contains the proof token — so a
// bare open, or a vague search that finds nothing, witnesses nothing. Mirrors recordStage7Search.
export function recordStage10EchoSearch({ file, query, result, match, setAction = sharedSetAction } = {}) {
  const id = stage10EchoMemoryId(file);
  if (!id) return false;
  const spec = echoVerb(id);
  if (spec.verb !== 'search') return false;
  const q = String(query || '').toUpperCase();
  const text = extractSearchResultText(result ?? match).toUpperCase();
  if (!q.includes(String(spec.query || '').toUpperCase())) return false;
  if (!text.includes(String(spec.token || '').toUpperCase())) return false;
  return fireEcho(id, 'search', {
    file: basename(file),
    value: spec.query,
    result: extractSearchResultText(result ?? match),
  }, setAction);
}

// NESTED-navigation echoes (pattern → the answer was deeper than the root). Called from the viewer
// open path. Load-bearing un-cheat: fires ONLY when the OPENED path actually contains the required
// nested folder segment — opening a top-level file (or any other artifact) witnesses nothing.
export function recordStage10EchoNested({ file, path, setAction = sharedSetAction } = {}) {
  const target = path || file;
  const id = stage10EchoMemoryId(target);
  if (!id) return false;
  const spec = echoVerb(id);
  if (spec.verb !== 'nested') return false;
  const full = String(path || file || '');
  if (!spec.path || !full.includes(spec.path)) return false;
  return fireEcho(id, 'nested', { file: basename(full), path: full }, setAction);
}

// METADATA echoes (identity → read the buried EXIF). Called from the image metadata renderer
// (docs/types/image/metadata.js) only when the named EXIF row actually renders in the metadata
// drawer — never on a bare file-open. Self-gates on the artifact basename + field. Mirrors
// recordStage7MetadataInspection but keyed by the verb spec's file (a real image, not an _echo name).
export function recordStage10EchoMetadata({ file, field, setAction = sharedSetAction } = {}) {
  const id = echoIdByFile(file);
  if (!id) return false;
  const spec = echoVerb(id);
  if (spec.verb !== 'metadata') return false;
  if (String(field || '').toLowerCase() !== String(spec.field || '').toLowerCase()) return false;
  return fireEcho(id, 'viewer-metadata', { file: basename(file), field: spec.field }, setAction);
}

export function recordMetagameViewerOpen({ file, path, opts = {}, setAction = sharedSetAction } = {}) {
  const target = file || path;
  const results = [
    recordSecretTxtOpen({ file: target, setAction }),
    recordStage4BlueprintOpen({ file: target, setAction }),
    recordStage6CodexOpen({ file: target, setAction }),
    recordStage7AnchorOpen({ file: target, setAction }),
    recordStage7SourceOpen({ file: target, setAction }),
    recordStage10EchoOpen({ file: target, setAction }),
    // Nested-navigation echo needs the FULL opened path (not just the basename) to verify the player
    // reached the artifact through its repeating nested folders, so pass path explicitly.
    recordStage10EchoNested({ file: target, path: path || file, setAction }),
    // NOTE: Stage 7's EXIF contradiction is deliberately NOT recorded here. It fires only from the
    // image metadata renderer (docs/types/image/metadata.js → recordStage7MetadataInspection) when
    // the player navigates to the metadata pane and the GPS row renders — never on file-open.
  ];
  return results.some(Boolean);
}
