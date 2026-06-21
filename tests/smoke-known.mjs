// Runs only the known-files area in a fresh process to avoid OOM on WSL2
// when the full suite (812 page.goto calls in known-files alone) accumulates too much memory.
import { createHarness, finish } from './harness.mjs';
import * as knownFiles from './areas/known-files.mjs';

const ctx = await createHarness();
try {
  await knownFiles.run(ctx);
} catch (e) {
  ctx.fail('exception: ' + e.message);
} finally {
  await finish(ctx);
}
