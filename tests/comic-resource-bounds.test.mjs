import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';

import {
  COMIC_LIMITS,
  COMIC_RESOURCE_LIMIT_CODE,
  comicFromZip,
  createComicPageCache,
} from '../docs/types/ebook/comic/comiclib.js';
import { loadReaderPrefs, normalizeReaderPrefs, saveReaderPrefs } from '../docs/core/reader-prefs.js';
import { COMIC_READER_PREFS } from '../docs/types/ebook/reader-prefs.js';
import { createHarness, finish } from './harness.mjs';

const require = createRequire(import.meta.url);
const JSZip = require('jszip');

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}

const prefStorage = new MemoryStorage();
assert.deepEqual(normalizeReaderPrefs(COMIC_READER_PREFS, { layout: 'spread', fit: 'bogus', extra: 'ignored' }), {
  layout: 'spread', fit: 'width', direction: 'ltr',
});
assert.deepEqual(saveReaderPrefs(COMIC_READER_PREFS, { layout: 'spread', fit: 'page', direction: 'rtl' }, prefStorage), {
  layout: 'spread', fit: 'page', direction: 'rtl',
});
assert.deepEqual(loadReaderPrefs(COMIC_READER_PREFS, prefStorage), {
  layout: 'spread', fit: 'page', direction: 'rtl',
});

function fakeEntry(size, counter, actualSize = size) {
  return {
    dir: false,
    _data: Number.isSafeInteger(size) ? { uncompressedSize: size } : undefined,
    async: async (type) => {
      assert.equal(type, 'blob');
      counter.count++;
      return new Blob([new Uint8Array(actualSize)]);
    },
  };
}

// Constructing a comic inventory must not decompress entries. Natural order and the page cap are
// established from the ZIP directory alone, and only an explicit loadBlob() extracts a payload.
const delayedCounter = { count: 0 };
const fakeZip = { files: {
  'pages/10.png': fakeEntry(10, delayedCounter),
  'pages/2.png': fakeEntry(2, delayedCounter),
  'cover.png': fakeEntry(3, delayedCounter),
  'pages/20.png': fakeEntry(20, delayedCounter),
  'notes.txt': fakeEntry(4, delayedCounter),
  'pages/.hidden.png': fakeEntry(4, delayedCounter),
} };
const delayed = comicFromZip(fakeZip, { maxPages: 3, maxPageBytes: 32 });
assert.equal(delayedCounter.count, 0);
assert.deepEqual(delayed.pages.map((page) => page.name), ['cover.png', 'pages/2.png', 'pages/10.png']);
assert.equal(delayed.totalPages, 4);
assert.equal(delayed.truncatedPages, 1);
await delayed.pages[1].loadBlob();
assert.equal(delayedCounter.count, 1);

// Declared oversized pages are rejected before extraction; unknown/misreported sizes are checked
// again against the actual Blob after extraction.
const declaredCounter = { count: 0 };
const declaredLarge = comicFromZip({ files: { 'huge.png': fakeEntry(11, declaredCounter) } }, { maxPageBytes: 10 });
assert.equal(declaredLarge.oversizedPages, 1);
await assert.rejects(declaredLarge.pages[0].loadBlob(), (error) => error.code === COMIC_RESOURCE_LIMIT_CODE);
assert.equal(declaredCounter.count, 0);

const actualCounter = { count: 0 };
const actualLarge = comicFromZip({ files: { 'unknown.png': fakeEntry(null, actualCounter, 11) } }, { maxPageBytes: 10 });
await assert.rejects(actualLarge.pages[0].loadBlob(), (error) => error.code === COMIC_RESOURCE_LIMIT_CODE);
assert.equal(actualCounter.count, 1);

// The URL cache is LRU-bounded by both page count and expanded bytes. Eviction notifies the
// renderer before revocation, repeated loads reuse the current URL, and dispose revokes the rest.
const created = [];
const revoked = [];
const evicted = [];
const extractions = [0, 0, 0];
const cachePages = extractions.map((_value, index) => ({
  name: `page-${index}.png`,
  size: 4,
  async loadBlob() { extractions[index]++; return new Blob([new Uint8Array(4)]); },
}));
const cache = createComicPageCache({
  maxActivePages: 2,
  maxActiveBytes: 8,
  maxPageBytes: 8,
  createObjectURL(blob) { const url = `blob:test-${created.length}`; created.push({ url, size: blob.size }); return url; },
  revokeObjectURL(url) { revoked.push(url); },
  onEvict(index, url) { evicted.push({ index, url }); },
});
assert.equal(await cache.load(0, cachePages[0]), 'blob:test-0');
assert.equal(await cache.load(1, cachePages[1]), 'blob:test-1');
assert.deepEqual(cache.stats(), { activePages: 2, activeBytes: 8, pendingPages: 0, disposed: false });
cache.touch(0);
assert.equal(await cache.load(2, cachePages[2]), 'blob:test-2');
assert.deepEqual(evicted, [{ index: 1, url: 'blob:test-1' }]);
assert.deepEqual(revoked, ['blob:test-1']);
assert.equal(await cache.load(0, cachePages[0]), 'blob:test-0');
assert.deepEqual(extractions, [1, 1, 1]);
cache.dispose();
assert.deepEqual(new Set(revoked), new Set(['blob:test-0', 'blob:test-1', 'blob:test-2']));
assert.deepEqual(cache.stats(), { activePages: 0, activeBytes: 0, pendingPages: 0, disposed: true });

let oversizedCacheExtracted = false;
const boundedCache = createComicPageCache({
  maxPageBytes: 8,
  maxActiveBytes: 8,
  createObjectURL() { throw new Error('oversized page must not create a URL'); },
});
await assert.rejects(boundedCache.load(0, {
  name: 'declared-too-large.png', size: 9,
  async loadBlob() { oversizedCacheExtracted = true; return new Blob([new Uint8Array(9)]); },
}), (error) => error.code === COMIC_RESOURCE_LIMIT_CODE);
assert.equal(oversizedCacheExtracted, false);
boundedCache.dispose();

// Intersection callbacks may request several nearby pages together, but extraction itself remains
// capped at two concurrent jobs so pending expanded buffers cannot grow without bound.
const started = [];
const finishConcurrent = [];
const concurrentCache = createComicPageCache({
  maxConcurrentLoads: 2,
  createObjectURL(_blob) { return `blob:concurrent-${started.length}`; },
});
const concurrentLoads = Array.from({ length: 4 }, (_unused, index) => concurrentCache.load(index, {
  name: `concurrent-${index}.png`, size: 1,
  loadBlob: () => new Promise((resolve) => {
    started.push(index);
    finishConcurrent[index] = resolve;
  }),
}));
await new Promise((resolve) => setImmediate(resolve));
assert.deepEqual(started, [0, 1]);
finishConcurrent[0](new Blob([new Uint8Array(1)]));
await new Promise((resolve) => setImmediate(resolve));
assert.deepEqual(started, [0, 1, 2]);
finishConcurrent[1](new Blob([new Uint8Array(1)]));
finishConcurrent[2](new Blob([new Uint8Array(1)]));
await new Promise((resolve) => setImmediate(resolve));
assert.deepEqual(started, [0, 1, 2, 3]);
finishConcurrent[3](new Blob([new Uint8Array(1)]));
await Promise.all(concurrentLoads);
concurrentCache.dispose();

// Replacing a preview while extraction is pending must not create a late, untracked blob URL.
let finishPending;
let lateUrls = 0;
const pendingCache = createComicPageCache({
  createObjectURL() { lateUrls++; return 'blob:late'; },
});
const pendingLoad = pendingCache.load(0, {
  name: 'pending.png', size: 1,
  loadBlob: () => new Promise((resolve) => { finishPending = resolve; }),
});
await Promise.resolve();
assert.equal(pendingCache.stats().pendingPages, 1);
pendingCache.dispose();
finishPending(new Blob([new Uint8Array(1)]));
await assert.rejects(pendingLoad, /cache is closed/);
assert.equal(lateUrls, 0);

// Existing public fixture: exact natural order, no eager entry.async calls, and valid extraction
// when one page is requested.
const fixtureBytes = await readFile(new URL('../docs/examples/sample.cbz', import.meta.url));
const fixtureZip = await JSZip.loadAsync(fixtureBytes);
const fixtureCalls = new Map();
for (const entry of Object.values(fixtureZip.files)) {
  if (entry.dir) continue;
  const original = entry.async.bind(entry);
  fixtureCalls.set(entry.name, 0);
  entry.async = async (...args) => {
    fixtureCalls.set(entry.name, fixtureCalls.get(entry.name) + 1);
    return original(...args);
  };
}
const fixture = comicFromZip(fixtureZip);
assert.deepEqual(fixture.pages.map((page) => page.name), ['page-01.png', 'page-02.png', 'page-10.png']);
assert.equal(fixture.totalPages, 3);
assert.equal(fixture.truncatedPages, 0);
assert.equal(fixture.oversizedPages, 0);
assert.deepEqual([...fixtureCalls.values()], [0, 0, 0]);
const firstPage = await fixture.pages[0].loadBlob();
assert.equal(firstPage.type, 'image/png');
assert.ok(firstPage.size > 1000);
assert.deepEqual([...fixtureCalls.values()], [1, 0, 0]);
const signature = Buffer.from(await firstPage.arrayBuffer()).subarray(0, 8).toString('hex');
assert.equal(signature, '89504e470d0a1a0a');

// Browser integration: a 12-page CBZ exposes only the immediate reading window at open, extracts a
// distant page when scrolled into view, and never exceeds the active URL count.
const onePixelPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
const generatedZip = new JSZip();
for (let index = 1; index <= 12; index++) {
  generatedZip.file(`page-${String(index).padStart(2, '0')}.png`, onePixelPng);
}
const generatedBytes = await generatedZip.generateAsync({ type: 'uint8array' });
const ctx = await createHarness();
const { page, origin, waitForFv } = ctx;
try {
  await page.goto(origin, { waitUntil: 'load' });
  await waitForFv();
  await page.evaluate(() => localStorage.removeItem('fv:reader:prefs:comic'));
  await page.evaluate(async (data) => {
    const blob = new Blob([new Uint8Array(data)], { type: 'application/vnd.comicbook+zip' });
    await window.__fv.openBlobFile(blob, 'lazy.cbz', { mime: 'application/vnd.comicbook+zip' });
  }, [...generatedBytes]);
  await page.waitForSelector('#previewHost .comic-page');
  await page.waitForFunction((minimum) => [...document.querySelectorAll('#previewHost .comic-page')]
    .filter((image) => image.src.startsWith('blob:')).length >= minimum, COMIC_LIMITS.initialPages);
  const initialActive = await page.$$eval('#previewHost .comic-page', (images) =>
    images.filter((image) => image.src.startsWith('blob:')).length);
  assert.ok(initialActive >= COMIC_LIMITS.initialPages && initialActive < 12, `expected delayed extraction, got ${initialActive}`);
  assert.match(await page.textContent('#previewHost .comic-info'), /loads on demand.*max 8 active/);
  assert.deepEqual(await page.$$eval('#previewHost .comic-page', (images) => images.slice(0, 3).map((image) => image.alt)),
    ['Page 1', 'Page 2', 'Page 3']);

  await page.click('#previewHost .comic-spread');
  const spread = await page.$$eval('#previewHost .comic-page-wrap', (wraps) => {
    const first = wraps[0].getBoundingClientRect();
    const second = wraps[1].getBoundingClientRect();
    return Math.abs(first.top - second.top) < 5 && second.left > first.left;
  });
  assert.equal(spread, true);
  await page.click('#previewHost .comic-fit');
  await page.click('#previewHost .comic-direction');
  await page.waitForFunction(() => {
    const value = JSON.parse(localStorage.getItem('fv:reader:prefs:comic') || 'null');
    return value?.layout === 'spread' && value?.fit === 'page' && value?.direction === 'rtl';
  });
  await page.evaluate(async (data) => {
    const blob = new Blob([new Uint8Array(data)], { type: 'application/vnd.comicbook+zip' });
    await window.__fv.openBlobFile(blob, 'lazy-again.cbz', { mime: 'application/vnd.comicbook+zip' });
  }, [...generatedBytes]);
  await page.waitForSelector('#previewHost .comic-page');
  const restored = await page.$eval('#previewHost .comic-doc', (host) => ({
    spread: host.classList.contains('comic-spread-on'),
    fit: host.classList.contains('comic-fit-page'),
    rtl: host.classList.contains('comic-rtl'),
    dir: host.querySelector('.comic-pages')?.dir,
    pressed: [...host.querySelectorAll('.comic-setting')].map((button) => button.getAttribute('aria-pressed')),
  }));
  assert.deepEqual(restored, { spread: true, fit: true, rtl: true, dir: 'rtl', pressed: ['true', 'true', 'true'] });

  await page.locator('#previewHost .comic-page-wrap').nth(10).scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelectorAll('#previewHost .comic-page')[10]?.src.startsWith('blob:'));
  const afterScroll = await page.$$eval('#previewHost .comic-page', (images) =>
    images.filter((image) => image.src.startsWith('blob:')).length);
  assert.ok(afterScroll <= COMIC_LIMITS.maxActivePages, `active blob URL count ${afterScroll}`);

  console.log(`comic resource bounds tests passed (initial=${initialActive}, active=${afterScroll})`);
} catch (error) {
  ctx.fail(error.stack || error.message);
} finally {
  await finish(ctx);
}
