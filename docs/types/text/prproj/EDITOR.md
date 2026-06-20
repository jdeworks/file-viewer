# Editor Roadmap — PRPROJ (Adobe Premiere Pro Project)

## Current state
Viewer decompresses the gzip wrapper using native `DecompressionStream`, then does lightweight regex extraction on the XML string to surface: project name, Premiere version, creation date, sequence count, clip count, media source count, and frame rate (from `<timebase>`). Renders a stat hero card and an info table. Binary `.prproj` files that are not gzip-wrapped are handled with an error notice. Editing is not implemented.

## Viewer enhancements (no write-back needed)
- Sequence list — extract `<Sequence>` names (`<Name>` child) and durations (`<Duration>` / `<timebase>`) and list them with human-readable timecode — M
- Bin / folder tree — Premiere uses `<ProjectItem>` / `<Bin>` nesting to represent the project panel; parse and render as a collapsible tree — L
- Asset path list — collect all `<MediaSource><FilePath>` (or `<ActualMediaFilePath>`) values and show a deduplicated list; flag offline/missing paths (relative vs. absolute) — M
- Effect inventory — count and list distinct effect/filter names from `<VideoFilter>` / `<AudioFilter>` `<Name>` elements — M
- Colour space / profile — extract `<ColorProfile>` or working colour space from sequence settings — S
- Premiere version badge — `<PremiereData Version="">` attribute is already parsed; show it more prominently and map known version numbers to Premiere release names — S
- Export extracted XML — offer download of the decompressed XML as `.xml`; very useful for debugging and external diffing — S

## In-browser editing (download-on-save)
Editing note: PRPROJ XML is a large, deeply nested proprietary schema with binary blob sub-fields. Only cosmetic/metadata edits are safe to attempt.
- Edit project name — find and replace `<Project>name text</Project>` or equivalent; re-compress with `CompressionStream`; download — S — native `CompressionStream`
- Rename sequences — change `<Sequence><Name>` text nodes; re-compress and download — M — native `CompressionStream`
- Edit sequence frame rate — change `<timebase><value>` integer; re-compress and download — S — native `CompressionStream`; warn user this changes timing metadata
- Strip unused media — remove `<MediaSource>` nodes whose `<IsOffline>` flag is true; re-compress and download as a cleaned project — M — native `CompressionStream`

## Full write-back editing (companion required)
- Save patched `.prproj` to original path via companion `/write-back`
- Batch project rename — companion walks a folder and applies name patches across multiple `.prproj` files

## Shared toolbar / modular note
Editing is feasible only for string/integer metadata fields. Do not attempt to edit binary blob sub-fields (media descriptors, effect parameter blobs). The gzip round-trip uses native `CompressionStream` / `DecompressionStream` — no pako. Use `String.replace` with anchored regexes rather than `XMLSerializer` to avoid mangling Premiere's non-standard XML constructs (CDATA blobs, processing instructions).
