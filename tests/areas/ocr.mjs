// OCR smoke area (heavy: loads the vendored tesseract.js wasm core + traineddata). Run on demand:
//   node tests/smoke-area.mjs ocr
// NOT part of the smoke.mjs core gate (the wasm parse + recognize is slow). Proves the shared engine
// works fully OFFLINE end-to-end (the harness separately asserts ZERO off-origin requests across the
// run) by recognizing an image after PPTX, the digits preset, and the video plumbing.
export async function run(ctx) {
  const { page, origin, pass, fail, openExample } = ctx;
  await page.goto(origin, { waitUntil: 'load' });

  // 1. PptxViewJS used to replace window.FileReader with an incompatible helper. Open a deck first,
  //    then drive the image viewer's real OCR button to cover the reported cross-format sequence.
  await openExample('Sample.pptx');
  await page.waitForSelector('#previewHost img.pptx-slide', { timeout: 30000 });
  await page.evaluate(async () => {
    const c = document.createElement('canvas');
    c.width = 520; c.height = 160;
    const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#000'; g.font = 'bold 80px sans-serif'; g.textBaseline = 'top';
    g.fillText('HELLO', 24, 30);
    const blob = await new Promise((resolve) => c.toBlob(resolve, 'image/png'));
    localStorage.setItem('imgv-ocr-consent', '1');
    await window.__fv.openBlobFile(blob, 'ocr-after-pptx.png', { mime: 'image/png' });
  });
  await page.waitForSelector('#previewHost .imgv-ocr-btn:not([hidden])', { timeout: 15000 });
  await page.click('#previewHost .imgv-ocr-btn');
  await page.waitForFunction(() => {
    const status = document.querySelector('#previewHost .imgv-ocr-status')?.textContent || '';
    return status !== '' && status !== 'Recognizing…';
  }, null, { timeout: 120000 });
  const imageOcr = await page.evaluate(() => ({
    text: document.querySelector('#previewHost .imgv-ocr-out')?.value || '',
    error: document.querySelector('#previewHost .imgv-ocr-err')?.textContent || '',
  }));
  const norm = imageOcr.text.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!imageOcr.error && norm.includes('HELLO')) pass('OCR: image button recognizes text after PPTX in the same page');
  else fail('OCR after PPTX: ' + JSON.stringify(imageOcr));

  // 2. Digits-optimized preset reads a number string.
  const digits = await page.evaluate(async () => {
    const c = document.createElement('canvas');
    c.width = 420; c.height = 140;
    const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#000'; g.font = 'bold 80px sans-serif'; g.textBaseline = 'top';
    g.fillText('1234567', 20, 25);
    const ocr = await import('/core/ocr/index.js');
    return (await ocr.recognize(c, { digits: true })).text;
  });
  if ((digits || '').replace(/\D/g, '').includes('1234567')) pass('OCR: digits preset reads numbers');
  else fail('OCR digits preset: ' + JSON.stringify(digits));

  // 3. Video plumbing: sample a decodable <video> (webm) and serialize. One frame (interval = duration)
  //    keeps it fast; text may be empty — we assert the sample→recognize→serialize pipeline runs.
  const vid = await page.evaluate(async () => {
    const ocr = await import('/core/ocr/index.js');
    const v = document.createElement('video');
    v.muted = true; v.src = '/examples/sample.webm';
    await new Promise((res, rej) => {
      v.addEventListener('loadedmetadata', res, { once: true });
      v.addEventListener('error', () => rej(new Error('video failed to load')), { once: true });
    });
    const cues = await ocr.ocrVideo(v, { intervalSec: Math.max(1, v.duration || 1), maxWidth: 320 });
    return { isArray: Array.isArray(cues), srt: typeof ocr.toSRT(cues) };
  }).catch((e) => ({ error: e.message }));
  if (vid && vid.isArray && vid.srt === 'string') pass('OCR: ocrVideo samples a real <video> and serializes (plumbing)');
  else fail('OCR video plumbing: ' + JSON.stringify(vid));

  // Free the worker so it doesn't linger for later areas.
  await page.evaluate(async () => { try { (await import('/core/ocr/index.js')).terminate(); } catch {} });
}
