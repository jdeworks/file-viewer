# APK Browsing, Media Tool Visibility, and EmulatorJS Repair

## Goal

Add safe APK-family content browsing, correctly scope ASCII Studio visibility, and make the six
advertised EmulatorJS systems work entirely from same-origin assets. Validate the private NES
runtime deeply, maintain resumable checkpoints and frequent commits, remove task clutter, and
finish with clean `dev` pushed safely to `origin`.

## Requirements

- Preserve the existing Android structure/security analysis while making APK, AAB, and XAPK
  entries locally browsable through normal file-viewer intake.
- Show one ASCII Studio link only inside an expanded Media category that still has a visible match.
- Pin and verify a complete same-release EmulatorJS dependency closure for the six advertised
  cores; no localization, update, telemetry, netplay, CDN, or other off-origin fallback requests.
- Prefer EmulatorJS for a supported ROM only while `enableEmulators` is enabled, apply the toggle
  live, and tear down all emulator resources when leaving it.
- Use the ignored local Mario ROM as a mandatory machine-local NES boot gate without committing,
  caching, logging, screenshotting, or otherwise retaining its bytes or derived state.
- Commit each independently validated subsystem, keep this file's checkpoint current, and end with
  an empty index/worktree and a non-force push whose remote SHA is verified.

## Assumptions

- Baseline is `906fd642c50a9dd782edb57707d11b6a5681e0bb` on `dev`, equal to `origin/dev`.
- The official release behind `stable-2026-06-17` remains the chosen EmulatorJS source. Any asset
  or core without verifiable redistribution terms is excluded and blocks claiming that core.
- Existing committed beta-readiness evidence is intentional and must not be treated as clutter.
- The user authorized a normal push of `dev`, but not force-pushing, tagging, publishing, or remote
  configuration changes.

## Plan

1. Add focused failing tests and record the clean baseline plus private-fixture preflight.
2. Share bounded ZIP inventory/opening with the APK renderer. Cap inventory at 10,000 entries,
   extraction at 64 MiB per entry and 256 MiB per renderer, expansion at 1,000:1, nesting at three,
   one active extraction, and 15 seconds. Handle stale work, traversal-like names, duplicates,
   directories, symlinks, encryption, corruption, unsupported methods, and teardown explicitly.
3. Move ASCII Studio into the expanded Media content and derive visibility from post-filter visible
   Media sample buttons, including collapse/back/filter/rerender and accessible-focus behavior.
4. Resolve the pinned official EmulatorJS source immutably, record per-file source/hash/license,
   and vendor the exact frontend, reports, normal/legacy core data, and compression dependency
   closure for fceumm, snes9x, gambatte, mgba, genesis_plus_gx, and stella2014. Exclude BIOS files.
   Add a deterministic staged refresh/verifier and synchronize offline bundles/manifests.
5. Pass emulator preference explicitly into type selection. Promote only complete supported cores;
   implement live on/off selection transitions and full worker/audio/script/global/blob teardown.
   Remove the reload affordance only for emulators and fix remaining narrow settings layout.
6. Run unit/browser/offline coverage. For the ignored private NES, prime runtime assets online,
   select the file, require ready/start plus nonblank changing frames and input response, close,
   go hard-offline, reselect from disk, and repeat. Retain no ROM-derived output or browser state.
7. Run affected areas and full `./scripts/check.sh`, update generated files to a fixed point, inspect
   UI at desktop/phone in both themes, classify every dirty path, remove only task-owned temporary
   material, fetch and require non-divergent `origin/dev`, push normally, and verify SHA equality.

## Validation

- APK-family semantic, resource-bound, cancellation, navigation, and cleanup tests.
- Examples catalog search/kind/category/back/duplicate/accessibility tests.
- Emulator mapping, lock-manifest, origin-guard, ranking/state-transition, teardown, settings, and
  online plus reselected hard-offline NES runtime tests.
- Relevant archive, examples, core UI, interactions, remote-resource, exact-manifest offline, smoke,
  and full repository checks.
- Final `git status --short` empty; `origin/dev` SHA equals local `HEAD` after push.

## Risks

- ZIP bombs or stale extraction can exhaust memory. Enforce declared and actual limits before and
  during extraction, abort stale work, and release resources deterministically.
- EmulatorJS frontend/core mismatches can trigger hidden CDN fallback. Verify one immutable release
  tree and make missing assets a detailed local failure.
- GitHub Pages lacks cross-origin-isolation headers. Disable threads, retain compatible normal and
  legacy variants, and test against the production-equivalent server behavior.
- Commercial ROM handling can contaminate evidence. Keep the fixture ignored, reselect it manually
  after reload/offline transitions, and delete emulator saves/browser contexts after each gate.

## Resume checkpoint — 2026-07-11, implementation and local validation complete

- The implementation is split into recoverable commits: plan `8628bec2`; bounded APK browsing
  `c3bd632e`; Media-only ASCII Studio `6127570b`; pinned EmulatorJS closure `91573769`; live
  preference/runtime teardown `01f3b99f`; portable core/settings matrices `34a58dd6`; and fresh-page
  core lifecycle isolation `97c1cbac`.
- APK/AAB/XAPK keep their specialist structure and trust summary while exposing bounded contents
  through normal intake. ZIP and APK opening share caps of 10,000 entries, 64 MiB per entry,
  256 MiB per renderer/session, 1,000:1 expansion, depth three, one active extraction, and 15 seconds,
  with unsafe paths, duplicates, symlinks, encryption, corruption, stale work, actual-size overruns,
  cancellation, and disposal covered. The binary browser matrix proves APK `assets/config.json`
  re-detects and opens as JSON while AAB/XAPK inventories remain honest.
- ASCII Studio now appears exactly once inside expanded Media and only while the post-filter Media
  set is nonempty. It is absent from Image, folder overview, show-all, and back navigation. The
  exhaustive catalog repeatedly opened all 1,115 samples across all 144 registered types and passed
  Media search/kind transitions, direct same-origin image/JPEG handoff, zero console errors, and zero
  off-origin requests.
- EmulatorJS is pinned to official 4.2.3 commit `e150dc0491ae747028919fb82d6598954976ede6`.
  The staged installer and strict verifier retain 39 source- and hash-locked files: frontend,
  compression helpers, six reports, and normal plus legacy non-threaded data for fceumm, snes9x,
  gambatte, mgba, genesis_plus_gx, and stella2014, with the relevant licenses. BIOS, firmware, ROMs,
  threaded cores, localization, ads, and netplay are excluded. The fixed-point release manifest has
  5,119 assets, 49 bundles, a 40-file/14,225,124-byte EmulatorJS bundle, and service-worker version
  `568fc2189dd2`.
- Preference-aware detection preserves the raw NES confidence scores (Game ROM 0.99, EmulatorJS
  0.92) but selects EmulatorJS when enabled, never promotes unsupported N64, applies changes live,
  and restores Game ROM Header on disable. The old reload affordance is removed. Runtime disables
  threads and locale fetching, blocks off-origin fallbacks, neutralizes the localhost version probe,
  tolerates Wake Lock denial, and tears down the main loop, gamepad, audio, globals, injected nodes,
  fetch/wake guards, and ROM URL.
- Portable browser coverage initializes all six real locked report/core/decompressor closures from
  generated non-copyrighted placeholder bytes. A full-gate run exposed that reloading a page with an
  active Emscripten loop can abort navigation as the frame detaches; `97c1cbac` now gives every core
  a fresh page. The six-core matrix then passed three consecutive focused runs and the final full
  gate, always with HTTP 200 assets and zero localization/off-origin requests. This proves dependency
  closure and Module initialization, not gameplay.
- The ignored 40,976-byte private NES remains only at
  `.example-files-internet/Super Mario Bros. (World).nes`. Repeated gates, including the final run,
  prove online boot and hard-offline reload plus disk reselection, ready/start signals, advancing
  frame count, nonblank multi-color rendered pixels, player-one Start keydown/up, live-disable
  teardown, and zero 404/off-origin/console/page errors. No ROM bytes, hashes, saves, screenshots,
  cache entries, logs, or derived artifacts were retained.
- Settings automation passes at 1100×800 and 390×844 in light and dark: drawer/row/toggle
  containment, no horizontal overflow, legible typography, at least 3:1 hint contrast, live rerank,
  and no reload block. Temporary desktop/phone light/dark captures and an APK capture were inspected
  at original resolution; APK contents and settings layout were readable and contained. All captures
  and the temporary capture script were deleted; no NES screenshot was taken.
- Final `./scripts/check.sh` is green from generator fixed-point and vendor verification through the
  full parser/unit corpus, core smoke, all three remote-resource privacy suites, all 11 exact-byte
  offline scenarios, Sokoban replay, known-file viewers, binary/container viewers, six-core closure,
  and four-case responsive settings matrix, ending with `✓ all checks passed`. An earlier fresh
  Chromium process transiently SIGSEGVed before the embedded-privacy page opened; that suite passed
  immediately alone and twice in later full runs, so no privacy assertion was bypassed.
- YAMS CLI fallback captured the archive-bound, pinned-runtime, and preference/Media conventions,
  then completed a non-destructive repo rescan plus pointer, consolidation, temporal-graph, quality,
  and generalization maintenance. Four quality findings were repaired; no duplicate, contradiction,
  dead-pointer, or temporal-chain retirement was needed.
- Final Git steps only: commit this handoff update; classify/remove task-owned temporary material;
  require a clean worktree; fetch and prove `origin/dev` is an ancestor; push `dev` normally; fetch
  again and verify local HEAD equals `origin/dev`. Do not force-push, tag, publish, or delete the
  committed beta evidence.

## Open Questions

None.
