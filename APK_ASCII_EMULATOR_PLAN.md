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

## Resume checkpoint — 2026-07-11, baseline recorded

- Clean `dev` and `origin/dev` both point to `906fd642c50a9dd782edb57707d11b6a5681e0bb`.
- Private fixture exists at `.example-files-internet/Super Mario Bros. (World).nes`, is 40,976 bytes,
  and is ignored/untracked; never stage or retain derived output from it.
- Planning and repository/YAMS guidance were read. Implementation begins with bounded APK browsing.
- Remaining: all seven plan steps above.

## Open Questions

None.
