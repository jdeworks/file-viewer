// Standalone smoke test: serves docs/ and drives headless Chromium.
// Uses the Playwright install from the sibling make-it-look-good repo.
// Verifies: page loads clean, markdown renders in the sandboxed iframe, the magic
// selector wires preview->raw, and ZERO off-origin requests are made (trust guarantee).
import { createHarness, finish } from './harness.mjs';
import * as coreUi from './areas/core-ui.mjs';
import * as diff from './areas/diff.mjs';
import * as tabularOffice from './areas/tabular-office.mjs';
import * as structuredTypes from './areas/structured-types.mjs';
import * as simpleTypes from './areas/simple-types.mjs';
import * as knownFiles from './areas/known-files.mjs';
import * as exports from './areas/exports.mjs';
import * as emailArchives from './areas/email-archives.mjs';
import * as media3d from './areas/media-3d.mjs';
import * as ebookGit from './areas/ebook-git.mjs';
import * as interactions from './areas/interactions.mjs';
import * as games from './areas/games.mjs';
import * as treeDrag from './areas/tree-drag.mjs';
import * as examplesCatalog from './areas/examples-catalog.mjs';

const ctx = await createHarness();
try {
  await coreUi.run(ctx);
  await diff.run(ctx);
  await tabularOffice.run(ctx);
  await structuredTypes.run(ctx);
  await simpleTypes.run(ctx);
  await knownFiles.run(ctx);
  await exports.run(ctx);
  await emailArchives.run(ctx);
  await media3d.run(ctx);
  await ebookGit.run(ctx);
  await interactions.run(ctx);
  await games.run(ctx);
  await treeDrag.run(ctx);
  await examplesCatalog.run(ctx);
} catch (e) {
  ctx.fail('exception: ' + e.message);
} finally {
  await finish(ctx);
}
