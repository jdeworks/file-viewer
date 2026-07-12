import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  createDocxFidelityFixture,
  createPptxNotesFixture,
  createXlsxFidelityFixture,
} from './office-fidelity-fixtures.mjs';

const MIME = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  pages: 'application/vnd.apple.pages',
};

const PACKAGE_SOURCE = '\ufeff{\r\n'
  + '  "name": "offline-fidelity",\r\n'
  + '  "version": "1.0.0",\r\n'
  + '  "duplicate": "first",\r\n'
  + '  "duplicate": "second",\r\n'
  + '  "x-offline-unknown": "OFFLINE_EXACT_SENTINEL"\r\n'
  + '}\r\n';

const BREWFILE_SOURCE = [
  ...Array.from({ length: 9 }, (_, index) => `tap "offline-tap-${index}"`),
  ...Array.from({ length: 11 }, (_, index) => `mas "offline-mas-${index}", id: ${9000 + index}`),
  ...Array.from({ length: 11 }, (_, index) => `vscode "offline-vscode-${index}"`),
].join('\n');

async function openBytes(page, bytes, filename, mime) {
  const encoded = Buffer.from(bytes).toString('base64');
  await page.evaluate(async ({ encoded: data, filename: name, mime: type }) => {
    const binary = atob(data);
    const array = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) array[index] = binary.charCodeAt(index);
    await window.__fv.openBlobFile(new Blob([array], { type }), name, { mime: type });
  }, { encoded, filename, mime });
}

async function openText(page, source, filename, mime = 'text/plain') {
  return openBytes(page, Buffer.from(source, 'utf8'), filename, mime);
}

function normalRequest(url, origin) {
  if (/^(?:data|blob):/i.test(url)) return false;
  try { return new URL(url).origin === origin; }
  catch { return false; }
}

export async function runOfflineFidelityMatrix({ page, context, origin, setServerOffline }) {
  // Generate the adversarial local files before network loss. Generation uses only repository
  // fixtures; opening below goes through the browser's normal Blob intake after a hard reload.
  const fixtures = {
    xlsx: createXlsxFidelityFixture(),
    docx: await createDocxFidelityFixture(),
    pptx: await createPptxNotesFixture(),
    pages: new Uint8Array(await readFile(new URL('../docs/examples/sample.pages', import.meta.url))),
  };

  const consoleErrors = [];
  const failedRequests = [];
  const offOrigin = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push('pageerror: ' + error.message));
  page.on('requestfailed', (request) => {
    const url = request.url();
    if (normalRequest(url, origin)) failedRequests.push(`${url}: ${request.failure()?.errorText || 'failed'}`);
  });
  page.on('request', (request) => {
    const url = request.url();
    if (/^(?:data|blob):/i.test(url)) return;
    try { if (new URL(url).origin !== origin) offOrigin.push(url); }
    catch { offOrigin.push(url); }
  });

  setServerOffline();
  await context.setOffline(true);
  await page.goto(`${origin}/viewer/index.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.__fv, null, { timeout: 30000 });
  assert.equal(await page.evaluate(() => navigator.onLine), false, 'matrix must run with browser network disabled');

  await openBytes(page, fixtures.xlsx, 'offline-fidelity.xlsx', MIME.xlsx);
  await page.waitForSelector('#previewHost .xe-tab[data-visibility="2"]', { timeout: 30000 });
  await page.click('#previewHost .xe-panel:not([hidden]) .xe-cell[data-address="B2"]');
  const workbook = await page.evaluate(() => {
    const host = document.querySelector('#previewHost');
    const field = (name) => host.querySelector(`.xe-inspector-field[data-field="${name}"] .xe-inspector-value`)?.textContent || '';
    return {
      formula: field('formula'),
      cached: field('cached'),
      comment: field('comments'),
      tabs: [...host.querySelectorAll('.xe-tab')].map((tab) => tab.dataset.visibility),
    };
  });
  assert.equal(workbook.formula, '=SUM(A2:A3)');
  assert.equal(workbook.cached, '3');
  assert.match(workbook.comment, /Stored result/);
  assert.deepEqual(workbook.tabs, ['0', '1', '2']);

  await openBytes(page, fixtures.docx, 'offline-fidelity.docx', MIME.docx);
  await page.waitForSelector('#previewHost .dx-note', { timeout: 30000 });
  assert.match(await page.textContent('#previewHost .dx-note'), /headers\/footers/);
  assert.equal(await page.isDisabled('#previewHost .dx-download-rebuilt'), true);
  await page.click('#previewHost .dx-edit');
  await page.waitForSelector('#previewHost .dx-edit-host .ProseMirror', { timeout: 30000 });
  assert.match(await page.textContent('#previewHost .dx-edit-host'), /Original paragraph/);
  assert.equal(await page.isDisabled('#previewHost .dx-download-rebuilt'), true,
    'offline lazy Edit must not invent a rebuilt document before an edit');

  await openBytes(page, fixtures.pptx, 'offline-fidelity.pptx', MIME.pptx);
  await page.waitForFunction(() => document.querySelectorAll('#previewHost .pptx-notes-card').length === 2,
    null, { timeout: 30000 });
  const notes = await page.$$eval('#previewHost .pptx-notes-card', (cards) => cards.map((card) => ({
    slide: card.dataset.slideNumber,
    headline: card.querySelector('.pptx-notes-headline')?.textContent || '',
  })));
  assert.deepEqual(notes, [
    { slide: '1', headline: 'Presented first headline' },
    { slide: '2', headline: 'Presented second headline' },
  ]);
  assert.match(await page.textContent('#previewHost .pptx-notes-status'), /2 slides with speaker notes/);

  await openText(page, PACKAGE_SOURCE, 'package.json', 'application/json');
  await page.waitForSelector('#previewHost .pj-doc .json-duplicate-warning', { timeout: 30000 });
  const json = await page.evaluate((expected) => ({
    raw: window.__fv.state.rawview?.getValue?.(),
    source: window.__fv.state.intake?.sourceText,
    original: window.__fv.state.intake?.originalText,
    chip: document.querySelector('#enhanceChip .ec-label')?.textContent || '',
    toggle: document.querySelector('#enhanceChip .ec-toggle')?.textContent || '',
    warning: document.querySelector('#previewHost .json-duplicate-warning')?.textContent || '',
    exact: window.__fv.state.rawview?.getValue?.() === expected,
  }), PACKAGE_SOURCE);
  assert.equal(json.exact, true);
  assert.equal(json.source, PACKAGE_SOURCE);
  assert.equal(json.original, PACKAGE_SOURCE);
  assert.match(json.chip, /^✦ Enhanced summary:/);
  assert.equal(json.toggle, 'Show default view');
  assert.match(json.warning, /duplicate/);
  assert.match(json.warning, /line 4.*line 5|line 5.*line 4/i);

  await openText(page, BREWFILE_SOURCE, 'Brewfile');
  await page.waitForSelector('#previewHost .brewfile-doc', { timeout: 30000 });
  const brewfile = (await page.textContent('#previewHost .brewfile-doc')).replace(/\s+/g, ' ');
  assert.match(brewfile, /Taps Showing 8 of 9/);
  assert.match(brewfile, /Mac App Store Showing 10 of 11/);
  assert.match(brewfile, /VS Code Extensions Showing 10 of 11/);
  assert.equal(brewfile.includes('offline-tap-8'), false);
  assert.equal(await page.evaluate((expected) => window.__fv.state.rawview?.getValue?.() === expected,
    BREWFILE_SOURCE), true, 'capped summary must retain the exact source offline');

  await openBytes(page, fixtures.pages, 'offline-fidelity.pages', MIME.pages);
  await page.waitForFunction(() => {
    const image = document.querySelector('#previewHost .iwork-thumbnail');
    return image?.complete && image.naturalWidth === 640 && image.naturalHeight === 360;
  }, null, { timeout: 30000 });
  assert.match(await page.textContent('#previewHost [data-partial-support]'), /complete document structure/);
  await page.click('#previewHost .iwork-tab-text');
  await page.waitForFunction(() => document.querySelector('#previewHost .iwork-text-content')
    ?.textContent?.includes('File Viewer Pages Fidelity Sample'), null, { timeout: 30000 });

  assert.equal(await page.locator('#previewHost .offline-miss').count(), 0,
    'no fidelity viewer may fall back to an offline-missing card');
  assert.deepEqual([...new Set(failedRequests)], [], 'every lazy fidelity dependency must come from cache');
  assert.deepEqual([...new Set(offOrigin)], [], 'offline fidelity viewers must not escape origin');
  assert.deepEqual([...new Set(consoleErrors)], [], 'offline fidelity viewers must remain error-free');
}
