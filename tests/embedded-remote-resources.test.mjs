import assert from 'node:assert/strict';
import http from 'node:http';
import { createHarness, finish } from './harness.mjs';

const sentinelRequests = [];
const sentinel = http.createServer((req, res) => {
  sentinelRequests.push(req.url);
  if (req.url.endsWith('.css')) {
    res.writeHead(200, { 'content-type': 'text/css', 'access-control-allow-origin': '*' });
    res.end('svg{background:red}');
  } else {
    res.writeHead(200, { 'content-type': 'image/svg+xml', 'access-control-allow-origin': '*' });
    res.end('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>');
  }
});
await new Promise((resolve) => sentinel.listen(0, '127.0.0.1', resolve));
const remote = `http://127.0.0.1:${sentinel.address().port}`;

const onePixelPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

function epubFixture({ origin, blobUrl }) {
  return {
    onePixelPng,
    files: {
      'META-INF/container.xml': `<?xml version="1.0"?>
    <container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
      <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
    </container>`,
      'OEBPS/content.opf': `<?xml version="1.0"?>
    <package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id">
      <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
        <dc:identifier id="id">privacy-probe</dc:identifier><dc:title>Privacy probe</dc:title>
      </metadata>
      <manifest><item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml"/></manifest>
      <spine><itemref idref="chapter"/></spine>
    </package>`,
      'OEBPS/images/nested.svg': `<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2">
    <style>.remote{background-image:u\\72l("${remote}/epub-nested-css.png")}</style>
    <image class="remote" href="${remote}/epub-nested-image.png" width="2" height="2"/>
  </svg>`,
      'OEBPS/chapter.xhtml': `<?xml version="1.0"?>
    <html xmlns="http://www.w3.org/1999/xhtml"><body>
      <h1>Privacy probe</h1>
      <input id="epub-remote-input" type="image" src="${remote}/epub-input.png"/>
      <img id="epub-safe-relative" src="images/pixel.png"/>
      <img id="epub-safe-origin" src="${origin}/favicon.svg"/>
      <img id="epub-safe-data" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="/>
      <img id="epub-safe-blob" src="${blobUrl}"/>
      <img id="epub-nested-svg" src="images/nested.svg"/>
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20">
        <defs><path id="local-shape" d="M0 0h1v1z"/></defs>
        <image id="epub-remote-image" href="${remote}/epub-image.png"/>
        <filter id="epub-filter"><feImage id="epub-remote-fe" href="${remote}/epub-fe.png"/></filter>
        <rect id="epub-remote-fill" width="10" height="10" fill="u\\72l(${remote}/epub-paint.svg#p)"/>
        <image id="epub-safe-svg" href="images/pixel.png"/>
        <image id="epub-safe-fragment" href="#local-shape"/>
      </svg>
    </body></html>`,
    },
  };
}

const ctx = await createHarness();
const { page, origin, frameOf, waitForFv } = ctx;
let blobUrl = null;

async function assertNoSentinelRequests(label) {
  await page.waitForTimeout(650);
  assert.deepEqual(sentinelRequests, [], `${label} must emit zero off-origin resource requests`);
}

try {
  await page.goto(origin, { waitUntil: 'load' });
  await waitForFv();
  blobUrl = await page.evaluate(() => URL.createObjectURL(new Blob([
    Uint8Array.from(atob('R0lGODlhAQABAAAAACw='), (char) => char.charCodeAt(0)),
  ], { type: 'image/gif' })));

  // Exercise the modular generic-image source directly. The production registry uses its
  // generated bundle, which the release integration step regenerates from this source.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="20" height="20">
    <style>
      @import "${remote}/generic-import.css";
      .remote { background-image:u\\72l("${remote}/generic-css.png"); }
      .safe { background-image:url("favicon.svg"); }
    </style>
    <image id="generic-remote-image" href="${remote}/generic-image.png"/>
    <filter id="g"><feImage id="generic-remote-fe" xlink:href="${remote}/generic-fe.png"/></filter>
    <rect id="generic-remote-fill" width="10" height="10" fill="url(${remote}/generic-paint.svg#p)"/>
    <image id="generic-safe-relative" class="safe" href="favicon.svg"/>
    <image id="generic-safe-origin" href="${origin}/favicon.svg"/>
    <image id="generic-safe-data" href="data:image/gif;base64,R0lGODlhAQABAAAAACw="/>
    <image id="generic-safe-blob" href="${blobUrl}"/>
  </svg>`;
  await page.evaluate(async (source) => {
    const { render } = await import('./types/image/renderer.js');
    const result = await render({ filename: 'generic.svg', text: source, bytes: new Uint8Array(), isBinary: false }, {});
    const iframe = document.createElement('iframe');
    iframe.id = 'generic-source-frame';
    iframe.setAttribute('sandbox', 'allow-same-origin');
    iframe.srcdoc = result.bodyHtml;
    document.body.appendChild(iframe);
  }, svg);
  let frame = await frameOf('#generic-source-frame');
  await frame.waitForSelector('#generic-safe-relative');
  await assertNoSentinelRequests('generic SVG source renderer');
  assert.equal(await frame.locator('#generic-remote-image').getAttribute('href'), null);
  assert.equal(await frame.locator('#generic-remote-fe').getAttribute('xlink:href'), null);
  assert.equal(await frame.locator('#generic-remote-fill').getAttribute('fill'), 'url("data:,")');
  assert.equal(await frame.locator('#generic-safe-relative').getAttribute('href'), 'favicon.svg');
  assert.equal(await frame.locator('#generic-safe-origin').getAttribute('href'), `${origin}/favicon.svg`);
  assert.match(await frame.locator('#generic-safe-data').getAttribute('href'), /^data:image\/gif/);
  assert.equal(await frame.locator('#generic-safe-blob').getAttribute('href'), blobUrl);

  sentinelRequests.length = 0;
  const emlHtml = `<p>Mail privacy probe</p>
    <input id="eml-remote-input" type="image" src="${remote}/eml-input.png">
    <img id="eml-safe-relative" src="favicon.svg"><img id="eml-safe-origin" src="${origin}/favicon.svg">
    <img id="eml-safe-data" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="><img id="eml-safe-blob" src="${blobUrl}">
    <svg width="20" height="20">
      <image id="eml-remote-image" href="${remote}/eml-image.png"></image>
      <filter id="e"><feImage id="eml-remote-fe" href="${remote}/eml-fe.png"></feImage></filter>
      <rect id="eml-remote-fill" width="10" height="10" fill="u\\72l(${remote}/eml-paint.svg#p)"></rect>
      <image id="eml-safe-svg" href="favicon.svg"></image>
    </svg>`;
  const eml = `MIME-Version: 1.0\r\nFrom: privacy@example.invalid\r\nTo: reader@example.invalid\r\nSubject: Privacy probe\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${emlHtml}`;
  await page.evaluate(async (source) => {
    await window.__fv.openBlobFile(new Blob([source], { type: 'message/rfc822' }), 'privacy.eml', { mime: 'message/rfc822' });
  }, eml);
  frame = await frameOf('iframe.eml-body-iframe');
  await frame.waitForSelector('#eml-safe-relative');
  await assertNoSentinelRequests('EML renderer');
  assert.equal(await frame.locator('#eml-remote-input').getAttribute('src'), null);
  assert.equal(await frame.locator('#eml-remote-image').getAttribute('href'), null);
  assert.equal(await frame.locator('#eml-remote-fe').getAttribute('href'), null);
  assert.equal(await frame.locator('#eml-remote-fill').getAttribute('fill'), 'url("data:,")');
  assert.equal(await frame.locator('#eml-safe-relative').getAttribute('src'), 'favicon.svg');
  assert.equal(await frame.locator('#eml-safe-origin').getAttribute('src'), `${origin}/favicon.svg`);
  assert.match(await frame.locator('#eml-safe-data').getAttribute('src'), /^data:image\/gif/);
  assert.equal(await frame.locator('#eml-safe-blob').getAttribute('src'), blobUrl);
  assert.equal(await frame.locator('#eml-safe-svg').getAttribute('href'), 'favicon.svg');

  sentinelRequests.length = 0;
  const dedicatedSvg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="20" height="20">
    <style>
      @import "${remote}/svg-import.css";
      @import "assets/preview.css";
      .remote { background-image:u\\72l("${remote}/svg-css.png"); cursor:url(${remote}/svg.cur), auto; }
      .safe { background-image:url("favicon.svg"); }
    </style>
    <foreignObject width="1" height="1"><input xmlns="http://www.w3.org/1999/xhtml" id="svg-remote-input" type="image" src="${remote}/svg-input.png"/></foreignObject>
    <image id="svg-remote-image" href="${remote}/svg-image.png"/>
    <filter id="s"><feImage id="svg-remote-fe" xlink:href="${remote}/svg-fe.png"/></filter>
    <rect id="svg-remote-fill" class="remote" width="10" height="10" fill="url(${remote}/svg-paint.svg#p)"/>
    <image id="svg-safe-relative" class="safe" href="favicon.svg"/>
    <image id="svg-safe-origin" href="${origin}/favicon.svg"/>
    <image id="svg-safe-data" href="data:image/gif;base64,R0lGODlhAQABAAAAACw="/>
    <image id="svg-safe-blob" href="${blobUrl}"/>
    <animate id="svg-animation" attributeName="href" values="${remote}/svg-animated.png"/>
    <script>document.body.dataset.ran='1'<\/script>
  </svg>`;
  await page.evaluate(async (source) => {
    await window.__fv.openBlobFile(new Blob([source], { type: 'image/svg+xml' }), 'privacy.svg', { mime: 'image/svg+xml' });
  }, dedicatedSvg);
  frame = await frameOf('iframe.svg-preview-iframe', 20000);
  await frame.waitForSelector('#svg-safe-relative');
  await assertNoSentinelRequests('dedicated SVG renderer');
  assert.equal(await frame.locator('#svg-remote-input').getAttribute('src'), null);
  assert.equal(await frame.locator('#svg-remote-image').getAttribute('href'), null);
  assert.equal(await frame.locator('#svg-remote-fe').getAttribute('xlink:href'), null);
  assert.equal(await frame.locator('#svg-remote-fill').getAttribute('fill'), 'url("data:,")');
  assert.equal(await frame.locator('#svg-animation').count(), 0);
  assert.equal(await frame.locator('script').count(), 0);
  assert.equal(await frame.locator('#svg-safe-relative').getAttribute('href'), 'favicon.svg');
  assert.equal(await frame.locator('#svg-safe-origin').getAttribute('href'), `${origin}/favicon.svg`);
  assert.match(await frame.locator('#svg-safe-data').getAttribute('href'), /^data:image\/gif/);
  assert.equal(await frame.locator('#svg-safe-blob').getAttribute('href'), blobUrl);
  const svgCss = (await frame.locator('style').allTextContents()).join('\n');
  assert.ok(svgCss.includes('assets/preview.css'), 'same-origin SVG import is preserved');
  assert.ok(svgCss.includes('favicon.svg'), 'same-origin SVG CSS resource is preserved');
  assert.ok(!svgCss.includes(remote), 'remote SVG CSS is neutralized');

  sentinelRequests.length = 0;
  // Build the archive with the app's vendored browser JSZip so the standard check gate does not
  // depend on root node_modules (its only test-runtime prerequisite remains Playwright).
  const epub = await page.evaluate(async ({ files, onePixelPng: png }) => {
    // Monaco installs AMD `define`; evaluate with module globals shadowed so JSZip's UMD wrapper
    // takes its browser-global branch (the same protection used by core/script-loader.js).
    if (typeof window.JSZip !== 'function') {
      const response = await fetch('vendor/jszip/jszip.min.js');
      if (!response.ok) throw new Error('Could not load vendored JSZip');
      new Function('define', 'module', 'exports', await response.text()).call(window, undefined, undefined, undefined);
    }
    const zip = new window.JSZip();
    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
    for (const [path, source] of Object.entries(files)) zip.file(path, source);
    zip.file('OEBPS/images/pixel.png', Uint8Array.from(atob(png), (char) => char.charCodeAt(0)));
    return [...await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })];
  }, epubFixture({ origin, blobUrl }));
  await page.evaluate(async (bytes) => {
    await window.__fv.openBlobFile(new Blob([new Uint8Array(bytes)], { type: 'application/epub+zip' }), 'privacy.epub', { mime: 'application/epub+zip' });
  }, epub);
  await page.waitForSelector('#previewHost .epub-doc', { timeout: 20000 });
  await page.waitForSelector('#previewHost #epub-safe-relative', { timeout: 20000 });
  await assertNoSentinelRequests('EPUB renderer');
  assert.equal(await page.locator('#epub-remote-input').getAttribute('src'), null);
  assert.equal(await page.locator('#epub-remote-image').getAttribute('href'), null);
  assert.equal(await page.locator('#epub-remote-fe').getAttribute('href'), null);
  assert.equal(await page.locator('#epub-remote-fill').getAttribute('fill'), 'url("data:,")');
  assert.match(await page.locator('#epub-safe-relative').getAttribute('src'), /^blob:/);
  assert.equal(await page.locator('#epub-safe-origin').getAttribute('src'), `${origin}/favicon.svg`);
  assert.match(await page.locator('#epub-safe-data').getAttribute('src'), /^data:image\/gif/);
  assert.equal(await page.locator('#epub-safe-blob').getAttribute('src'), blobUrl);
  assert.match(await page.locator('#epub-nested-svg').getAttribute('src'), /^blob:/);
  assert.match(await page.locator('#epub-safe-svg').getAttribute('href'), /^blob:/);
  assert.equal(await page.locator('#epub-safe-fragment').getAttribute('href'), '#local-shape');

  assert.deepEqual(ctx.offOrigin, [], 'privacy probes must remain within the app origin');
  console.log('embedded remote-resource privacy test passed');
} catch (error) {
  ctx.fail(error.stack || error.message);
} finally {
  if (blobUrl) await page.evaluate((url) => URL.revokeObjectURL(url), blobUrl).catch(() => {});
  await new Promise((resolve) => sentinel.close(resolve));
  await finish(ctx);
}
