import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { basename, join, resolve } from 'node:path';
import JSZip from 'jszip';
import {
  REPO_ROOT,
  closeServer,
  isAllowedFormatUrl,
  loadChromium,
  startFormatServer,
} from './release-readiness-format-helpers.mjs';

const { server, origin } = await startFormatServer();
const browser = await loadChromium().launch({
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
});
const errors = [];
const offOrigin = [];

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.route('**/core/app.generated.js', (route) => route.fulfill({
    status: 200,
    contentType: 'text/javascript',
    body: "import './app.js';\n",
  }));
  context.on('request', (request) => {
    if (!isAllowedFormatUrl(request.url(), origin)) offOrigin.push(request.url());
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.on('pageerror', (error) => errors.push(error.stack || error.message));
  page.on('dialog', (dialog) => dialog.accept());
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto(origin, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.setItem('fv:settings:global', JSON.stringify({
    version: 1,
    values: { enableArchiveWasm: true },
  })));
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__fv);

  const originalSevenZip = await readFile(join(REPO_ROOT, 'docs/examples/Sample.7z'));
  await page.setInputFiles('#fileInput', join(REPO_ROOT, 'docs/examples/Sample.7z'));
  try {
    await page.waitForFunction(() => window.__fv?.state?.type?.id === 'archive');
  } catch (error) {
    const diagnosis = await page.evaluate(() => ({
      filename: window.__fv?.state?.intake?.filename,
      type: window.__fv?.state?.type?.id,
      toast: document.getElementById('toast')?.textContent,
      roots: window.__fv?.state?.sidebarRoots?.map((root) => root.label),
    }));
    throw new Error('7z did not activate: ' + JSON.stringify(diagnosis), { cause: error });
  }
  await page.waitForSelector('#fileTree:not([hidden]) .ft-file[data-path="README.md"]');
  assert.equal(await page.evaluate(() => window.__fv.state.treeEntries.length), 4);

  await page.click('#fileTree .ft-file[data-path="README.md"]');
  try {
    await page.waitForFunction(() => window.__fv?.state?.currentFolderPath === 'README.md'
      && window.__fv?.state?.type?.id === 'markdown');
  } catch (error) {
    const diagnosis = await page.evaluate(() => ({
      type: window.__fv?.state?.type?.id,
      currentFolderPath: window.__fv?.state?.currentFolderPath,
      toast: document.getElementById('toast')?.textContent,
    }));
    throw new Error('7z entry did not open: ' + JSON.stringify(diagnosis), { cause: error });
  }
  await page.evaluate(() => window.__fv.state.rawview.setValue('# Edited in archive\n'));

  await page.click('.arc-del-toggle');
  await page.check('.arc-del-cb[data-path="docs/guide.txt"]');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('#ftExportBtn'),
  ]);
  assert.equal(download.suggestedFilename(), 'Sample.7z-updates.zip');
  const updateBytes = await readFile(await download.path());
  const update = await JSZip.loadAsync(updateBytes);
  assert.equal(await update.file('README.md').async('string'), '# Edited in archive\n');
  assert.equal(update.file('docs/guide.txt'), null);
  const manifestEntry = update.file('_file-viewer-update.json');
  assert.ok(manifestEntry, 'update ZIP should contain its manifest');
  const manifest = JSON.parse(await manifestEntry.async('string'));
  assert.deepEqual(manifest, {
    schema: 'file-viewer-archive-update',
    version: 1,
    source: { filename: 'Sample.7z', format: '7z' },
    deletedPaths: ['docs/guide.txt'],
  });
  assert.deepEqual(await readFile(join(REPO_ROOT, 'docs/examples/Sample.7z')), originalSevenZip);

  const realArchiveFixture = process.env.FV_ARCHIVE_FIXTURE;
  if (realArchiveFixture) {
    const realArchivePath = resolve(REPO_ROOT, realArchiveFixture);
    const realArchiveName = basename(realArchivePath);
    await page.setInputFiles('#fileInput', realArchivePath);
    await page.waitForFunction((expected) => window.__fv?.state?.type?.id === 'archive'
      && window.__fv?.state?.intake?.filename === expected, realArchiveName);
    try {
      await page.waitForFunction((expected) => document.getElementById('ftRoot')?.textContent === expected,
        realArchiveName);
    } catch (error) {
      const diagnosis = await page.evaluate(() => ({
        filename: window.__fv?.state?.intake?.filename,
        type: window.__fv?.state?.type?.id,
        treeRoot: document.getElementById('ftRoot')?.textContent,
        entries: window.__fv?.state?.treeEntries?.map((entry) => entry.path),
        toast: document.getElementById('toast')?.textContent,
      }));
      throw new Error(`real archive did not mount: ${JSON.stringify(diagnosis)}`, { cause: error });
    }
    await page.waitForFunction(() => window.__fv?.state?.treeEntries?.some((entry) => !entry.disabledReason));
    const openablePath = await page.evaluate(() => window.__fv.state.treeEntries
      .find((entry) => !entry.disabledReason)?.path || '');
    assert.ok(openablePath, `${realArchiveName} should contain an openable file`);
    await page.evaluate((path) => [...document.querySelectorAll('#fileTree .ft-file')]
      .find((row) => row.dataset.path === path)?.click(), openablePath);
    await page.waitForFunction((expected) => window.__fv?.state?.currentFolderPath === expected, openablePath);
    console.log(`real archive fixture opened: ${realArchiveName} -> ${openablePath}`);
  }

  const standaloneStreams = [
    { extension: 'gz', mimeType: 'application/gzip', buffer: gzipSync(Buffer.from('standalone stream text\n')) },
    {
      extension: 'bz2',
      mimeType: 'application/x-bzip2',
      buffer: Buffer.from('QlpoOTFBWSZTWeQ3jrAAAAhRgAAQQAAmB5xAIAAij0BP1TQgGgD0VKa9CvYN0zFw+LuSKcKEhyG8dYA=', 'base64'),
    },
    {
      extension: 'xz',
      mimeType: 'application/x-xz',
      buffer: Buffer.from('/Td6WFoAAATm1rRGBMAbFyEBFgAAAAAAAAAAAO+SojQBABZzdGFuZGFsb25lIHN0cmVhbSB0ZXh0CgAAt85JGGqUlDQAATcX2JBSMx+2830BAAAAAARZWg==', 'base64'),
    },
    {
      extension: 'zst',
      mimeType: 'application/zstd',
      buffer: Buffer.from('KLUv/QRYuQAAc3RhbmRhbG9uZSBzdHJlYW0gdGV4dAo7lI5W', 'base64'),
    },
  ];
  for (const stream of standaloneStreams) {
    const filename = `notes-${stream.extension}.txt.${stream.extension}`;
    const entryPath = `notes-${stream.extension}.txt`;
    await page.setInputFiles('#fileInput', {
      name: filename,
      mimeType: stream.mimeType,
      buffer: stream.buffer,
    });
    try {
      await page.waitForFunction((expected) => window.__fv?.state?.type?.id === 'archive'
        && window.__fv?.state?.intake?.filename === expected, filename);
      await page.waitForSelector(`#fileTree .ft-file[data-path="${entryPath}"]`, { timeout: 5000 });
    } catch (error) {
      const diagnosis = await page.evaluate(() => ({
        filename: window.__fv?.state?.intake?.filename,
        type: window.__fv?.state?.type?.id,
        entries: window.__fv?.state?.treeEntries?.map((entry) => ({
          path: entry.path,
          disabledReason: entry.disabledReason,
        })),
        toast: document.getElementById('toast')?.textContent,
      }));
      throw new Error(`${stream.extension} stream did not activate: ${JSON.stringify(diagnosis)}`, { cause: error });
    }
    await page.click(`#fileTree .ft-file[data-path="${entryPath}"]`);
    try {
      await page.waitForFunction((expected) => window.__fv?.state?.currentFolderPath === expected,
        entryPath, { timeout: 10000 });
    } catch (error) {
      const diagnosis = await page.evaluate(() => ({
        currentFolderPath: window.__fv?.state?.currentFolderPath,
        filename: window.__fv?.state?.intake?.filename,
        toast: document.getElementById('toast')?.textContent,
      }));
      throw new Error(`${stream.extension} stream did not open: ${JSON.stringify(diagnosis)}`, { cause: error });
    }
    assert.match(await page.evaluate(() => window.__fv.state.rawview?.getValue?.() || ''), /standalone stream text/);
  }

  await page.click('#settingsBtn');
  const advanced = page.locator('#settingsBody details').filter({ hasText: /^Advanced/ }).last();
  if (!await advanced.evaluate((element) => element.open)) await advanced.locator('summary').click();
  const checkbox = page.locator('#set-enableArchiveWasm');
  await checkbox.uncheck();
  const rowHeight = await checkbox.locator('..').evaluate((row) => row.getBoundingClientRect().height);
  await checkbox.check();
  await page.waitForSelector('#settingsDrawer > .heavy-dl-stack .heavy-dl');
  const overlay = await page.evaluate(() => {
    const drawer = document.getElementById('settingsDrawer');
    const body = document.getElementById('settingsBody');
    const row = document.getElementById('set-enableArchiveWasm').parentElement;
    const stack = drawer.querySelector(':scope > .heavy-dl-stack');
    const drawerRect = drawer.getBoundingClientRect();
    const stackRect = stack.getBoundingClientRect();
    return {
      rowHeight: row.getBoundingClientRect().height,
      stackParent: stack.parentElement.id,
      stackBottomGap: drawerRect.bottom - stackRect.bottom,
      bodyPaddingBottom: parseFloat(getComputedStyle(body).paddingBottom),
      stackHeight: stackRect.height,
    };
  });
  assert.equal(overlay.rowHeight, rowHeight);
  assert.equal(overlay.stackParent, 'settingsDrawer');
  assert.ok(overlay.stackBottomGap >= 0 && overlay.stackBottomGap < 30, JSON.stringify(overlay));
  assert.ok(overlay.bodyPaddingBottom > overlay.stackHeight, JSON.stringify(overlay));

  assert.deepEqual(offOrigin, []);
  assert.deepEqual(errors, []);
  await context.close();
  console.log('advanced archive browsing tests passed');
} finally {
  await browser.close().catch(() => {});
  await closeServer(server);
}
