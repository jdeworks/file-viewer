// Machine-local release gate for a private NES ROM. The ROM is selected from disk for each cycle;
// it is never copied into docs/, Cache Storage, logs, screenshots, or repository artifacts.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHarness, finish } from './harness.mjs';

const { PNG } = createRequire(import.meta.url)('pngjs');

const rom = resolve(process.env.FV_NES_ROM || '.example-files-internet/Super Mario Bros. (World).nes');
const info = await stat(rom);
assert.equal(info.isFile(), true, 'private NES fixture must be a file');

const ctx = await createHarness({ launchArgs: ['--use-angle=swiftshader'] });
const { page, origin, pass, fail } = ctx;
const badResponses = [];
const emulatorRequests = [];
page.on('response', (response) => {
  if (response.url().includes('/vendor/emulatorjs/')) {
    emulatorRequests.push(response.url());
    if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`);
  }
});

async function openPrivateRom() {
  await page.setInputFiles('#fileInput', rom);
  await page.waitForFunction(() => window.__fv?.state?.intake?.filename?.endsWith('.nes')
    && window.__fv?.state?.type?.id && document.getElementById('typeSelect')?.value, { timeout: 15000 });
}

async function startAndProve(label) {
  await page.getByRole('button', { name: /Start emulator/ }).click();
  await page.waitForSelector('#previewHost [data-ejs-ready="1"]', { timeout: 60000 });
  await page.waitForSelector('#previewHost [data-ejs-started="1"] canvas', { timeout: 60000 });
  const canvas = page.locator('#previewHost [data-ejs-started="1"] canvas').first();
  await canvas.waitFor({ state: 'visible', timeout: 30000 });
  const dimensions = await canvas.evaluate((element) => ({ width: element.width, height: element.height }));
  assert.ok(dimensions.width > 0 && dimensions.height > 0, `${label}: emulator canvas must be nonblank-sized`);
  const frameA = await page.evaluate(() => window.EJS_emulator?.gameManager?.functions?.getFrameNum?.());
  await page.waitForTimeout(900);
  const frameB = await page.evaluate(() => window.EJS_emulator?.gameManager?.functions?.getFrameNum?.());
  assert.ok(Number.isFinite(frameA) && frameB > frameA, `${label}: emulated frame counter must advance`);
  const transientPng = await canvas.screenshot({ type: 'png' });
  const decoded = PNG.sync.read(transientPng);
  let visible = 0;
  const colors = new Set();
  for (let i = 0; i < decoded.data.length; i += 16) {
    if (decoded.data[i] || decoded.data[i + 1] || decoded.data[i + 2]) visible++;
    colors.add(`${decoded.data[i]},${decoded.data[i + 1]},${decoded.data[i + 2]},${decoded.data[i + 3]}`);
  }
  transientPng.fill(0);
  decoded.data.fill(0);
  const pixels = { visible, colors: colors.size };
  assert.ok(pixels.visible > 100 && pixels.colors > 2, `${label}: canvas must contain rendered game pixels`);

  const inputCalls = await page.evaluate(async () => {
    const emulator = window.EJS_emulator;
    const manager = emulator.gameManager;
    const calls = [];
    const original = manager.simulateInput.bind(manager);
    manager.simulateInput = (...args) => { calls.push(args); return original(...args); };
    const options = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true };
    emulator.elements.parent.dispatchEvent(new KeyboardEvent('keydown', options));
    emulator.elements.parent.dispatchEvent(new KeyboardEvent('keyup', options));
    await new Promise((resolve) => setTimeout(resolve, 250));
    manager.simulateInput = original;
    return calls;
  });
  assert.ok(inputCalls.some((args) => args[0] === 0 && args[1] === 3 && args[2] === 1),
    `${label}: Enter keydown must reach player-one Start input`);
  assert.ok(inputCalls.some((args) => args[0] === 0 && args[1] === 3 && args[2] === 0),
    `${label}: Enter keyup must release player-one Start input`);
  pass(`${label}: ready/start signals, advancing frames, nonblank canvas, and keyboard response verified`);
}

try {
  await page.goto(origin, { waitUntil: 'load' });
  await page.waitForFunction(() => !!navigator.serviceWorker?.controller, { timeout: 15000 });
  // Reload under the first active controller so the app shell and every later runtime request are
  // genuinely cache-on-use assets available to the following hard-offline navigation.
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => typeof window.__fv !== 'undefined', { timeout: 15000 });

  await openPrivateRom();
  assert.equal(await page.$eval('#typeSelect', (select) => select.value), 'gamerom',
    'NES must default to Game ROM Header while emulator preference is disabled');
  await page.click('#settingsBtn');
  await page.waitForSelector('#set-enableEmulators', { state: 'attached' });
  await page.evaluate(() => {
    const summary = [...document.querySelectorAll('#settingsBody .set-group > summary')]
      .find((node) => node.textContent === 'Advanced');
    if (summary) summary.parentElement.open = true;
  });
  await page.click('label[for="set-enableEmulators"]');
  await page.waitForFunction(() => document.getElementById('typeSelect')?.value === 'emulatorjs');
  assert.equal(await page.$eval('#settingsBody .heavy-dl', () => true).catch(() => false), false,
    'live emulator preference must not mount a reload box');
  await page.click('#settingsDrawer [data-close]');
  await startAndProve('online NES');

  const requestedPaths = emulatorRequests.map((url) => new URL(url).pathname);
  assert.ok(requestedPaths.some((path) => /\/cores\/reports\/fceumm\.json$/.test(path)), 'NES core report requested locally');
  assert.ok(requestedPaths.some((path) => /\/cores\/fceumm-(?:legacy-)?wasm\.data$/.test(path)), 'NES core data requested locally');
  assert.ok(requestedPaths.some((path) => /\/compression\/extract7z\.js$/.test(path)), '7z core extractor requested locally');
  assert.equal(requestedPaths.some((path) => path.includes('/localization/')), false, 'no localization request is made');

  await ctx.page.context().setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.__fv !== 'undefined', { timeout: 20000 });
  await openPrivateRom();
  assert.equal(await page.$eval('#typeSelect', (select) => select.value), 'emulatorjs',
    'persisted preference selects EmulatorJS after hard-offline reload');
  await startAndProve('hard-offline reselected NES');

  await page.click('#settingsBtn');
  await page.waitForSelector('#set-enableEmulators', { state: 'attached' });
  await page.evaluate(() => {
    const summary = [...document.querySelectorAll('#settingsBody .set-group > summary')]
      .find((node) => node.textContent === 'Advanced');
    if (summary) summary.parentElement.open = true;
  });
  await page.click('label[for="set-enableEmulators"]');
  await page.waitForFunction(() => document.getElementById('typeSelect')?.value === 'gamerom');
  await page.waitForTimeout(1200);
  const teardown = await page.evaluate(() => ({
    emulator: !!window.EJS_emulator,
    fetchGuard: !!window.__ejsFetchGuard,
    vendorNodes: [...document.querySelectorAll('script[src],link[href]')]
      .filter((node) => (node.getAttribute('src') || node.getAttribute('href') || '').includes('vendor/emulatorjs/')).length,
  }));
  assert.deepEqual(teardown, { emulator: false, fetchGuard: false, vendorNodes: 0 },
    'disabling preference must tear down EmulatorJS globals, request guard, and injected assets');
  pass('live disable returns to Game ROM Header and tears down EmulatorJS runtime resources');

  assert.deepEqual(badResponses, [], 'EmulatorJS runtime must have no HTTP error responses');
  assert.deepEqual(ctx.offOrigin, [], 'EmulatorJS runtime must make no off-origin requests');
  assert.deepEqual(ctx.consoleErrors, [], 'EmulatorJS runtime must produce no console/page errors');
  pass('online and hard-offline NES cycles completed with zero 404/off-origin/console errors');
} catch (error) {
  fail(error.stack || error.message);
} finally {
  await ctx.page.context().setOffline(false).catch(() => {});
  await finish(ctx);
}
