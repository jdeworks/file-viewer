#!/usr/bin/env node
// Build one bundled module per metagame stage: docs/games/metagame/stages/stageN/stage.generated.js
//
//   node build/metagame/build.mjs        (re-run after editing any stage's source modules)
//
// WHY: the hub lazy-loads ONE stage's module graph at a time (stage-manifest.js → loadStage),
// but a single stage is itself split into 6–16 small modules (stage6 = 16). Loaded directly that
// means 6–16 first-open requests *per stage*. esbuild collapses each stage's OWN module graph
// (index.js + its local ./*.js) into ONE same-origin ESM exporting stageMeta/defaultState/
// mountStage (+ the re-exports each index.js declares). The hub's LOADERS point at this bundle.
//
// WHAT STAYS EXTERNAL (NOT inlined):
//   • Shared metagame singletons imported via `../../*.js` (stages.js, bignum.js, boss1.js,
//     stage1.js, messages1.js, achievements1.js). These are cross-stage shared state/config —
//     inlining a copy into each stage bundle would duplicate them and break the singleton.
//     Only stage1 imports any of these today; the ALLOWED_SHARED gate below FAILS the build if a
//     stage introduces a NEW cross-dir import, so a shared dep can never be silently inlined.
//   • The `new URL('./styles.css', import.meta.url)` stylesheet reference (a `url-token`): kept
//     verbatim so the stage still link-tags its CSS. Because the bundle is emitted IN the stage's
//     own directory, `./styles.css` and every `../../*.js` specifier resolve identically to how
//     they did from index.js — no path rewriting needed.
//
// The output is a committed *.generated.* artifact — never hand-edit it; edit the stage source and
// re-run. scripts/gen-metagame-bundles.mjs wraps this for scripts/check.sh (fails if stale).
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, relative, sep } from 'node:path';
import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');
const stagesDir = resolve(repoRoot, 'docs/games/metagame/stages');

// DRIFT GATE — the ONLY cross-stage-dir module specifiers a stage bundle is allowed to keep
// external. Anything else means a stage started importing a new shared module: the build FAILS so
// a human confirms it's a genuine shared singleton (and not something that should be inlined or
// duplicated). To allow a new one: verify it must stay a single shared instance, then add it here.
const ALLOWED_SHARED = new Set([
  '../../stages.js',
  '../../bignum.js',
  '../../boss1.js',
  '../../stage1.js',
  '../../messages1.js',
  '../../achievements1.js',
  // Phase-0 shared run/economy foundations (docs/games/metagame/shared/*). Kept external (one
  // vendored same-origin instance fetched once + SW-cached) rather than inlined per stage: they are
  // stateless factories shared across stages (run-state retrofit started with S6; S4/S8 follow).
  '../../shared/run-state.js',
  '../../shared/economy.js',
  '../../shared/shop.js',
  '../../shared/ascension.js',
  // Shared metagame modal (UX audit F6). One vendored same-origin instance every stage reuses (S3's
  // Defrag shop + boon draft today) rather than each stage inlining a copy — kept external like the
  // other shared singletons above.
  '../../shared/modal.js',
  // Shared micro-feedback kit (UX audit F5): flash/shake/floatNum/banner. Stateless helpers every
  // stage attaches (S6 combat play-feedback today); kept external like the other shared singletons.
  '../../shared/feedback.js',
  // Shared on-screen touch-control component (d-pad / verb toggle). Stateless factory reused across
  // stages (S5 steering, S3 verb toggle); kept external like the other shared singletons.
  '../../touch-controls.js',
  // Shared capped-30fps rAF driver + hidden-tab guard (CPU budget fix 2026-07-12). Stateless
  // factory used by every stage with a continuous loop (S4/S5/S8 rAF, S1/S2 interval guards);
  // kept external like the other shared singletons.
  '../../shared/frame-loop.js',
]);

// Every stageN/ directory that has an index.js entry, in numeric order.
const stageDirs = readdirSync(stagesDir)
  .filter((n) => /^stage\d+$/.test(n))
  .filter((n) => { try { return statSync(resolve(stagesDir, n, 'index.js')).isFile(); } catch { return false; } })
  .sort((a, b) => Number(a.slice(5)) - Number(b.slice(5)));

const banner = (name) => `// GENERATED — DO NOT EDIT BY HAND.
// Bundled from docs/games/metagame/stages/${name}/index.js (+ its local modules) by
// build/metagame/build.mjs. Rebuild:  node build/metagame/build.mjs  (run by scripts/check.sh).
// Exports stageMeta / defaultState / mountStage. Shared ../../*.js singletons + ./styles.css stay
// external (NOT inlined). The hub's stage-manifest.js LOADERS import THIS file.
`;

// esbuild plugin: bundle only modules INSIDE this stage's own directory; keep everything else
// (shared ../../ modules + the new-URL stylesheet) external and verbatim. Records the external
// module specifiers it kept so we can gate them against ALLOWED_SHARED.
function externalizeOutOfDir(stageDir, kept) {
  return {
    name: 'metagame-stage-externals',
    setup(b) {
      b.onResolve({ filter: /.*/ }, (args) => {
        if (args.kind === 'entry-point') return null;
        // `new URL('./styles.css', import.meta.url)` etc. — leave the literal alone.
        if (args.kind === 'url-token') { kept.add(args.path); return { external: true }; }
        // Bare/vendor specifiers (none today) would land here with no resolveDir-relative path;
        // treat anything that isn't a relative path as external too, to be safe.
        if (!args.path.startsWith('.')) { kept.add(args.path); return { external: true }; }
        const abs = resolve(args.resolveDir, args.path);
        if (abs === stageDir || abs.startsWith(stageDir + sep)) return null; // inside the stage → inline
        kept.add(args.path); // shared module → external, keep specifier verbatim (output is in-dir)
        return { external: true };
      });
    },
  };
}

let totalInlined = 0;
for (const name of stageDirs) {
  const stageDir = resolve(stagesDir, name);
  const entry = resolve(stageDir, 'index.js');
  const outfile = resolve(stageDir, 'stage.generated.js');
  const kept = new Set();

  const result = await build({
    entryPoints: [entry],
    bundle: true,
    format: 'esm',
    minify: false,             // keep the bundle diff-reviewable like other *.generated.*
    legalComments: 'none',
    charset: 'utf8',
    outfile,
    plugins: [externalizeOutOfDir(stageDir, kept)],
    banner: { js: banner(name) },
    metafile: true,
    logLevel: 'warning',
  });

  // Gate: every kept-external MODULE specifier (i.e. a *.js, not the .css url-token) must be on the
  // allow-list, else a new shared/cross-dir dependency crept in — fail loudly.
  const offenders = [...kept].filter((p) => p.endsWith('.js') && !ALLOWED_SHARED.has(p));
  if (offenders.length) {
    console.error(`\n✗ ${name}: unexpected cross-dir import(s): ${offenders.join(', ')}`);
    console.error('  If intentional, confirm each is a shared singleton that must NOT be inlined per');
    console.error('  stage, then add it to ALLOWED_SHARED in build/metagame/build.mjs.');
    process.exit(1);
  }

  const inputs = Object.keys(result.metafile.inputs).filter((p) => !p.includes('node_modules')).length;
  totalInlined += inputs;
  const sharedJs = [...kept].filter((p) => p.endsWith('.js'));
  console.log(`${name}: ${inputs} module(s) → ${relative(repoRoot, outfile)}` +
    (sharedJs.length ? `  (external shared: ${sharedJs.join(', ')})` : ''));
}

// Touch each output through fs to normalise line endings for stable, repeatable diffs.
for (const name of stageDirs) {
  const f = resolve(stagesDir, name, 'stage.generated.js');
  writeFileSync(f, readFileSync(f));
}

console.log(`\n✓ ${stageDirs.length} stage bundles written (${totalInlined} source modules inlined).`);
