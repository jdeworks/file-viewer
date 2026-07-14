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
const { page, origin, frameOf, waitForFv, offOrigin } = ctx;
let allowScripts = false;
let blobUrl = null;
const dialogMessages = [];

try {
  page.on('dialog', (dialog) => {
    dialogMessages.push(dialog.message());
    return allowScripts ? dialog.accept() : dialog.dismiss();
  });
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

  // Folder HTML resolves relative CSS/JS/images from the loaded in-memory folder. CSS and images
  // survive the safe sanitizer as blob URLs; local JavaScript still uses the ordinary script gate.
  const folderHtml = `<!doctype html><html><head>
    <link rel="stylesheet" href="styles/site.css">
  </head><body>
    <div id="local-card" class="card utility-one utility-two utility-three utility-four utility-five utility-six utility-seven utility-eight">Local dependencies</div>
    <img id="local-image" src="img/pixel.svg"><img id="missing-image" src="img/missing.svg">
    <script src="scripts/app.js"><\/script>
  </body></html>`;
  await page.evaluate(async (source) => {
    await window.__fv.loadFolder([
      { path: 'site/index.html', file: new File([source], 'index.html', { type: 'text/html' }) },
      { path: 'site/styles/site.css', file: new File([
        '@import "theme.css"; .card{color:rgb(12, 34, 56);background-image:url("../img/pixel.svg")}',
      ], 'site.css', { type: 'text/css' }) },
      { path: 'site/styles/theme.css', file: new File(['.utility-one{font-weight:700}'], 'theme.css', { type: 'text/css' }) },
      { path: 'site/scripts/app.js', file: new File(['document.body.dataset.localScript="ran"'], 'app.js', { type: 'text/javascript' }) },
      { path: 'site/img/pixel.svg', file: new File([
        '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2" fill="green"/></svg>',
      ], 'pixel.svg', { type: 'image/svg+xml' }) },
    ]);
  }, folderHtml);
  const folderFrame = await frameOf('iframe.fv-preview-frame');
  await folderFrame.waitForSelector('#local-card');
  assert.equal(await folderFrame.locator('#local-card').evaluate((element) => getComputedStyle(element).color), 'rgb(12, 34, 56)');
  assert.equal(await folderFrame.locator('#local-card').evaluate((element) => getComputedStyle(element).fontWeight), '700');
  assert.match(await folderFrame.locator('#local-image').getAttribute('src'), /^blob:/);
  assert.equal(await folderFrame.locator('#missing-image').getAttribute('src'), 'data:,');
  assert.equal(await folderFrame.locator('body').getAttribute('data-local-script'), null);
  const dependencyText = await folderFrame.locator('.fv-html-deps').textContent();
  assert.match(dependencyText, /resolved \d+ folder assets/i);
  assert.match(dependencyText, /missing local/i);

  // Accepting the existing raw-document trust gate makes the already-rewired local script live;
  // it still runs in sandbox=allow-scripts with no parent/file access.
  allowScripts = true;
  await page.evaluate(async () => {
    window.__fv.state.htmlAllowScripts = false;
    window.__fv.state.htmlAsked = false;
    await window.__fv.rerenderPreview();
  });
  const trustedFolderFrame = await frameOf('iframe.fv-preview-frame');
  await trustedFolderFrame.waitForSelector('body[data-local-script="ran"]');
  assert.equal(await page.getAttribute('iframe.fv-preview-frame', 'sandbox'), 'allow-scripts');

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
  assert.match(dialogMessages.find((message) => /Raw mode can request/.test(message)) || '', /images, stylesheets, fonts, media, frames, form targets/);
  assert.match(dialogMessages.find((message) => /Raw mode can request/.test(message)) || '', /fetch or WebSocket/);

  // A remote preset is network-silent when selected. Seed the dedicated cache with a deterministic
  // Tailwind stand-in, then prove the separate iframe button + confirmation loads that cached code
  // without contacting jsDelivr (and without weakening the sandbox).
  const tailwindUrl = 'https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4';
  await page.evaluate(async ({ source, url }) => {
    const cache = await caches.open('fv-html-dependencies-v1');
    await cache.put(url, new Response(source, { headers: { 'content-type': 'text/javascript' } }));
    await window.__fv.openBlobFile(new Blob([
      '<!doctype html><main class="mx-auto p-4 text-lg">Preset test</main>',
    ], { type: 'text/html' }), 'preset.html', { mime: 'text/html' });
  }, { source: 'document.documentElement.dataset.fvTailwindPreset="cached"', url: tailwindUrl });
  const beforePreset = offOrigin.length;
  await page.click('#settingsBtn');
  await page.waitForSelector('#set-htmlDependencyPreset', { state: 'attached' });
  await page.locator('#set-htmlDependencyPreset').evaluate((element) => { element.closest('details').open = true; });
  await page.selectOption('#set-htmlDependencyPreset', 'tailwind');
  const presetFrame = await frameOf('iframe.fv-preview-frame');
  await presetFrame.waitForSelector('[data-fv-action="html-load-remote"]');
  await page.waitForTimeout(250);
  assert.equal(offOrigin.length, beforePreset, 'selecting a remote preset must make no request');
  assert.match(await presetFrame.locator('.fv-html-deps').textContent(), /1\/1 resource cached/i);
  await page.evaluate(() => {
    document.getElementById('settingsDrawer').hidden = true;
    document.getElementById('scrim').hidden = true;
  });
  await presetFrame.locator('[data-fv-action="html-load-remote"]').click();
  await page.waitForFunction(() => window.__fv.state.htmlRemotePresetAllowed === 'tailwind');
  const loadedPresetFrame = await frameOf('iframe.fv-preview-frame');
  await loadedPresetFrame.waitForSelector('html[data-fv-tailwind-preset="cached"]');
  await page.waitForTimeout(250);
  assert.equal(offOrigin.length, beforePreset, 'cached preset load must make no off-origin request');
  assert.equal(await page.getAttribute('iframe.fv-preview-frame', 'sandbox'), 'allow-scripts');
  const presetDisclosure = dialogMessages.find((message) => /Load Tailwind Play CDN/.test(message)) || '';
  assert.match(presetDisclosure, /no network request/i);
  assert.match(presetDisclosure, /SCRIPT https:\/\/cdn\.jsdelivr\.net\/npm\/@tailwindcss\/browser@4/);

  console.log('html remote-resource privacy test passed');
} catch (error) {
  ctx.fail(error.stack || error.message);
} finally {
  if (blobUrl) await page.evaluate((url) => URL.revokeObjectURL(url), blobUrl).catch(() => {});
  await new Promise((resolve) => sentinel.close(resolve));
  await finish(ctx);
}
