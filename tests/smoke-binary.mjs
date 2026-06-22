// Runs the binary/container file-type smokes in their OWN fresh browser process — like
// smoke-known.mjs does for known-files. This area opens ~45 heavy WebGL/wasm renderers (3D mol
// viewers, CAD, scientific data) via per-test page.goto; keeping them out of the shared smoke.mjs
// process (which already runs 14 areas) avoids GPU/RAM accumulation on constrained WSL2 hosts.
import { createHarness, finish } from './harness.mjs';
import * as binaryTypes from './areas/binary-types.mjs';

const ctx = await createHarness();
try {
  await binaryTypes.run(ctx);
} catch (e) {
  ctx.fail('exception: ' + e.message);
} finally {
  await finish(ctx);
}
