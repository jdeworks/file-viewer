import { setAction as sharedSetAction, emitTransientAction as sharedEmitTransient } from './action-flags.js';
import { echoTokenFor } from './stages/stage9/echo-token.js';
import { echoVerb, isRealVerb, rawModeMatches, echoIdByFile } from './stages/stage9/echo-verbs.js';

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
const STAGE7_ANCHOR_FILE = 'rescinded_appointment.txt';
// Case 2 (The Second Claim) source files — opening each in the real viewer mints one evidence-board
// fact card. fact:route (household_register.csv) is load-bearing: the rule-of-three triad cannot
// complete without it, so the second case can only be solved by a genuine file-open. Action strings
// are internal engine ids shared with stage7/content.js — the filenames were re-themed for the human
// detective rework (2026-07-12, Meridian Estate Affair) but the ids deliberately kept.
const STAGE7_SOURCE_FILES = [
  ['estate_rules.txt', 'spec_examined'],
  ['household_register.csv', 'route_table_examined'],
  ['visitors_book.csv', 'access_log_examined'],
  ['parlour_interview.txt', 'comms_examined'],
  // Case 3 (The Distant Relations) open-minted facts. The ledger opens to a hint card; its DECISIVE
  // fact is search-gated below (recordStage7Search), so opening the ledger is not enough for Case 3.
  ['inheritance_customs.txt', 'quorum_spec_examined'],
  ['solicitor_memo.txt', 'audit_examined'],
  ['mourners_register.csv', 'handshake_examined'],
  ['estate_ledger.csv', 'ledger_examined'],
];

// Case 3 SEARCH un-cheat: the decisive deduction requires SEARCHING estate_ledger.csv (not just
// opening it) for the claimed voucher; the matching line proves the annuity is VOID.
const STAGE7_SEARCH_FILE = 'estate_ledger.csv';
const STAGE7_SEARCH_QUERY = 'VOUCHER 214';
const STAGE7_SEARCH_TOKEN = 'VOID';

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

// Throttle memo for the cosmetic progress signal: the media renderer fires this ~4x/sec, but the HUD
// only displays whole seconds, so we emit a fresh progress signal only when the floored-second value
// actually changes (resetting to 0 when continuous playback restarts). Module-scoped on purpose — the
// recorder is invoked fresh each timeupdate and has nowhere else to remember the last displayed second.
let lastStage5ProgressSecond = -1;

export function recordStage5MediaPlayback({
  file,
  continuousMs,
  active = true,
  seeking = false,
  setAction = sharedSetAction,
  emitProgress = sharedEmitTransient,
} = {}) {
  if (!isStage5TransmissionHum(file)) return false;

  // Sub-threshold cosmetic readout. Emitted on the TRANSIENT channel (no map record, no localStorage,
  // no save mirror/persist) so the calibration HUD can animate every tick without spamming a full
  // game-state save. The authoritative unlock below is still a real, persisted setAction — this signal
  // never satisfies the boss gate (hasAction). When playback is inactive/seeking the media renderer has
  // already reset its continuous counter to 0, so the next active tick emits a low value and the HUD
  // falls back to "uncalibrated" on its own.
  if (active && !seeking) {
    const ms = Math.max(0, Number(continuousMs || 0));
    const second = Math.floor(ms / 1000);
    if (second !== lastStage5ProgressSecond) {
      lastStage5ProgressSecond = second;
      emitProgress?.(5, 'calibration_progress', {
        source: 'media-playback',
        file: STAGE5_FILE,
        continuousMs: ms,
      });
    }
  }

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

// The stage-7 boss un-cheat is no longer viewer-fired: the Meridian rework (2026-07-12) replaced the
// EXIF/GPS metadata read with an in-stage evidence-board gate — pinning + CONNECTING the alibi
// statement and the postmarked torn letter fires `7.alibi_contradiction_pinned` from stage7/boss.js
// through the same actions bus. The old shouldSetStage7ExifContradiction/recordStage7MetadataInspection
// recorders (and their hook in docs/types/image/metadata.js) were removed with it.

export function isStage7AnchorFile(file) {
  return basename(file) === STAGE7_ANCHOR_FILE;
}

export function recordStage7AnchorOpen({ file, setAction = sharedSetAction } = {}) {
  if (!isStage7AnchorFile(file)) return false;
  setAction?.(7, 'anchor_chain_examined', {
    source: 'viewer-open',
    file: STAGE7_ANCHOR_FILE,
    anchor: 'RESCINDED_APPOINTMENT',
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

// NOTE (2026-07-11 stage renumbering): Awakening moved from stage 10 to stage 9 when Entropy Field
// (the old stage 8) was removed and Observer State was promoted 9→8. The functions below still
// carry their original "Stage10" names where docs/core/rawpane.js, docs/core/viewer-open.js, and
// docs/types/image/metadata.js (general lane — out of scope for a metagame-lane rename) import them
// by that exact name; only the functions that are ONLY called from within this file were renamed.
// The actual stage id everywhere below is correctly 9 (see fireEcho).
export function stage9EchoMemoryId(file) {
  const base = basename(file);
  const match = base.match(/^([a-z]+)_echo\./);
  return match ? match[1] : null;
}

// Fire the echo for a memory via a genuine real-feature action. Every recorder stamps the per-memory
// token so the Stage-9 subscription can tell a real viewer action from a forged console action
// (verifyEchoToken). One private helper keeps the token/detail shape identical across all verbs.
function fireEcho(id, source, extra, setAction) {
  setAction?.(9, `echo_${id}`, { source, memory: id, token: echoTokenFor(id), ...extra });
  return true;
}

// PLAIN-OPEN echoes only. Memories whose echo is a DISTINCT real-feature gate (raw-mode, diff,
// download, …) are intentionally NOT witnessed by a bare open — opening their artifact is step one;
// the player must then perform the verb (fired by recordStage10EchoRawMode / recordStage10EchoDownload
// from the real feature site). See echo-verbs.js for the per-memory verb map.
export function recordStage9EchoOpen({ file, setAction = sharedSetAction } = {}) {
  const id = stage9EchoMemoryId(file);
  if (!id || isRealVerb(id)) return false;
  return fireEcho(id, 'viewer-open', { file: basename(file) }, setAction);
}

// Raw-pane MODE echoes (genesis → Original, memory → Diff). Called from rawpane.setRawMode when the
// player switches the loaded echo artifact into the required raw mode — a real, distinct app verb.
export function recordStage10EchoRawMode({ file, mode, setAction = sharedSetAction } = {}) {
  const id = stage9EchoMemoryId(file);
  if (!id) return false;
  const spec = echoVerb(id);
  if (!(spec.verb === 'rawmode' || spec.verb === 'diff') || !rawModeMatches(spec, mode)) return false;
  return fireEcho(id, 'raw-mode', { file: basename(file), mode }, setAction);
}

// DOWNLOAD echoes. Called from rawpane.downloadCurrent when the player downloads the loaded echo
// artifact. Currently no memory uses verb 'download' (its one user, Entropy Field, was removed —
// see the stage-renumbering note above) — kept as generic, reusable infrastructure for a future one.
export function recordStage10EchoDownload({ file, setAction = sharedSetAction } = {}) {
  const id = stage9EchoMemoryId(file);
  if (!id || echoVerb(id).verb !== 'download') return false;
  return fireEcho(id, 'download', { file: basename(file) }, setAction);
}

// SEARCH echoes (syntax → ask the precise question). Called from searchViewerFile when the player
// searches the loaded echo artifact. Load-bearing un-cheat: fires ONLY when the searched query
// matches the memory's decisive query AND the matched line actually contains the proof token — so a
// bare open, or a vague search that finds nothing, witnesses nothing. Mirrors recordStage7Search.
export function recordStage10EchoSearch({ file, query, result, match, setAction = sharedSetAction } = {}) {
  const id = stage9EchoMemoryId(file);
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
export function recordStage9EchoNested({ file, path, setAction = sharedSetAction } = {}) {
  const target = path || file;
  const id = stage9EchoMemoryId(target);
  if (!id) return false;
  const spec = echoVerb(id);
  if (spec.verb !== 'nested') return false;
  const full = String(path || file || '');
  if (!spec.path || !full.includes(spec.path)) return false;
  return fireEcho(id, 'nested', { file: basename(full), path: full }, setAction);
}

// METADATA echoes (identity → read the buried EXIF). Called from the image metadata renderer
// (docs/types/image/metadata.js) only when the named EXIF row actually renders in the metadata
// drawer — never on a bare file-open. Self-gates on the artifact basename + field. Keyed by the
// verb spec's file (a real image, not an _echo name).
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
    recordStage9EchoOpen({ file: target, setAction }),
    // Nested-navigation echo needs the FULL opened path (not just the basename) to verify the player
    // reached the artifact through its repeating nested folders, so pass path explicitly.
    recordStage9EchoNested({ file: target, path: path || file, setAction }),
    // NOTE: Stage 7's boss contradiction is deliberately NOT recorded here. Since the Meridian
    // rework it fires in-stage from the evidence board (stage7/boss.js connectAlibiContradiction)
    // — never on file-open.
  ];
  return results.some(Boolean);
}
