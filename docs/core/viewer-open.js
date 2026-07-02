import { intakeFromFile, intakeFromText } from './intake.js';
import { state } from './state.js';

let loadIntakeCallback = null;
let viewerActionsPromise = null;
function viewerActions() {
  if (!viewerActionsPromise) viewerActionsPromise = import('../games/metagame/viewer-actions.js');
  return viewerActionsPromise;
}

export function initViewerOpen({ loadIntake }) {
  loadIntakeCallback = loadIntake;
}

export async function openExampleFile(path, opts = {}) {
  const clean = String(path || '').replace(/^\/?docs\/examples\//, '').replace(/^\/?examples\//, '');
  if (!clean) return false;
  const index = await fetch('examples/index.json').then((r) => r.ok ? r.json() : []).catch(() => []);
  const meta = Array.isArray(index) ? index.find((entry) => entry.file === clean) : null;
  const res = await fetch('examples/' + clean);
  if (!res.ok) return false;
  const buf = new Uint8Array(await res.arrayBuffer());
  state._skipDiscardGuard = true;
  await loadIntakeCallback(await intakeFromFile(new File([buf], clean.split('/').pop(), { type: opts.mime || meta?.mime || '' })));
  return true;
}

export async function openViewerFile(path, opts = {}) {
  const target = String(path || '');
  if (opts.text != null) {
    state._skipDiscardGuard = true;
    await loadIntakeCallback(intakeFromText(String(opts.text), target.split('/').pop() || opts.filename || 'generated.txt'));
    viewerActions().then(({ recordMetagameViewerOpen }) => recordMetagameViewerOpen({ path: target, opts }));
    return true;
  }
  if (target.includes('/docs/bts/') || target.includes('/bts/')) {
    const clean = target.replace(/^\/?docs\/bts\//, '').replace(/^\/?bts\//, '');
    const res = await fetch('bts/' + clean);
    if (!res.ok) return false;
    const text = await res.text();
    state._skipDiscardGuard = true;
    await loadIntakeCallback(intakeFromText(text, clean));
    viewerActions().then(({ recordMetagameViewerOpen }) => recordMetagameViewerOpen({ path: target, opts }));
    return true;
  }
  const opened = await openExampleFile(target, opts);
  if (opened) viewerActions().then(({ recordMetagameViewerOpen }) => recordMetagameViewerOpen({ path: target, opts }));
  return opened;
}

// Open an in-memory Blob (e.g. a webcam recording) directly in the viewer — no
// download/re-open round-trip. A Blob wraps straight into a File, so it flows
// through the exact same intake → detect → render path as a disk file (a .webm
// recording lands in the media/video studio). Returns false if no intake handler
// is wired (e.g. on a standalone page that didn't call initViewerOpen).
export async function openBlobFile(blob, name, opts = {}) {
  if (!blob || !loadIntakeCallback) return false;
  const filename = name || 'recording';
  const type = opts.mime || blob.type || '';
  state._skipDiscardGuard = true;
  await loadIntakeCallback(await intakeFromFile(new File([blob], filename, { type })));
  viewerActions().then(({ recordMetagameViewerOpen }) => recordMetagameViewerOpen({ path: filename, opts }));
  return true;
}

export async function searchViewerFile(path, query, opts = {}) {
  const target = String(path || '');
  const clean = target.replace(/^\/?docs\/examples\//, '').replace(/^\/?examples\//, '');
  const text = opts.text || (state.intake?.filename === clean.split('/').pop() ? state.rawview?.getValue?.() || state.intake.text : null);
  const sourceText = text == null ? await fetch('examples/' + clean).then((r) => r.ok ? r.text() : '').catch(() => '') : text;
  const line = sourceText.split(/\r?\n/).find((entry) => entry.includes(query));
  const result = line && line.trim();
  viewerActions().then(({ recordStage2SearchResult, recordStage7Search, recordStage10EchoSearch }) => {
    recordStage2SearchResult({ file: target || clean, query, result });
    recordStage7Search({ file: target || clean, query, result });
    recordStage10EchoSearch({ file: target || clean, query, result });
  });
  return { found: Boolean(result), result };
}
