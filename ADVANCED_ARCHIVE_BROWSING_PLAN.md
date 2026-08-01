# Advanced archive browsing and reload UI

## Goal

Give advanced archives virtual-folder browsing, bounded lazy extraction, and a consistent update export while keeping the optional libarchive dependency and its reload flow.

## Requirements

- Browse and open 7z, RAR, tar-family archives plus standalone gzip, bzip2, xz, and zstd streams.
- Warn before loading source archives above 64 MiB and reject sources above 256 MiB.
- Reuse the existing archive entry limits and route extracted files through normal intake.
- Export advanced archive edits as an update ZIP while preserving the existing ZIP repack path.
- Move heavy-package progress and reload controls outside settings row flow.

## Assumptions

- Advanced archive support stays opt-in and reload-based.
- Password entry, multipart archives, and original-format repacking remain outside this change.
- The original source archive remains unchanged and available through its normal download path.

## Plan

1. Mount heavy-package cards in a bottom overlay owned by the settings drawer. Keep the content scrollable above the overlay.
2. Extend advanced archive detection and single-stream child naming.
3. Add source preflight, normalized raw listing, shared extraction coordination, cancellation, and persistent archive-root cleanup.
4. Connect advanced archive listings to the existing sidebar tree and normal file intake.
5. Add an explicit update-ZIP export mode with a versioned JSON deletion manifest.
6. Add unit and browser regressions, regenerate derived files, then run the fast repository gate.

## Validation

- Run archive bounds, archive metadata, path, settings, and export unit tests.
- Exercise 7z and standalone compressed streams in Chromium.
- Verify update-ZIP contents and unchanged source bytes.
- Run `./scripts/check.sh --fast`.

## Risks

- libarchive loads the source into worker and WASM memory. Source and extracted-byte limits bound the peak.
- The pinned libarchive reader exposes raw listing through an internal client property. Isolate that access and cover it against the vendored bundle.
- Preview cleanup can revoke an extractor too early. Transfer cleanup ownership to the persistent sidebar root.

## Open Questions

None.
