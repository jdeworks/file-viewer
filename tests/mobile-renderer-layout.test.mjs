import { createHarness, finish, pass, fail } from './harness.mjs';

const ctx = await createHarness();
const { browser, origin } = ctx;
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  colorScheme: 'dark',
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();
const errors = [];
const offOrigin = [];
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
page.on('pageerror', (error) => errors.push(error.message));
page.on('request', (request) => {
  const url = request.url();
  if (/^(data|blob|about):/.test(url)) return;
  try { if (new URL(url).origin !== new URL(origin).origin) offOrigin.push(url); } catch { offOrigin.push(url); }
});

async function open(label, type) {
  const opened = await page.evaluate((value) => window.__fv.openExampleByLabel(value), label);
  if (!opened) throw new Error('example did not open: ' + label);
  await page.waitForFunction((id) => window.__fv?.state?.type?.id === id, type);
  await page.waitForFunction(() => document.getElementById('previewHost')?.children.length > 0);
  const tree = page.locator('#fileTree');
  if (await tree.isVisible().catch(() => false)) await page.locator('#treeCloseBtn').click();
}

try {
  await page.goto(origin, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__fv);

  await open('Sample.jsonl', 'jsonl');
  const jsonl = await page.$eval('#previewHost .jsonl-table', (table) => {
    const host = document.getElementById('previewHost');
    const cells = [...table.querySelectorAll('td')];
    return {
      noOverflow: host.scrollWidth <= host.clientWidth + 2,
      labeled: cells.length > 0 && cells.every((cell) => cell.dataset.label),
      cardLayout: cells.length > 0 && getComputedStyle(cells[0]).display === 'grid',
    };
  });
  if (Object.values(jsonl).every(Boolean)) pass('mobile JSONL records use labeled cards without horizontal clipping');
  else fail('mobile JSONL layout failed: ' + JSON.stringify(jsonl));

  await open('Sample.mid', 'midi');
  const midiFrame = await (await page.$('#previewHost iframe')).contentFrame();
  const midi = await midiFrame.evaluate(() => {
    const root = document.documentElement;
    const cells = [...document.querySelectorAll('.midi-table td')];
    const instrumentCells = cells.filter((cell) => cell.dataset.label === 'Instruments used');
    return {
      noOverflow: root.scrollWidth <= root.clientWidth + 2,
      labeled: cells.length > 0 && cells.every((cell) => cell.dataset.label),
      cardLayout: cells.length > 0 && getComputedStyle(cells[0]).display === 'grid',
      instrumentVisible: document.body.innerText.includes('Acoustic Grand Piano'),
      instrumentLabelsContained: instrumentCells.length > 0 && instrumentCells.every((cell) => {
        const labelStyle = getComputedStyle(cell, '::before');
        const labelTrack = Number.parseFloat(getComputedStyle(cell).gridTemplateColumns);
        return labelStyle.whiteSpace !== 'nowrap' && labelStyle.overflowWrap === 'normal'
          && labelTrack >= 108 && cell.scrollWidth <= cell.clientWidth + 1;
      }),
    };
  });
  if (Object.values(midi).every(Boolean)) pass('mobile MIDI tracks use labeled cards with the full instrument visible');
  else fail('mobile MIDI layout failed: ' + JSON.stringify(midi));

  await open('Sample.glb', 'gltf');
  await page.waitForSelector('#previewHost .stl-canvas');
  const mesh = await page.$eval('#previewHost .stl-bar', (bar) => {
    const info = bar.querySelector('.stl-info').getBoundingClientRect();
    return {
      noOverflow: bar.scrollWidth <= bar.clientWidth + 2,
      summaryOwnRow: info.width >= bar.clientWidth * 0.85,
      resetVisible: bar.querySelector('.stl-reset').getBoundingClientRect().right <= innerWidth + 1,
    };
  });
  if (Object.values(mesh).every(Boolean)) pass('mobile 3D toolbar wraps its summary and keeps controls in bounds');
  else fail('mobile 3D toolbar failed: ' + JSON.stringify(mesh));

  if (!errors.length && !offOrigin.length) pass('mobile renderer layout run has no page errors or off-origin requests');
  else fail('mobile renderer run errors: ' + JSON.stringify({ errors, offOrigin }));
} catch (error) {
  fail('mobile renderer layout regression threw: ' + (error?.stack || error));
} finally {
  await context.close();
  await finish(ctx);
}
