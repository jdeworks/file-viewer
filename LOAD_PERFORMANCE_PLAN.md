# Load Performance Plan

Status legend: `[ ]` todo, `[~]` in progress, `[x]` done.

## Baseline

- [x] Captured cold load and service-worker-controlled reload with Chromium/CDP.
- [x] Confirmed current cold load shape: about 92 visible app requests plus `sw.js` and `asset-manifest.json`.
- [x] Confirmed controlled reload still hits the server for the same app asset set because the service worker revalidates every cached asset in the background.

## Service Worker

- [x] Switch versioned static assets from stale-while-revalidate to cache-first.
- [x] Keep navigation HTML network-first with cached fallback.
- [x] Keep `sw.js` and `asset-manifest.json` network-first for explicit update/status/modal paths.
- [x] Stop startup status from scanning every manifest asset.
- [x] Store cache status metadata after a completed precache.
- [ ] Add deeper offline modal cache-status refresh if exact per-bundle cached counts become necessary.

## Startup Graph

- [x] Keep `boot.js` as the tiny interactive shell.
- [x] Remove known-file registry from the eager app module graph.
- [x] Remove examples gallery module from the eager app module graph.
- [x] Remove games launcher from the eager app module graph.
- [x] Remove metagame viewer-action modules from raw pane startup.
- [ ] Move folder/repo/companion behind action-specific dynamic imports.
- [ ] Move compare/side-by-side behind action-specific dynamic imports.
- [ ] Move raw advanced editors/toolbars behind type-specific dynamic imports.
- [ ] Consolidate generated detector chunks into fewer browser-loaded chunks.

## Bundling And Compression

- [ ] Add a production bundling step for deploy assets.
- [ ] Emit minified chunks while keeping source modules readable.
- [ ] Define stable chunk groups: boot, app-core, registry-detect, known-registry, raw-editor-tools, folder-repo-companion, examples-gallery, games.
- [ ] Verify GitHub Pages gzip behavior on deployed assets.
- [ ] Do not depend on precompressed `.gz` or `.br` files unless hosting gains proper `Content-Encoding` header control.

## Measurement

- [x] Add repeatable network capture script for cold load and controlled reload.
- [ ] Extend capture script with file-open, examples, and offline-modal scenarios.
- [ ] Add CI budget assertions once the target request counts stabilize.

## Current Targets

- First shell stays immediate and usable.
- Full idle startup should move toward fewer than 30 visible requests before user action.
- Controlled reload should not re-fetch every unchanged JS/CSS/JSON asset.
- Exact offline cache accounting should happen on demand, not on every startup.
