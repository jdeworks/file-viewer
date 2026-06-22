// Local preview server for the static site — serve docs/ to eyeball changes before they go to dev.
//
//   node scripts/serve.mjs            # http://localhost:8097
//   node scripts/serve.mjs 9000       # custom port (or PORT=9000 node scripts/serve.mjs)
//
// Zero dependencies. Same-origin only, correct MIME types for ES modules + .wasm, and no-cache
// headers so a reload always shows the latest edit (the service worker still registers as in prod;
// if a stale SW gets in the way, hard-reload or toggle "Update" / clear site data in DevTools).
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname } from 'node:path';

const ROOT = new URL('../docs/', import.meta.url).pathname;
const PORT = Number(process.argv[2] || process.env.PORT || 8097);

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.map': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.avif': 'image/avif',
  '.ico': 'image/x-icon', '.bmp': 'image/bmp',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.flac': 'audio/flac',
  '.m4a': 'audio/mp4', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
  '.pdf': 'application/pdf', '.zip': 'application/zip', '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8', '.wgsl': 'text/plain; charset=utf-8',
};

const server = createServer(async (req, res) => {
  try {
    let p = normalize(decodeURIComponent((req.url || '/').split('?')[0]));
    if (p === '/' || p === '\\') p = '/index.html';
    const file = join(ROOT, p);
    if (!file.startsWith(ROOT)) { res.writeHead(403).end('forbidden'); return; }   // no path escape
    let target = file;
    try { if ((await stat(target)).isDirectory()) target = join(target, 'index.html'); } catch { /* fall through to read */ }
    const body = await readFile(target);
    res.writeHead(200, {
      'content-type': MIME[extname(target)] || 'application/octet-stream',
      'cache-control': 'no-cache, no-store, must-revalidate',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('404 not found');
  }
});

server.listen(PORT, () => {
  console.log(`file-viewer dev server → http://localhost:${PORT}/  (serving docs/, Ctrl+C to stop)`);
});
