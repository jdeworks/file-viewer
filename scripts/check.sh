#!/usr/bin/env bash
# Local validation gate — the SAME checks the (now-disabled) CI ran, so we catch failures here
# before pushing instead of paying for GitHub Actions. Run --fast before every commit/push.
#
#   ./scripts/check.sh           full gate — recommended before a release/tag (adds heavy suites)
#   ./scripts/check.sh --fast    DEFAULT pre-push gate: generators + unit tests + CORE smoke only
#
# Does: (1) regenerate the asset manifest and fail if it was stale (the smoke test also asserts
# this, but failing early is clearer); (2) the move-diff unit tests; (3) the headless smoke test
# (serves docs/, drives Chromium, asserts ZERO off-origin). Tests are self-contained — they never
# depend on local-only files (see autonomous-loop memory: TEST DISCIPLINE).
#
# --fast trades coverage for CPU/time: it SKIPS the two heaviest Chromium suites — known-file
# viewers (smoke-known.mjs, ~812 page.goto reloads, each re-parsing Monaco's 13 MB bundle) and
# binary/container types (smoke-binary.mjs, ~45 heavy WebGL/wasm opens) — which together dominate
# the gate's cost. It still regenerates every bundle (all generators total ~2s) so core smoke runs
# against fresh artifacts, but it does NOT hard-fail on an unstaged regen (that staleness gate is a
# pre-push concern). --fast is the default before every push; run the full gate before a release/tag.
set -euo pipefail
cd "$(dirname "$0")/.."

FAST=0
case "${1:-}" in
  --fast|-f) FAST=1 ;;
  "") ;;
  *) echo "usage: $(basename "$0") [--fast]"; exit 2 ;;
esac

# Full mode: a generated artifact differing from HEAD means "you forgot to regenerate+stage" — fail
# loudly. --fast mode: that's expected mid-iteration, so just note it and carry on.
stale() {  # $1 = message, $2.. = paths to diff
  local msg="$1"; shift
  if ! git diff --quiet -- "$@"; then
    if [ "$FAST" = 1 ]; then
      echo "  (fast) $msg — regenerated but not staged; 'git add' it before you push"
    else
      echo "  $msg — stage it."
      exit 1
    fi
  fi
}

echo "→ regenerating settings defaults (must be committed fresh)…"
node scripts/gen-settings-defaults.mjs >/dev/null
stale "settings-defaults.generated.json changed" docs/core/settings-defaults.generated.json

echo "→ regenerating runtime registry (must be committed fresh)…"
node scripts/gen-registry-runtime.mjs >/dev/null
stale "runtime registry changed" docs/core/registry-runtime.generated.js docs/core/registry-detect.generated.*.js

echo "→ regenerating bundled known-file registry (must be committed fresh)…"
node scripts/gen-known-runtime.mjs >/dev/null
stale "known/registry.generated.js changed (known plugins changed since last regen)" docs/known/registry.generated.js

echo "→ regenerating bundled image renderer (must be committed fresh)…"
node scripts/gen-image-renderer.mjs >/dev/null
stale "image renderer.generated.js changed (renderer source changed since last regen)" docs/types/image/renderer.generated.js

echo "→ regenerating metagame stage bundles (must be committed fresh)…"
node scripts/gen-metagame-bundles.mjs >/dev/null
stale "metagame stage bundle(s) changed (a stage's source modules changed since last regen)" 'docs/games/metagame/stages/*/stage.generated.js'

echo "→ running compatibility matrix generator…"
node scripts/gen-example-compatibility.mjs

echo "→ regenerating asset-manifest.json (must be committed fresh)…"
node scripts/gen-asset-manifest.mjs >/dev/null
if ! git diff --quiet -- docs/asset-manifest.json; then
  echo "  asset-manifest.json changed — stage it (docs files changed since last regen)."
fi

echo "→ LOC housekeeping report (advisory)…"
./scripts/loc-check.sh || true

echo "→ unit tests (move-aware diff + parsers + metadata)…"
node tests/movediff.test.mjs
node tests/markdown-edit-actions.test.mjs
node tests/image-fill.test.mjs
node tests/image-geometry.test.mjs
node tests/image-levels.test.mjs
node tests/image-curves.test.mjs
node tests/image-convolve.test.mjs
node tests/image-gif.test.mjs
node tests/settings-defaults.test.mjs
node tests/registry-runtime.test.mjs
node tests/example-compatibility.test.mjs
node tests/type-info.test.mjs
node tests/metadata-normalize.test.mjs
node tests/metadata-owned.test.mjs
node tests/sokoban-levels.test.mjs

echo "→ smoke test: core areas (headless Chromium, zero off-origin)…"
node tests/smoke.mjs

if [ "$FAST" = 1 ]; then
  echo "→ fast mode: SKIPPING known-file + binary smoke suites (the two heaviest)."
  echo "  This is the default pre-push gate. Run the full gate before a release:  ./scripts/check.sh"
  echo "✓ fast checks passed (known + binary suites skipped)"
  exit 0
fi

echo "→ smoke test: known-file viewers (fresh browser process, avoids WSL2 OOM)…"
node tests/smoke-known.mjs

echo "→ smoke test: binary/container types (fresh browser process, ~45 heavy WebGL/wasm opens)…"
node tests/smoke-binary.mjs

echo "✓ all checks passed"
