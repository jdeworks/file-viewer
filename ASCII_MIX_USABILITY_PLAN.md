# ASCII Studio and Audio Mix usability handoff

Status: implementation in progress on `dev`.

## Outcomes

- Standalone ASCII Studio keeps its generated starter image, fills the remaining viewport, and opens an accessible gallery of maintained raster examples from **Use a sample**.
- Image and camera are exclusive modes backed by one canonical ASCII option state and one shared settings panel; camera-only capture controls remain separate and every camera resource is torn down on exit.
- Audio Mix uses the common compact toolbar pattern, supports workspace fullscreen, and reduces each lane gutter to its number and settings button. Lane identity and audio controls live in the lane dialog.
- Mixdown uses one offline PCM render with WAV (default) and locally vendored, worker-based MP3 output. Project JSON actions are consistently labelled **Download project settings**.

## Implementation checkpoints

1. Add sample gallery, full-height standalone layout, canonical ASCII state, exclusive camera transition, and browser coverage.
2. Rework the Mix toolbar, fullscreen lifecycle, lane gutter/dialog layout, shared geometry, and settings-download labels.
3. Add lazy local MP3 encoding, format/progress/error UX, provenance, cancellation, and decoded-output tests.
4. Run focused and complete checks, inspect desktop/narrow UI, remove generated artifacts and this handoff file, then verify the pushed `origin/dev` commit is clean and tested.

## Required validation

- Exercise several gallery samples, failed/rapid sample loading, keyboard dialog behavior, repeated camera transitions, denied/delayed camera access, shared settings, and stream cleanup.
- Exercise multiple/reordered Mix lanes at desktop, narrow, and fullscreen sizes; verify dialog controls affect playback/export and ruler/playhead/clip geometry remains aligned.
- Download and decode both WAV and MP3, checking duration, channels, sample rate, non-silence, mute/solo/gain behavior, final MP3 frames, offline worker loading, cancellation, and failure paths.
- Verify all media project-settings downloads are valid JSON and no old **Export settings** label remains.
- Run `./scripts/check.sh`, confirm zero off-origin requests, remove screenshots/test debris, and finish with an empty `git status --short` and `origin/dev == HEAD`.

## Fixed decisions

- Browser Fullscreen API applies to the Mix workspace only.
- WAV remains the default format; MP3 is mount-local UI state and does not alter the project schema.
- Gallery entries are an explicit safe raster allowlist; existing safe `?sample=` deep links remain compatible.
- The generated startup sample remains visible until another source successfully decodes.
- The plan file is committed for handoff during implementation and removed from the final tree; Git history remains the durable record.
