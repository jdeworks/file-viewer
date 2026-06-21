#!/usr/bin/env node
// Build the bundled known-file registry: docs/known/registry.generated.js
//
//   node build/known/build.mjs            (re-run after editing docs/known/registry.js
//                                           or any known plugin index.js)
//
// WHY: docs/known/registry.js statically imports ~889 per-plugin index.js files. Loaded
// directly by the page that means ~889 first-paint requests — way over the ≤100 budget.
// esbuild collapses all 889 index.js modules (which are pure metadata: id/label/match/about
// plus dynamic loadRenderer thunks) into ONE same-origin ESM that exports
// matchKnown/matchAllKnown/KNOWN.
//
// Renderers STAY LAZY. Every plugin's `loadRenderer: () => import('./renderer.js')` (and
// './render.js', './metadata.js', '../../../../core/diff-renderer.js') is marked EXTERNAL so
// esbuild does NOT inline the renderer bodies into the page-load bundle. Instead each dynamic
// import specifier is rewritten to be correct relative to the OUTPUT file location, so the
// browser still fetches each renderer.js as its own chunk only when a matching file opens.
//
// The output is a committed *.generated.* artifact — never hand-edit it; edit the source
// (docs/known/registry.js or the plugin) and re-run this script. scripts/check.sh runs it and
// fails on staleness, exactly like gen-registry-runtime.mjs.
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, relative, posix } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');
const entry = resolve(repoRoot, 'docs/known/registry.js');
const outfile = resolve(repoRoot, 'docs/known/registry.generated.js');
const outDir = dirname(outfile);

// These specifier suffixes are the lazy renderer / metadata / diff chunks. Keep them external
// (separate, on-demand chunks) and rewrite the path so it resolves relative to `outfile`.
const LAZY_SUFFIXES = ['renderer.js', 'render.js', 'metadata.js', 'diff-renderer.js'];
function isLazy(spec) {
  return LAZY_SUFFIXES.some((s) => spec.endsWith('/' + s) || spec === './' + s);
}

// esbuild plugin: mark each lazy dynamic import external and rewrite its specifier to a path
// relative to the generated bundle's directory (so `import('./renderer.js')` inside a plugin
// becomes e.g. `import('../types/text/json/known/package-json/renderer.js')`).
const keepRenderersLazy = {
  name: 'keep-renderers-lazy',
  setup(b) {
    b.onResolve({ filter: /\.js$/ }, (args) => {
      if (args.kind !== 'dynamic-import' || !isLazy(args.path)) return null;
      const abs = resolve(args.resolveDir, args.path);
      let rel = relative(outDir, abs).split('\\').join('/');
      if (!rel.startsWith('.')) rel = './' + rel;
      return { path: rel, external: true };
    });
  },
};

const banner = `// GENERATED — DO NOT EDIT BY HAND.
// Bundled from docs/known/registry.js (+ ~889 plugin index.js files) by build/known/build.mjs.
// Rebuild:  node build/known/build.mjs   (run by scripts/check.sh; fails if stale)
// Exports matchKnown / matchAllKnown / KNOWN. Renderer modules stay lazy (external dynamic
// imports rewritten relative to this file) — they are NOT inlined here.
`;

const result = await build({
  entryPoints: [entry],
  bundle: true,
  format: 'esm',
  // No minify: keep the generated bundle diff-reviewable like the other *.generated.* files.
  minify: false,
  legalComments: 'none',
  charset: 'utf8',
  outfile,
  plugins: [keepRenderersLazy],
  banner: { js: banner },
  metafile: true,
  logLevel: 'info',
});

const bytes = readFileSync(outfile);
// Normalise trailing whitespace for stable, repeatable output.
writeFileSync(outfile, bytes);

// Report: bundle size + how many lazy renderer chunks were kept external (proof of laziness).
const lazyImports = new Set();
for (const out of Object.values(result.metafile.outputs)) {
  for (const imp of out.imports || []) {
    if (imp.external) lazyImports.add(imp.path);
  }
}
console.log(`Wrote ${relative(repoRoot, outfile)} (${(bytes.length / 1024).toFixed(1)} KB)`);
console.log(`Kept ${lazyImports.size} lazy renderer/metadata chunks external (NOT inlined).`);
