// Standalone smoke test: serves docs/ and drives headless Chromium.
// Uses the Playwright install from the sibling make-it-look-good repo.
// Verifies: page loads clean, markdown renders in the sandboxed iframe, the magic
// selector wires preview->raw, and ZERO off-origin requests are made (trust guarantee).
import { createHarness, finish } from './harness.mjs';
import * as coreUi from './areas/core-ui.mjs';
import * as diff from './areas/diff.mjs';
import * as kvMerge from './areas/kv-merge.mjs';
import * as tabularOffice from './areas/tabular-office.mjs';
import * as structuredTypes from './areas/structured-types.mjs';
import * as simpleTypes from './areas/simple-types.mjs';
import * as exports from './areas/exports.mjs';
import * as emailArchives from './areas/email-archives.mjs';
import * as media3d from './areas/media-3d.mjs';
import * as mediaStudio from './areas/media-studio.mjs';
import * as ebookGit from './areas/ebook-git.mjs';
import * as git from './areas/git.mjs';
import * as interactions from './areas/interactions.mjs';
import * as games from './areas/games.mjs';
import * as treeDrag from './areas/tree-drag.mjs';
import * as examplesCatalog from './areas/examples-catalog.mjs';
import * as capFidelity from './areas/cap-fidelity.mjs';
import * as enhancedSecurityFidelity from './areas/enhanced-security-fidelity.mjs';
import * as partialSupportFidelity from './areas/partial-support-fidelity.mjs';
// binary-types is NOT run here — it's the heavy WebGL/wasm area (45 per-test page.goto opens) and
// runs in its own fresh process via smoke-binary.mjs (like known-files via smoke-known.mjs) so
// those heavy renderers don't accumulate in the shared browser after 15 prior areas.

const shouldTimeAreas = process.env.FV_SMOKE_TIMING === '1';

const areaStamp = () => {
  const now = new Date();
  const to2 = (n) => String(n).padStart(2, '0');
  return `${to2(now.getHours())}:${to2(now.getMinutes())}:${to2(now.getSeconds())}`;
};

const runArea = async (name, fn) => {
  const startMs = Date.now();
  console.log(`[${areaStamp()}] ${name} start`);
  await fn();
  const elapsedMs = Date.now() - startMs;
  const seconds = (elapsedMs / 1000).toFixed(3);
  console.log(`[${areaStamp()}] ${name} end, elapsed ${seconds}s`);
};

const ctx = await createHarness();
try {
  if (shouldTimeAreas) {
    await runArea('core-ui', () => coreUi.run(ctx));
    await runArea('diff', () => diff.run(ctx));
    await runArea('kv-merge', () => kvMerge.run(ctx));
    await runArea('tabular-office', () => tabularOffice.run(ctx));
    await runArea('structured-types', () => structuredTypes.run(ctx));
    await runArea('simple-types', () => simpleTypes.run(ctx));
    await runArea('exports', () => exports.run(ctx));
    await runArea('email-archives', () => emailArchives.run(ctx));
    await runArea('media-3d', () => media3d.run(ctx));
    await runArea('media-studio', () => mediaStudio.run(ctx));
    await runArea('ebook-git', () => ebookGit.run(ctx));
    await runArea('git', () => git.run(ctx));
    await runArea('interactions', () => interactions.run(ctx));
    await runArea('games', () => games.run(ctx));
    await runArea('tree-drag', () => treeDrag.run(ctx));
    await runArea('examples-catalog', () => examplesCatalog.run(ctx));
    await runArea('cap-fidelity', () => capFidelity.run(ctx));
    await runArea('enhanced-security-fidelity', () => enhancedSecurityFidelity.run(ctx));
    await runArea('partial-support-fidelity', () => partialSupportFidelity.run(ctx));
  } else {
    await coreUi.run(ctx);
    await diff.run(ctx);
    await kvMerge.run(ctx);
    await tabularOffice.run(ctx);
    await structuredTypes.run(ctx);
    await simpleTypes.run(ctx);
    await exports.run(ctx);
    await emailArchives.run(ctx);
    await media3d.run(ctx);
    await mediaStudio.run(ctx);
    await ebookGit.run(ctx);
    await git.run(ctx);
    await interactions.run(ctx);
    await games.run(ctx);
    await treeDrag.run(ctx);
    await examplesCatalog.run(ctx);
    await capFidelity.run(ctx);
    await enhancedSecurityFidelity.run(ctx);
    await partialSupportFidelity.run(ctx);
  }
} catch (e) {
  ctx.fail('exception: ' + e.message);
} finally {
  await finish(ctx);
}
