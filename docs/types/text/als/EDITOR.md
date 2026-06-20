# Editor Roadmap — ALS (Ableton Live Set)

## Current state
Full gzip-aware viewer: decompresses the `.als` gzip wrapper in-browser using the native `DecompressionStream` API, then parses the XML with `DOMParser`. Extracts BPM, time signature, track list (Audio / MIDI / Return / Master) with clip names and plugin names per track, and a de-duplicated plugin inventory. Renders a metric hero bar, a responsive track grid with clip/plugin chips, and a sidebar plugin list. Dark mode supported.

## Viewer enhancements (no write-back needed)
- Clip timeline grid — render a read-only arrangement view: for each AudioTrack/MidiTrack show horizontal bars for clip positions/lengths using `<Arrangement>` clip data (`<AudioClip Time="">` and `<Length>` attributes) scaled to a common timeline ruler — L
- Scene / Session view — group clips by `<Scene>` slots and render a matrix (tracks × scenes) grid similar to Ableton's session view — L
- Plugin details panel — clicking a plugin chip shows plugin preset name, vendor, category (parsed from `<PluginDesc>`), and whether it is enabled (`<IsOn>`) — M
- Automation lane count — count `<AutomationEnvelope>` nodes per track and show in the track header — S
- Sample reference list — collect all `<SampleRef><FileRef>` paths and show a deduplicated file list; flag missing/relative paths — M
- Send/return routing map — parse `<TrackSendHolder>` and build a text or SVG routing diagram — M
- Live version badge — read `<Ableton MajorVersion="">` attribute and display it next to the BPM hero — S
- Export extracted XML — offer a download of the decompressed XML as `.xml` for editing in an external editor — S

## In-browser editing (download-on-save)
- Edit BPM — numeric input for `<Tempo><Manual Value="..."/>` (and `<AutomationTarget>` if present); regenerate gzip on save using `CompressionStream` — M — native `CompressionStream` (no lib)
- Edit time signature — inputs for numerator/denominator targeting `<TimeSignature><Numerator Value="">` and `<Denominator Value="">` — S — native `CompressionStream`
- Rename tracks — inline `<input>` on each track header writing back to `<UserName Value="">` in the XML, then re-compress — M — native `CompressionStream`
- Toggle track mute/solo — flip `<Solo Value="">` and `<Mute Value="">` boolean attributes and re-export — S — native `CompressionStream`
- Export extracted XML — already noted above; always offer even without other edits — S

## Full write-back editing (companion required)
- Save edited `.als` to original path — POST re-compressed bytes to companion `/write-back`
- Batch BPM change across multiple files — companion orchestrates gzip round-trip for a folder of sets

## Shared toolbar / modular note
The gzip round-trip (decompress → edit XML string → re-compress) is fully achievable with the native `DecompressionStream` / `CompressionStream` APIs available in all modern browsers — no `pako` or external lib needed. Keep the XML as a string and use `String.replace` / `DOMParser` + `XMLSerializer` for edits; avoid DOM-then-serialize for large sets as it can lose XML comments.
