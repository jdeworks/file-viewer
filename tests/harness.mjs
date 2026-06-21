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

  // --no-sandbox: required on WSL2/Linux where unprivileged user namespaces may be
  // restricted; without it Chromium's zygote process can crash mid-run on long suites.
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 800 } });
  const page = await ctx.newPage();
  // Raise the default and navigation timeouts (30s) to 60s so that networkidle
  // waits on pages loading large vendor libs (abcjs 492 KB, sql.js WASM, etc.)
  // don't intermittently time out on slow/loaded WSL2 hosts.
  page.setDefaultNavigationTimeout(60000);
  page.setDefaultTimeout(60000);

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

  const openExample = async (label, pg) => {
    const p = pg || page;
    // Wait until window.__fv is set (app may still be initialising after networkidle)
    await p.waitForFunction(() => typeof window.__fv !== 'undefined', { timeout: 10000 });
    return p.evaluate((l) => window.__fv.openExampleByLabel(l), label);
  };

  // Wait for window.__fv to be available — needed after page.goto(waitUntil:'load') before
  // calling window.__fv directly in page.evaluate (app init is async, 'load' fires too early).
  const waitForFv = (pg) => (pg || page).waitForFunction(() => typeof window.__fv !== 'undefined', { timeout: 10000 });

  return { browser, server, page, origin, ROOT, frameOf, pass, fail, consoleErrors, offOrigin, openExample, waitForFv };
}

export async function finish(ctx) {
  const { browser, server } = ctx;
  await browser.close();
  server.close();
  console.log(process.exitCode ? '\nSMOKE FAILED' : '\nSMOKE PASSED');
}
