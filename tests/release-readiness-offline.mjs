import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import http from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { extname, join, normalize } from 'node:path';
import { runOfflineFidelityMatrix } from './release-fidelity-offline.mjs';

const ROOT = new URL('../docs/', import.meta.url).pathname;
const captureDir = process.env.FV_OFFLINE_CAPTURE_DIR || '';
const actualManifest = JSON.parse(await readFile(join(ROOT, 'asset-manifest.json'), 'utf8'));
const offlineSource = await readFile(join(ROOT, 'core/offline.js'), 'utf8');
const swSource = await readFile(join(ROOT, 'sw.js'), 'utf8');
const appCss = await readFile(join(ROOT, 'assets/app.css'), 'utf8');

function loadChromium() {
  for (const base of ['/home/jens/repos/make-it-look-good/', new URL('./', import.meta.url).pathname, process.cwd() + '/']) {
    try { return createRequire(base)('playwright').chromium; } catch { /* try next */ }
  }
  throw new Error('Playwright not found');
}

const slug = (id) => id.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const bundleFiles = new Map();
for (const bundle of actualManifest.bundles) {
  bundleFiles.set(bundle.id, [`fixture/bundle-${slug(bundle.id)}.js`]);
}
bundleFiles.set('core', [
  'offline-harness.html',
  'core/offline.js',
  'assets/app.css',
  'fixture/bundle-core.js',
]);
bundleFiles.set('types', [
  'fixture/bundle-types.js',
  'fixture/office-viewer.js',
  'fixture/archive-viewer.js',
  'fixture/editable-viewer.js',
]);
bundleFiles.set('games', [...bundleFiles.get('games'), 'fixture/cache-use.js']);

const bundles = actualManifest.bundles.map((bundle) => ({
  id: bundle.id,
  label: bundle.label,
  group: bundle.group,
  heavy: bundle.heavy,
  size: bundle.size,
  files: bundleFiles.get(bundle.id),
}));
const state = {
  version: 'rr-v1',
  realAssets: false,
  fail: new Set(),
  delayAssetsMs: 0,
  delaySwMs: 0,
  networkDown: false,
  requests: [],
};
const manifestForState = () => state.realAssets ? actualManifest : ({
  version: state.version,
  assets: bundles.flatMap((bundle) => bundle.files),
  bundles,
});

const viewerModules = {
  'fixture/office-viewer.js': `import pdf from './bundle-vendor-pdfjs.js'; export const value = 'office:' + pdf;`,
  'fixture/archive-viewer.js': `import archive from './bundle-vendor-libarchive.js'; export const value = 'archive:' + archive;`,
  'fixture/editable-viewer.js': `import monaco from './bundle-vendor-monaco.js'; export const value = 'editable:' + monaco;`,
  'fixture/cache-use.js': `export const value = 'cache-on-use';`,
};

function harnessHtml() {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="assets/app.css"><title>Offline readiness harness</title></head>
<body><main id="fixture"></main><span id="offlineBadge" hidden></span><div id="offlineStatus" class="offline-status" hidden></div>
<script type="module">
import { initOffline, initOfflineBadge, offlineMissHtml } from './core/offline.js';
const targets = {
  office: './fixture/office-viewer.js',
  archive: './fixture/archive-viewer.js',
  editable: './fixture/editable-viewer.js',
  cacheUse: './fixture/cache-use.js',
};
window.__rrOpen = async (name) => {
  const host = document.getElementById('fixture');
  try {
    const mod = await import(targets[name]);
    host.className = 'fixture-ok'; host.textContent = mod.value; return mod.value;
  } catch (error) {
    if (!navigator.onLine) { host.className = ''; host.innerHTML = offlineMissHtml(); return 'offline-miss'; }
    host.className = 'fixture-error'; host.textContent = error.message; throw error;
  }
};
initOffline(document.getElementById('offlineStatus'));
initOfflineBadge();
window.__rrReady = true;
</script></body></html>`;
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const prefix = '/viewer/';
  if (!url.pathname.startsWith(prefix)) { res.writeHead(404).end(); return; }
  const rel = normalize(decodeURIComponent(url.pathname.slice(prefix.length))).replace(/^\.\.(\/|\\)/, '');
  state.requests.push({ version: state.version, path: rel, at: Date.now() });
  if (state.networkDown) { req.socket.destroy(); return; }
  if (state.fail.has(rel)) { res.writeHead(503, { 'content-type': 'text/plain' }).end('injected failure'); return; }
  if (rel === 'sw.js' && state.delaySwMs) await new Promise((resolve) => setTimeout(resolve, state.delaySwMs));
  if (rel.startsWith('fixture/') && state.delayAssetsMs) await new Promise((resolve) => setTimeout(resolve, state.delayAssetsMs));
  if (state.networkDown) { req.socket.destroy(); return; }
  let body;
  if (rel === 'offline-harness.html') body = harnessHtml();
  else if (rel === 'core/offline.js') body = offlineSource;
  else if (rel === 'assets/app.css') body = appCss;
  else if (rel === 'asset-manifest.json') body = JSON.stringify(manifestForState());
  else if (rel === 'sw.js') body = state.realAssets ? swSource
    : swSource.replace(/^const VERSION = '[^']*';.*$/m, `const VERSION = '${state.version}';`);
  else if (viewerModules[rel]) body = viewerModules[rel];
  else if (rel.startsWith('fixture/bundle-') && rel.endsWith('.js')) {
    const bundle = bundles.find((candidate) => candidate.files.includes(rel));
    body = `export default ${JSON.stringify(bundle?.id || rel)};`;
  } else {
    const full = join(ROOT, rel);
    if (!full.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    try { body = await readFile(full); } catch { res.writeHead(404).end(); return; }
  }
  const headers = { 'content-type': MIME[extname(rel)] || 'application/octet-stream', 'cache-control': 'no-store' };
  res.writeHead(200, headers).end(body);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const appUrl = `${origin}/viewer/offline-harness.html`;

const chromium = loadChromium();
const headedCapture = Boolean(captureDir && (process.env.DISPLAY || process.env.WAYLAND_DISPLAY));
const browser = await chromium.launch({
  headless: !headedCapture,
  // Headless Chromium's own compositor is more reliable for nested-scroll evidence. The headed
  // WSL path still uses software compositing because WSLg otherwise leaves stale GPU tiles.
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
    ...(headedCapture ? ['--disable-gpu'] : [])],
});
const failures = [];
let passes = 0;

async function scenario(name, fn) {
  try {
    state.version = 'rr-v1'; state.realAssets = false; state.fail.clear(); state.delayAssetsMs = 0; state.delaySwMs = 0; state.networkDown = false; state.requests.length = 0;
    await fn();
    passes++;
    console.log('✓ ' + name);
  } catch (error) {
    failures.push(`${name}: ${error.stack || error.message}`);
    console.error('✗ ' + name + ': ' + error.message);
  }
}

async function fresh({ viewport = { width: 1280, height: 720 }, colorScheme = 'light' } = {}) {
  const context = await browser.newContext({ viewport, colorScheme, serviceWorkers: 'allow' });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  return { context, page };
}

async function gotoHarness(page) {
  await page.goto(appUrl, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__rrReady === true);
  await page.waitForSelector('#offlineStatus:not([hidden])');
}

async function waitForController(page) {
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 });
}

async function openModal(page) {
  await page.click('#offlineStatus');
  await page.waitForSelector('.cache-modal');
}

async function cachePaths(page) {
  return page.evaluate(async () => {
    const key = (await caches.keys()).find((candidate) => candidate.startsWith('file-viewer-'));
    if (!key) return [];
    const requests = await (await caches.open(key)).keys();
    return requests.map((request) => new URL(request.url).pathname.replace(/^\/viewer\//, '')).sort();
  });
}

async function cacheMeta(page) {
  return page.evaluate(async () => {
    const key = (await caches.keys()).find((candidate) => candidate.startsWith('file-viewer-'));
    if (!key) return null;
    const cache = await caches.open(key);
    const status = (await cache.keys()).find((request) => request.url.includes('__fv-cache-status__'));
    return status ? (await cache.match(status)).json() : null;
  });
}

async function cachedAssetHashes(page, assets) {
  return page.evaluate(async (paths) => {
    const key = (await caches.keys()).find((candidate) => candidate.startsWith('file-viewer-'));
    if (!key) return {};
    const cache = await caches.open(key);
    const hex = (bytes) => [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, '0')).join('');
    const out = {};
    for (let offset = 0; offset < paths.length; offset += 32) {
      const slice = paths.slice(offset, offset + 32);
      const records = await Promise.all(slice.map(async (path) => {
        const response = await cache.match(new URL(path, document.baseURI));
        if (!response) return [path, null];
        return [path, hex(await crypto.subtle.digest('SHA-256', await response.arrayBuffer()))];
      }));
      for (const [path, hash] of records) out[path] = hash;
    }
    return out;
  }, assets);
}

function fmtSize(n) {
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n / 1024).toFixed(0) + ' KB';
  return (n / 1048576).toFixed(1) + ' MB';
}

const expectedPresets = {
  'common-v': ['core', 'known', 'types', 'vendor:dompurify', 'vendor:markdown-it', 'vendor:js-yaml', 'vendor:papaparse',
    'vendor:jszip', 'vendor:pdfjs', 'vendor:xlsx', 'vendor:mammoth', 'vendor:pptxviewjs', 'vendor:cfb',
    'vendor:html2canvas', 'vendor:gifuct', 'vendor:utif', 'vendor:libheif', 'vendor:fonts', 'vendor:monaco',
    'examples:catalog', 'examples:text-config', 'examples:data', 'examples:office'],
  'common-e': ['core', 'known', 'types', 'vendor:dompurify', 'vendor:markdown-it', 'vendor:js-yaml', 'vendor:papaparse',
    'vendor:jszip', 'vendor:pdfjs', 'vendor:xlsx', 'vendor:mammoth', 'vendor:pptxviewjs', 'vendor:cfb',
    'vendor:html2canvas', 'vendor:gifuct', 'vendor:gifenc', 'vendor:utif', 'vendor:libheif', 'vendor:fonts',
    'vendor:monaco', 'vendor:tiptap', 'vendor:pdf-lib', 'vendor:konva',
    'examples:catalog', 'examples:text-config', 'examples:data', 'examples:office'],
  'office-v': ['core', 'known', 'types', 'vendor:dompurify', 'vendor:markdown-it', 'vendor:js-yaml',
    'vendor:jszip', 'vendor:pdfjs', 'vendor:xlsx', 'vendor:mammoth', 'vendor:pptxviewjs', 'vendor:cfb',
    'vendor:html2canvas', 'vendor:monaco', 'examples:catalog', 'examples:office', 'examples:text-config', 'examples:data'],
  'office-e': ['core', 'known', 'types', 'vendor:dompurify', 'vendor:markdown-it', 'vendor:js-yaml',
    'vendor:jszip', 'vendor:pdfjs', 'vendor:xlsx', 'vendor:mammoth', 'vendor:pptxviewjs', 'vendor:cfb',
    'vendor:html2canvas', 'vendor:monaco', 'vendor:tiptap', 'vendor:pdf-lib',
    'examples:catalog', 'examples:office', 'examples:text-config', 'examples:data'],
};
const emulatorBundleIds = bundles.filter((bundle) => bundle.group === 'Emulators').map((bundle) => bundle.id).sort();

await scenario('cache-on-use works before opt-in and does not claim a full save', async () => {
  const { context, page } = await fresh();
  try {
    await gotoHarness(page); await waitForController(page);
    await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => window.__rrReady);
    assert.equal(await page.evaluate(() => localStorage.getItem('fv:offline:savedVersion')), null);
    assert.equal(await page.evaluate(() => window.__rrOpen('cacheUse')), 'cache-on-use');
    assert.ok((await cachePaths(page)).includes('fixture/cache-use.js'));
    assert.ok(!(await cachePaths(page)).includes('fixture/bundle-vendor-libarchive.js'));
    state.networkDown = true; await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => window.__rrReady);
    assert.equal(await page.evaluate(() => window.__rrOpen('cacheUse')), 'cache-on-use');
    assert.ok(await page.isVisible('#offlineBadge'));
  } finally { await context.close(); }
});

await scenario('first-visit save queues until the initial controller claims the page', async () => {
  state.delaySwMs = 1500;
  const { context, page } = await fresh();
  try {
    await gotoHarness(page);
    await openModal(page);
    assert.equal(await page.evaluate(() => !!navigator.serviceWorker.controller), false);
    await page.click('.cm-save');
    await page.waitForSelector('#offlineStatus.partial', { timeout: 12000 });
    assert.ok(/selected/i.test(await page.textContent('#offlineStatus')));
  } finally { await context.close(); }
});

await scenario('concurrent tab saves are queued, correlated, and both selections are persisted', async () => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, serviceWorkers: 'allow' });
  const pageA = await context.newPage();
  const pageB = await context.newPage();
  pageA.setDefaultTimeout(15000);
  pageB.setDefaultTimeout(15000);
  try {
    await gotoHarness(pageA); await waitForController(pageA);
    await gotoHarness(pageB); await waitForController(pageB);
    for (const page of [pageA, pageB]) {
      await page.evaluate(() => {
        window.__rrPrecacheMessages = [];
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (/^precache-/.test(event.data?.type || '')) window.__rrPrecacheMessages.push(event.data);
        });
      });
    }

    state.delayAssetsMs = 80;
    await openModal(pageA);
    await pageA.click('.cm-preset[data-preset="office-v"]');
    await pageA.click('.cm-save');
    await pageA.waitForSelector('#offlineStatus.caching');

    await openModal(pageB);
    await pageB.click('.cm-none');
    await pageB.check('.cm-chk[data-id="games"]');
    await pageB.click('.cm-save');
    await pageB.waitForSelector('#offlineStatus.caching');

    await Promise.all([pageA, pageB].map((page) => page.waitForFunction(() =>
      window.__rrPrecacheMessages.some((message) => message.type === 'precache-done'), null, { timeout: 30000 })));
    const [messagesA, messagesB] = await Promise.all([pageA, pageB].map((page) =>
      page.evaluate(() => window.__rrPrecacheMessages)));
    const idsA = new Set(messagesA.map((message) => message.requestId));
    const idsB = new Set(messagesB.map((message) => message.requestId));
    assert.equal(idsA.size, 1, JSON.stringify(messagesA));
    assert.equal(idsB.size, 1, JSON.stringify(messagesB));
    assert.notEqual([...idsA][0], [...idsB][0], 'each tab must receive only its own request id');
    assert.equal(messagesA.some((message) => message.type === 'precache-error'), false);
    assert.equal(messagesB.some((message) => message.type === 'precache-error'), false);

    const paths = await cachePaths(pageA);
    for (const id of expectedPresets['office-v']) {
      for (const file of bundleFiles.get(id)) assert.ok(paths.includes(file), `tab A: ${file}`);
    }
    for (const file of bundleFiles.get('games')) assert.ok(paths.includes(file), `tab B: ${file}`);
  } finally { await context.close(); }
});

await scenario('modal controls, exact presets, totals, focus, and responsive layout are correct', async () => {
  const { context, page } = await fresh({ viewport: { width: 390, height: 844 } });
  try {
    await gotoHarness(page); await waitForController(page);
    await page.focus('#offlineStatus'); await page.keyboard.press('Enter'); await page.waitForSelector('.cache-modal');
    const defaultBundleIds = await page.$$eval('.cm-chk', (elements) => elements.map((element) => element.dataset.id));
    assert.equal(defaultBundleIds.some((id) => emulatorBundleIds.includes(id)), false,
      'emulator bundles stay hidden before the real Settings opt-in');
    assert.ok(await page.evaluate(() => document.querySelector('.cache-modal').contains(document.activeElement)));
    assert.equal(await page.getAttribute('.cache-modal', 'aria-modal'), 'true');
    const required = await page.$$eval('.cm-chk:disabled', (els) => els.map((el) => [el.dataset.id, el.checked]));
    assert.deepEqual(required, [['core', true], ['known', true]]);
    assert.ok(await page.locator('.cm-heavy').count() > 0);
    for (const [id, expected] of Object.entries(expectedPresets)) {
      await page.click(`.cm-preset[data-preset="${id}"]`);
      const selected = await page.$$eval('.cm-chk:checked', (els) => els.map((el) => el.dataset.id).sort());
      assert.deepEqual(selected, [...new Set(expected)].sort(), `${id} dependency closure`);
      const sum = await page.$$eval('.cm-chk:checked', (els) => els.reduce((n, el) => n + Number(el.dataset.size || 0), 0));
      assert.equal(await page.textContent('.cm-total'), 'Selected: ' + fmtSize(sum));
    }
    await page.click('.cm-none');
    assert.deepEqual(await page.$$eval('.cm-chk:checked', (els) => els.map((el) => el.dataset.id).sort()), ['core', 'known']);
    await page.click('.cm-all');
    assert.equal(await page.locator('.cm-chk:not(:checked)').count(), 0);
    const group = page.locator('.cm-group-head').first();
    const before = await group.getAttribute('aria-expanded'); await group.click();
    assert.notEqual(await group.getAttribute('aria-expanded'), before);
    const metrics = await page.evaluate(() => {
      const modal = document.querySelector('.cache-modal'); const toolbar = document.querySelector('.cm-toolbar'); const foot = document.querySelector('.cm-foot');
      return { modalOverflow: modal.scrollWidth - modal.clientWidth, toolbarOverflow: toolbar.scrollWidth - toolbar.clientWidth,
        footBottom: foot.getBoundingClientRect().bottom, viewport: innerHeight };
    });
    assert.ok(metrics.modalOverflow <= 1 && metrics.toolbarOverflow <= 1, JSON.stringify(metrics));
    assert.ok(metrics.footBottom <= metrics.viewport + 1, JSON.stringify(metrics));
    await page.locator('.cm-save').focus(); await page.keyboard.press('Tab');
    assert.ok(await page.evaluate(() => document.querySelector('.cache-modal').contains(document.activeElement)), 'Tab stays in modal');
    await page.keyboard.press('Escape'); await page.waitForSelector('.cache-modal', { state: 'detached' });
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'offlineStatus');
    await openModal(page); await page.click('.cm-close'); await page.waitForSelector('.cache-modal', { state: 'detached' });
    await openModal(page); await page.$eval('.cache-modal-backdrop', (el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await page.waitForSelector('.cache-modal', { state: 'detached' });
    await page.evaluate(() => localStorage.setItem('fv:settings:global', JSON.stringify({
      version: 1,
      values: { enableEmulators: true },
    })));
    await openModal(page);
    const visibleBundleIds = await page.$$eval('.cm-chk', (elements) => elements
      .map((element) => element.dataset.id).sort());
    const visibleEmulators = visibleBundleIds.filter((id) => emulatorBundleIds.includes(id));
    assert.deepEqual(visibleEmulators, emulatorBundleIds, 'real Settings persistence must reveal emulator bundles');
    await page.keyboard.press('Escape');
  } finally { await context.close(); }
});

await scenario('offline modal fits phone, tablet, and desktop in both themes', async () => {
  const viewports = [
    { id: 'phone', width: 390, height: 844 },
    { id: 'tablet', width: 768, height: 900 },
    { id: 'desktop', width: 1440, height: 900 },
  ];
  const appearances = new Map();
  for (const viewport of viewports) {
    for (const theme of ['light', 'dark']) {
      const { context, page } = await fresh({ viewport: { width: viewport.width, height: viewport.height }, colorScheme: theme });
      try {
        await gotoHarness(page);
        await page.evaluate((value) => { document.documentElement.dataset.theme = value; }, theme);
        await waitForController(page); await openModal(page);
        const metrics = await page.evaluate(() => {
          const modal = document.querySelector('.cache-modal');
          const toolbar = document.querySelector('.cm-toolbar');
          const groups = document.querySelector('.cm-groups');
          const footer = document.querySelector('.cm-foot');
          const save = document.querySelector('.cm-save');
          const close = document.querySelector('.cm-close');
          const rect = (element) => {
            const box = element.getBoundingClientRect();
            return { left: box.left, top: box.top, right: box.right, bottom: box.bottom, width: box.width, height: box.height };
          };
          const rgb = (value) => (value.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
          const luminance = (value) => {
            const channels = rgb(value).map((channel) => {
              const normalized = channel / 255;
              return normalized <= .04045 ? normalized / 12.92 : ((normalized + .055) / 1.055) ** 2.4;
            });
            return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
          };
          const modalStyle = getComputedStyle(modal);
          const foreground = luminance(modalStyle.color); const background = luminance(modalStyle.backgroundColor);
          const contrast = (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05);
          return {
            theme: document.documentElement.dataset.theme,
            viewport: { width: innerWidth, height: innerHeight },
            modal: rect(modal), footer: rect(footer), save: rect(save), close: rect(close),
            modalOverflow: modal.scrollWidth - modal.clientWidth,
            toolbarOverflow: toolbar.scrollWidth - toolbar.clientWidth,
            groupsScrollable: groups.scrollHeight > groups.clientHeight,
            footerVisible: getComputedStyle(footer).visibility !== 'hidden' && footer.getClientRects().length > 0,
            background: modalStyle.backgroundColor,
            color: modalStyle.color,
            contrast,
          };
        });
        assert.equal(metrics.theme, theme);
        assert.ok(metrics.modal.left >= -1 && metrics.modal.top >= -1
          && metrics.modal.right <= metrics.viewport.width + 1 && metrics.modal.bottom <= metrics.viewport.height + 1,
        `${viewport.id}/${theme}: ${JSON.stringify(metrics)}`);
        assert.ok(metrics.modalOverflow <= 1 && metrics.toolbarOverflow <= 1, `${viewport.id}/${theme}: ${JSON.stringify(metrics)}`);
        assert.ok(metrics.footerVisible && metrics.footer.bottom <= metrics.modal.bottom + 1, `${viewport.id}/${theme}: footer`);
        assert.ok(metrics.save.right <= metrics.modal.right && metrics.close.right <= metrics.modal.right, `${viewport.id}/${theme}: controls`);
        assert.ok(metrics.contrast >= 4.5, `${viewport.id}/${theme}: modal contrast ${metrics.contrast}`);
        assert.equal(metrics.groupsScrollable, true, `${viewport.id}/${theme}: bundle list must scroll inside the modal`);
        if (captureDir) {
          await mkdir(captureDir, { recursive: true });
          const modal = page.locator('.cache-modal');
          const clip = await modal.boundingBox();
          assert.ok(clip, `${viewport.id}/${theme}: modal screenshot bounds`);
          // Capture the asserted modal bounds directly. Whole-page WSL captures can retain stale
          // black compositor tiles after the nested list scrolls, obscuring the sticky controls.
          await modal.screenshot({ path: join(captureDir, `offline-modal-${viewport.id}-${theme}-top.png`),
            animations: 'disabled' });
          await page.$eval('.cache-modal', (element) => {
            const groups = element.querySelector('.cm-groups');
            groups.scrollTop = groups.scrollHeight;
            // Rebuild the compositor layer after moving the nested scroller. Merely waiting leaves
            // transparent/stale tiles on some WSL Chromium paths, especially at desktop width.
            element.style.display = 'none';
            void document.body.offsetHeight;
            element.style.display = '';
            groups.scrollTop = groups.scrollHeight;
            void element.offsetHeight;
          });
          await page.waitForTimeout(100);
          await modal.screenshot({ path: join(captureDir, `offline-modal-${viewport.id}-${theme}-bottom.png`),
            animations: 'disabled' });
        }
        appearances.set(`${viewport.id}/${theme}`, `${metrics.background}/${metrics.color}`);
      } finally { await context.close(); }
    }
    assert.notEqual(appearances.get(`${viewport.id}/light`), appearances.get(`${viewport.id}/dark`), `${viewport.id}: theme colors differ`);
  }
});

await scenario('limited Office selection is honest; selected dependencies work and omitted viewer misses offline', async () => {
  const { context, page } = await fresh();
  try {
    await gotoHarness(page); await waitForController(page); await openModal(page);
    await page.click('.cm-preset[data-preset="office-v"]'); await page.click('.cm-save');
    await page.waitForSelector('#offlineStatus.partial', { timeout: 15000 });
    assert.equal(await page.evaluate(() => localStorage.getItem('fv:offline:savedVersion')), null);
    const selected = [...new Set(expectedPresets['office-v'].flatMap((id) => bundleFiles.get(id)))].sort();
    const paths = await cachePaths(page);
    const statusPaths = paths.filter((path) => path.startsWith('__fv-cache-status__/'));
    const cachedFiles = paths.filter((path) => !path.startsWith('__fv-cache-status__/')).sort();
    assert.equal(statusPaths.length, 1, JSON.stringify(paths));
    assert.deepEqual(cachedFiles, [...selected, 'asset-manifest.json'].sort(),
      'limited save cache must equal the selected manifest files plus the modal manifest fetch');
    const meta = await cacheMeta(page);
    assert.deepEqual([...meta.savedFiles].sort(), selected, 'status metadata must list the exact selected set');
    assert.equal(meta.selected, selected.length);
    assert.equal(meta.cached, selected.length);
    assert.equal(meta.full, false);
    assert.deepEqual(meta.failed, []);
    assert.ok(!paths.includes('fixture/bundle-vendor-libarchive.js'));
    state.networkDown = true; await context.setOffline(true); await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => window.__rrReady);
    assert.match(await page.evaluate(() => window.__rrOpen('office')), /^office:/);
    assert.match(await page.evaluate(() => window.__rrOpen('editable')), /^editable:/);
    const archiveResult = await page.evaluate(() => window.__rrOpen('archive'));
    assert.equal(archiveResult, 'offline-miss', JSON.stringify({ paths: await cachePaths(page), requests: state.requests.slice(-12) }));
    assert.ok(await page.isVisible('.offline-miss'));
  } finally { await context.close(); }
});

await scenario('production full save is byte-exact and hard-offline fidelity viewers remain complete', async () => {
  state.realAssets = true;
  state.version = actualManifest.version;
  const { context, page } = await fresh();
  page.setDefaultTimeout(360000);
  try {
    await gotoHarness(page); await waitForController(page);
    await page.evaluate(() => localStorage.setItem('fv:settings:global', JSON.stringify({
      version: 1,
      values: { enableEmulators: true },
    })));
    await openModal(page); await page.click('.cm-all'); await page.click('.cm-save');
    await page.waitForSelector('#offlineStatus.ready', { timeout: 360000 });

    const expectedAssets = [...new Set(actualManifest.assets)].sort();
    assert.equal(expectedAssets.length, actualManifest.assets.length, 'release manifest paths must be unique');
    const meta = await cacheMeta(page);
    assert.equal(meta.version, actualManifest.version);
    assert.equal(meta.full, true);
    assert.equal(meta.complete, true);
    assert.equal(meta.selectionComplete, true);
    assert.equal(meta.selected, expectedAssets.length);
    assert.equal(meta.cached, expectedAssets.length);
    assert.equal(meta.total, expectedAssets.length);
    assert.deepEqual([...meta.savedFiles].sort(), expectedAssets, 'full-save metadata must equal the release manifest');
    assert.deepEqual(meta.failed, []);

    const paths = await cachePaths(page);
    const statusPaths = paths.filter((path) => path.startsWith('__fv-cache-status__/'));
    const cachedFiles = paths.filter((path) => !path.startsWith('__fv-cache-status__/')).sort();
    assert.equal(statusPaths.length, 1, JSON.stringify(statusPaths));
    assert.deepEqual(cachedFiles, [...expectedAssets, 'asset-manifest.json'].sort(),
      'production cache must contain every release asset and no unexplained file');

    const expectedHashes = Object.fromEntries(await Promise.all(expectedAssets.map(async (asset) => {
      const bytes = await readFile(join(ROOT, asset));
      return [asset, createHash('sha256').update(bytes).digest('hex')];
    })));
    const cacheHashes = await cachedAssetHashes(page, expectedAssets);
    assert.deepEqual(cacheHashes, expectedHashes,
      'every cached production response must be byte-for-byte identical to the release asset');

    await runOfflineFidelityMatrix({
      page,
      context,
      origin,
      setServerOffline: () => { state.networkDown = true; },
    });
  } finally { await context.close(); }
});

await scenario('real Office preset reopens an actual XLSX viewer after a hard offline reload', async () => {
  state.realAssets = true;
  state.version = actualManifest.version;
  const { context, page } = await fresh();
  page.setDefaultTimeout(60000);
  const offOrigin = [];
  page.on('request', (request) => {
    const raw = request.url();
    if (/^(?:data|blob):/.test(raw)) return;
    try { if (new URL(raw).origin !== origin) offOrigin.push(raw); }
    catch { offOrigin.push(raw); }
  });
  try {
    await page.goto(`${origin}/viewer/index.html`, { waitUntil: 'load' });
    await page.waitForFunction(() => !!window.__fv, null, { timeout: 30000 });
    await page.waitForSelector('#offlineStatus:not([hidden])');
    await waitForController(page);
    await openModal(page);
    await page.click('.cm-preset[data-preset="office-v"]');
    await page.click('.cm-save');
    await page.waitForSelector('#offlineStatus.partial', { timeout: 60000 });
    // Cache the real 7z fixture itself without opening it. Its omitted libarchive viewer must still
    // miss offline; otherwise a missing sample file would be testing intake rather than dependency
    // closure, while opening it online would contaminate the cache with the viewer.
    assert.equal(await page.evaluate(async () => {
      const response = await fetch('examples/Sample.7z');
      await response.arrayBuffer();
      return response.ok;
    }), true);
    await page.waitForFunction(async () => {
      const key = (await caches.keys()).find((candidate) => candidate.startsWith('file-viewer-'));
      return key && !!(await (await caches.open(key)).match('examples/Sample.7z'));
    });
    assert.equal((await cachePaths(page)).some((path) => path.startsWith('vendor/libarchive/')), false);
    await page.evaluate(() => localStorage.setItem('fv:settings:global', JSON.stringify({
      version: 1,
      values: { enableArchiveWasm: true },
    })));

    state.networkDown = true;
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!window.__fv, null, { timeout: 30000 });
    const opened = await page.evaluate(() => window.__fv.openExampleByLabel('Sample.xlsx'));
    assert.equal(opened, true);
    await page.waitForFunction(() => window.__fv?.state?.type?.id === 'xlsx', null, { timeout: 30000 });
    await page.waitForSelector('#previewHost .xe-table .xe-cell', { timeout: 30000 });
    const previewText = await page.textContent('#previewHost');
    assert.match(previewText, /Ada Lovelace/);
    assert.equal(await page.evaluate(() => window.__fv.openExampleByLabel('Sample.7z')), true);
    await page.waitForFunction(() => window.__fv?.state?.type?.id === 'archive', null, { timeout: 30000 });
    await page.waitForTimeout(1000);
    const archiveMiss = await page.evaluate(() => ({
      offlineMiss: !!document.querySelector('#previewHost .offline-miss'),
      preview: document.getElementById('previewHost')?.textContent?.replace(/\s+/g, ' ').trim() || '',
      enableArchiveWasm: window.__fv?.state?.settingsModel?.values?.enableArchiveWasm,
      online: navigator.onLine,
    }));
    assert.equal(archiveMiss.offlineMiss, true, JSON.stringify(archiveMiss));
    assert.equal(offOrigin.length, 0, JSON.stringify([...new Set(offOrigin)]));
  } finally { await context.close(); }
});

await scenario('failed and interrupted saves never report ready and resume to an exact full cache', async () => {
  const { context, page } = await fresh();
  try {
    await gotoHarness(page); await waitForController(page);
    await page.evaluate(() => localStorage.setItem('fv:settings:global', JSON.stringify({
      version: 1,
      values: { enableEmulators: true },
    })));
    await openModal(page); await page.click('.cm-all');
    state.fail.add('fixture/bundle-vendor-ffmpeg.js');
    await page.click('.cm-save'); await page.waitForSelector('#offlineStatus.error', { timeout: 15000 });
    assert.ok(!await page.isVisible('#offlineStatus.ready'));
    assert.ok(!(await cachePaths(page)).includes('fixture/bundle-vendor-ffmpeg.js'));
    state.fail.clear(); state.delayAssetsMs = 80;
    await openModal(page); await page.click('.cm-all'); await page.click('.cm-save');
    await page.waitForSelector('#offlineStatus.caching'); state.networkDown = true; await context.setOffline(true);
    await page.waitForSelector('#offlineStatus.error', { timeout: 15000 });
    state.networkDown = false; await context.setOffline(false); state.delayAssetsMs = 0;
    await openModal(page); await page.click('.cm-all'); await page.click('.cm-save');
    await page.waitForSelector('#offlineStatus.ready', { timeout: 20000 });
    const paths = await cachePaths(page);
    for (const asset of manifestForState().assets) assert.ok(paths.includes(asset), asset);
    const meta = await page.evaluate(async () => {
      const key = (await caches.keys()).find((candidate) => candidate.startsWith('file-viewer-'));
      const cache = await caches.open(key); const status = (await cache.keys()).find((request) => request.url.includes('__fv-cache-status__'));
      return status ? (await cache.match(status)).json() : null;
    });
    assert.equal(meta.full, true); assert.equal(meta.complete, true);
  } finally { await context.close(); }
});

await scenario('cache eviction overrides stale localStorage readiness', async () => {
  const { context, page } = await fresh();
  try {
    await gotoHarness(page); await waitForController(page);
    await page.evaluate(() => localStorage.setItem('fv:settings:global', JSON.stringify({
      version: 1,
      values: { enableEmulators: true },
    })));
    await openModal(page); await page.click('.cm-all'); await page.click('.cm-save');
    await page.waitForSelector('#offlineStatus.ready', { timeout: 20000 });
    assert.equal(await page.evaluate(() => localStorage.getItem('fv:offline:savedVersion')), 'rr-v1');
    await page.evaluate(async () => { for (const key of await caches.keys()) if (key.startsWith('file-viewer-')) await caches.delete(key); });
    await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => window.__rrReady);
    await page.waitForSelector('#offlineStatus.idle', { timeout: 12000 });
    assert.equal(await page.evaluate(() => localStorage.getItem('fv:offline:savedVersion')), null);
  } finally { await context.close(); }
});

await scenario('v1 to v2 update prompts, cleans only stale app caches, and reevaluates saved state', async () => {
  const { context, page } = await fresh();
  try {
    await gotoHarness(page); await waitForController(page);
    await page.evaluate(() => localStorage.setItem('fv:settings:global', JSON.stringify({
      version: 1,
      values: { enableEmulators: true },
    })));
    await openModal(page); await page.click('.cm-all'); await page.click('.cm-save');
    await page.waitForSelector('#offlineStatus.ready', { timeout: 20000 });
    await page.evaluate(() => caches.open('unrelated-release-readiness'));
    state.version = 'rr-v2';
    await page.evaluate(async () => { const reg = await navigator.serviceWorker.getRegistration(); await reg.update(); });
    await page.waitForSelector('#updateBanner', { timeout: 15000 });
    assert.ok((await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL))?.endsWith('/viewer/sw.js'));
    await page.click('.ub-dismiss');
    await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => window.__rrReady);
    await page.waitForSelector('#updateBanner', { timeout: 15000 });
    await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), page.click('.ub-reload')]);
    await page.waitForFunction(() => window.__rrReady); await page.waitForSelector('#offlineStatus.idle', { timeout: 15000 });
    const keys = await page.evaluate(() => caches.keys());
    assert.ok(keys.includes('file-viewer-rr-v2')); assert.ok(!keys.includes('file-viewer-rr-v1')); assert.ok(keys.includes('unrelated-release-readiness'));
    assert.equal(await page.evaluate(() => localStorage.getItem('fv:offline:savedVersion')), null);
  } finally { await context.close(); }
});

await scenario('Clear offline data empties the cache, resets the pill, and is guarded by confirm', async () => {
  const { context, page } = await fresh();
  try {
    await gotoHarness(page); await waitForController(page);
    await page.evaluate(() => localStorage.setItem('fv:settings:global', JSON.stringify({
      version: 1,
      values: { enableEmulators: true },
    })));
    // Save everything, reach the green ready state.
    await openModal(page); await page.click('.cm-all'); await page.click('.cm-save');
    await page.waitForSelector('#offlineStatus.ready', { timeout: 20000 });
    assert.ok((await cachePaths(page)).length > 0, 'precache must populate the cache first');
    assert.equal(await page.evaluate(() => localStorage.getItem('fv:offline:savedVersion')), 'rr-v1');

    // A cancelled confirm must leave the save fully intact.
    page.once('dialog', (dialog) => dialog.dismiss());
    await openModal(page); await page.click('.cm-clear');
    assert.ok(await page.isVisible('.cache-modal'), 'cancelling keeps the modal open');
    await page.keyboard.press('Escape'); await page.waitForSelector('.cache-modal', { state: 'detached' });
    await page.waitForSelector('#offlineStatus.ready', { timeout: 5000 });
    assert.ok((await cachePaths(page)).length > 0, 'a cancelled clear preserves the cache');

    // An accepted confirm empties every owned cache and returns the pill to idle.
    page.once('dialog', (dialog) => dialog.accept());
    await openModal(page); await page.click('.cm-clear');
    await page.waitForSelector('.cache-modal', { state: 'detached' });
    await page.waitForSelector('#offlineStatus.idle', { timeout: 15000 });
    assert.deepEqual(await cachePaths(page), [], 'clear removes every cached asset, including the status record');
    assert.equal(await page.evaluate(() => localStorage.getItem('fv:offline:savedVersion')), null);
    assert.equal(await page.evaluate(async () =>
      (await caches.keys()).some((key) => key.startsWith('file-viewer-'))), false, 'no owned cache remains');
  } finally { await context.close(); }
});

await browser.close();
await new Promise((resolve) => server.close(resolve));

if (failures.length) {
  console.error(`\nOFFLINE READINESS FAILED — ${failures.length} failure(s), ${passes} pass(es)`);
  for (const failure of failures) console.error('\n' + failure);
  process.exit(1);
}
console.log(`\nOFFLINE READINESS PASSED — ${passes} scenarios`);
