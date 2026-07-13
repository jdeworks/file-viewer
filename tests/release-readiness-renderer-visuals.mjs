import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { createHarness, finish } from './harness.mjs';

const require = createRequire(import.meta.url);
const { PNG } = require('pngjs');

const ctx = await createHarness();
const { page, origin, ROOT, frameOf, waitForFv } = ctx;
const captureDir = process.env.FV_RENDERER_VISUAL_CAPTURE_DIR || '';

function rgb(value) {
  return (String(value).match(/[\d.]+/g) || []).slice(0, 3).map(Number);
}

function luminance(value) {
  const channels = rgb(value).map((channel) => {
    const normalized = channel / 255;
    return normalized <= .04045 ? normalized / 12.92 : ((normalized + .055) / 1.055) ** 2.4;
  });
  return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
}

function contrast(foreground, background) {
  const a = luminance(foreground), b = luminance(background);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}

function assertContrast(sample, label, minimum = 4.5) {
  const ratio = contrast(sample.color, sample.backgroundColor);
  assert.ok(ratio >= minimum, `${label} contrast ${ratio.toFixed(2)}:1 (${sample.color} on ${sample.backgroundColor})`);
}

function foregroundStats(bytes) {
  const png = PNG.sync.read(bytes);
  const inset = 10;
  let pixels = 0;
  let minX = png.width;
  let minY = png.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = inset; y < png.height - inset; y++) {
    for (let x = inset; x < png.width - inset; x++) {
      const offset = (y * png.width + x) * 4;
      const r = png.data[offset];
      const g = png.data[offset + 1];
      const b = png.data[offset + 2];
      const alpha = png.data[offset + 3];
      if (alpha < 32 || (r > 235 && g > 235 && b > 235)) continue;
      pixels++;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  return {
    pixels,
    width: maxX >= minX ? maxX - minX + 1 : 0,
    height: maxY >= minY ? maxY - minY + 1 : 0,
  };
}

async function openFixture(filename, mime, expectedType) {
  const bytes = await readFile(join(ROOT, 'examples', filename));
  await page.evaluate(async ({ data, filename: name, mime: type }) => {
    await window.__fv.openBlobFile(new Blob([new Uint8Array(data)], { type }), name, { mime: type });
  }, { data: [...bytes], filename, mime });
  await page.waitForFunction((id) => window.__fv?.state?.type?.id === id, expectedType, { timeout: 20000 });
}

async function previewFrame(selector) {
  const frame = await frameOf('iframe.fv-preview-frame');
  await frame.waitForSelector(selector, { timeout: 12000 });
  return frame;
}

async function closeMobileTreeIfOpen() {
  const tree = page.locator('#fileTree');
  if (!await tree.isVisible().catch(() => false)) return;
  await page.locator('#treeCloseBtn').click();
  await tree.waitFor({ state: 'hidden', timeout: 5000 });
}

async function capture(name, selector = 'iframe.fv-preview-frame') {
  if (!captureDir) return;
  await mkdir(captureDir, { recursive: true });
  await page.locator(selector).screenshot({ path: join(captureDir, `${name}.png`), animations: 'disabled' });
}

async function stylePair(frame, foregroundSelector, backgroundSelector = foregroundSelector) {
  return frame.evaluate(({ foregroundSelector: fgSelector, backgroundSelector: bgSelector }) => {
    const foreground = document.querySelector(fgSelector);
    const background = document.querySelector(bgSelector);
    return {
      color: getComputedStyle(foreground).color,
      backgroundColor: getComputedStyle(background).backgroundColor,
    };
  }, { foregroundSelector, backgroundSelector });
}

try {
  await page.goto(origin, { waitUntil: 'load' });
  await waitForFv();

  await openFixture('sample.topojson', 'application/json', 'geojson');
  let frame = await previewFrame('.geo-preview');
  const topo = await frame.evaluate(() => ({
    statsDisplay: getComputedStyle(document.querySelector('.geo-stats')).display,
    badgeDisplay: getComputedStyle(document.querySelector('.geo-badge')).display,
    chipBorder: getComputedStyle(document.querySelector('.geo-chip')).borderStyle,
    headerGap: getComputedStyle(document.querySelector('.geo-header')).gap,
  }));
  assert.equal(topo.statsDisplay, 'grid');
  assert.equal(topo.badgeDisplay, 'flex');
  assert.equal(topo.chipBorder, 'solid');
  assert.notEqual(topo.headerGap, 'normal');
  await capture('topojson-light');

  await openFixture('sample.kml', 'application/vnd.google-earth.kml+xml', 'kml');
  frame = await previewFrame('.kml-preview');
  assert.equal(await frame.$eval('.kml-stats', (element) => getComputedStyle(element).display), 'grid');
  assert.equal(await frame.$eval('.kml-badge', (element) => getComputedStyle(element).display), 'flex');

  await openFixture('sample.elf', 'application/x-executable', 'exe');
  await page.waitForSelector('#previewHost .exe-preview', { timeout: 12000 });
  assert.equal(await page.$eval('#previewHost .exe-badge', (element) => getComputedStyle(element).display), 'flex');
  assert.equal(await page.$eval('#previewHost .exe-table', (element) => getComputedStyle(element).width !== 'auto'), true);
  assert.equal(await page.$eval('#previewHost .exe-sha256', (element) => getComputedStyle(element).overflowWrap), 'anywhere');
  assert.equal(await page.$('#previewHost iframe.fv-preview-frame'), null);
  await capture('exe-light', '#previewHost .exe-preview');

  if (await page.evaluate(() => document.documentElement.dataset.theme !== 'dark')) await page.click('#themeBtn');
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');

  await openFixture('sample.fits', 'application/fits', 'fits');
  frame = await previewFrame('.fits-preview');
  assert.equal(await frame.$eval('.fits-stats', (element) => getComputedStyle(element).display), 'grid');
  assert.equal(await frame.$eval('.fits-badge', (element) => getComputedStyle(element).display), 'flex');
  await capture('fits-dark');

  await page.setViewportSize({ width: 1440, height: 900 });
  await openFixture('sample.dxf', 'image/vnd.dxf', 'dxf');
  frame = await previewFrame('.dxf-canvas');
  assert.equal(await frame.$eval('body', (element) => element.classList.contains('fv-dark')), true);
  assertContrast(await stylePair(frame, '.card td', '.card'), 'DXF table value');
  const dxfCanvas = await frame.evaluate(() => ({
    backgroundColor: getComputedStyle(document.querySelector('.dxf-canvas-wrap')).backgroundColor,
    bodyBackground: getComputedStyle(document.body).backgroundColor,
  }));
  assert.notEqual(dxfCanvas.backgroundColor, 'rgb(251, 251, 251)');
  assert.equal(dxfCanvas.bodyBackground, 'rgb(30, 30, 30)');
  await capture('dxf-dark');

  await page.setViewportSize({ width: 1280, height: 720 });
  await openFixture('sample.nc', 'application/netcdf', 'netcdf');
  frame = await previewFrame('.nc-header');
  assertContrast(await stylePair(frame, '.card dd', '.card'), 'NetCDF global attribute');
  assertContrast(await stylePair(frame, '.card tbody td', '.card'), 'NetCDF table value');
  await capture('netcdf-dark');

  await page.setViewportSize({ width: 390, height: 844 });
  await openFixture('sample.npy', 'application/octet-stream', 'npy');
  await closeMobileTreeIfOpen();
  frame = await previewFrame('.header-card');
  assertContrast(await stylePair(frame, '.info-value', '.info-grid'), 'NumPy array metadata');
  assertContrast(await stylePair(frame, '.val', '.values-block'), 'NumPy data value');
  assert.equal(await frame.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), true);
  await capture('npy-phone-dark');

  await openFixture('sample.kml', 'application/vnd.google-earth.kml+xml', 'kml');
  await closeMobileTreeIfOpen();
  frame = await previewFrame('.kml-table');
  const kmlMobile = await frame.evaluate(() => {
    const table = document.querySelector('.kml-table');
    const desc = document.querySelector('.kml-desc');
    return {
      viewport: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      table: table.getBoundingClientRect().toJSON(),
      descWhiteSpace: getComputedStyle(desc).whiteSpace,
      descWrap: getComputedStyle(desc).overflowWrap,
    };
  });
  assert.ok(kmlMobile.documentWidth <= kmlMobile.viewport + 1, JSON.stringify(kmlMobile));
  assert.ok(kmlMobile.table.right <= kmlMobile.viewport + 1, JSON.stringify(kmlMobile));
  assert.equal(kmlMobile.descWhiteSpace, 'normal');
  assert.equal(kmlMobile.descWrap, 'anywhere');
  await capture('kml-phone-dark');

  await openFixture('sample.sarif', 'application/sarif+json', 'sarif');
  await closeMobileTreeIfOpen();
  frame = await previewFrame('.sarif-preview');
  const sarifInlineStyles = await frame.evaluate(() => ({
    styleTags: document.querySelectorAll('.sarif-preview style').length,
    attributes: [...document.querySelectorAll('.sarif-preview [style]')].map((element) => element.getAttribute('style')),
  }));
  assert.equal(sarifInlineStyles.styleTags, 0);
  assert.equal(sarifInlineStyles.attributes.every((style) => !style || /^display:\s*none;?$/.test(style)), true);
  const sarifMobile = await frame.evaluate(() => {
    const wrap = document.querySelector('.sarif-table-wrap');
    const pager = document.querySelector('.sarif-pager');
    const next = document.querySelector('#sarif-next');
    const row = document.querySelector('tr[data-sev="error"]');
    const cell = row.querySelector('.sarif-message');
    return {
      viewport: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      wrapClientWidth: wrap.clientWidth,
      wrapScrollWidth: wrap.scrollWidth,
      wrapRight: wrap.getBoundingClientRect().right,
      wrapTop: wrap.getBoundingClientRect().top,
      pagerRight: pager.getBoundingClientRect().right,
      pagerBottom: pager.getBoundingClientRect().bottom,
      nextVisible: next.getClientRects().length > 0,
      color: getComputedStyle(cell).color,
      backgroundColor: getComputedStyle(row).backgroundColor,
    };
  });
  assert.ok(sarifMobile.documentWidth <= sarifMobile.viewport + 1, JSON.stringify(sarifMobile));
  assert.ok(sarifMobile.wrapRight <= sarifMobile.viewport + 1 && sarifMobile.pagerRight <= sarifMobile.viewport + 1, JSON.stringify(sarifMobile));
  assert.ok(sarifMobile.pagerBottom <= sarifMobile.wrapTop + 1, JSON.stringify(sarifMobile));
  assert.ok(sarifMobile.wrapScrollWidth <= sarifMobile.wrapClientWidth + 1, 'SARIF mobile cards must not require horizontal scrolling');
  assert.equal(sarifMobile.nextVisible, true);
  assertContrast(sarifMobile, 'SARIF dark error row');
  await capture('sarif-phone-dark');
  await frame.click('#sarif-next');
  assert.match(await frame.textContent('#sarif-page-info'), /51.62.*of 62/);

  if (await page.evaluate(() => document.documentElement.dataset.theme !== 'light')) await page.click('#themeBtn');
  await openFixture('sample.pdb', 'chemical/x-pdb', 'pdb');
  await closeMobileTreeIfOpen();
  await page.waitForSelector('#previewHost .pdb-doc', { timeout: 20000 });
  const pdbSummary = await page.evaluate(() => ({
    statsDisplay: getComputedStyle(document.querySelector('.pdb-stats')).display,
    badgeDisplay: getComputedStyle(document.querySelector('.badge-pdb')).display,
    columns: getComputedStyle(document.querySelector('.pdb-stats')).gridTemplateColumns.split(' ').length,
  }));
  assert.equal(pdbSummary.statsDisplay, 'grid');
  assert.equal(pdbSummary.badgeDisplay, 'flex');
  assert.equal(pdbSummary.columns, 2);
  await capture('pdb-phone-light-summary', '#previewHost');
  await page.click('.mol3d-load-btn');
  await page.waitForSelector('.mol3d-stage canvas', { timeout: 25000 });
  const pdbLayout = await page.evaluate(() => {
    const doc = document.querySelector('.pdb-doc');
    const bar = document.querySelector('.mol3d-bar');
    const stage = document.querySelector('.mol3d-stage');
    const host = document.querySelector('#previewHost');
    doc.scrollTop = doc.scrollHeight;
    return new Promise((resolve) => requestAnimationFrame(() => {
      const stageBox = stage.getBoundingClientRect();
      const hostBox = host.getBoundingClientRect();
      resolve({
        overflowY: getComputedStyle(doc).overflowY,
        scrollable: doc.scrollHeight > doc.clientHeight,
        barOverflow: bar.scrollWidth - bar.clientWidth,
        stageTop: stageBox.top,
        stageBottom: stageBox.bottom,
        hostTop: hostBox.top,
        hostBottom: hostBox.bottom,
        canvas: { width: stage.querySelector('canvas').width, height: stage.querySelector('canvas').height },
      });
    }));
  });
  assert.equal(pdbLayout.overflowY, 'auto');
  assert.equal(pdbLayout.scrollable, true);
  assert.ok(pdbLayout.barOverflow <= 1, JSON.stringify(pdbLayout));
  assert.ok(pdbLayout.stageTop >= pdbLayout.hostTop - 1 && pdbLayout.stageBottom <= pdbLayout.hostBottom + 1, JSON.stringify(pdbLayout));
  assert.ok(pdbLayout.canvas.width > 0 && pdbLayout.canvas.height > 0, JSON.stringify(pdbLayout));
  assert.equal(await page.locator('.mol3d-style').inputValue(), 'cartoon');
  const cartoonBytes = await page.locator('.mol3d-stage').screenshot({ animations: 'disabled' });
  const cartoonPixels = foregroundStats(cartoonBytes);
  assert.ok(cartoonPixels.pixels > 500 && cartoonPixels.width > 80 && cartoonPixels.height > 30,
    `PDB cartoon must be visibly framed instead of reduced to distant-coordinate hairlines: ${JSON.stringify(cartoonPixels)}`);
  await page.locator('.mol3d-style').selectOption('stick');
  await page.waitForTimeout(250);
  const stickBytes = await page.locator('.mol3d-stage').screenshot({ animations: 'disabled' });
  const stickPixels = foregroundStats(stickBytes);
  assert.ok(stickPixels.pixels > 500 && stickPixels.width > 80 && stickPixels.height > 30,
    `PDB stick representation must remain visibly framed: ${JSON.stringify(stickPixels)}`);
  assert.notEqual(createHash('sha256').update(stickBytes).digest('hex'), createHash('sha256').update(cartoonBytes).digest('hex'),
    'PDB representation control must change rendered pixels');
  await capture('pdb-phone-light-stage', '#previewHost');

  console.log('renderer visual readiness test passed');
} catch (error) {
  ctx.fail(error.stack || error.message);
} finally {
  await finish(ctx);
}
