import assert from 'node:assert/strict';
import { createHarness, finish } from './harness.mjs';

const ctx = await createHarness();
const { page, origin, frameOf, waitForFv } = ctx;
const remoteHost = 'markdown-privacy.example.test';
const remoteUrls = [
  `https://${remoteHost}/markdown.png`,
  `https://${remoteHost}/raw-html.png`,
  `http://${remoteHost}/protocol-relative.png`,
  `https://${remoteHost}/entity-obfuscated.png`,
  `https://${remoteHost}/svg-image.png`,
  `https://${remoteHost}/svg-use.svg#icon`,
];
let blobUrl = null;

try {
  const emittedRemoteRequests = [];
  page.on('request', (request) => {
    if (request.url().includes(remoteHost)) emittedRemoteRequests.push(request.url());
  });

  await page.goto(origin, { waitUntil: 'load' });
  await waitForFv();
  blobUrl = await page.evaluate(() => URL.createObjectURL(new Blob(['safe local image'], { type: 'image/png' })));
  const markdown = [
    '# Remote resource privacy',
    '',
    `![Quarterly chart](${remoteUrls[0]})`,
    `<img alt="Raw HTML chart" src="${remoteUrls[1]}">`,
    `<img alt="Protocol-relative chart" src="//${remoteHost}/protocol-relative.png">`,
    `<img alt="Entity-obfuscated chart" src="https:&#x2f;&#x2f;${remoteHost}/entity-obfuscated.png">`,
    `<svg><image href="${remoteUrls[4]}"></image><use href="${remoteUrls[5]}"></use></svg>`,
    '',
    '![Inline image](data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==)',
    `<img alt="Blob image" data-safe-kind="blob" src="${blobUrl}">`,
    `![Same-origin image](${origin}/favicon.svg)`,
    '![Relative image](favicon.svg)',
  ].join('\n');

  await page.evaluate(async (text) => {
    await window.__fv.openBlobFile(new Blob([text], { type: 'text/markdown' }), 'privacy.md', { mime: 'text/markdown' });
  }, markdown);

  const frame = await frameOf('iframe.fv-preview-frame');
  await frame.waitForSelector('.md-remote-image-blocked');
  await page.waitForTimeout(750);

  assert.deepEqual(emittedRemoteRequests, [], 'default Markdown preview must emit no remote resource request');
  assert.equal(await frame.locator('.md-remote-image-blocked').count(), 4, 'remote HTML and Markdown images become visible notices');
  assert.equal(
    await frame.locator('.md-remote-image-blocked').first().textContent(),
    'Remote image blocked: Quarterly chart',
    'the blocked image keeps useful alt-text context',
  );
  assert.equal(
    await frame.locator(`.md-remote-image-blocked a[href="${remoteUrls[0]}"]`).count(),
    1,
    'the blocked Markdown image keeps a user-visible link to its source',
  );
  assert.equal(await frame.locator('svg image[href], svg use[href]').count(), 0, 'remote SVG resource references are removed');

  const safeSources = await frame.locator('img').evaluateAll((images) => images.map((img) => img.getAttribute('src')));
  assert.ok(safeSources.some((src) => src?.startsWith('data:image/gif;base64,')), 'data image source is preserved');
  assert.ok(safeSources.includes(blobUrl), 'blob image source is preserved');
  assert.ok(safeSources.includes(`${origin}/favicon.svg`), 'same-origin image source is preserved');
  assert.ok(safeSources.includes('favicon.svg'), 'relative local image source is preserved');

  console.log('markdown remote-resource privacy test passed');
} catch (error) {
  ctx.fail(error.stack || error.message);
} finally {
  if (blobUrl) await page.evaluate((url) => URL.revokeObjectURL(url), blobUrl).catch(() => {});
  await finish(ctx);
}
