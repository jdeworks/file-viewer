#!/usr/bin/env bash
# Local validation gate — the SAME checks the (now-disabled) CI ran, so we catch failures here
# before pushing instead of paying for GitHub Actions. THREE modes:
#
#   ./scripts/check.sh --fast        DEFAULT pre-push gate: generators + scoped unit + scoped smoke.
#   ./scripts/check.sh               RELEASE gate (default, ~10 min): full non-browser layer + full
#                                    core-tier smoke (ebook LITE) + a REPRESENTATIVE sample of the
#                                    exhaustive suites (examples-catalog one-per-type, known-files
#                                    slice spread) + 2-of-4 privacy suites. Run before a release/tag.
#   ./scripts/check.sh --exhaustive  EXHAUSTIVE sweep (~13 min): opens EVERY sample, all 18 known
#                                    slices, binary/WebGL, all 4 privacy suites, the full ebook-git +
#                                    git-tree stress, the emulator matrices, and the Sokoban replay.
#                                    ⚠️ ALWAYS RUN THIS IN A MEMORY-CAPPED CONTAINER — it can spike to
#                                    the RAM ceiling and OOM-thrash a bare WSL2 host to a hang. The
#                                    container caps memory + disables swap so it can only OOM ITSELF,
#                                    never the host. See "Certify --exhaustive" below for the command.
#
# Append --dry-run (-n) to ANY mode to regenerate bundles then PRINT that mode's unit/smoke/privacy
# selection and exit (no browser, ~7s).  e.g. `check.sh --dry-run`, `check.sh --exhaustive --dry-run`.
#
# Does: (1) regenerate the asset manifest and fail if it was stale (the smoke test also asserts
# this, but failing early is clearer); (2) the move-diff unit tests; (3) the headless smoke test
# (serves docs/, drives Chromium, asserts ZERO off-origin). Tests are self-contained — they never
# depend on local-only files (see autonomous-loop memory: TEST DISCIPLINE).
#
# --fast trades coverage for CPU/time: it SKIPS the two heaviest Chromium suites — known-file
# viewers (smoke-known.mjs, ~812 page.goto reloads, each re-parsing Monaco's 13 MB bundle) and
# binary/container types (smoke-binary.mjs, ~45 heavy WebGL/wasm opens) — and the exhaustive
# Sokoban solution replay unit suite (sokoban-levels.test.mjs). These together dominate the gate's
# cost. It still regenerates every bundle (all generators total ~2s) so smoke runs against fresh
# artifacts, but it does NOT hard-fail on an unstaged regen (that staleness gate is a pre-push concern).
# When changes are owned by a smoke area, --fast runs just those areas through the shared zero-off-origin
# harness; shared/global changes fall back to the aggregate smoke.
#
# The RELEASE gate (bare, no flag) samples those exhaustive suites down to a representative pass so the
# routine pre-release check lands ~10 min on this constrained host; the open-EVERYTHING sweep is
# --exhaustive, run on command. Both release + exhaustive HARD-FAIL on an unstaged regen (unlike --fast).
#
# Lane-scoped routing (so a lane's own changes never fall to the 15–20 min aggregate): docs/assets/games.css
# is the metagame/arcade stylesheet → owned by the games area (NOT the shared app shell). docs/examples/
# compatibility.json is generated wholesale (like summary.json) → neutral. docs/examples/index.json is the
# hand-maintained catalog source and is owned by the examples-catalog area.
set -euo pipefail
cd "$(dirname "$0")/.."

# Pre-flight: stray headless-Chromium from a dead/hung earlier run starves every suite below into
# timeouts or OOM (2026-07-12: two orphaned browser trees made the gate hang for 100 minutes with no
# recorded failure). Reap clearly-orphaned ones (>45 min — no single suite legitimately keeps one
# browser that long); younger ones mean another gate may genuinely be running — fail fast instead of
# silently fighting it for CPU/RAM (override with FV_ALLOW_STRAY=1).
preflight_reap_stray_browsers() {
  local pid age young=()
  for pid in $(pgrep -f chrome-headless 2>/dev/null || true); do
    age=$(ps -o etimes= -p "$pid" 2>/dev/null | tr -d ' ' || echo 0)
    if [ "${age:-0}" -gt 2700 ]; then
      echo "  reaping orphaned headless-Chromium pid $pid (age ${age}s)"
      kill "$pid" 2>/dev/null || true
    elif [ -n "$age" ]; then
      young+=("$pid")
    fi
  done
  if [ "${#young[@]}" -gt 0 ] && [ "${FV_ALLOW_STRAY:-0}" != 1 ]; then
    echo "✗ live headless-Chromium detected (pids: ${young[*]}) — another gate/smoke may be running."
    echo "  Running two gates concurrently starves both. Wait for it, or FV_ALLOW_STRAY=1 to proceed."
    exit 1
  fi
}

# Memory floor. This guards the CONCURRENCY / pile-up / orphan class of OOM (the one that hung the
# machine for 100 min): it refuses to start a heavy gate when RAM is already low (Docker TTS, another
# build, a leaked browser). It does NOT prevent within-a-single-process accumulation — that is handled
# by the release gate's small samples, the examples-catalog GC fix, and known/binary running in their
# own isolated processes. Thresholds are conservative starting points; override with FV_ALLOW_LOWMEM=1.
preflight_memory_floor() {
  local need_mb="$1" avail_mb
  avail_mb=$(awk '/^MemAvailable:/{print int($2/1024)}' /proc/meminfo 2>/dev/null || echo 999999)
  if [ "${avail_mb:-999999}" -lt "$need_mb" ] && [ "${FV_ALLOW_LOWMEM:-0}" != 1 ]; then
    echo "✗ low memory: ${avail_mb} MB available, this gate wants ≥ ${need_mb} MB."
    echo "  Free RAM (close Docker/other builds) or override with FV_ALLOW_LOWMEM=1 (risks OOM)."
    exit 1
  fi
  echo "  memory floor OK (${avail_mb} MB available ≥ ${need_mb} MB)"
}

# Reap any browser a prior separate suite process left behind, so exhaustive's sequential suites
# (core smoke → known → binary → emulator) never overlap in RAM. Called between those phases.
reap_between_suites() {
  local pid
  for pid in $(pgrep -f chrome-headless 2>/dev/null || true); do
    kill "$pid" 2>/dev/null || true
  done
}

# Modes: fast | release (default) | exhaustive.  FAST/EXHAUSTIVE are derived flags so the existing
# per-phase `if FAST`/`if !FAST` branches keep working; the new release path is explicit where needed.
MODE=release
DRY=0
for arg in "$@"; do
  case "$arg" in
    --fast|-f) MODE=fast ;;
    --exhaustive|--full) MODE=exhaustive ;;
    --dry-run|-n) DRY=1 ;;
    "") ;;
    *) echo "usage: $(basename "$0") [--fast|--exhaustive] [--dry-run]"; exit 2 ;;
  esac
done
FAST=0; EXHAUSTIVE=0
[ "$MODE" = fast ] && FAST=1
[ "$MODE" = exhaustive ] && EXHAUSTIVE=1

# Certify --exhaustive SAFELY in a memory-capped container (the WSL2 dev host itself can OOM-thrash to
# a hang on the full sweep; a container with a hard memory cap + swap OFF either completes or gets
# cleanly OOM-killed INSIDE the container, host untouched). Reuses the HOST's playwright browser cache
# so there is no ~2 GB image pull. Certified 2026-07-13 = ~13 min, exit 0, peaks near the 8 GB cap:
#
#   docker run --rm --memory=8g --memory-swap=8g --cpus=8 \
#     --user "$(id -u):$(id -g)" -e HOME=/tmp -e PLAYWRIGHT_BROWSERS_PATH=/pw-browsers -e FV_IN_CONTAINER=1 \
#     -v "$PWD:$PWD" -v "$HOME/.cache/ms-playwright:/pw-browsers:ro" -w "$PWD" \
#     mcr.microsoft.com/playwright:v1.53.0-noble bash -c './scripts/check.sh --exhaustive'
#
warn_exhaustive_wants_container() {
  # Skip the nudge when we ARE the container (marker env or docker/cgroup hint) or the user opts out.
  if [ "${FV_IN_CONTAINER:-0}" = 1 ] || [ -f /.dockerenv ] || [ "${FV_ALLOW_HOST_EXHAUSTIVE:-0}" = 1 ]; then return; fi
  echo "⚠️  --exhaustive should run in a MEMORY-CAPPED CONTAINER, not bare on this host —"
  echo "    the full sweep can spike to the RAM ceiling and OOM-thrash WSL2 to a hang."
  echo "    Recommended (caps memory, disables swap, reuses the host browser cache):"
  echo "      docker run --rm --memory=8g --memory-swap=8g --cpus=8 \\"
  echo "        --user \"\$(id -u):\$(id -g)\" -e HOME=/tmp -e PLAYWRIGHT_BROWSERS_PATH=/pw-browsers -e FV_IN_CONTAINER=1 \\"
  echo "        -v \"\$PWD:\$PWD\" -v \"\$HOME/.cache/ms-playwright:/pw-browsers:ro\" -w \"\$PWD\" \\"
  echo "        mcr.microsoft.com/playwright:v1.53.0-noble bash -c './scripts/check.sh --exhaustive'"
  echo "    Proceeding on the host anyway (set FV_ALLOW_HOST_EXHAUSTIVE=1 to silence this)."
}

preflight_reap_stray_browsers
# Memory floor only gates the browser-heavy modes (skip for dry-run, which never launches a browser).
if [ "$DRY" != 1 ]; then
  if [ "$MODE" = exhaustive ]; then warn_exhaustive_wants_container; preflight_memory_floor 5000
  elif [ "$MODE" = release ]; then preflight_memory_floor 2500
  fi
fi

# Full mode: a generated artifact differing from HEAD means "you forgot to regenerate+stage" — fail
# loudly. --fast mode: that's expected mid-iteration, so just note it and carry on.
stale() {  # $1 = message, $2.. = paths to diff
  local msg="$1"; shift
  if ! git diff --quiet -- "$@"; then
    # --fast and any --dry-run only WARN (staleness is a pre-push concern; dry-run never executes).
    # The release + exhaustive gates HARD-FAIL so a stale bundle can never ship.
    if [ "$FAST" = 1 ] || [ "$DRY" = 1 ]; then
      echo "  ($MODE) $msg — regenerated but not staged; 'git add' it before you push"
    else
      echo "  $msg — stage it."
      exit 1
    fi
  fi
}

_now_seconds() {
  date +%s
}

_now_timestamp() {
  date +%H:%M:%S
}

run_phase() {
  local label="$1"
  shift
  local start
  local start_ts
  local end
  local end_ts
  local elapsed

  start_ts=$(_now_timestamp)
  start=$(_now_seconds)
  # Per-phase timestamps + elapsed help track the ~10 min (release) / ≤30 min (exhaustive) budgets,
  # so show them in every mode except a dry-run (which executes nothing).
  if [ "$DRY" != 1 ]; then
    echo "→ [${start_ts}] $label"
  else
    echo "→ $label"
  fi
  "$@"
  end=$(_now_seconds)
  end_ts=$(_now_timestamp)
  elapsed=$((end - start))
  if [ "$DRY" != 1 ]; then
    echo "  ✓ ${label} in ${elapsed}s at [${end_ts}]"
  fi
}

run_phase_settings_defaults() {
  node scripts/gen-settings-defaults.mjs >/dev/null
  stale "settings-defaults.generated.json changed" docs/core/settings-defaults.generated.json
}

run_phase "regenerating settings defaults (must be committed fresh)…" \
  run_phase_settings_defaults

run_phase_runtime_registry() {
  node scripts/gen-registry-runtime.mjs >/dev/null
  stale "runtime registry changed" docs/core/registry-runtime.generated.js docs/core/registry-detect.generated*.js
}

run_phase "regenerating runtime registry (must be committed fresh)…" \
  run_phase_runtime_registry

run_phase_known_runtime() {
  node scripts/gen-known-runtime.mjs >/dev/null
  stale "known/registry.generated.js changed (known plugins changed since last regen)" docs/known/registry.generated.js
}

run_phase "regenerating bundled known-file registry (must be committed fresh)…" \
  run_phase_known_runtime

run_phase_image_renderer() {
  node scripts/gen-image-renderer.mjs >/dev/null
  stale "image renderer.generated.js changed (renderer source changed since last regen)" docs/types/image/renderer.generated.js
}

run_phase "regenerating bundled image renderer (must be committed fresh)…" \
  run_phase_image_renderer

run_phase_metagame_bundles() {
  node scripts/gen-metagame-bundles.mjs >/dev/null
  stale "metagame stage bundle(s) changed (a stage's source modules changed since last regen)" 'docs/games/metagame/stages/*/stage.generated.js'
}

run_phase "regenerating metagame stage bundles (must be committed fresh)…" \
  run_phase_metagame_bundles

run_phase_app_core() {
  node scripts/gen-app-core.mjs >/dev/null
  stale "app.generated.js or its production graph changed (startup app graph changed since last regen)" docs/core/app.generated.js build/app/app-graph.generated.json
}

run_phase "regenerating bundled app core (must be committed fresh)…" \
  run_phase_app_core

run_phase "running compatibility matrix generator…" \
  node scripts/gen-example-compatibility.mjs

run_phase_examples_summary() {
  node scripts/gen-examples-summary.mjs >/dev/null
  stale "examples/summary.json changed" docs/examples/summary.json
}

run_phase "regenerating examples summary (must be committed fresh)…" \
  run_phase_examples_summary

run_phase_detect_lite() {
  node scripts/gen-detect-lite.mjs >/dev/null
  stale "detect-lite.generated.json changed" docs/core/detect-lite.generated.json
}

run_phase "regenerating lightweight detector metadata (must be committed fresh)…" \
  run_phase_detect_lite

run_phase_darkmode() {
  node scripts/gen-darkmode-overrides.mjs >/dev/null
  stale "preview.css / preview-chrome.css dark-mode overrides changed" docs/assets/preview.css docs/assets/preview-chrome.css
}

run_phase "regenerating dark-mode overrides (must be committed fresh)…" \
  run_phase_darkmode

run_phase_asset_manifest() {
  node scripts/gen-asset-manifest.mjs >/dev/null
  if ! git diff --quiet -- docs/asset-manifest.json; then
    echo "  asset-manifest.json changed — stage it (docs files changed since last regen)."
  fi
}

run_phase "regenerating asset-manifest.json (must be committed fresh)…" \
  run_phase_asset_manifest

run_phase "verifying generated SEO metadata and sitemap…" \
  node scripts/seo.mjs --check

run_loc_check() {
  ./scripts/loc-check.sh || true
}

run_phase_unit_tests() {
  local test_file
  for test_file in "${FULL_UNIT_TESTS[@]}"; do
    node "$test_file"
  done
}

run_phase "verifying pinned EmulatorJS vendor closure…" \
  node scripts/verify-emulatorjs-vendor.mjs

FULL_UNIT_TESTS=(
  tests/media-parsers.test.mjs
  tests/media-qc-fixture.test.mjs
  tests/media-mixer-model.test.mjs
  tests/media-mixer-import-export.test.mjs
  tests/media-mixer-capabilities.test.mjs
  tests/media-mixer-hit-test.test.mjs
  tests/movediff.test.mjs
  tests/comic-resource-bounds.test.mjs
  tests/harness-origin.test.mjs
  tests/markdown-edit-actions.test.mjs
  tests/image-fill.test.mjs
  tests/image-geometry.test.mjs
  tests/image-levels.test.mjs
  tests/image-curves.test.mjs
  tests/image-convolve.test.mjs
  tests/image-gif.test.mjs
  tests/image-overlay-document.test.mjs
  tests/layered-psd.test.mjs
  tests/molview.test.mjs
  tests/mobile-renderer-layout.test.mjs
  tests/core-layout-regressions.mjs
  tests/preview-request-lifecycle.test.mjs
  tests/enhanced-cap-fidelity.test.mjs
  tests/csv-shape-fidelity.test.mjs
  tests/xlsx-fidelity.test.mjs
  tests/docx-fidelity.test.mjs
  tests/pptx-notes-fidelity.test.mjs
  tests/json-duplicate-keys.test.mjs
  tests/lottie-dbf-protected.test.mjs
  tests/source-fidelity.test.mjs
  tests/partial-support-notices.test.mjs
  tests/archivelib-paths.test.mjs
  tests/archive-entry-bounds.test.mjs
  tests/archive-metadata.test.mjs
  tests/example-fixture-quality.test.mjs
  tests/rich-example-fixtures.test.mjs
  tests/format-parser-hardening.test.mjs
  tests/torrent-v2-semantics.test.mjs
  tests/format-semantic-correctness.test.mjs
  tests/package-trust-labels.test.mjs
  tests/asset-manifest.test.mjs
  tests/seo.test.mjs
  tests/settings-defaults.test.mjs
  tests/registry-runtime.test.mjs
  tests/production-bundle.test.mjs
  tests/request-budgets.test.mjs
  tests/emulatorjs-runtime-contract.test.mjs
  tests/example-compatibility.test.mjs
  tests/type-info.test.mjs
  tests/metadata-coverage.test.mjs
  tests/metadata-normalize.test.mjs
  tests/metadata-owned.test.mjs
  tests/ocr.test.mjs
  tests/arduino-sketch.test.mjs
  tests/known-ada-lang.test.mjs
  tests/known-agda-lang.test.mjs
  tests/known-asm-lang.test.mjs
  tests/known-carbon-lang.test.mjs
  tests/known-chapel-lang.test.mjs
  tests/known-awk-script.test.mjs
  tests/known-cobol-lang.test.mjs
  tests/known-coffeescript-lang.test.mjs
  tests/known-clojure-lang.test.mjs
  tests/known-coq-lang.test.mjs
  tests/known-crystal-lang.test.mjs
  tests/known-cue-lang.test.mjs
  tests/known-factor-lang.test.mjs
  tests/known-fennel-lang.test.mjs
  tests/known-d-lang.test.mjs
  tests/known-fish-script.test.mjs
  tests/known-forth-lang.test.mjs
  tests/known-eiffel-lang.test.mjs
  tests/known-grain-lang.test.mjs
  tests/known-gnuplot-script.test.mjs
  tests/known-elm-lang.test.mjs
  tests/known-elixir-lang.test.mjs
  tests/known-elvish-script.test.mjs
  tests/known-ink-script.test.mjs
  tests/known-haskell-lang.test.mjs
  tests/known-idris-lang.test.mjs
  tests/known-janet-lang.test.mjs
  tests/known-koka-lang.test.mjs
  tests/known-lean-lang.test.mjs
  tests/known-lua-lang.test.mjs
  tests/known-livescript-lang.test.mjs
  tests/known-nushell-script.test.mjs
  tests/known-nim-lang.test.mjs
  tests/known-objc-lang.test.mjs
  tests/known-ocaml-lang.test.mjs
  tests/known-pascal-lang.test.mjs
  tests/known-perl-lang.test.mjs
  tests/known-prolog-lang.test.mjs
  tests/known-purescript-lang.test.mjs
  tests/known-r-lang.test.mjs
  tests/known-racket-lang.test.mjs
  tests/known-red-lang.test.mjs
  tests/known-reason-lang.test.mjs
  tests/known-scala-lang.test.mjs
  tests/known-rescript-lang.test.mjs
  tests/known-ruby-lang.test.mjs
  tests/known-scheme-lang.test.mjs
  tests/known-sed-script.test.mjs
  tests/known-sml-lang.test.mjs
  tests/known-squirrel-lang.test.mjs
  tests/known-swift-lang.test.mjs
  tests/known-tcl-lang.test.mjs
  tests/known-vala-lang.test.mjs
  tests/known-vhdl-lang.test.mjs
  tests/known-verilog.test.mjs
  tests/known-wolfram-lang.test.mjs
  tests/known-wren-lang.test.mjs
  tests/known-zig-lang.test.mjs
  tests/known-zsh-script.test.mjs
  tests/known-fsharp-lang.test.mjs
  tests/known-alloy-lang.test.mjs
)

IMAGE_UNIT_TESTS=(
  tests/image-fill.test.mjs
  tests/image-geometry.test.mjs
  tests/image-levels.test.mjs
  tests/image-curves.test.mjs
  tests/image-convolve.test.mjs
  tests/image-gif.test.mjs
  tests/image-ascii-scheduler.test.mjs
  tests/image-ascii-audio.test.mjs
)

FAST_GAME_UNIT_TESTS=(
  tests/metagame-platform.test.mjs
)

MEDIA_MIXER_UNIT_TESTS=(
  tests/media-mixer-model.test.mjs
  tests/media-mixer-import-export.test.mjs
  tests/media-mixer-capabilities.test.mjs
  tests/media-mixer-hit-test.test.mjs
)

collect_changed_paths() {
  {
    git diff --name-only HEAD --
    git ls-files --others --exclude-standard
  } | LC_ALL=C sort -u
}

print_fast_smoke_changed_paths() {
  local total="$1"
  shift
  local shown=0
  local limit=30
  local path

  echo "  changed paths considered (${total}):"
  for path in "$@"; do
    if [ "$shown" -ge "$limit" ]; then
      echo "    ... ($((total - shown)) more)"
      break
    fi
    echo "    $path"
    shown=$((shown + 1))
  done
}

print_fast_changed_paths() {
  print_fast_smoke_changed_paths "$@"
}

is_generated_cache_artifact() {
  case "$1" in
    # summary.json (gen-examples-summary) and compatibility.json (gen-example-compatibility) are both
    # regenerated WHOLESALE from docs/examples/ contents — a diff here is pure fallout of whatever
    # fixture change caused it, never its own test owner. (index.json is NOT here: it is the
    # hand-maintained catalog SOURCE, not generated.)
    docs/asset-manifest.json|docs/sw.js|docs/examples/summary.json|docs/examples/compatibility.json) return 0 ;;
    *) return 1 ;;
  esac
}

print_neutral_generated_cache_note() {
  local path

  echo "  (fast) ignoring generated cache artifact(s) for selection:"
  for path in "$@"; do
    echo "    $path"
  done
}

run_fast_unit_tests() {
  local changed_paths=()
  local collected_path
  while IFS= read -r collected_path; do
    changed_paths+=("$collected_path")
  done < <(collect_changed_paths)

  local unit_tests=()
  local unit_notes=()
  local neutral_generated_cache_artifacts=()
  local non_neutral_path_count=0
  local full_reason=""
  local path

  add_unit_test() {
    local selected="$1"
    local existing
    for existing in "${unit_tests[@]}"; do
      if [ "$existing" = "$selected" ]; then
        return
      fi
    done
    unit_tests+=("$selected")
  }

  add_image_unit_tests() {
    local image_test
    for image_test in "${IMAGE_UNIT_TESTS[@]}"; do
      add_unit_test "$image_test"
    done
  }

  add_fast_game_unit_tests() {
    local game_test
    for game_test in "${FAST_GAME_UNIT_TESTS[@]}"; do
      add_unit_test "$game_test"
    done
  }

  add_media_mixer_unit_tests() {
    local mixer_test
    for mixer_test in "${MEDIA_MIXER_UNIT_TESTS[@]}"; do
      add_unit_test "$mixer_test"
    done
  }

  require_full_units() {
    local reason="$1"
    if [ -z "$full_reason" ]; then
      full_reason="$reason"
    fi
  }

  add_unit_note() {
    unit_notes+=("$1")
  }

  for path in "${changed_paths[@]}"; do
    if is_generated_cache_artifact "$path"; then
      neutral_generated_cache_artifacts+=("$path")
      continue
    fi

    non_neutral_path_count=$((non_neutral_path_count + 1))
    case "$path" in
      docs/types/media/mixer/*|tests/media-mixer-*.test.mjs)
        add_media_mixer_unit_tests
        ;;
      docs/types/media/*|docs/assets/preview-media.css|docs/examples/acx-qc-reference.mp3|scripts/gen-media-qc-fixture.py|tests/media-parsers.test.mjs|tests/media-qc-fixture.test.mjs|tests/areas/media-studio.mjs|tests/areas/media-studio-*.mjs)
        add_unit_test tests/media-parsers.test.mjs
        add_unit_test tests/media-qc-fixture.test.mjs
        ;;
      docs/types/ebook/comic/*|docs/readme/comic.md|tests/comic-resource-bounds.test.mjs)
        add_unit_test tests/comic-resource-bounds.test.mjs
        ;;
      docs/types/ebook/*|tests/areas/ebook-git.mjs|tests/movediff.test.mjs)
        add_unit_test tests/movediff.test.mjs
        ;;
      docs/types/binary/torrent/*|tests/torrent-v2-semantics.test.mjs)
        add_unit_test tests/torrent-v2-semantics.test.mjs
        ;;
      docs/types/image/*|tests/image-*.test.mjs|tests/areas/media-3d.mjs)
        add_image_unit_tests
        ;;
      docs/games/metagame/*|tests/metagame-platform.test.mjs)
        add_fast_game_unit_tests
        ;;
      docs/games/*|docs/assets/games.css|tests/areas/games.mjs)
        add_unit_note "no non-exhaustive unit owner for $path; game smoke selection still applies"
        ;;
      docs/examples/index.json|docs/examples/*)
        # Catalog/example changes are owned by the catalog-integrity units, which validate the index
        # and fixtures without a browser. Must precede the generic scripts/known/examples case below.
        add_unit_test tests/example-compatibility.test.mjs
        add_unit_test tests/example-fixture-quality.test.mjs
        add_unit_test tests/rich-example-fixtures.test.mjs
        ;;
      tests/sokoban-levels.test.mjs)
        add_unit_note "skipping exhaustive Sokoban replay unit suite for $path"
        ;;
      tests/markdown-edit-actions.test.mjs|docs/types/markdown/edit-actions.js)
        add_unit_test tests/markdown-edit-actions.test.mjs
        ;;
      tests/settings-defaults.test.mjs)
        add_unit_test tests/settings-defaults.test.mjs
        ;;
      tests/registry-runtime.test.mjs)
        add_unit_test tests/registry-runtime.test.mjs
        ;;
      tests/example-compatibility.test.mjs)
        add_unit_test tests/example-compatibility.test.mjs
        ;;
      tests/type-info.test.mjs)
        add_unit_test tests/type-info.test.mjs
        ;;
      tests/metadata-coverage.test.mjs)
        add_unit_test tests/metadata-coverage.test.mjs
        ;;
      tests/metadata-normalize.test.mjs)
        add_unit_test tests/metadata-normalize.test.mjs
        ;;
      tests/metadata-owned.test.mjs)
        add_unit_test tests/metadata-owned.test.mjs
        ;;
      tests/lottie-dbf-protected.test.mjs|docs/types/binary/dbf/*|docs/types/binary/protected-data/*|docs/types/text/json/known/lottie/*)
        add_unit_test tests/lottie-dbf-protected.test.mjs
        ;;
      tests/*.test.mjs)
        require_full_units "$path is an unowned unit test"
        ;;
      tests/smoke.mjs|tests/smoke-area.mjs|tests/harness.mjs|scripts/check.sh)
        require_full_units "$path is shared test/check infrastructure"
        ;;
      docs/core/*|docs/assets/*.css|docs/index.html)
        require_full_units "$path is shared app shell"
        ;;
      docs/core/registry-runtime.generated.js|docs/core/registry-detect.generated.*|docs/core/settings-defaults.generated.json|docs/known/registry.generated.js|docs/types/image/renderer.generated.js)
        require_full_units "$path is generated shared runtime/cache state"
        ;;
      package.json|package-lock.json|npm-shrinkwrap.json|pnpm-lock.yaml|yarn.lock|docs/vendor/*|vendor/*|tests/package.json|tests/package-lock.json)
        require_full_units "$path affects package/vendor/test runtime"
        ;;
      scripts/*|docs/known/*|examples/index.json)
        require_full_units "$path affects generators or known files"
        ;;
      *)
        require_full_units "$path has no unit-test owner"
        ;;
    esac
  done

  echo "→ fast unit selection"
  print_fast_changed_paths "${#changed_paths[@]}" "${changed_paths[@]}"
  for path in "${unit_notes[@]}"; do
    echo "  (fast) $path"
  done
  if [ "${#neutral_generated_cache_artifacts[@]}" -gt 0 ] && [ "$non_neutral_path_count" -gt 0 ] && [ -z "$full_reason" ]; then
    print_neutral_generated_cache_note "${neutral_generated_cache_artifacts[@]}"
  fi

  if [ "$DRY" = 1 ]; then
    if [ -n "$full_reason" ]; then echo "  (dry-run) units: FULL SET ($full_reason)";
    elif [ "${#unit_tests[@]}" -eq 0 ]; then echo "  (dry-run) units: none (only smoke/skipped-exhaustive owners)";
    else echo "  (dry-run) units: ${unit_tests[*]}"; fi
    return 0
  fi

  if [ "${#changed_paths[@]}" -eq 0 ]; then
    echo "  selected unit tests: full existing unit set (no changed paths detected after generators)"
    run_phase_unit_tests
  elif [ -n "$full_reason" ]; then
    echo "  selected unit tests: full existing unit set ($full_reason)"
    run_phase_unit_tests
  elif [ "$non_neutral_path_count" -eq 0 ]; then
    echo "  selected unit tests: full existing unit set (only generated cache artifacts changed)"
    run_phase_unit_tests
  elif [ "${#unit_tests[@]}" -eq 0 ]; then
    echo "  selected unit tests: none (changed paths only map to smoke or skipped exhaustive suites)"
  else
    echo "  selected unit tests: ${unit_tests[*]}"
    for path in "${unit_tests[@]}"; do
      node "$path"
    done
  fi
}

run_smoke_core() {
  if [ "$EXHAUSTIVE" = 1 ]; then
    if [ "$DRY" = 1 ]; then echo "  (dry-run) smoke: FULL aggregate (all 19 areas)"; return 0; fi
    node tests/smoke.mjs
    return
  fi
  if [ "$MODE" = release ]; then
    if [ "$DRY" = 1 ]; then
      echo "  (dry-run) smoke: core-tier aggregate (ebook LITE) + examples-catalog RELEASE sample"
      return 0
    fi
    # Release gate: the core-tier light areas (shell + detection + games + interactions), with the
    # ebook-git area in its <5s LITE path (FV_EBOOK_LITE) instead of the 70s sql.js/git-tree stress,
    # PLUS examples-catalog opening a one-per-type + all-partial representative sample (its own process
    # so the big open sweep never shares the core-tier browser). Full sweeps run under --exhaustive.
    FV_SMOKE_TIER=core FV_EBOOK_LITE=1 FV_SMOKE_TIMING=1 node tests/smoke.mjs
    FV_SMOKE_SAMPLE=release node tests/smoke-area.mjs examples-catalog
    return
  fi

  local changed_paths=()
  local collected_path
  while IFS= read -r collected_path; do
    changed_paths+=("$collected_path")
  done < <(collect_changed_paths)

  local smoke_areas=()
  local area
  local neutral_generated_cache_artifacts=()
  local non_neutral_path_count=0
  local full_reason=""
  local path

  add_smoke_area() {
    local selected="$1"
    local existing
    for existing in "${smoke_areas[@]}"; do
      if [ "$existing" = "$selected" ]; then
        return
      fi
    done
    smoke_areas+=("$selected")
  }

  require_full_smoke() {
    local reason="$1"
    if [ -z "$full_reason" ]; then
      full_reason="$reason"
    fi
  }

  for path in "${changed_paths[@]}"; do
    if is_generated_cache_artifact "$path"; then
      neutral_generated_cache_artifacts+=("$path")
      continue
    fi

    non_neutral_path_count=$((non_neutral_path_count + 1))
    case "$path" in
      docs/types/media/mixer/mixer-audio-listen.js|tests/areas/media-studio-mixer-audio-listen.mjs)
        add_smoke_area media-studio-mixer-audio-listen
        ;;
      docs/types/media/mixer/*|tests/areas/media-studio-mixer-shell.mjs)
        add_smoke_area media-studio-mixer-shell
        ;;
      docs/types/media/*|docs/assets/preview-media.css|docs/examples/acx-qc-reference.mp3|scripts/gen-media-qc-fixture.py|tests/media-parsers.test.mjs|tests/media-qc-fixture.test.mjs|tests/areas/media-studio.mjs|tests/areas/media-studio-*.mjs)
        add_smoke_area media-studio
        ;;
      docs/types/text/json/known/lottie/*|tests/lottie-dbf-protected.test.mjs)
        add_smoke_area structured-types
        ;;
      tests/areas/media-3d.mjs|docs/types/3d/*|docs/types/image/*|docs/types/binary/midi/*|docs/types/binary/gamerom/*)
        add_smoke_area media-3d
        ;;
      docs/types/ebook/comic/*|docs/readme/comic.md|tests/comic-resource-bounds.test.mjs)
        add_smoke_area email-archives
        ;;
      docs/types/ebook/*)
        add_smoke_area ebook-git
        ;;
      docs/types/git/*|docs/core/git.js)
        add_smoke_area git
        ;;
      docs/games/*)
        add_smoke_area games
        ;;
      docs/assets/games.css)
        # games.css is the metagame/arcade stylesheet (.games-*/.mg-* selectors only); its sole smoke
        # exerciser is the games area — NOT the shared app shell. Must precede docs/assets/*.css below.
        add_smoke_area games
        ;;
      docs/examples/index.json)
        # Hand-maintained catalog source: validate the index and open a deterministic per-type sample
        # under --fast. Must precede the generic case.
        add_smoke_area examples-catalog
        ;;
      tests/areas/*.mjs)
        area="${path#tests/areas/}"
        area="${area%.mjs}"
        add_smoke_area "$area"
        ;;
      tests/smoke.mjs|tests/smoke-area.mjs|tests/harness.mjs|scripts/check.sh)
        require_full_smoke "$path is shared smoke/check infrastructure"
        ;;
      docs/core/*|docs/assets/*.css|docs/index.html)
        require_full_smoke "$path is shared app shell"
        ;;
      docs/core/registry-runtime.generated.js|docs/core/registry-detect.generated.*|docs/core/settings-defaults.generated.json|docs/known/registry.generated.js|docs/types/image/renderer.generated.js)
        require_full_smoke "$path is generated shared runtime/cache state"
        ;;
      package.json|package-lock.json|npm-shrinkwrap.json|pnpm-lock.yaml|yarn.lock|docs/vendor/*|vendor/*)
        require_full_smoke "$path affects package/vendor runtime"
        ;;
      examples/index.json|docs/examples/index.json|docs/examples/*)
        # Example fixtures are owned by the examples-catalog area (validates the index + opens samples;
        # --fast opens a deterministic per-type subset). NOT the full aggregate.
        add_smoke_area examples-catalog
        ;;
      *)
        require_full_smoke "$path has no smoke-area owner"
        ;;
    esac
  done

  echo "→ fast smoke selection"
  print_fast_smoke_changed_paths "${#changed_paths[@]}" "${changed_paths[@]}"
  if [ "${#neutral_generated_cache_artifacts[@]}" -gt 0 ] && [ "$non_neutral_path_count" -gt 0 ] && [ -z "$full_reason" ]; then
    print_neutral_generated_cache_note "${neutral_generated_cache_artifacts[@]}"
  fi

  if [ "$DRY" = 1 ]; then
    if [ -n "$full_reason" ]; then echo "  (dry-run) smoke: CORE-TIER aggregate ($full_reason)";
    elif [ "${#smoke_areas[@]}" -eq 0 ]; then echo "  (dry-run) smoke: CORE-TIER aggregate (no smoke areas determined)";
    else echo "  (dry-run) smoke areas: ${smoke_areas[*]}"; fi
    return 0
  fi

  if [ "${#changed_paths[@]}" -eq 0 ]; then
    echo "  selected smoke: core-tier aggregate (no changed paths detected after generators)"
    FV_SMOKE_TIER=core FV_SMOKE_TIMING=1 node tests/smoke.mjs
  elif [ -n "$full_reason" ]; then
    echo "  selected smoke: core-tier aggregate ($full_reason)"
    FV_SMOKE_TIER=core FV_SMOKE_TIMING=1 node tests/smoke.mjs
  elif [ "$non_neutral_path_count" -eq 0 ]; then
    echo "  selected smoke: core-tier aggregate (only generated cache artifacts changed)"
    FV_SMOKE_TIER=core FV_SMOKE_TIMING=1 node tests/smoke.mjs
  elif [ "${#smoke_areas[@]}" -eq 0 ]; then
    echo "  selected smoke: core-tier aggregate (no smoke areas determined)"
    FV_SMOKE_TIER=core FV_SMOKE_TIMING=1 node tests/smoke.mjs
  else
    echo "  selected smoke areas: ${smoke_areas[*]}"
    # FV_SMOKE_SUBSET=1: the examples-catalog area opens a per-type subset instead of all ~1,100 samples
    # (fast path-owned run); every other area ignores it. Full sweep still runs in the full gate.
    FV_SMOKE_SUBSET=1 node tests/smoke-area.mjs "${smoke_areas[@]}"
  fi
}

run_phase "LOC housekeeping report (advisory)…" \
  run_loc_check

if [ "$FAST" = 1 ]; then
  run_phase "unit tests (fast selected by changed paths)…" \
    run_fast_unit_tests
elif [ "$DRY" = 1 ]; then
  echo "→ unit tests (${MODE}): full existing unit set (dry-run — not executed)"
else
  run_phase "unit tests (move-aware diff + parsers + metadata)…" \
    run_phase_unit_tests
fi

run_phase "smoke test: core areas (headless Chromium, zero off-origin)…" \
  run_smoke_core

# The four standalone Chromium suites below each boot their own browser+server (~1-2 min apiece).
# In --fast mode they are path-gated like units/smoke: each runs only when a changed path touches
# what it actually asserts; shared shell/vendor/infra changes conservatively run all four. Full mode
# always runs all four.
run_privacy_and_offline_suites() {
  local run_markdown=0 run_html=0 run_embedded=0 run_offline=0
  local full_reason=""

  if [ "$EXHAUSTIVE" = 1 ]; then
    run_markdown=1; run_html=1; run_embedded=1; run_offline=1
  elif [ "$MODE" = release ]; then
    # Release gate runs 2 of the 4 (each is a separate browser boot ~1-2 min): EMBEDDED covers the
    # broadest remote-resource surface (SVG + email + EPUB blocking) and OFFLINE covers SW/precache
    # readiness. The markdown + html remote-resource suites run under --exhaustive. (Every smoke area
    # still asserts zero-off-origin via the harness, so same-origin enforcement is checked throughout;
    # these 4 specifically test remote-resource *blocking* UX.)
    run_embedded=1; run_offline=1
  else
    local changed_paths=()
    local collected_path path
    while IFS= read -r collected_path; do
      changed_paths+=("$collected_path")
    done < <(collect_changed_paths)

    if [ "${#changed_paths[@]}" -eq 0 ]; then
      full_reason="no changed paths detected — aggregate behavior"
    fi
    for path in "${changed_paths[@]}"; do
      if is_generated_cache_artifact "$path"; then
        # sw.js regen churns on every docs change; the offline suite only needs to run when the
        # OFFLINE LOGIC changes, not when the VERSION stamp moves. Skip as neutral.
        continue
      fi
      case "$path" in
        docs/types/markdown/*|tests/markdown-remote-resources.test.mjs) run_markdown=1 ;;
        docs/types/html/*|tests/html-remote-resources.test.mjs) run_html=1 ;;
        docs/types/image/*|docs/types/eml/*|docs/types/mbox/*|docs/types/ebook/*|tests/embedded-remote-resources.test.mjs) run_embedded=1 ;;
        docs/core/offline.js|docs/core/sw-*.js|scripts/gen-asset-manifest.mjs|tests/release-readiness-offline.mjs) run_offline=1 ;;
        docs/games/*|docs/assets/games.css|docs/types/*) ;; # owned elsewhere (their own areas/units); games.css/games have no remote-resource surface
        tests/areas/*.mjs|tests/*.test.mjs) ;;                 # owned by unit/smoke selection
        docs/core/*|docs/assets/*.css|docs/index.html|docs/vendor/*|vendor/*|package.json|package-lock.json|tests/harness.mjs|tests/smoke.mjs|tests/smoke-area.mjs|scripts/check.sh)
          full_reason="$path is shared shell/vendor/infra" ;;
        *) ;; # everything else has no privacy/offline surface
      esac
      if [ -n "$full_reason" ]; then break; fi
    done
    if [ -n "$full_reason" ]; then
      echo "  (fast) privacy/offline suites: running all four ($full_reason)"
      run_markdown=1; run_html=1; run_embedded=1; run_offline=1
    fi
  fi

  local selected=""
  [ "$run_markdown" = 1 ] && selected="$selected markdown"
  [ "$run_html" = 1 ] && selected="$selected html"
  [ "$run_embedded" = 1 ] && selected="$selected embedded"
  [ "$run_offline" = 1 ] && selected="$selected offline"
  if [ -z "$selected" ]; then
    echo "→ privacy/offline suites: none selected (no changed path touches their surfaces)"
    return
  fi
  echo "→ privacy/offline suites selected:${selected}"
  if [ "$DRY" = 1 ]; then echo "  (dry-run) privacy suites:${selected}"; return 0; fi
  [ "$run_markdown" = 1 ] && run_phase "Markdown remote-resource privacy (headless Chromium)…" \
    node tests/markdown-remote-resources.test.mjs
  [ "$run_html" = 1 ] && run_phase "HTML remote-resource privacy (headless Chromium)…" \
    node tests/html-remote-resources.test.mjs
  [ "$run_embedded" = 1 ] && run_phase "Embedded SVG/email/EPUB remote-resource privacy (headless Chromium)…" \
    node tests/embedded-remote-resources.test.mjs
  [ "$run_offline" = 1 ] && run_phase "Offline save/update readiness (headless Chromium)…" \
    node tests/release-readiness-offline.mjs
  return 0
}

run_privacy_and_offline_suites

if [ "$DRY" = 1 ]; then
  echo "✓ dry-run complete — selection printed above; no browser/tests were run."
  exit 0
fi

if [ "$FAST" = 1 ]; then
  echo "→ fast mode: SKIPPING known-file + binary smoke suites + exhaustive Sokoban replay suite (the heaviest)."
  echo "  This is the default pre-push gate. Run the release gate before a release:  ./scripts/check.sh"
  echo "✓ fast checks passed (known + binary + sokoban suites skipped)"
  exit 0
fi

if [ "$MODE" = release ]; then
  # Release gate: known-files render coverage isn't reachable via the examples catalog (known files
  # aren't examples), so run it here — but SAMPLED (FV_KNOWN_SAMPLE=release = a fixed 6-of-18 slice
  # spread, ~250 opens instead of ~816). Binary/3D/media types are already opened representatively by
  # the examples-catalog release sample above, so the dedicated binary suite, the Sokoban replay, and
  # the emulator matrices are EXHAUSTIVE-only. Own process to keep it off the core-tier browser.
  run_phase "smoke test: known-file viewers (RELEASE slice sample, fresh browser process)…" \
    env FV_KNOWN_SAMPLE=release node tests/smoke-known.mjs
  echo "✓ release checks passed (binary + sokoban + emulator suites are --exhaustive only)"
  echo "  Open EVERYTHING before a tag with:  ./scripts/check.sh --exhaustive"
  exit 0
fi

# --exhaustive: the open-everything sweep. Reap any browser a prior suite left behind BEFORE each of
# the remaining separate-process suites so they never overlap in RAM (the pile-up OOM class).
run_phase "running exhaustive Sokoban solution replay unit suite…" \
  node tests/sokoban-levels.test.mjs

reap_between_suites
run_phase "smoke test: known-file viewers (fresh browser process, avoids WSL2 OOM)…" \
  node tests/smoke-known.mjs

reap_between_suites
run_phase "smoke test: binary/container types (fresh browser process, ~45 heavy WebGL/wasm opens)…" \
  node tests/smoke-binary.mjs

reap_between_suites
run_phase "EmulatorJS six-core dependency closure (headless Chromium)…" \
  node tests/emulatorjs-core-load.mjs

run_phase "Emulator settings responsive matrix (headless Chromium)…" \
  node tests/emulator-settings-responsive.mjs

echo "✓ all checks passed (exhaustive)"
