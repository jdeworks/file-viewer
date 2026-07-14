#!/usr/bin/env node
// Build the bundled app core: docs/core/app.generated.js
//
// The app shell is authored as small ESM modules, but loading each static import as a separate
// browser request makes startup slow on GitHub Pages. This build inlines the startup static graph
// into one same-origin ESM while preserving every dynamic import() as a lazy runtime boundary.
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, relative } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import { brotliCompressSync, constants as zlibConstants, gzipSync } from 'node:zlib';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');
const entry = resolve(repoRoot, 'docs/core/app.js');
const outfile = resolve(repoRoot, 'docs/core/app.generated.js');
const graphFile = resolve(repoRoot, 'build/app/app-graph.generated.json');
const outDir = dirname(outfile);
const SHARED_SINGLETONS = new Set([
  resolve(repoRoot, 'docs/core/state.js'),
  resolve(repoRoot, 'docs/core/script-loader.js'),
  resolve(repoRoot, 'docs/core/monaco-loader.js'),
  resolve(repoRoot, 'docs/core/companion.js'),
]);

const lazy = new Set();
const externalizeBoundaries = {
  name: 'app-core-boundaries',
  setup(b) {
    b.onResolve({ filter: /.*/ }, (args) => {
      if (args.kind !== 'dynamic-import' && args.kind !== 'import-statement') return null;
      const abs = args.path.startsWith('.')
        ? resolve(args.resolveDir, args.path)
        : args.path;
      if (args.kind === 'import-statement' && !SHARED_SINGLETONS.has(abs)) return null;
      let spec = abs;
      if (args.path.startsWith('.')) {
        spec = relative(outDir, abs).split('\\').join('/');
        if (!spec.startsWith('.')) spec = './' + spec;
      }
      if (args.kind === 'dynamic-import') lazy.add(spec);
      return { path: spec, external: true };
    });
  },
};

const banner = `// GENERATED — DO NOT EDIT BY HAND.
// Bundled from docs/core/app.js by build/app/build.mjs.
// Static startup modules are inlined to reduce browser request count. Every dynamic import()
// stays external/lazy, including detectors, type renderers, examples, games, known files, Monaco,
// side-by-side compare, and optional tools.
`;

const result = await build({
  entryPoints: [entry],
  bundle: true,
  format: 'esm',
  minify: true,
  target: ['es2022'],
  treeShaking: true,
  legalComments: 'none',
  charset: 'utf8',
  outfile,
  banner: { js: banner },
  plugins: [externalizeBoundaries],
  metafile: true,
  logLevel: 'warning',
});

writeFileSync(outfile, readFileSync(outfile));
const bytes = readFileSync(outfile);
const inlined = Object.keys(result.metafile.inputs).filter((p) => !p.includes('node_modules')).length;
const outputMeta = Object.values(result.metafile.outputs)[0];
const inputRows = Object.entries(outputMeta?.inputs || {}).map(([input, info]) => ({
  path: input.split('\\').join('/'),
  bytesInOutput: info.bytesInOutput,
})).sort((a, b) => b.bytesInOutput - a.bytesInOutput || a.path.localeCompare(b.path));
const graph = {
  schemaVersion: 1,
  entry: relative(repoRoot, entry).split('\\').join('/'),
  output: relative(repoRoot, outfile).split('\\').join('/'),
  format: 'esm',
  target: 'es2022',
  minified: true,
  bytes: bytes.length,
  gzipBytes: gzipSync(bytes, { level: 9 }).length,
  brotliBytes: brotliCompressSync(bytes, {
    params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 11 },
  }).length,
  inlinedModules: inlined,
  dynamicImports: [...lazy].sort(),
  inputs: inputRows,
};
writeFileSync(graphFile, JSON.stringify(graph, null, 2) + '\n');
console.log(`Wrote ${relative(repoRoot, outfile)} (${(bytes.length / 1024).toFixed(1)} KB, ${inlined} modules inlined)`);
console.log(`Kept ${lazy.size} dynamic imports external.`);
console.log(`Wrote ${relative(repoRoot, graphFile)} (${(graph.gzipBytes / 1024).toFixed(1)} KB gzip, ${(graph.brotliBytes / 1024).toFixed(1)} KB brotli)`);
