#!/usr/bin/env node
// Build the vendored UTIF bundle: docs/vendor/utif/utif.esm.js
//
//   cd build/tiff && npm install && node build.mjs
//
// Produces ONE self-contained, same-origin ESM file the page imports directly
// (no CDN, no runtime fetch). UTIF is published as CommonJS, so esbuild
// transpiles + bundles it into a single ESM module with a default export.
// Re-run after bumping the utif version in package.json, then commit
// docs/vendor/utif/utif.esm.js.
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');
const outfile = resolve(repoRoot, 'docs/vendor/utif/utif.esm.js');

const version = JSON.parse(
  readFileSync(resolve(here, 'node_modules/utif/package.json'), 'utf8'),
).version;

const banner = `// VENDORED — DO NOT EDIT BY HAND.
// Generated from build/tiff/entry.js by build/tiff/build.mjs.
// Rebuild:  cd build/tiff && npm install && node build.mjs
// Bundled (MIT):
//   utif@${version}
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
console.log(`Wrote ${outfile} (${(bytes.length / 1024).toFixed(1)} KB)  <-  utif@${version}`);
