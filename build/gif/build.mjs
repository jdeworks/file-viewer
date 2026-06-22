#!/usr/bin/env node
// Build the vendored gifuct-js bundle: docs/vendor/gifuct/gifuct.esm.js
//
//   cd build/gif && npm install && node build.mjs
//
// Produces ONE self-contained, same-origin ESM file the page imports directly
// (no CDN, no runtime fetch). gifuct-js is published as CommonJS, so esbuild
// transpiles + bundles it (and its `js-binary-schema-parser` dep) into a single
// ESM module re-exporting parseGIF + decompressFrames. Re-run after bumping the
// gifuct-js version in package.json, then commit docs/vendor/gifuct/gifuct.esm.js.
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');
const outfile = resolve(repoRoot, 'docs/vendor/gifuct/gifuct.esm.js');

// Pin the version actually installed so the bundle header documents it.
const version = JSON.parse(
  readFileSync(resolve(here, 'node_modules/gifuct-js/package.json'), 'utf8'),
).version;

const banner = `// VENDORED — DO NOT EDIT BY HAND.
// Generated from build/gif/entry.js by build/gif/build.mjs.
// Rebuild:  cd build/gif && npm install && node build.mjs
// Bundled (MIT):
//   gifuct-js@${version}
`;

await build({
  entryPoints: [resolve(here, 'entry.js')],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  minify: true,
  legalComments: 'none',
  outfile,
  banner: { js: banner },
  logLevel: 'info',
});

const bytes = readFileSync(outfile);
console.log(`Wrote ${outfile} (${(bytes.length / 1024).toFixed(1)} KB)  <-  gifuct-js@${version}`);
