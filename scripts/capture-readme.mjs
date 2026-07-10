// Capture the README screenshots from a clean, local browser session.
import http from 'node:http';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('../docs/', import.meta.url)));
const ASSET_DIR = resolve(fileURLToPath(new URL('../.github/assets/', import.meta.url)));
const MAX_IMAGE_BYTES = 500 * 1024;
const MIME = {
  '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
  '.md': 'text/markdown', '.mjs': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm', '.woff': 'font/woff', '.woff2': 'font/woff2',
};

function loadChromium() {
  const bases = [
    new URL('../tests/package.json', import.meta.url),
    new URL('../package.json', import.meta.url),
  ];
  for (const base of bases) {
    try { return createRequire(base)('playwright').chromium; } catch { /* try the next location */ }
  }
  throw new Error('Playwright not found. Run: cd tests && npm install && npx playwright install chromium');
}

function createServer() {
  return http.createServer(async (req, res) => {
    try {
      let pathname = normalize(decodeURIComponent((req.url || '/').split('?')[0]));
      if (pathname === '/') pathname = '/index.html';
      const file = join(ROOT, pathname);
      if (!file.startsWith(ROOT + '/') && file !== join(ROOT, 'index.html')) {
        res.writeHead(403).end();
        return;
      }
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
}

function listen(server) {
  return new Promise((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolveListen(server.address().port));
  });
}

async function preparePage(context, origin) {
  const page = await context.newPage();
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('fv:theme', 'light');
  });
  await page.goto(origin, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof window.__fv !== 'undefined', { timeout: 15000 });
  const opened = await page.evaluate(() => window.__fv.openExampleByLabel('welcome.md'));
  if (!opened) throw new Error('Could not open the built-in welcome.md example');
  await page.waitForFunction(() => document.getElementById('fileName')?.textContent === 'welcome.md');
  await page.waitForSelector('#workspace:not([hidden])');
  await page.waitForSelector('.construction-badge');
  return page;
}

async function assertCapture(page, { mobile }) {
  const state = await page.evaluate(() => ({
    workspace: !document.getElementById('workspace')?.hidden,
    beta: document.querySelector('.construction-badge')?.textContent?.trim(),
    tree: !document.getElementById('fileTree')?.hidden,
    mode: document.getElementById('panes')?.dataset.mode,
    tab: document.getElementById('panes')?.dataset.tab,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  if (!state.workspace) throw new Error('Workspace did not become visible');
  if (state.beta !== 'Public beta') throw new Error('Public beta badge was not visible');
  if (mobile) {
    if (state.tree) throw new Error('Mobile tree should be closed');
    if (state.tab !== 'preview') throw new Error('Mobile preview tab was not active');
    if (state.scrollWidth > state.clientWidth) throw new Error('Mobile capture has horizontal overflow');
  } else {
    if (!state.tree) throw new Error('Desktop tree should be visible');
    if (state.mode !== 'split') throw new Error('Desktop split view was not active');
  }
}

async function capture(browser, origin, output, options) {
  const context = await browser.newContext({
    viewport: options.viewport,
    deviceScaleFactor: 1,
    colorScheme: 'light',
    isMobile: options.mobile ? true : undefined,
    hasTouch: options.mobile ? true : undefined,
  });
  try {
    const page = await preparePage(context, origin);
    if (options.mobile) {
      await page.locator('#treeBtn').click();
      await page.waitForFunction(() => document.getElementById('fileTree')?.hidden === true);
    } else {
      await page.locator('#viewMode [data-mode="split"]').click();
      await page.waitForFunction(() => document.getElementById('panes')?.dataset.mode === 'split');
    }
    await assertCapture(page, options);
    await page.screenshot({ path: output });
    const size = (await stat(output)).size;
    if (size > MAX_IMAGE_BYTES) throw new Error(`${output} is ${size} bytes; limit is ${MAX_IMAGE_BYTES}`);
  } finally {
    await context.close();
  }
}

const server = createServer();
let browser;
try {
  const port = await listen(server);
  const origin = `http://127.0.0.1:${port}`;
  await mkdir(ASSET_DIR, { recursive: true });
  browser = await loadChromium().launch({ args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });
  await capture(browser, origin, join(ASSET_DIR, 'file-viewer-desktop.png'), {
    viewport: { width: 1440, height: 900 },
    mobile: false,
  });
  await capture(browser, origin, join(ASSET_DIR, 'file-viewer-mobile.png'), {
    viewport: { width: 390, height: 844 },
    mobile: true,
  });
  console.log('Captured README screenshots.');
} finally {
  await browser?.close();
  await new Promise((resolveClose) => server.close(resolveClose));
}
