#!/usr/bin/env bash
# Local validation gate — the SAME checks the (now-disabled) CI ran, so we catch failures here
# before pushing instead of paying for GitHub Actions. Run --fast before every commit/push.
#
#   ./scripts/check.sh           full gate — recommended before a release/tag (adds heavy suites)
#   ./scripts/check.sh --fast    DEFAULT pre-push gate: generators + unit tests + scoped smoke
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
# harness; shared/global changes fall back to the aggregate smoke. --fast is the default before every push;
# run the full gate before a release/tag.
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
  if [ "$FAST" = 1 ]; then
    echo "→ [${start_ts}] $label"
  else
    echo "→ $label"
  fi
  "$@"
  end=$(_now_seconds)
  end_ts=$(_now_timestamp)
  elapsed=$((end - start))
  if [ "$FAST" = 1 ]; then
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
  stale "runtime registry changed" docs/core/registry-runtime.generated.js docs/core/registry-detect.generated.*.js
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
  stale "app.generated.js changed (startup app graph changed since last regen)" docs/core/app.generated.js
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

run_loc_check() {
  ./scripts/loc-check.sh || true
}

run_phase_unit_tests() {
  local test_file
  for test_file in "${FULL_UNIT_TESTS[@]}"; do
    node "$test_file"
  done
}

FULL_UNIT_TESTS=(
  tests/media-parsers.test.mjs
  tests/media-mixer-model.test.mjs
  tests/media-mixer-import-export.test.mjs
  tests/media-mixer-capabilities.test.mjs
  tests/media-mixer-hit-test.test.mjs
  tests/movediff.test.mjs
  tests/markdown-edit-actions.test.mjs
  tests/image-fill.test.mjs
  tests/image-geometry.test.mjs
  tests/image-levels.test.mjs
  tests/image-curves.test.mjs
  tests/image-convolve.test.mjs
  tests/image-gif.test.mjs
  tests/settings-defaults.test.mjs
  tests/registry-runtime.test.mjs
  tests/example-compatibility.test.mjs
  tests/type-info.test.mjs
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
  tests/metagame-viewer-actions.test.mjs
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
    docs/asset-manifest.json|docs/sw.js) return 0 ;;
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
      docs/types/media/*|docs/assets/preview-media.css|tests/media-parsers.test.mjs|tests/areas/media-studio.mjs|tests/areas/media-studio-*.mjs)
        add_unit_test tests/media-parsers.test.mjs
        ;;
      docs/types/ebook/*|tests/areas/ebook-git.mjs|tests/movediff.test.mjs)
        add_unit_test tests/movediff.test.mjs
        ;;
      docs/types/image/*|tests/image-*.test.mjs|tests/areas/media-3d.mjs)
        add_image_unit_tests
        ;;
      docs/games/metagame/*|docs/examples/metagame/*|tests/metagame-platform.test.mjs|tests/metagame-viewer-actions.test.mjs)
        add_fast_game_unit_tests
        ;;
      docs/games/*|tests/areas/games.mjs)
        add_unit_note "no non-exhaustive unit owner for $path; game smoke selection still applies"
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
      tests/metadata-normalize.test.mjs)
        add_unit_test tests/metadata-normalize.test.mjs
        ;;
      tests/metadata-owned.test.mjs)
        add_unit_test tests/metadata-owned.test.mjs
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
      scripts/*|docs/known/*|docs/examples/*|examples/index.json|docs/examples/index.json)
        require_full_units "$path affects generators, known files, or examples"
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
  if [ "$FAST" != 1 ]; then
    node tests/smoke.mjs
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
      docs/types/media/*|docs/assets/preview-media.css|tests/media-parsers.test.mjs|tests/areas/media-studio.mjs|tests/areas/media-studio-*.mjs)
        add_smoke_area media-studio
        ;;
      tests/areas/media-3d.mjs|docs/types/3d/*|docs/types/image/*|docs/types/binary/midi/*|docs/types/binary/gamerom/*)
        add_smoke_area media-3d
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
        require_full_smoke "$path affects the examples catalog"
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

  if [ "${#changed_paths[@]}" -eq 0 ]; then
    echo "  selected smoke: aggregate (no changed paths detected after generators)"
    FV_SMOKE_TIMING=1 node tests/smoke.mjs
  elif [ -n "$full_reason" ]; then
    echo "  selected smoke: aggregate ($full_reason)"
    FV_SMOKE_TIMING=1 node tests/smoke.mjs
  elif [ "$non_neutral_path_count" -eq 0 ]; then
    echo "  selected smoke: aggregate (only generated cache artifacts changed)"
    FV_SMOKE_TIMING=1 node tests/smoke.mjs
  elif [ "${#smoke_areas[@]}" -eq 0 ]; then
    echo "  selected smoke: aggregate (no smoke areas determined)"
    FV_SMOKE_TIMING=1 node tests/smoke.mjs
  else
    echo "  selected smoke areas: ${smoke_areas[*]}"
    node tests/smoke-area.mjs "${smoke_areas[@]}"
  fi
}

run_phase "LOC housekeeping report (advisory)…" \
  run_loc_check

if [ "$FAST" = 1 ]; then
  run_phase "unit tests (fast selected by changed paths)…" \
    run_fast_unit_tests
else
  run_phase "unit tests (move-aware diff + parsers + metadata)…" \
    run_phase_unit_tests
fi

run_phase "smoke test: core areas (headless Chromium, zero off-origin)…" \
  run_smoke_core

if [ "$FAST" = 1 ]; then
  echo "→ fast mode: SKIPPING known-file + binary smoke suites + exhaustive Sokoban replay suite (the heaviest)."
  echo "  This is the default pre-push gate. Run the full gate before a release:  ./scripts/check.sh"
  echo "✓ fast checks passed (known + binary + sokoban suites skipped)"
  exit 0
fi

run_phase "running exhaustive Sokoban solution replay unit suite…" \
  node tests/sokoban-levels.test.mjs

run_phase "smoke test: known-file viewers (fresh browser process, avoids WSL2 OOM)…" \
  node tests/smoke-known.mjs

run_phase "smoke test: binary/container types (fresh browser process, ~45 heavy WebGL/wasm opens)…" \
  node tests/smoke-binary.mjs

echo "✓ all checks passed"
