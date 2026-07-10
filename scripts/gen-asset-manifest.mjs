// Generates docs/asset-manifest.json — the list of every static asset under docs/ plus a
// content-hash version. The service worker precaches this list so the app works fully
// offline. Re-run whenever files are added/removed: `node scripts/gen-asset-manifest.mjs`.
// The smoke test fails if the manifest is stale, so it can't silently drift.
import { createReadStream } from 'node:fs';
import { readdir, stat, readFile, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const DOCS = new URL('../docs/', import.meta.url).pathname;
const EXCLUDE = new Set(['asset-manifest.json', 'sw.js']);   // manifest + SW manage themselves

async function walk(dir, out) {
  for (const name of await readdir(dir)) {
    const full = join(dir, name);
    const st = await stat(full);
    if (st.isDirectory()) {
      if (name.startsWith('_')) continue;                   // _-prefixed dirs are local/scratch (e.g. _held) — never deployed
      await walk(full, out);
    } else out.push({ path: relative(DOCS, full).split('\\').join('/'), fullPath: full, size: st.size });
  }
}

// Hash asset metadata and bytes incrementally so large vendored files do not need to be buffered.
export async function contentVersion(files) {
  const hash = createHash('sha256');
  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));
  const count = Buffer.allocUnsafe(4);
  count.writeUInt32BE(sorted.length);
  hash.update(count);

  for (const file of sorted) {
    const path = Buffer.from(file.path);
    const header = Buffer.allocUnsafe(12);
    header.writeUInt32BE(path.length, 0);
    header.writeBigUInt64BE(BigInt(file.size), 4);
    hash.update(header);
    hash.update(path);
    for await (const chunk of createReadStream(file.fullPath)) hash.update(chunk);
  }

  return hash.digest('hex').slice(0, 12);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
const files = [];
await walk(DOCS, files);
const kept = files.filter((f) => !EXCLUDE.has(f.path)).sort((a, b) => a.path.localeCompare(b.path));
const assets = kept.map((f) => f.path);

// Group assets into named BUNDLES so the cache-download modal can offer per-bundle offline saving
// (each with a size). Core app shell, each vendored library, type renderers, known-files, games,
// and examples are separate. Heavy = a big optional download the modal leaves unchecked by default.
function bundleOf(path) {
  if (path.startsWith('vendor/')) {
    const parts = path.split('/');
    return 'vendor:' + (parts.length > 2 ? parts[1] : parts[1].replace(/(\.min)?\.[^.]+$/, ''));
  }
  if (path.startsWith('bts/') || path.startsWith('games/metagame/') || path.startsWith('examples/metagame/') || path === 'examples/easteregg') return 'easteregg';
  if (path.startsWith('examples/')) return exampleBundleOf(path);
  if (path.startsWith('games/')) return 'games';
  if (path.startsWith('types/')) return 'types';
  if (path.startsWith('known/')) return 'known';
  return 'core';            // index.html, core/, assets/, *.json, etc. — the app shell
}
function extOf(path) {
  const base = path.split('/').pop().toLowerCase();
  return base.includes('.') ? base.split('.').pop() : '';
}
function exampleBundleOf(path) {
  const base = path.split('/').pop().toLowerCase();
  const ext = extOf(path);
  if (['index.json', 'provenance.json', '_config.yml', '_redirects'].includes(base)) return 'examples:catalog';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'jxl', 'tif', 'tiff', 'bmp', 'ico', 'svg', 'eps', 'psd', 'xcf'].includes(ext)) return 'examples:image';
  if (['mp3', 'wav', 'flac', 'ogg', 'oga', 'm4a', 'mp4', 'webm', 'avi', 'mov', 'mid', 'midi'].includes(ext)) return 'examples:media';
  if (['pdf', 'docx', 'odt', 'pptx', 'xlsx', 'xls', 'epub', 'mobi', 'fb2', 'lrf', 'djvu', 'rtf'].includes(ext)) return 'examples:office';
  if (['zip', '7z', 'cbz', 'bin', 'nes', 'sfc', 'smc', 'gb', 'gbc', 'gba', 'n64', 'z64', 'v64', 'wasm', 'sqlite', 'db', 'clip'].includes(ext)) return 'examples:binary';
  if (['json', 'jsonl', 'yaml', 'yml', 'toml', 'xml', 'csv', 'tsv', 'har', 'ini', 'env', 'gpx', 'geojson', 'kml', 'vcf', 'ics', 'ofx', 'qfx'].includes(ext)) return 'examples:data';
  if (['md', 'markdown', 'txt', 'log', 'ans', 'srt', 'vtt'].includes(ext)) return 'examples:text-config';
  return 'examples:text-config';
}
const LABELS = {
  core: 'Core app', types: 'File-type viewers', known: 'Known-file enhancers', games: 'Arcade games',
  easteregg: 'Easter eggs',
  'vendor:easymde': 'EasyMDE legacy editor',
  'examples:catalog': 'Examples catalog',
  'examples:text-config': 'Text/config examples',
  'examples:data': 'Data examples',
  'examples:office': 'Office/document examples',
  'examples:image': 'Image examples',
  'examples:media': 'Media examples',
  'examples:binary': 'Archive/binary examples',
};
const labelFor = (id) => LABELS[id] || (id.startsWith('vendor:') ? id.slice(7) + ' (library)' : id);

// Modal display group for each bundle. Future emulator bundles use group 'Emulators'.
const BUNDLE_GROUPS = {
  core: 'App shell', known: 'App shell',
  types: 'File viewers',
  'vendor:dompurify': 'File viewers', 'vendor:js-yaml': 'File viewers', 'vendor:markdown-it': 'File viewers',
  'vendor:jszip': 'File viewers', 'vendor:papaparse': 'File viewers', 'vendor:pdf-lib': 'File viewers',
  'vendor:pptxviewjs': 'File viewers', 'vendor:mammoth': 'File viewers', 'vendor:html2canvas': 'File viewers',
  'vendor:ag-psd': 'File viewers', 'vendor:jxl': 'File viewers',
  'vendor:monaco': 'Editor', 'vendor:tiptap': 'Editor',
  'vendor:easymde': 'Editor',
  'vendor:chartjs': 'Data & charts', 'vendor:xlsx': 'Data & charts', 'vendor:sql.js': 'Data & charts',
  'vendor:pdfjs': 'Documents',
  'vendor:libarchive': 'Archives',
  'vendor:ffmpeg': 'Media',
  'vendor:ruffle': 'Emulators',
  'vendor:v86': 'Emulators',
  'vendor:emulatorjs': 'Emulators',
  games: 'Games',
  easteregg: 'Easter eggs',
  'examples:catalog': 'Content',
  'examples:text-config': 'Content',
  'examples:data': 'Data & charts',
  'examples:office': 'Documents',
  'examples:image': 'Media',
  'examples:media': 'Media',
  'examples:binary': 'Archives',
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
// Bundles always treated as heavy/opt-in regardless of size (lazy-loaded only when
// the feature is used, so they should NOT be precached by default).
const FORCE_HEAVY = new Set(['vendor:easymde', 'vendor:jxl', 'vendor:tesseract']);
// Essential bundles are NEVER heavy: 'core' is the app shell (index.html + core/ + assets/ + the
// bundled type-detection registry) — it must always be precached for offline-first to work, so it is
// not an optional download even though detection bundling has pushed it past HEAVY_BYTES (~1.58 MB).
const NEVER_HEAVY = new Set(['core']);
const bundles = [...groups.values()]
  .map((g) => ({ ...g, group: groupFor(g.id), heavy: !NEVER_HEAVY.has(g.id) && (g.size > HEAVY_BYTES || FORCE_HEAVY.has(g.id)) }))
  .sort((a, b) => (a.id === 'core' ? -1 : b.id === 'core' ? 1 : a.label.localeCompare(b.label)));

// Version changes when the asset set or any asset bytes change.
const version = await contentVersion(kept);

await writeFile(join(DOCS, 'asset-manifest.json'), JSON.stringify({ version, assets, bundles }, null, 0) + '\n');

// Stamp the same version into the service worker. This makes sw.js's BYTES change on every deploy,
// which is what triggers the browser to install a new SW (and then prompt the user to reload); it
// also names the per-version cache. sw.js is excluded from the manifest (and from the version hash),
// so rewriting it here can never change `version` — no chicken-and-egg.
const SW = join(DOCS, 'sw.js');
const swOriginal = await readFile(SW, 'utf8');
let swText = swOriginal;

// Self-heal a merge conflict around the VERSION line. sw.js is regenerated on every deploy, so a
// lane→dev merge ALWAYS conflicts here. The documented resolution is "just run this generator" — for
// that to be sufficient, collapse any conflict block whose two sides are ONLY VERSION lines down to a
// single line, which the stamp below rewrites to the fresh hash. A conflict containing anything other
// than VERSION lines is NOT safe to auto-resolve, so fail loudly rather than commit half-merged JS
// (a sw.js with literal <<<<<<< markers is broken JS that bricks the service worker). Handles diff3
// style too (the optional `|||||||` base section). Idempotent on a clean file (no markers → no-op).
if (/^<{7}/m.test(swText)) {
  const VERSION_LINE = /^const VERSION = '[^']*';/;
  const stampedLine = `const VERSION = '${version}';   // stamped by scripts/gen-asset-manifest.mjs`;
  const out = [];
  let inConflict = false, conflictLines = [];
  for (const line of swText.split('\n')) {
    if (/^<{7}/.test(line)) { inConflict = true; conflictLines = []; continue; }   // <<<<<<< ours
    if (inConflict && /^(={7}|\|{7})/.test(line)) continue;                        // ======= / ||||||| separators
    if (inConflict && /^>{7}/.test(line)) {                                        // >>>>>>> theirs — close block
      const bad = conflictLines.find((l) => l.trim() !== '' && !VERSION_LINE.test(l));
      if (bad) throw new Error('gen-asset-manifest: sw.js has a merge conflict NOT confined to the ' +
        'VERSION line — resolve it by hand, then re-run. Offending line: ' + bad.trim());
      out.push(stampedLine);                                                       // collapse to one good line
      inConflict = false; conflictLines = [];
      continue;
    }
    if (inConflict) { conflictLines.push(line); continue; }
    out.push(line);
  }
  swText = out.join('\n');
}

const swStamped = swText.replace(/^const VERSION = '[^']*';.*$/m, `const VERSION = '${version}';   // stamped by scripts/gen-asset-manifest.mjs`);
if (swStamped !== swOriginal) await writeFile(SW, swStamped);

console.log('asset-manifest.json: ' + assets.length + ' assets, ' + bundles.length + ' bundles, version ' + version);
console.log('sw.js: VERSION stamped to ' + version);
}
