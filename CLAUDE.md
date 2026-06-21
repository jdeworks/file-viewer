# file-viewer — architecture & working rules

A static, offline-first file viewer hosted on GitHub Pages. `docs/` is the web root.
Native ES modules, **no app-level bundler**, **zero off-origin at runtime** (every library is
vendored into `docs/vendor/`; the running page never fetches a CDN).

## Core principle: author modular, ship bundled

Two competing constraints shape every structural decision:

1. **Modularity (for maintainability).** Code is split into small, focused files so a change
   touches one concern, not a 1000-line monolith. **Hard cap 500 LOC per file, soft cap 300**
   (`./scripts/loc-check.sh` enforces it; vendored code is excluded). The same applies to **`.md`
   docs** — keep them focused and split when they sprawl. When a file grows past the soft cap,
   split it by concern rather than letting it accrete.

2. **Page-load budget (for the browser).** A static site must NOT fetch hundreds of small modules
   on first paint — keep first-load requests well under ~100. So the always-needed code
   (**file-type detection + enhanced/known-file detection**) is **bundled at build time** into a
   few generated files, and everything else is **lazy-loaded on demand**.

These are reconciled by a **build-before-commit** step: you write many small modular source
files; generator scripts concatenate the always-needed ones into committed `*.generated.*`
artifacts that the page actually loads. Never hand-edit a `*.generated.*` file — edit the source
and regenerate.

## What is bundled vs. lazy-loaded

- **Bundled at build time (loaded on page load):**
  - `docs/core/registry.js` — the modular list of type plugins (one `import` per type). SOURCE.
  - `scripts/gen-registry-runtime.mjs` reads it and emits:
    - `docs/core/registry-runtime.generated.js` — the runtime registry.
    - `docs/core/registry-detect.generated.*.js` — all detector functions, chunked (≤360 lines
      each) so detection for every type is available without fetching one file per type.
  - `scripts/gen-settings-defaults.mjs` → `docs/core/settings-defaults.generated.json`.
  - `scripts/gen-asset-manifest.mjs` → `docs/asset-manifest.json` (the SW precache list).
  - `scripts/gen-example-compatibility.mjs` → `docs/compatibility.json`.
- **Lazy-loaded on demand (dynamic `import()`):** each type's `renderer.js` and each known-file
  plugin's `renderer.js`. A renderer is fetched only when a matching file is actually opened
  (`loadRenderer: () => import('./renderer.js')`). Heavy vendored libs (Monaco, ffmpeg.wasm,
  sql.js, pdf.js, emulators…) load only when their feature is used, and are flagged "heavy" so
  the offline precache can skip them unless opted in.

## Adding a file type / known-file viewer (the modular extension path)

1. Create a focused directory under `docs/types/.../<name>/` with `index.js` (id, label, `match()`
   detection, `loadRenderer`, `about`) and a lazy `renderer.js`.
2. Register it in `docs/core/registry.js` (one import line) — detection only; the renderer stays
   lazy.
3. Regenerate the bundles (see below). The detector is now part of the build-time bundle; the
   renderer is still fetched on demand.

## Build-before-commit (REQUIRED before every commit/push)

`./scripts/check.sh` regenerates all `*.generated.*` artifacts and FAILS if any is stale (i.e. if
you forgot to rebuild after a source change). Treat it as the build step. It runs, in order:
settings-defaults → registry-runtime → example-compatibility → asset-manifest → LOC check → unit
tests → smoke tests. If a generated file changes, stage it. **A real git pre-commit hook that runs
the generators (and stages the artifacts) is desirable so the bundle is never committed stale** —
add one when convenient; until then `check.sh` is the gate.

## Testing (keep it cheap — see [tests](tests/))

Headless-Chromium smoke tests live in `tests/areas/*.mjs`, each exporting `run(ctx)`.
- **`node tests/smoke-area.mjs <area> [<area>…]`** runs ONLY the named area(s) in one browser —
  use this for per-change verification. `--list` shows areas. This is the cheap path; prefer it
  while iterating.
- `tests/smoke.mjs` runs the core areas; `tests/smoke-known.mjs` runs the heavy `known-files`
  area in a fresh process. `check.sh` runs both before a push.
- **Cost model:** the dominant test cost is full SPA reloads (`page.goto` re-parses Monaco's 13 MB
  bundle). The harness `openExample()` therefore reuses one page load and only reloads every ~50
  opens to flush accumulated state. Don't reintroduce a per-test `page.goto` — let `openExample`
  manage isolation.
- Tests must be self-contained (no dependency on local-only files).

## Hard runtime rules

- **Zero off-origin at runtime.** Vendor every lib into `docs/vendor/`. The page must never fetch
  a CDN. Smoke tests assert zero off-origin requests.
- **Security-sensitive content is redacted** (private keys, `.env` secrets, JWT signatures,
  WireGuard/OpenVPN/Maven/pgbackrest credentials, etc.). The Download button is never removed; Save
  is additive. Never commit `.example-files-internet/`.
- Convert relative dates to absolute when recording anything durable.
