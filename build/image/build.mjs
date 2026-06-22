#!/usr/bin/env node
// Build the bundled image renderer: docs/types/image/renderer.generated.js
//
//   node build/image/build.mjs        (re-run after editing renderer.js or any module it inlines)
//
// WHY: the image renderer is lazy-loaded on image-open (index.js → loadRenderer), but renderer.js
// statically imports a dozen image-local edit modules (fill, editor-core, edit-*, gif-*, adv-edit,
// imglib, + the split view/draw/els modules). Loaded directly that's ~12 first-open requests every
// time an image opens. esbuild collapses renderer.js's OWN static graph into ONE same-origin ESM,
// emitted IN docs/types/image/ so every external specifier and `new URL('./doc.html', …)` resolves
// identically. index.js's loadRenderer points at THIS file.
//
// WHAT STAYS EXTERNAL (NOT inlined):
//   • Anything outside docs/types/image/ — shared core (../../core/*) and the metagame viewer
//     bridge (../../games/metagame/viewer-actions.js). Shared singletons, not duplicated per type.
//   • Every DYNAMIC import() — the deliberately-lazy heavy chunks (jxl-decode, ascii/studio,
//     ascii-screensaver, compare-view, the vendored gifuct/jxl wasm). They must load only when
//     their feature is used, so they MUST stay separate on-demand chunks, not inlined here.
//   • `new URL(..., import.meta.url)` url-tokens (doc.html / edit-tools.html templates) — kept
//     verbatim; they fetch from this file's own directory at runtime.
//
// The static-external specifiers are gated against ALLOWED_EXTERNAL so a new cross-dir dependency
// can't silently creep into the page-load graph. Output is a committed *.generated.* artifact —
// never hand-edit; edit the source and re-run (scripts/check.sh runs it and fails if stale).
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, relative, sep } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');
const imageDir = resolve(repoRoot, 'docs/types/image');
const entry = resolve(imageDir, 'renderer.js');
const outfile = resolve(imageDir, 'renderer.generated.js');

// DRIFT GATE — the only out-of-dir STATIC import specifiers the bundle may keep external. Anything
// else means renderer.js (or a module it inlines) started importing a new shared/cross-dir module
// at page-load time: the build FAILS so a human confirms it should stay external (a shared
// singleton) rather than be inlined — then adds it here.
const ALLOWED_EXTERNAL = new Set([
  '../../core/script-loader.js',
  '../../core/template.js',
  '../../games/metagame/viewer-actions.js',
]);

const kept = new Set();        // out-of-dir STATIC specifiers kept external (gated)
const lazy = new Set();        // dynamic-import specifiers kept external (reported, not gated)

const externalizePlugin = {
  name: 'image-renderer-externals',
  setup(b) {
    b.onResolve({ filter: /.*/ }, (args) => {
      if (args.kind === 'entry-point') return null;
      // `new URL('./doc.html', import.meta.url)` etc. — leave the literal alone.
      if (args.kind === 'url-token') return { external: true };
      // Every dynamic import stays a separate lazy chunk (heavy/optional features).
      if (args.kind === 'dynamic-import') { lazy.add(args.path); return { external: true }; }
      // Bare/vendor specifiers (none today via static import) → external to be safe.
      if (!args.path.startsWith('.')) { kept.add(args.path); return { external: true }; }
      const abs = resolve(args.resolveDir, args.path);
      if (abs === imageDir || abs.startsWith(imageDir + sep)) return null; // inside → inline
      kept.add(args.path);                                                 // outside → external
      return { external: true };
    });
  },
};

const banner = `// GENERATED — DO NOT EDIT BY HAND.
// Bundled from docs/types/image/renderer.js (+ the edit modules it statically imports) by
// build/image/build.mjs. Rebuild:  node build/image/build.mjs  (run by scripts/check.sh).
// Exports render(). Shared core/* modules + every dynamic import() (jxl-decode, ascii/studio,
// ascii-screensaver, compare-view, gifuct/jxl wasm) + the new-URL HTML templates stay external —
// they are NOT inlined here. index.js's loadRenderer imports THIS file.
`;

const result = await build({
  entryPoints: [entry],
  bundle: true,
  format: 'esm',
  minify: false,             // keep diff-reviewable like other *.generated.*
  legalComments: 'none',
  charset: 'utf8',
  outfile,
  plugins: [externalizePlugin],
  banner: { js: banner },
  metafile: true,
  logLevel: 'warning',
});

const offenders = [...kept].filter((p) => !ALLOWED_EXTERNAL.has(p));
if (offenders.length) {
  console.error(`\n✗ unexpected out-of-dir static import(s): ${offenders.join(', ')}`);
  console.error('  If intentional, confirm each must stay a shared external (not inlined into the');
  console.error('  page-load image chunk), then add it to ALLOWED_EXTERNAL in build/image/build.mjs.');
  process.exit(1);
}

writeFileSync(outfile, readFileSync(outfile));   // normalise for stable diffs
const bytes = readFileSync(outfile);
const inlined = Object.keys(result.metafile.inputs).filter((p) => !p.includes('node_modules')).length;
console.log(`Wrote ${relative(repoRoot, outfile)} (${(bytes.length / 1024).toFixed(1)} KB, ${inlined} modules inlined)`);
console.log(`External shared: ${[...kept].sort().join(', ')}`);
console.log(`Kept lazy (dynamic import, not inlined): ${[...lazy].sort().join(', ')}`);
