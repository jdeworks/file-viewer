// Portable closure test: load and initialize each advertised core with generated, non-copyrighted
// placeholder bytes. This verifies runtime assets and variants, not gameplay correctness.
import assert from 'node:assert/strict';
import { createHarness, finish, isAllowedHarnessUrl } from './harness.mjs';

const specs = [
  { name: 'closure.nes', core: 'fceumm', size: 16, header: [0x4e, 0x45, 0x53, 0x1a, 1, 1] },
  { name: 'closure.sfc', core: 'snes9x', size: 0x10000, header: [] },
  { name: 'closure.gb', core: 'gambatte', size: 0x8000, header: [] },
  { name: 'closure.gba', core: 'mgba', size: 0x200, header: [] },
  { name: 'closure.gen', core: 'genesis_plus_gx', size: 0x400, header: [] },
  { name: 'closure.a26', core: 'stella2014', size: 0x1000, header: [] },
];

const ctx = await createHarness({ launchArgs: ['--use-angle=swiftshader'] });
const { page: bootstrapPage, origin, pass, fail } = ctx;
const browserContext = bootstrapPage.context();
const responses = [];
const offOrigin = [];
browserContext.on('response', (response) => {
  if (response.url().includes('/vendor/emulatorjs/')) {
    responses.push({ path: new URL(response.url()).pathname, status: response.status() });
  }
});
browserContext.on('request', (request) => {
  if (!isAllowedHarnessUrl(request.url(), origin)) offOrigin.push(request.url());
});

try {
  // Prime only the persisted preference. Each core then gets a fresh page: reloading a page while
  // an Emscripten main loop is active can abort the navigation as the old frame tears down, which
  // tests Chromium lifecycle timing instead of the vendored dependency closure.
  await bootstrapPage.goto(origin, { waitUntil: 'load' });
  await bootstrapPage.evaluate(() => localStorage.setItem('fv:settings:global', JSON.stringify({
    version: 1, values: { enableEmulators: true },
  })));
  await bootstrapPage.close();

  for (const spec of specs) {
    const page = await browserContext.newPage();
    page.setDefaultNavigationTimeout(60000);
    page.setDefaultTimeout(60000);
    try {
      await page.goto(origin, { waitUntil: 'load' });
      await page.waitForFunction(() => typeof window.__fv !== 'undefined');
      const start = responses.length;
      await page.evaluate(async ({ name, size, header }) => {
        const bytes = new Uint8Array(size);
        bytes.set(header);
        await window.__fv.openBlobFile(new Blob([bytes], { type: 'application/octet-stream' }), name);
      }, spec);
      await page.waitForFunction(() => window.__fv?.state?.type?.id === 'emulatorjs'
        && window.EJS_core === undefined);
      await page.getByRole('button', { name: /Start emulator/ }).click();
      await page.waitForFunction((core) => window.EJS_core === core
        && !!window.EJS_emulator?.gameManager?.Module, spec.core, { timeout: 60000 });
      const coreResponses = responses.slice(start);
      assert.ok(coreResponses.some((row) => row.status === 200
        && row.path.endsWith(`/cores/reports/${spec.core}.json`)), `${spec.core}: report loaded`);
      assert.ok(coreResponses.some((row) => row.status === 200
        && new RegExp(`/cores/${spec.core}-(?:legacy-)?wasm\\.data$`).test(row.path)), `${spec.core}: core data loaded`);
      assert.equal(coreResponses.some((row) => row.status >= 400), false, `${spec.core}: no runtime HTTP errors`);
      pass(`${spec.core}: report, selected core variant, decompression, and Module initialization verified`);
    } finally {
      await page.close().catch(() => {});
    }
  }

  assert.ok(responses.some((row) => row.path.endsWith('/compression/extract7z.js') && row.status === 200),
    '7z decompressor loaded for packed core assets');
  assert.equal(responses.some((row) => row.path.includes('/localization/')), false, 'no localization request');
  assert.deepEqual(offOrigin, [], 'six-core load makes no off-origin request');
  assert.equal(responses.some((row) => row.status >= 400), false, 'six-core load has no HTTP errors');
  pass('all six locked EmulatorJS dependency closures initialize with zero 404/off-origin requests');
} catch (error) {
  fail(error.stack || error.message);
} finally {
  await finish(ctx);
}
