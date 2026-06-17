// Standalone smoke test: serves docs/ and drives headless Chromium.
// Uses the Playwright install from the sibling make-it-look-good repo.
// Verifies: page loads clean, markdown renders in the sandboxed iframe, the magic
// selector wires preview->raw, and ZERO off-origin requests are made (trust guarantee).
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { createRequire } from 'node:module';

// Resolve Playwright from whatever's available: a sibling make-it-look-good checkout
// (local dev), this tests/ folder's own node_modules (CI installs it there), or cwd.
function loadChromium() {
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

const ROOT = new URL('../docs/', import.meta.url).pathname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.md': 'text/markdown', '.txt': 'text/plain',
  '.wav': 'audio/wav', '.ipynb': 'application/json', '.svg': 'image/svg+xml', '.eml': 'message/rfc822', '.zip': 'application/zip', '.ics': 'text/calendar', '.yaml': 'application/yaml', '.toml': 'application/toml',
  '.xml': 'application/xml', '.epub': 'application/epub+zip', '.pdf': 'application/pdf', '.har': 'application/har+json',
  '.env': 'text/plain', '.ini': 'text/plain', '.patch': 'text/x-diff', '.log': 'text/plain',
  '.geojson': 'application/geo+json', '.gpx': 'application/gpx+xml', '.als': 'application/x-ableton-live-set', '.mid': 'audio/midi', '.midi': 'audio/midi', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg',
  '.sqlite': 'application/vnd.sqlite3', '.clip': 'application/vnd.clip-studio.paint', '.wasm': 'application/wasm', '.png': 'image/png', '.srt': 'application/x-subrip', '.vcf': 'text/vcard', '.stl': 'model/stl', '.obj': 'model/obj', '.glb': 'model/gltf-binary', '.3mf': 'model/3mf', '.mbox': 'application/mbox', '.ply': 'model/ply' };

export const fail = (m) => { console.error('✗ ' + m); process.exitCode = 1; };
export const pass = (m) => console.log('✓ ' + m);

export async function createHarness() {
  const chromium = loadChromium();

  const server = http.createServer(async (req, res) => {
    try {
      let p = normalize(decodeURIComponent(req.url.split('?')[0]));
      if (p === '/') p = '/index.html';
      const file = join(ROOT, p);
      if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
      res.end(body);
    } catch { res.writeHead(404).end('not found'); }
  });

  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;
  const origin = `http://localhost:${port}`;

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 800 } });
  const page = await ctx.newPage();

  // Robust contentFrame(): an iframe element can exist before its content document has committed,
  // so handle.contentFrame() transiently returns null → "Cannot read properties of null". Poll
  // briefly until the frame is ready. Used everywhere instead of a bare .contentFrame().
  // Accepts a CSS selector (preferred) or an element handle. A selector is re-queried fresh on
  // each poll, so it survives the app swapping the iframe (which detaches a held handle and makes
  // its contentFrame() return null forever).
  async function frameOf(target, timeout = 8000) {
    const deadline = Date.now() + timeout;
    const get = async () => {
      const h = typeof target === 'string' ? await page.$(target) : target;
      return h ? await h.contentFrame() : null;
    };
    let f = await get();
    while (!f && Date.now() < deadline) { await page.waitForTimeout(50); f = await get(); }
    if (!f) throw new Error('iframe never produced a content frame: ' + (typeof target === 'string' ? target : '<handle>'));
    return f;
  }

  const consoleErrors = [];
  const offOrigin = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));
  page.on('request', (req) => {
    const u = req.url();
    if (!u.startsWith(origin) && !u.startsWith('data:') && !u.startsWith('blob:')) offOrigin.push(u);
  });

  const openExample = (label, pg) => (pg || page).evaluate((l) => window.__fv.openExampleByLabel(l), label);

  return { browser, server, page, origin, ROOT, frameOf, pass, fail, consoleErrors, offOrigin, openExample };
}

export async function finish(ctx) {
  const { browser, server } = ctx;
  await browser.close();
  server.close();
  console.log(process.exitCode ? '\nSMOKE FAILED' : '\nSMOKE PASSED');
}
