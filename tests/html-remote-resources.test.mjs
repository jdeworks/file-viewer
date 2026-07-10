import assert from 'node:assert/strict';
import http from 'node:http';
import { createHarness, finish } from './harness.mjs';

const sentinelRequests = [];
const sentinel = http.createServer((req, res) => {
  sentinelRequests.push(req.url);
  if (req.url.endsWith('.css')) {
    res.writeHead(200, { 'content-type': 'text/css', 'access-control-allow-origin': '*' });
    res.end('body{color:red}');
  } else {
    res.writeHead(200, { 'content-type': 'image/svg+xml', 'access-control-allow-origin': '*' });
    res.end('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>');
  }
});
await new Promise((resolve) => sentinel.listen(0, '127.0.0.1', resolve));
const remote = `http://127.0.0.1:${sentinel.address().port}`;

const ctx = await createHarness();
const { page, origin, frameOf, waitForFv } = ctx;
let allowScripts = false;
let blobUrl = null;

try {
  page.on('dialog', (dialog) => allowScripts ? dialog.accept() : dialog.dismiss());
  await page.goto(origin, { waitUntil: 'load' });
  await waitForFv();
  blobUrl = await page.evaluate(() => URL.createObjectURL(new Blob(['local image'], { type: 'image/png' })));

  const encodedRemote = remote.replace('http://', 'h&#x74;tp:&#x2f;&#x2f;');
  const cssEscapedRemote = remote.replace('http://', 'h\\74 tp\\3a \\2f \\2f ');
  const html = `<!doctype html><html><head></head><body>
    <style>
      @import "${remote}/remote-import.css";
      @import "assets/preview.css";
      @font-face { font-family: Remote; src: local("safe"), u\\72l("${remote}/font.woff2"); }
      .escaped { background-image: u\\72l("${remote}/escaped.png"); }
      .encoded { cursor: url("${cssEscapedRemote}/cursor.cur"), auto; }
      .set { background-image: image-set("${remote}/one.png" 1x, url("favicon.svg") 2x); }
      .custom { --remote-image: u\\72l("${remote}/custom.png"); background: var(--remote-image); }
      .safe-css { background-image:url("favicon.svg"); border-image-source:url("${origin}/favicon.svg"); }
    </style>
    <input id="remote-input" type="ImAgE" src=" ${remote}/input.png ">
    <img id="remote-img" src="${encodedRemote}/entity.png" srcset="${remote}/srcset.png 1x">
    <img id="safe-relative" src="favicon.svg"><img id="safe-origin" src="${origin}/favicon.svg">
    <img id="safe-data" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="><img id="safe-blob" src="${blobUrl}">
    <svg xmlns:xlink="http://www.w3.org/1999/xlink" width="20" height="20">
      <image id="remote-svg-image" HREF="${remote}/svg-image.png"></image>
      <use id="remote-svg-use" href="${remote}/sprite.svg#x"></use>
      <filter id="f"><feImage id="remote-fe" xlink:href="${remote}/fe.png"></feImage></filter>
      <rect id="remote-fill" width="10" height="10" fill="u\\72l(${remote}/paint.svg#p)" filter="url(${remote}/filter.svg#f)"></rect>
      <image id="safe-svg" href="favicon.svg"></image>
    </svg>
    <div id="remote-style" style="background: URL(  '${remote}/inline.png' ); cursor:url(${remote}/cursor2.cur), auto">remote</div>
    <div class="escaped encoded set custom safe-css">styled</div>
    <video poster="${remote}/poster.png"><source src="${remote}/movie.mp4"></video>
    <iframe src="${remote}/frame.html"></iframe><object data="${remote}/object.bin"></object>
    <link rel="stylesheet" href="${remote}/link.css"><form action="${remote}/submit"><button>send</button></form>
  </body></html>`;

  await page.evaluate(async (source) => {
    await window.__fv.openBlobFile(new Blob([source], { type: 'text/html' }), 'privacy.html', { mime: 'text/html' });
  }, html);
  const frame = await frameOf('iframe.fv-preview-frame');
  await frame.waitForSelector('#safe-relative');
  await page.waitForTimeout(750);

  assert.deepEqual(sentinelRequests, [], 'sanitized HTML must emit zero off-origin resource requests');
  assert.equal(await frame.locator('#remote-input').getAttribute('src'), null);
  assert.equal(await frame.locator('#remote-img').getAttribute('src'), null);
  assert.equal(await frame.locator('#remote-svg-image').getAttribute('href'), null);
  assert.equal(await frame.locator('#remote-fe').getAttribute('xlink:href'), null);
  assert.equal(await frame.locator('#remote-fill').getAttribute('fill'), 'url("data:,")');
  assert.equal(await frame.locator('#safe-relative').getAttribute('src'), 'favicon.svg');
  assert.equal(await frame.locator('#safe-origin').getAttribute('src'), `${origin}/favicon.svg`);
  assert.match(await frame.locator('#safe-data').getAttribute('src'), /^data:image\/gif/);
  assert.equal(await frame.locator('#safe-blob').getAttribute('src'), blobUrl);
  assert.equal(await frame.locator('#safe-svg').getAttribute('href'), 'favicon.svg');
  const safeCss = (await frame.locator('style').allTextContents()).join('\n');
  assert.ok(safeCss.includes('assets/preview.css'), 'relative CSS import is preserved');
  assert.ok(safeCss.includes('favicon.svg'), 'relative CSS resource is preserved');
  assert.ok(!safeCss.includes(remote), 'remote CSS references are neutralized');

  // The raw full-document path is a separately disclosed, explicit trust mode. Prove its network
  // behavior remains opt-in and the iframe still lacks allow-same-origin.
  sentinelRequests.length = 0;
  allowScripts = true;
  const trusted = `<!doctype html><img id="trusted-remote" src="${remote}/explicit.png"><script>document.body.dataset.ran='1'<\/script>`;
  await page.evaluate(async (source) => {
    await window.__fv.openBlobFile(new Blob([source], { type: 'text/html' }), 'trusted.html', { mime: 'text/html' });
  }, trusted);
  const trustedFrame = await frameOf('iframe.fv-preview-frame');
  await trustedFrame.waitForSelector('#trusted-remote');
  await page.waitForTimeout(500);
  assert.ok(sentinelRequests.includes('/explicit.png'), 'explicit script-enabled HTML may load its declared remote resources');
  assert.equal(await page.getAttribute('iframe.fv-preview-frame', 'sandbox'), 'allow-scripts');
  assert.equal(await trustedFrame.locator('body').getAttribute('data-ran'), '1');

  console.log('html remote-resource privacy test passed');
} catch (error) {
  ctx.fail(error.stack || error.message);
} finally {
  if (blobUrl) await page.evaluate((url) => URL.revokeObjectURL(url), blobUrl).catch(() => {});
  await new Promise((resolve) => sentinel.close(resolve));
  await finish(ctx);
}
