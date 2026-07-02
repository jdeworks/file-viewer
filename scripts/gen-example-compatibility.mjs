#!/usr/bin/env node
// Generator/updater for docs/examples/compatibility.json
// Adds new schema fields (increment 2) to every row while preserving
// all manually curated values. Safe to re-run; only adds missing fields.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ── FileExamples.com slug lookup (by registry type id) ───────────────────────
const FE_SLUGS = {
  json:        'json',
  csv:         'csv',
  xml:         'xml',
  yaml:        'yaml',
  pdf:         'pdf',
  docx:        'docx',
  xlsx:        'xlsx',
  pptx:        'pptx',
  html:        'html',
  epub:        'epub',
  media:       null,   // mixed; handled per-extension elsewhere
  midi:        'mid',
  image:       null,   // mixed; png/gif/etc covered separately
  svg:         'svg',
  gif:         'gif',
  png:         'png',
  jpeg:        'jpeg',
  tiff:        'tiff',
  heif:        null,
  zip:         'zip',
  archive:     '7z',
  mkv:         'mkv',
  mov:         'mov',
  avi:         'avi',
  wav:         'wav',
  flac:        'flac',
  ogg:         'ogg',
  webm:        'webm',
  webp:        'webp',
  font:        'ttf',
  odf:         'odt',
  rtf:         'rtf',
  torrent:     'torrent',
  sql:         'sql',
  markdown:    'md',
  raw:         null,   // no "txt" page on FE
  ini:         null,
  toml:        null,
  plist:       null,
  ics:         'ics',
  vcard:       'vcf',
  mid:         'mid',
  sqlite:      null,
  csv_tsv:     'csv',
  fb2:         null,
  mobi:        null,
  lrf:         null,
  djvu:        null,
  comic:       null,
  layered:     null,
  ico:         null,
  procreate:   null,
  sketch:      null,
  wasm:        null,
  npy:         null,
  lnk:         null,
  dmp:         'dmp',
  reg:         null,
  gltf:        null,
  stl:         'stl',
  obj:         null,
  ply:         null,
  '3mf':       null,
  geo:         null,
  ipynb:       null,
  eml:         null,
  mbox:        null,
  msg:         null,
  html_type:   'html',
  code:        null,
  patch:       null,
  log:         null,
  crash:       null,
  subtitle:    'srt',
  asciiart:    null,
  als:         null,
  env:         null,
  strings:     null,
  editorconfig:null,
  gitignore:   null,
  gitattributes:null,
  'ssh-config':null,
  rdp:         null,
  kubeconfig:  null,
  'mcp-config':null,
  pem:         'pem',
  har:         null,
  clip:        null,
  iwork:       null,
  gamerom:     null,
  dicom:       'dicom',
  dwg:         'dwg',
  ruffle:      null,
  v86:         null,
  emulatorjs:  null,
  'java-class':null,
  url:         null,
  gcode:       null,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extract type id strings from registry.js source using regex (browser-safe imports). */
function extractTypeIds(registrySrc) {
  const exportMatch = registrySrc.match(/export const REGISTRY\s*=\s*\[([^\]]+)\]/s);
  if (!exportMatch) return [];
  const body = exportMatch[1];
  const names = [...body.matchAll(/\b(\w+Type)\b/g)].map((m) => m[1]);

  // Map variable name → id by scanning import declarations
  const idMap = {};
  for (const varName of names) {
    const importMatch = registrySrc.match(
      new RegExp(`import\\s+${varName}\\s+from\\s+['"]\\.\\./types/([^'"]+)/index\\.js['"]`)
    );
    if (importMatch) {
      // The last path segment is the folder name which is the type id
      const segments = importMatch[1].split('/');
      idMap[varName] = segments[segments.length - 1];
    }
  }
  return names.map((n) => idMap[n]).filter(Boolean);
}

/** Extract known-file id strings from known/registry.js source. */
function extractKnownIds(registrySrc) {
  return extractKnownItems(registrySrc).map((item) => item.id);
}

/** Extract known-file {id, relPath} objects from known/registry.js source. */
function extractKnownItems(registrySrc) {
  const exportMatch = registrySrc.match(/export const KNOWN\s*=\s*\[([^\]]+)\]/s);
  if (!exportMatch) return [];
  const body = exportMatch[1];
  const names = [...body.matchAll(/\b(\w+)\b/g)].map((m) => m[1]).filter((n) => n !== 'KNOWN');

  const itemMap = {};
  for (const varName of names) {
    // Match imports like: import packageJson from '../types/.../known/package-json/index.js';
    const importMatch = registrySrc.match(
      new RegExp(`import\\s+${varName}\\s+from\\s+['"]\\.\\./types/([^'"]+)/index\\.js['"]`)
    );
    if (importMatch) {
      const relPath = importMatch[1]; // e.g. "text/yaml/known/appveyor"
      const segments = relPath.split('/');
      itemMap[varName] = { id: segments[segments.length - 1], relPath };
    }
  }
  return names.map((n) => itemMap[n]).filter(Boolean);
}

function computeSampleSource(row) {
  const { sourced, total } = row.provenance || { sourced: 0, total: 0 };
  const partial = Array.isArray(row.partialSamples) ? row.partialSamples.length : 0;
  if (sourced > 0 && sourced === total && total > 0) return 'real-world';
  if (sourced > 0) return 'derived';
  if (partial > 0) return 'partial-fixture';
  return 'synthetic';
}

function computePreviewDepth(row) {
  return row.capabilities?.preview === false ? 'none' : 'basic';
}

function computeEditCapability(row) {
  return row.capabilities?.rawView === true ? 'basic' : 'none';
}

function feSlug(typeId) {
  if (Object.prototype.hasOwnProperty.call(FE_SLUGS, typeId)) return FE_SLUGS[typeId] ?? null;
  return null;
}

/** Merge: preserve all existing fields; only add missing new ones. */
function enrichTypeRow(typeId, existing) {
  const sourced = existing.provenance?.sourced ?? 0;
  const total = existing.provenance?.total ?? 0;
  const partial = (existing.partialSamples ?? []).length;
  const sampleSrc = (() => {
    if (sourced > 0 && sourced === total && total > 0) return 'real-world';
    if (sourced > 0) return 'derived';
    if (partial > 0) return 'partial-fixture';
    return 'synthetic';
  })();

  const defaults = {
    fileExamplesSlug:    feSlug(typeId),
    previewDepth:        existing.capabilities?.preview === false ? 'none' : 'basic',
    metadataDepth:       'basic',
    editCapability:      existing.capabilities?.rawView === true ? 'basic' : 'none',
    exportCapability:    'download',
    securityLimitations: [],
    knownParserGaps:     [],
    testCoverage:        'smoke',
    sampleSource:        sampleSrc,
    needsRealWorldSample: existing.realWorldQuality === 'needs-review',
  };

  const enriched = { ...existing };
  for (const [k, v] of Object.entries(defaults)) {
    if (!(k in enriched)) enriched[k] = v;
  }
  return enriched;
}

/** Same as enrichTypeRow but without fileExamplesSlug. */
function enrichKnownRow(existing) {
  const sourced = existing.provenance?.sourced ?? 0;
  const total = existing.provenance?.total ?? 0;
  const partial = (existing.partialSamples ?? []).length;
  const sampleSrc = (() => {
    if (sourced > 0 && sourced === total && total > 0) return 'real-world';
    if (sourced > 0) return 'derived';
    if (partial > 0) return 'partial-fixture';
    return 'synthetic';
  })();

  const defaults = {
    previewDepth:        'basic',
    metadataDepth:       'basic',
    editCapability:      'none',
    exportCapability:    'download',
    securityLimitations: [],
    knownParserGaps:     [],
    testCoverage:        'smoke',
    sampleSource:        sampleSrc,
    needsRealWorldSample: existing.realWorldQuality === 'needs-review',
  };

  const enriched = { ...existing };
  for (const [k, v] of Object.entries(defaults)) {
    if (!(k in enriched)) enriched[k] = v;
  }
  return enriched;
}

// ── Main ──────────────────────────────────────────────────────────────────────

const registrySrc     = await readFile(resolve(ROOT, 'docs/core/registry.js'),  'utf8');
const knownRegistrySrc= await readFile(resolve(ROOT, 'docs/known/registry.js'), 'utf8');
const compat          = JSON.parse(await readFile(resolve(ROOT, 'docs/examples/compatibility.json'), 'utf8'));
const examplesIndex   = JSON.parse(await readFile(resolve(ROOT, 'docs/examples/index.json'), 'utf8'));

const typeIds  = extractTypeIds(registrySrc);
const knownIds = extractKnownIds(knownRegistrySrc);

// Enrich types
const updatedTypes = {};
for (const [id, row] of Object.entries(compat.types)) {
  updatedTypes[id] = enrichTypeRow(id, row);
}
// Add any NEW types from registry not yet in the matrix
for (const id of typeIds) {
  if (!updatedTypes[id]) {
    console.warn(`  Warning: new type ${id} not in matrix — no row to enrich (run gen-registry-runtime first if needed)`);
  }
}

// Enrich known files
const updatedKnown = {};
const catalogFileSet = new Set(examplesIndex.map((e) => e.file));
// Build knownFile -> files map from index.json for backfilling empty sampleFiles
const knownFileMap = {};
for (const e of examplesIndex) {
  if (e.knownFile && e.file && catalogFileSet.has(e.file)) {
    (knownFileMap[e.knownFile] ??= []).push(e.file);
  }
}
for (const [id, row] of Object.entries(compat.knownFiles)) {
  const enriched = enrichKnownRow(row);
  // Backfill empty sampleFiles from index.json knownFile links
  if ((!enriched.sampleFiles || enriched.sampleFiles.length === 0) && knownFileMap[id]) {
    enriched.sampleFiles = knownFileMap[id];
  }
  updatedKnown[id] = enriched;
}
// Scaffold any NEW known files from the registry that have no compat row yet.
// Use the plugin's actual `id` field (from index.js), not the folder name.
for (const knownItem of extractKnownItems(knownRegistrySrc)) {
  // Read the index.js to get the real plugin id, label, and base type
  let pluginId = knownItem.id; // folder name fallback
  let label = knownItem.id;
  let baseType = 'yaml';
  let matchFilenames = [];
  try {
    const indexSrc = await readFile(resolve(ROOT, 'docs/types', knownItem.relPath, 'index.js'), 'utf8');
    const idMatch = indexSrc.match(/\bid\s*:\s*['"]([^'"]+)['"]/);
    if (idMatch) pluginId = idMatch[1];
    const labelMatch = indexSrc.match(/\blabel\s*:\s*['"]([^'"]+)['"]/);
    if (labelMatch) label = labelMatch[1];
    const baseMatch = knownItem.relPath.match(/text\/([^/]+)\/known\//);
    if (baseMatch) baseType = baseMatch[1];
    else if (knownItem.relPath.includes('text/known/')) baseType = 'raw';
    // Extract filenames from match function for sampleFiles hint (any variable === 'filename')
    const nameMatches = [...indexSrc.matchAll(/\b\w+\s*===?\s*['"]([^'"]+\.[^'"]+)['"]/g)].map((m) => m[1]);
    matchFilenames = nameMatches;
  } catch { /* skip */ }
  if (updatedKnown[pluginId]) continue;
  // Find matching example files in the catalog: from match() extraction OR knownFile links in index.json
  const knownFileLinks = examplesIndex.filter((e) => e.knownFile === pluginId && e.file).map((e) => e.file);
  const sampleFiles = [...new Set([
    ...matchFilenames.filter((f) => catalogFileSet.has(f)),
    ...knownFileLinks.filter((f) => catalogFileSet.has(f)),
  ])];
  updatedKnown[pluginId] = enrichKnownRow({
    label,
    baseType,
    support: 'supported',
    sampleFiles,
    extensions: ['.yml'],
    capabilities: { rawView: true, preview: true, diff: true, magicSelector: false, screenshot: true },
  });
  console.log(`  Scaffolded new known-file row: ${pluginId} (sampleFiles: [${sampleFiles.join(', ')}])`);
}

const output = {
  ...compat,
  version: 2,
  schema: {
    ...compat.schema,
    previewDepth:    'rich | basic | partial | structure-only | metadata-only | none',
    metadataDepth:   'rich | basic | partial | none',
    editCapability:  'full | basic | none',
    exportCapability:'transform | download | none',
    testCoverage:    'smoke+unit | smoke | unit-only | none',
    sampleSource:    'real-world | derived | synthetic | partial-fixture',
  },
  types:      updatedTypes,
  knownFiles: updatedKnown,
};

await writeFile(resolve(ROOT, 'docs/examples/compatibility.json'), JSON.stringify(output, null, 2) + '\n', 'utf8');

const typeCount  = Object.keys(updatedTypes).length;
const knownCount = Object.keys(updatedKnown).length;
console.log(`Generated compatibility.json: ${typeCount} types, ${knownCount} known files`);
