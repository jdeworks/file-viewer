import { createHarness, finish, pass, fail } from './harness.mjs';

const ctx = await createHarness();
const { page, openExample } = ctx;

try {
  await openExample('sample.psd');
  await page.waitForSelector('#previewHost canvas.layered-canvas');
  const pixels = await page.$eval('#previewHost canvas.layered-canvas', (canvas) => {
    const context = canvas.getContext('2d');
    const at = (x, y) => [...context.getImageData(x, y, 1, 1).data];
    return { corner: at(0, 0), center: at(50, 50), lower: at(75, 75) };
  });
  const opaque = [pixels.corner, pixels.center, pixels.lower].every((pixel) => pixel[3] > 240);
  const backgroundVisible = pixels.corner.slice(0, 3).every((channel) => channel > 240);
  const foregroundVisible = pixels.center[0] > pixels.center[1] && pixels.lower[1] > pixels.lower[0];
  if (opaque && backgroundVisible && foregroundVisible) {
    pass('PSD composite preserves opaque background and correctly stacked foreground layers');
  } else {
    fail('PSD composite pixels are wrong: ' + JSON.stringify(pixels));
  }
} catch (error) {
  fail('PSD composite regression threw: ' + (error?.stack || error));
} finally {
  await finish(ctx);
}
