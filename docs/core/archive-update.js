// Build a compact update ZIP for an advanced archive. Only changed files are included. Deletions
// are represented in a versioned manifest so the original 7z/RAR/tar source never needs a full,
// memory-heavy rebuild.
import { loadGlobal, vendor } from './script-loader.js';
import { archivePathIssue } from '../types/zip/safe-entry.js';

const DEFAULT_MANIFEST = '_file-viewer-update.json';

function manifestNameFor(existingPaths) {
  if (!existingPaths.has(DEFAULT_MANIFEST)) return DEFAULT_MANIFEST;
  let index = 2;
  while (existingPaths.has(`_file-viewer-update-${index}.json`)) index++;
  return `_file-viewer-update-${index}.json`;
}

function assertSafeUpdatePath(path) {
  const issue = archivePathIssue(path);
  if (issue) throw new Error(`Cannot export ${path}: ${issue}.`);
}

export async function buildArchiveUpdateZip(intake, {
  textEdits = new Map(),
  binaryEdits = new Map(),
  deletions = new Set(),
  entries = [],
  sourceFormat = 'archive',
} = {}) {
  const JSZip = await loadGlobal(vendor('jszip/jszip.min.js'), 'JSZip');
  const zip = new JSZip();
  const deletedPaths = [...deletions].map(String).sort((a, b) => a.localeCompare(b));
  const existingPaths = new Set((entries || []).map((entry) => String(entry.path || entry.name || '')));
  const changedPaths = new Set();

  for (const [path, text] of textEdits) {
    if (deletions.has(path)) continue;
    assertSafeUpdatePath(path);
    zip.file(path, text);
    changedPaths.add(path);
  }
  for (const [path, edit] of binaryEdits) {
    if (deletions.has(path)) continue;
    assertSafeUpdatePath(path);
    if (!edit || typeof edit.getBytes !== 'function') throw new Error(`Cannot export ${path}: edited bytes are unavailable.`);
    zip.file(path, await edit.getBytes());
    changedPaths.add(path);
  }
  for (const path of deletedPaths) assertSafeUpdatePath(path);

  const manifestName = manifestNameFor(existingPaths);
  zip.file(manifestName, JSON.stringify({
    schema: 'file-viewer-archive-update',
    version: 1,
    source: {
      filename: intake?.filename || 'archive',
      format: sourceFormat || 'archive',
    },
    deletedPaths,
  }, null, 2) + '\n');

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
  return { blob, changedCount: changedPaths.size, deletedCount: deletedPaths.length, manifestName };
}
