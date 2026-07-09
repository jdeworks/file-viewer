// Targeted smoke runner — runs ONLY the area files you name, in one fresh browser.
// Use this instead of the full `check.sh` when iterating on a change, so you don't
// reboot the SPA ~2000 times (see the area map below for which file covers what).
//
//   node tests/smoke-area.mjs media-3d                 # one area
//   node tests/smoke-area.mjs interactions simple-types # several
//   node tests/smoke-area.mjs --list                    # show the area map
//
// Each area is an independent `run(ctx)` module under tests/areas/. The heavy
// `known-files` area is included by name but is the slowest by far (~1600 reloads).
import { createHarness, finish } from './harness.mjs';

const AREAS = {
  'core-ui':           () => import('./areas/core-ui.mjs'),
  'diff':              () => import('./areas/diff.mjs'),
  'kv-merge':          () => import('./areas/kv-merge.mjs'),
  'tabular-office':    () => import('./areas/tabular-office.mjs'),
  'structured-types':  () => import('./areas/structured-types.mjs'),
  'simple-types':      () => import('./areas/simple-types.mjs'),
  'exports':           () => import('./areas/exports.mjs'),
  'email-archives':    () => import('./areas/email-archives.mjs'),
  'media-3d':          () => import('./areas/media-3d.mjs'),
  'media-studio':      () => import('./areas/media-studio.mjs'),
  'media-studio-mixer-shell': () => import('./areas/media-studio-mixer-shell.mjs'),
  'media-studio-mixer-audio-listen': () => import('./areas/media-studio-mixer-audio-listen.mjs'),
  'ebook-git':         () => import('./areas/ebook-git.mjs'),
  'git':               () => import('./areas/git.mjs'),
  'interactions':      () => import('./areas/interactions.mjs'),
  'games':             () => import('./areas/games.mjs'),
  'tree-drag':         () => import('./areas/tree-drag.mjs'),
  'examples-catalog':  () => import('./areas/examples-catalog.mjs'),
  'binary-types':      () => import('./areas/binary-types.mjs'),
  'known-files':       () => import('./areas/known-files.mjs'),
  'ocr':               () => import('./areas/ocr.mjs'),   // heavy wasm; on-demand only (not in smoke.mjs core gate)
};

const args = process.argv.slice(2);
if (args.length === 0 || args.includes('--list') || args.includes('-h') || args.includes('--help')) {
  console.log('Usage: node tests/smoke-area.mjs <area> [<area>...]\n\nKnown areas:');
  for (const k of Object.keys(AREAS)) console.log('  ' + k);
  process.exit(args.length === 0 ? 1 : 0);
}

const unknown = args.filter((a) => !AREAS[a]);
if (unknown.length) {
  console.error('Unknown area(s): ' + unknown.join(', ') + '\nRun with --list to see valid names.');
  process.exit(1);
}

const ctx = await createHarness();
try {
  for (const name of args) {
    console.log('── area: ' + name + ' ──');
    const mod = await AREAS[name]();
    await mod.run(ctx);
  }
} catch (e) {
  ctx.fail('exception: ' + e.message);
} finally {
  await finish(ctx);
}
