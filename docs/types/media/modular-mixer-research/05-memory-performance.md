# Memory And Performance

The mixer must remain safe in a static client. Media files can be large, and the
browser process is the only runtime.

## Core Policies

- Do not read full media files unless the user explicitly triggers an operation
  that requires it.
- Prefer metadata and byte-range reads first.
- Prefer object URLs over base64.
- Revoke object URLs on teardown/replacement.
- Decode only selected or visible ranges when possible.
- Store derived summaries, not raw decoded data, when interaction only needs
  visualization.
- Make heavy analysis cancellable or generation-token guarded.
- Show warnings and disabled states instead of attempting unsafe work.
- Use byte-budgeted caches for decoded audio and processed audio. Cache keys
  must include every processing setting that changes output.

## Asset Memory

Keep:

- `File` references from the browser.
- object URL for preview.
- small metadata objects.
- waveform bucket arrays.
- thumbnail object URLs or small bitmap caches within caps.

Avoid:

- base64 media copies.
- full `ArrayBuffer` copies of large files.
- keeping decoded full `AudioBuffer`s for many tracks.
- generating all thumbnails for long videos by default.

## Audio Waveforms

Waveform policy:

- For small files, full decode and bucket summary is acceptable.
- For large files, cap decode duration or bytes and mark waveform as partial.
- Store min/max/RMS buckets, not raw PCM.
- Release decoded buffers after bucket generation unless needed for active
  playback/mix.
- For WAV, parse headers and selected PCM ranges where practical instead of
  always full-decoding.
- For compressed audio, browser decode may require full decode; make this
  explicit and capped for large files.
- Never decode during paint. Paint consumes precomputed peaks/summaries only.

Needed WAV details:

- detect sample rate
- detect channels
- detect bit depth/format where practical
- compute duration from header
- allow selected-range waveform from byte offsets for PCM WAV
- warn for unsupported WAV encodings that need browser decode or ffmpeg
- preserve source sample-rate metadata and avoid hardcoded export sample rates
  unless the selected export preset explicitly resamples.

## Audio Buffer Cache

Use a decoded buffer cache with an explicit byte budget, modeled after Narratu's
cache design.

Recommended policy:

- Default budget around 200 MB, configurable by constants.
- Cache key includes asset id, file identity hash, selected range, sample rate,
  channel interpretation, and decode mode.
- LRU eviction.
- Explicit `releaseProject(projectId)` on project teardown.
- Processed cache key includes EQ, gain, fades, speed, trim, sample rate, and
  any dynamics settings.
- Waveform summaries are separate from decoded buffers and much cheaper to keep.

## Audio Playback

Realtime playback:

- Build WebAudio graphs on play.
- Tear down source nodes on stop.
- Reuse minimal AudioContext infrastructure carefully.
- Keep per-lane EQ nodes only while needed.
- Support track-specific and master EQ without duplicating source buffers.

Offline mix/export:

- Use `OfflineAudioContext` only for bounded audio-only mixes.
- Estimate memory before rendering.
- Warn when output duration/channels/sample rate would exceed safe caps.
- Use ffmpeg for operations better handled by streaming/transcoding.

## Video And Images

Video policy:

- Use native video metadata where possible.
- Generate thumbnails lazily and sparsely.
- Cap thumbnail count and resolution.
- Use canvas extraction only on explicit request or visible ranges.
- For unsupported formats, warn that ffmpeg conversion is required.
- Avoid decoding entire video into frames in memory.

Image policy:

- Use object URLs for preview.
- Decode dimensions only.
- Downscale large images for timeline thumbnails.
- Keep original file reference for export.

## Ffmpeg

ffmpeg.wasm is opt-in and expensive.

Policies:

- Load ffmpeg only after explicit user action.
- Keep ffmpeg-gated controls visible as opt-in actions, not broken panels.
- Show approximate download/runtime warning.
- Reuse existing load/cancel/error handling from `transcoder.js`.
- Cap input byte size for browser ffmpeg.
- Prefer selected-range extraction over full-file processing.
- Release ffmpeg instance/memory when operations finish or are canceled if the
  current infrastructure supports it.
- Display clear errors for out-of-memory, unsupported codec, and canceled work.

When ffmpeg is unavailable, the mixer still supports project editing, native
preview for supported files, metadata-only timing edits, and project settings
import/export. Final operations that need ffmpeg must explain the opt-in rather
than attempting to run.

## Hashing And Project Import

Hashing should not force full-file reads for huge files.

Recommended:

- small files: full SHA-256
- large files: partial SHA-256 over stable byte windows
- include size, lastModified, and name
- allow relink flow when hashes do not match exactly

Hash work should be asynchronous and cancelable.

## Rendering Performance

- Canvas lanes draw only visible viewport ranges.
- Use requestAnimationFrame for cursor/playhead updates.
- Debounce resize and scroll work.
- Avoid layout thrash in drag loops.
- Precompute hit regions per visible render.
- Keep CSS dimensions stable.
- Do not redraw heavy thumbnails/waveforms every cursor tick unless needed.

## Cleanup Requirements

Every mounted mixer instance must expose `destroy()` that:

- stops playback
- cancels analysis
- removes event listeners
- revokes object URLs it owns
- disconnects WebAudio nodes
- releases canvas/thumbnail references
- cancels ffmpeg operation if the mixer owns it

Tests should include teardown/lifecycle coverage for repeated open/close.
