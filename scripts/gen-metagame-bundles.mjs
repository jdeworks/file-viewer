// Regenerate the per-stage metagame bundles (docs/games/metagame/stages/stageN/stage.generated.js).
//
//   node scripts/gen-metagame-bundles.mjs
//
// Thin wrapper so check.sh can call it alongside the other generators. The actual esbuild bundling
// lives in build/metagame/build.mjs (which owns the esbuild devDependency, exactly like
// build/known/build.mjs and build/tiptap/build.mjs do). If esbuild isn't installed yet, install it
// from the local npm cache (offline) so the build stays repeatable and never reaches a CDN — at
// build time OR runtime (the OUTPUT is a vendored same-origin ESM).
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const buildDir = resolve(repoRoot, 'build/metagame');
const esbuildPkg = resolve(buildDir, 'node_modules/esbuild/package.json');

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: buildDir, ...opts });
  if (r.status !== 0) {
    console.error(`\n${cmd} ${args.join(' ')} failed (exit ${r.status}).`);
    process.exit(r.status || 1);
  }
}

if (!existsSync(esbuildPkg)) {
  console.log('esbuild not installed in build/metagame — installing from local cache (offline)…');
  run('npm', ['install', '--offline', '--no-audit', '--no-fund']);
}

run('node', ['build.mjs']);
