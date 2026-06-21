#!/usr/bin/env node
// Build the vendored TipTap bundle: docs/vendor/tiptap/tiptap.esm.js
//
//   cd build/tiptap && npm install && node build.mjs
//
// Produces ONE self-contained, same-origin ESM file the page imports directly
// (no CDN, no runtime fetch). Re-run after bumping the @tiptap/* versions in
// package.json, then commit the regenerated docs/vendor/tiptap/tiptap.esm.js.
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');
const outfile = resolve(repoRoot, 'docs/vendor/tiptap/tiptap.esm.js');

// Pin the versions actually installed so the bundle header documents them.
const pkgLock = JSON.parse(readFileSync(resolve(here, 'package-lock.json'), 'utf8'));
const v = (name) => pkgLock.packages?.[`node_modules/${name}`]?.version ?? '?';
const versions = ['@tiptap/core', '@tiptap/starter-kit', '@tiptap/extension-table', '@tiptap/markdown', '@tiptap/pm']
  .map((n) => `//   ${n}@${v(n)}`).join('\n');

const banner = `// VENDORED — DO NOT EDIT BY HAND.
// Generated from build/tiptap/entry.js by build/tiptap/build.mjs.
// Rebuild:  cd build/tiptap && npm install && node build.mjs
// Bundled (MIT):
${versions}
`;

await build({
  entryPoints: [resolve(here, 'entry.js')],
  bundle: true,
  format: 'esm',
  minify: true,
  legalComments: 'none',
  outfile,
  banner: { js: banner },
  logLevel: 'info',
});

const bytes = readFileSync(outfile);
writeFileSync(outfile, bytes); // no-op; keeps fs import honest
console.log(`Wrote ${outfile} (${(bytes.length / 1024).toFixed(1)} KB)`);
