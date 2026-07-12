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
// Tiering: FV_SMOKE_TIER=core runs only the light "core" areas (shell + detection + representative
// viewers), kept under ~3-4 min so it can back the check.sh --fast aggregate fallback without paying
// the full 15-20 min sweep. Default ('full') runs every area. The HEAVY areas — WebGL/wasm (media-3d,
// media-studio), the ~1,100-file catalog sweep (examples-catalog), and the fidelity suites — only run
// in the full gate (or as path-owned standalone areas via smoke-area.mjs). Order is preserved from the
// historical sequence; every area self-bootstraps (its run() navigates / opens its own file first), so
// skipping heavy areas mid-sequence never shifts another area's baseline.
const TIER = process.env.FV_SMOKE_TIER || 'full';

const AREAS = [
  ['core-ui', coreUi, 'core'],
  ['diff', diff, 'core'],
  ['kv-merge', kvMerge, 'core'],
  ['tabular-office', tabularOffice, 'core'],
  ['structured-types', structuredTypes, 'core'],
  ['simple-types', simpleTypes, 'core'],
  ['exports', exports, 'core'],
  ['email-archives', emailArchives, 'core'],
  ['media-3d', media3d, 'heavy'],
  ['media-studio', mediaStudio, 'heavy'],
  ['ebook-git', ebookGit, 'core'],
  ['git', git, 'core'],
  ['interactions', interactions, 'core'],
  ['games', games, 'core'],
  ['tree-drag', treeDrag, 'core'],
  ['examples-catalog', examplesCatalog, 'heavy'],
  ['cap-fidelity', capFidelity, 'heavy'],
  ['enhanced-security-fidelity', enhancedSecurityFidelity, 'heavy'],
  ['partial-support-fidelity', partialSupportFidelity, 'heavy'],
];

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
  const selected = AREAS.filter(([, , tier]) => TIER !== 'core' || tier === 'core');
  console.log(`smoke tier=${TIER}: running ${selected.length}/${AREAS.length} areas`);
  for (const [name, mod] of selected) {
    if (shouldTimeAreas) await runArea(name, () => mod.run(ctx));
    else await mod.run(ctx);
  }
} catch (e) {
  ctx.fail('exception: ' + e.message);
} finally {
  await finish(ctx);
}
