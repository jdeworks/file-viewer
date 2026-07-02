// Regenerate the bundled app core (docs/core/app.generated.js).
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const buildDir = resolve(repoRoot, 'build/app');
const esbuildPkg = resolve(buildDir, 'node_modules/esbuild/package.json');

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: buildDir });
  if (r.status !== 0) {
    console.error(`\n${cmd} ${args.join(' ')} failed (exit ${r.status}).`);
    process.exit(r.status || 1);
  }
}

if (!existsSync(esbuildPkg)) {
  console.log('esbuild not installed in build/app — installing from local cache (offline)…');
  run('npm', ['install', '--offline', '--no-audit', '--no-fund']);
}

run('node', ['build.mjs']);
