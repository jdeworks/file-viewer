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
node tests/metadata-normalize.test.mjs
node tests/metadata-owned.test.mjs

echo "→ smoke test (headless Chromium, zero off-origin)…"
node tests/smoke.mjs

echo "✓ all checks passed"
