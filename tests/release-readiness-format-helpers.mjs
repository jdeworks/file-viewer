import http from 'node:http';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir, readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

export const REPO_ROOT = resolve(new URL('..', import.meta.url).pathname);
export const DOCS_ROOT = join(REPO_ROOT, 'docs');
export const FORMAT_ARTIFACT_ROOT = join(REPO_ROOT, 'artifacts/v0.1.0-public-beta-readiness');
export const FORMAT_SCREENSHOT_ROOT = join(FORMAT_ARTIFACT_ROOT, 'format-screenshots');
export const FORMAT_FIXTURE_ROOT = join(FORMAT_ARTIFACT_ROOT, 'format-fixtures');

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.md': 'text/markdown', '.txt': 'text/plain', '.csv': 'text/csv',
  '.yaml': 'application/yaml', '.yml': 'application/yaml', '.xml': 'application/xml',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.pdf': 'application/pdf', '.zip': 'application/zip', '.epub': 'application/epub+zip',
  '.wasm': 'application/wasm', '.mp4': 'video/mp4', '.mid': 'audio/midi', '.ttf': 'font/ttf',
  '.stl': 'model/stl', '.glb': 'model/gltf-binary', '.geojson': 'application/geo+json',
};

export async function ensureFormatArtifactDirs() {
  await Promise.all([
    mkdir(FORMAT_ARTIFACT_ROOT, { recursive: true }),
    mkdir(FORMAT_SCREENSHOT_ROOT, { recursive: true }),
    mkdir(FORMAT_FIXTURE_ROOT, { recursive: true }),
  ]);
}

export function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

export async function sha256File(path) {
  return sha256(await readFile(path));
}

export function loadChromium() {
  const bases = [
    '/home/jens/repos/make-it-look-good/',
    new URL('./', import.meta.url).pathname,
    process.cwd() + '/',
  ];
  for (const base of bases) {
    try { return createRequire(base)('playwright').chromium; } catch { /* try next */ }
  }
  throw new Error('Playwright not found. Run: cd tests && npm install && npx playwright install chromium');
}

export async function startFormatServer() {
  const server = http.createServer(async (req, res) => {
    try {
      let pathname = normalize(decodeURIComponent(new URL(req.url, 'http://local').pathname));
      if (pathname === '/') pathname = '/index.html';
      const file = join(DOCS_ROOT, pathname);
      if (!file.startsWith(DOCS_ROOT)) { res.writeHead(403).end('forbidden'); return; }
      const body = await readFile(file);
      res.writeHead(200, {
        'content-type': MIME[extname(file).toLowerCase()] || 'application/octet-stream',
        'cache-control': 'no-store',
      });
      res.end(body);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
    }
  });
  await new Promise((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolveListen);
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  return { server, origin };
}

export async function closeServer(server) {
  if (!server) return;
  await new Promise((resolveClose) => server.close(() => resolveClose()));
}

export function isAllowedFormatUrl(raw, origin) {
  if (/^(data|blob):/.test(raw)) return true;
  try { return new URL(raw).origin === origin; } catch { return false; }
}
