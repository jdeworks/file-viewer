import assert from 'node:assert/strict';
import { createHarness, finish } from './harness.mjs';

const ctx = await createHarness();
const { page, origin, pass, fail } = ctx;

function luminance([r, g, b]) {
  const channels = [r, g, b].map((value) => {
    const normalized = value / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}
function contrast(a, b) {
  const first = luminance(a), second = luminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

try {
  await page.goto(origin, { waitUntil: 'load' });
  for (const viewport of [{ id: 'desktop', width: 1100, height: 800 }, { id: 'phone', width: 390, height: 844 }]) {
    for (const theme of ['light', 'dark']) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.evaluate((selectedTheme) => {
        localStorage.setItem('fv:theme', selectedTheme);
        localStorage.setItem('fv:settings:global', JSON.stringify({
          version: 1, values: { enableEmulators: false },
        }));
      }, theme);
      await page.reload({ waitUntil: 'load' });
      await page.waitForFunction(() => typeof window.__fv !== 'undefined');
      await page.evaluate(async () => {
        const bytes = new Uint8Array([0x4e, 0x45, 0x53, 0x1a, 1, 1, 0, 0]);
        await window.__fv.openBlobFile(new Blob([bytes], { type: 'application/octet-stream' }), 'settings.nes');
      });
      await page.waitForFunction(() => window.__fv?.state?.type?.id === 'gamerom');
      if (!await page.isVisible('#settingsBtn')) {
        await page.click('#moreBtn');
        await page.waitForSelector('#settingsBtn', { state: 'visible' });
      }
      await page.click('#settingsBtn');
      await page.waitForSelector('#set-enableEmulators', { state: 'attached' });
      await page.evaluate(() => {
        const summary = [...document.querySelectorAll('#settingsBody .set-group > summary')]
          .find((node) => node.textContent === 'Advanced');
        if (summary) summary.parentElement.open = true;
      });
      await page.click('label[for="set-enableEmulators"]');
      await page.waitForFunction(() => window.__fv?.state?.type?.id === 'emulatorjs');

      const geometry = await page.evaluate(() => {
        const drawer = document.getElementById('settingsDrawer');
        const body = document.getElementById('settingsBody');
        const input = document.getElementById('set-enableEmulators');
        const row = input.closest('.set-row');
        const hint = row.querySelector('.set-hint');
        const drawerRect = drawer.getBoundingClientRect();
        const rowRect = row.getBoundingClientRect();
        const inputRect = input.getBoundingClientRect();
        const color = getComputedStyle(hint).color.match(/[\d.]+/g).slice(0, 3).map(Number);
        const background = getComputedStyle(drawer).backgroundColor.match(/[\d.]+/g).slice(0, 3).map(Number);
        return {
          drawerLeft: drawerRect.left,
          drawerRight: drawerRect.right,
          viewportWidth: innerWidth,
          bodyClient: body.clientWidth,
          bodyScroll: body.scrollWidth,
          rowClient: row.clientWidth,
          rowScroll: row.scrollWidth,
          rowLeft: rowRect.left,
          rowRight: rowRect.right,
          inputLeft: inputRect.left,
          inputRight: inputRect.right,
          hintFont: parseFloat(getComputedStyle(hint).fontSize),
          hintLine: parseFloat(getComputedStyle(hint).lineHeight),
          color,
          background,
          reloadBoxes: body.querySelectorAll('.heavy-dl').length,
        };
      });
      assert.ok(geometry.drawerLeft >= -1 && geometry.drawerRight <= geometry.viewportWidth + 1,
        `${viewport.id}/${theme}: drawer fits viewport`);
      assert.ok(geometry.bodyScroll <= geometry.bodyClient + 1, `${viewport.id}/${theme}: settings body has no horizontal overflow`);
      assert.ok(geometry.rowScroll <= geometry.rowClient + 1, `${viewport.id}/${theme}: emulator row has no horizontal overflow`);
      assert.ok(geometry.inputLeft >= geometry.rowLeft && geometry.inputRight <= geometry.rowRight + 1,
        `${viewport.id}/${theme}: toggle remains inside row`);
      assert.ok(geometry.hintFont >= 11 && geometry.hintLine >= 14, `${viewport.id}/${theme}: hint remains legible`);
      assert.ok(contrast(geometry.color, geometry.background) >= 3, `${viewport.id}/${theme}: hint contrast is at least 3:1`);
      assert.equal(geometry.reloadBoxes, 0, `${viewport.id}/${theme}: no emulator reload box`);
      pass(`${viewport.id}/${theme}: live emulator setting is readable, contained, and overflow-free`);
    }
  }
  assert.deepEqual(ctx.offOrigin, [], 'responsive emulator settings make no off-origin requests');
  assert.deepEqual(ctx.consoleErrors, [], 'responsive emulator settings produce no console/page errors');
} catch (error) {
  fail(error.stack || error.message);
} finally {
  await finish(ctx);
}
