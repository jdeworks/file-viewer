# file-viewer — architecture & working rules

A static, offline-first file viewer hosted on GitHub Pages. `docs/` is the web root.
Native ES modules, **no app-level bundler**, **zero off-origin at runtime** (every library is
vendored into `docs/vendor/`; the running page never fetches a CDN).

## Worktree lanes — orient before any work (every session)

This repo is developed across parallel LANES so concurrent agents don't collide. Each lane is
an isolated git worktree under `.claude/worktrees/`; the GENERAL lane is the main checkout on
`dev`. The FIRST thing every session does — before any task work — is establish which lane it
is in and route the user to the right one.

Step 1 — identify your lane from cwd:
- cwd = `/home/jens/repos/file-viewer` → you are THE GENERAL (main checkout, branch `dev`).
  Lane = cross-cutting/global only: load-time, bundling, service worker, import graph, build
  scripts, shared core, this CLAUDE.md, multi-type changes.
- cwd = `/home/jens/repos/file-viewer/.claude/worktrees/<name>` → you are the <name> lane;
  edit only that lane's owned paths (registry below).
- cwd under `.claude/worktrees/agent-*` → ephemeral subagent sandbox (auto-created with
  `isolation: worktree`, auto-cleaned). Never a destination.

Step 2 — route before working:
- If you are THE GENERAL and the user has not already named a lane, ASK which lane this task
  belongs to — offer the real lanes (bit-foundry/metagame, image/ascii-art, media) or "general
  cross-cutting". If they pick a worktree lane, TELL them to `cd .claude/worktrees/<name>` and
  relaunch (then run that worktree's setup prompt), and do NOT start the lane work from main.
- If the task is genuinely cross-cutting or a one-off → stay in general and do it here.
- If you are the general and the task is a focused stream spanning multiple commits (a game, a
  viewer family, an editor subsystem) that has no lane yet → offer to create one (below).
- If you are in a worktree and the task is outside your lane → say so; don't reach across.

### Lane registry (keep current: add a row on create, remove on teardown)
| Lane        | Worktree dir                            | Branch                         | Owns (edit only here) |
|-------------|-----------------------------------------|--------------------------------|-----------------------|
| general     | `/home/jens/repos/file-viewer`          | `dev`                          | cross-cutting: load/bundle/SW/import-graph/build/core/CLAUDE.md |
| metagame    | `.claude/worktrees/metagame-bitfoundry` | `worktree-metagame-bitfoundry` | `docs/games/metagame/**`, `docs/assets/games.css` |
| image/ascii | `.claude/worktrees/ascii-art`           | `worktree-ascii-art`           | `docs/types/image/**` (image editor + ASCII studio engine) + `docs/tools/ascii-studio/**` (standalone ASCII studio tool page) |
| media       | `.claude/worktrees/media`               | `worktree-media`               | `docs/types/media/**` (video + audio/music studio: audio graph, mixer, transcoder, spectrum, loudness/QC, video studio, subtitles, timeline) |

### Creating a new worktree (general only)
From the main checkout:

    git worktree add .claude/worktrees/<name> -b worktree-<name>

- NEST under `.claude/worktrees/` so Node resolves `node_modules` upward from main (a worktree
  elsewhere needs its own `npm install`).
- Branch = `worktree-<name>`. Add a registry row naming the paths it owns.
- Launch Claude from the new dir and run the one-time setup (memory symlink + lane-guard hook).

### Merge back and forth (any lane → dev) — only when the user says so
commit on the lane branch → `git fetch origin` → merge `origin/dev` in (only
`docs/asset-manifest.json` and `docs/sw.js` should conflict; resolve BOTH by regenerating with
`node scripts/gen-asset-manifest.mjs`, never hand-edit, then `git add` them) → `git push origin
HEAD:dev`. The generator overwrites `asset-manifest.json` wholesale and **auto-collapses the
`sw.js` VERSION-line conflict** (it strips the `<<<<<<< / ======= / >>>>>>>` markers and stamps the
fresh hash); if it instead throws "conflict NOT confined to the VERSION line", the `sw.js` conflict
is real — resolve that block by hand, then re-run.

### Cleaning up a finished lane (general only), once fully merged to dev

    git worktree remove .claude/worktrees/<name>    # --force if it holds untracked files
    git branch -D worktree-<name>

Then drop its registry row, and reap any hung smoke subprocesses whose cwd was the removed dir
(they survive removal and pin CPU). Optionally remove its `~/.claude/projects/` memory symlink.

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
- **NOT yet bundled (KNOWN GAP, 2026-06-21):** `docs/known/registry.js` (enhanced/known-file
  detection) statically imports **~889** per-plugin `index.js` files — so on first page load the
  browser fetches ~889 small modules (way over the ≤100 budget; mitigated only by the SW cache on
  repeat visits). The core type registry solved this with `gen-registry-runtime.mjs`; the known
  registry needs the SAME treatment — a generator that inlines the 889 `match()` detectors into a
  bundled `known/registry-detect.generated.*.js`, keeping each plugin modular in source but
  shipping one bundle. This is the highest-impact bundling task. Do NOT "split" known/registry.js
  into more source files without bundling — that makes the page-load worse.
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

**Pre-push gate = `./scripts/check.sh --fast`.** This is the DEFAULT before every commit/push. It
runs the generators + unit tests + CORE smoke but SKIPS the two heaviest Chromium suites (known-files
`smoke-known.mjs` ≈812 Monaco-reloading `page.goto`s, and binary `smoke-binary.mjs` WebGL/wasm) —
they dominate the gate's CPU/time, and skipping them keeps the machine cool. It still regenerates
every bundle so core smoke runs against fresh artifacts, but it only WARNS (does not fail) on an
unstaged regen — so when it reports a regenerated `*.generated.*` / `asset-manifest.json` / `sw.js`,
`git add` it before you push. The **FULL `./scripts/check.sh`** (adds the two heavy suites) is a
**recommendation before a release/tag**, not a per-push requirement. For a single concern, the
cheapest path remains `node tests/smoke-area.mjs <area>` (one area, no heavy suites).

## Testing (keep it cheap — see [tests](tests/))

Headless-Chromium smoke tests live in `tests/areas/*.mjs`, each exporting `run(ctx)`.
- **`node tests/smoke-area.mjs <area> [<area>…]`** runs ONLY the named area(s) in one browser —
  use this for per-change verification. `--list` shows areas. This is the cheap path; prefer it
  while iterating.
- `tests/smoke.mjs` runs the core areas; `tests/smoke-known.mjs` runs the heavy `known-files`
  area in a fresh process. The `--fast` pre-push default runs only `smoke.mjs`; the full
  `check.sh` (recommended before a release) runs both.
- **Cost model:** the dominant test cost is full SPA reloads (`page.goto` re-parses Monaco's 13 MB
  bundle). The harness `openExample()` therefore reuses one page load and only reloads every ~50
  opens to flush accumulated state. Prefer `openExample` — let it manage isolation. **Exception:**
  areas that open WebGL/emulator/wasm renderers (binary-types, media-3d, emulators) legitimately keep
  a per-test `page.goto(origin)`: reusing one page across dozens of heavy opens accumulates WebGL
  contexts (hard browser cap ~16), buffers, and document listeners → context-loss / OOM / double-fire
  flakiness that a reload avoids. So: light/text areas → `openExample`; heavy/binary areas → `goto`.
  **Caveat from the 2026-06-22 migration:** even a "light" area can hide stateful sub-tests that
  silently relied on per-test `goto` — e.g. one that injects a dirty editor (`rawview.setValue`) or
  toggles to raw view mode bleeds into the NEXT open (which `openExample` does not fully reset). When
  converting `goto`→`openExample`, run the area BOTH alone and after another area and confirm it's
  green (the every-50 reload can mask a bleed depending on `openCount` position). `simple-types` was
  migrated (green alone + combined); `structured-types` was reverted for exactly this reason.
- **A failing assertion is ambiguous — analyze BOTH ends before fixing.** The product code may be
  wrong, OR the assertion may be brittle/wrong. Don't reflexively change the renderer to satisfy a
  test, nor blindly relax a test to make it pass. Read the rendered output and the assertion together,
  decide which side is actually correct, and fix that side. (Worked example, 2026-06-22: a batch of
  known-files "content" fails — most were real renderer bugs, e.g. `intake.parsed` never populated,
  but `app.json` was a brittle test doing case-sensitive `.includes('buildpack')` against the
  renderer's correct capitalized "Buildpacks" heading → the test was the bug. A case-insensitive
  probe even *masked* it; only the real area run caught it.)
- Tests must be self-contained (no dependency on local-only files).

## Hard runtime rules

- **Zero off-origin at runtime.** Vendor every lib into `docs/vendor/`. The page must never fetch
  a CDN. Smoke tests assert zero off-origin requests.
- **Security-sensitive content is redacted** (private keys, `.env` secrets, JWT signatures,
  WireGuard/OpenVPN/Maven/pgbackrest credentials, etc.). The Download button is never removed; Save
  is additive. Never commit `.example-files-internet/`.
- Convert relative dates to absolute when recording anything durable.
