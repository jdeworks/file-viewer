// Generates docs/asset-manifest.json — the list of every static asset under docs/ plus a
// content-hash version. The service worker precaches this list so the app works fully
// offline. Re-run whenever files are added/removed: `node scripts/gen-asset-manifest.mjs`.
// The smoke test fails if the manifest is stale, so it can't silently drift.
import { readdir, stat, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';

const DOCS = new URL('../docs/', import.meta.url).pathname;
const EXCLUDE = new Set(['asset-manifest.json', 'sw.js']);   // manifest + SW manage themselves

async function walk(dir, out) {
  for (const name of await readdir(dir)) {
    const full = join(dir, name);
    const st = await stat(full);
    if (st.isDirectory()) await walk(full, out);
    else out.push({ path: relative(DOCS, full).split('\\').join('/'), size: st.size });
  }
}

const files = [];
await walk(DOCS, files);
const kept = files.filter((f) => !EXCLUDE.has(f.path)).sort((a, b) => a.path.localeCompare(b.path));
const assets = kept.map((f) => f.path);

// Group assets into named BUNDLES so the cache-download modal can offer per-bundle offline saving
// (each with a size). Core app shell, each vendored library, type renderers, known-files, games,
// and examples are separate. Heavy = a big optional download the modal leaves unchecked by default.
function bundleOf(path) {
  if (path.startsWith('vendor/') && path.split('/').length > 2) return 'vendor:' + path.split('/')[1];
  if (path.startsWith('examples/')) return 'examples';
  if (path.startsWith('games/')) return 'games';
  if (path.startsWith('types/')) return 'types';
  if (path.startsWith('known/')) return 'known';
  return 'core';            // index.html, core/, assets/, *.json, etc. — the app shell
}
const LABELS = {
  core: 'Core app', types: 'File-type viewers', known: 'Known-file enhancers', games: 'Arcade games',
  examples: 'Example files',
};
const labelFor = (id) => LABELS[id] || (id.startsWith('vendor:') ? id.slice(7) + ' (library)' : id);

// Modal display group for each bundle. Future emulator bundles use group 'Emulators'.
const BUNDLE_GROUPS = {
  core: 'App shell', known: 'App shell',
  types: 'File viewers',
  'vendor:dompurify': 'File viewers', 'vendor:js-yaml': 'File viewers', 'vendor:markdown-it': 'File viewers',
  'vendor:jszip': 'File viewers', 'vendor:papaparse': 'File viewers', 'vendor:pdf-lib': 'File viewers',
  'vendor:pptxviewjs': 'File viewers', 'vendor:mammoth': 'File viewers', 'vendor:html2canvas': 'File viewers',
  'vendor:ag-psd': 'File viewers',
  'vendor:monaco': 'Editor',
  'vendor:chartjs': 'Data & charts', 'vendor:xlsx': 'Data & charts', 'vendor:sql.js': 'Data & charts',
  'vendor:pdfjs': 'Documents',
  'vendor:libarchive': 'Archives',
  'vendor:ffmpeg': 'Media',
  'vendor:ruffle': 'Emulators',
  'vendor:v86': 'Emulators',
  'vendor:emulatorjs': 'Emulators',
  games: 'Games',
  examples: 'Content',
};
const groupFor = (id) => BUNDLE_GROUPS[id] || 'File viewers';

const groups = new Map();
for (const f of kept) {
  const id = bundleOf(f.path);
  if (!groups.has(id)) groups.set(id, { id, label: labelFor(id), files: [], size: 0 });
  const g = groups.get(id);
  g.files.push(f.path); g.size += f.size;
}
const HEAVY_BYTES = 1.5 * 1024 * 1024;   // bundles over this are large optional downloads
const bundles = [...groups.values()]
  .map((g) => ({ ...g, group: groupFor(g.id), heavy: g.size > HEAVY_BYTES }))
  .sort((a, b) => (a.id === 'core' ? -1 : b.id === 'core' ? 1 : a.label.localeCompare(b.label)));

// Version = hash of path+size pairs, so any change to the asset set bumps it.
const hash = createHash('sha256');
for (const f of kept) hash.update(f.path + ':' + f.size + '\n');
const version = hash.digest('hex').slice(0, 12);

await writeFile(join(DOCS, 'asset-manifest.json'), JSON.stringify({ version, assets, bundles }, null, 0) + '\n');
console.log('asset-manifest.json: ' + assets.length + ' assets, ' + bundles.length + ' bundles, version ' + version);
