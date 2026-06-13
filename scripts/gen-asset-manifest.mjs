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
const assets = files.map((f) => f.path).filter((p) => !EXCLUDE.has(p)).sort();

// Version = hash of path+size pairs, so any change to the asset set bumps it.
const hash = createHash('sha256');
for (const p of assets) hash.update(p + ':' + files.find((f) => f.path === p).size + '\n');
const version = hash.digest('hex').slice(0, 12);

await writeFile(join(DOCS, 'asset-manifest.json'), JSON.stringify({ version, assets }, null, 0) + '\n');
console.log('asset-manifest.json: ' + assets.length + ' assets, version ' + version);
