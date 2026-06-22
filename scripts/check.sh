#!/usr/bin/env bash
# Local validation gate — the SAME checks the (now-disabled) CI ran, so we catch failures here
# before pushing instead of paying for GitHub Actions. Run this before every commit/push.
#
#   ./scripts/check.sh
#
# Does: (1) regenerate the asset manifest and fail if it was stale (the smoke test also asserts
# this, but failing early is clearer); (2) the move-diff unit tests; (3) the headless smoke test
# (serves docs/, drives Chromium, asserts ZERO off-origin). Tests are self-contained — they never
# depend on local-only files (see autonomous-loop memory: TEST DISCIPLINE).
set -euo pipefail
cd "$(dirname "$0")/.."

echo "→ regenerating settings defaults (must be committed fresh)…"
node scripts/gen-settings-defaults.mjs >/dev/null
if ! git diff --quiet -- docs/core/settings-defaults.generated.json; then
  echo "  settings-defaults.generated.json changed — stage it."
  exit 1
fi

echo "→ regenerating runtime registry (must be committed fresh)…"
node scripts/gen-registry-runtime.mjs >/dev/null
if ! git diff --quiet -- docs/core/registry-runtime.generated.js docs/core/registry-detect.generated.*.js; then
  echo "  runtime registry changed — stage it."
  exit 1
fi

echo "→ regenerating bundled known-file registry (must be committed fresh)…"
node scripts/gen-known-runtime.mjs >/dev/null
if ! git diff --quiet -- docs/known/registry.generated.js; then
  echo "  known/registry.generated.js changed — stage it (known plugins changed since last regen)."
  exit 1
fi

echo "→ regenerating metagame stage bundles (must be committed fresh)…"
node scripts/gen-metagame-bundles.mjs >/dev/null
if ! git diff --quiet -- 'docs/games/metagame/stages/*/stage.generated.js'; then
  echo "  metagame stage bundle(s) changed — stage them (a stage's source modules changed since last regen)."
  exit 1
fi

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
node tests/image-gif.test.mjs
node tests/settings-defaults.test.mjs
node tests/registry-runtime.test.mjs
node tests/example-compatibility.test.mjs
node tests/type-info.test.mjs
node tests/metadata-normalize.test.mjs
node tests/metadata-owned.test.mjs

echo "→ smoke test: core areas (headless Chromium, zero off-origin)…"
node tests/smoke.mjs

echo "→ smoke test: known-file viewers (fresh browser process, avoids WSL2 OOM)…"
node tests/smoke-known.mjs

echo "✓ all checks passed"
