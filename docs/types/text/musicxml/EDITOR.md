# Editor Roadmap — MusicXML

## Current state

Parses both uncompressed `.musicxml`/`.xml` and compressed `.mxl` (ZIP via JSZip). Extracts title, composer, lyricist, key, time signature, tempo, part names, and measure count. Renders a metadata card, a collapsible score-structure tree (root → part-list → score-parts → first 3 measures), and a raw-XML preview of the first measure. Uses only DOMParser and JSZip — no rendering library, no audio.

No OSMD, no VexFlow, no MIDI output. No editing capability.

## Viewer enhancements (no write-back needed)

- **Score rendering via OpenSheetMusicDisplay (OSMD)** — Load [OSMD](https://opensheetmusicdisplay.org/) (MIT, ~1.5 MB UMD build) and render full staff notation from the parsed XML. OSMD accepts raw XML text. Add a part selector for multi-part scores. — L
- **MIDI playback** — Pair OSMD with [osmd-audio-player](https://github.com/jimutt/osmd-audio-player) or build a direct Web Audio synth over the parsed note list. Display play/pause/stop and a measure-position scrubber. Requires a small GM SoundFont. — M
- **Transpose view** — Add a semitone offset picker (−12 to +12). Re-parse or transform pitch elements in the in-memory XML DOM and re-render without touching the source file. — M
- **Part mute / solo** — OSMD supports rendering selected parts. Wire per-part toggles to `osmd.Sheet.Instruments[i].Visible` and a per-part mute on the audio player. — S
- **Version diff — changed measures** — Parse two MusicXML files (original vs edited) and highlight measures where note content differs. Colour changed measures in the score rendering (red outline). No extra lib needed; compare serialised measure XML. — M

## In-browser editing (download-on-save)

MusicXML is plain XML (or a trivially re-zippable `.mxl`). All editing is DOM manipulation followed by `XMLSerializer` + optional JSZip re-pack.

- **Dynamics editor** — Present a per-measure, per-part dynamics picker (`pp`, `mp`, `mf`, `ff`, etc.). Insert or replace `<dynamics>` child elements inside the selected `<direction>` block. Download modified XML. — M
- **Add / remove measures** — Insert a blank `<measure>` element (cloned from the last measure with notes cleared) or delete a selected measure from all `<part>` elements while keeping measure numbers in sync. — M
- **Tempo change** — Edit the `<sound tempo="...">` attribute or the `<per-minute>` text content via an inline number input. Update the metadata card live. — S
- **Export MIDI** — Traverse note/rest elements and write a Type-1 MIDI file (one track per part). Use the same hand-rolled MIDI writer as the Guitar Pro export path. Key: `<pitch>` → MIDI note number, `<duration>` + `<divisions>` → tick delta. — L (key lib: none; protocol is simple)
- **Re-export as `.mxl`** — Serialize the (possibly edited) XML DOM and re-zip via JSZip into a compressed `.mxl`. Already have all the pieces. — S

## Full write-back editing (companion required)

- **Note-level editing on OSMD canvas** — Click a notehead to select it; change pitch, duration, accidental, or articulation via a floating panel. Requires serialising the OSMD internal model back to MusicXML XML.
- **Lyrics editing** — Click a lyric syllable in OSMD and edit the `<lyric>` text inline.
- **Layout / formatting** — Set `<page-layout>` dimensions, `<system-margins>`, and `<staff-layout>` spacing values with a visual ruler.
- **Part add / remove** — Insert a new `<score-part>` + matching `<part>` with empty measures, or delete an existing part and repair `<part-list>` references.

## Shared toolbar / modular note

OSMD is the canonical JS MusicXML renderer. VexFlow underlies OSMD and could also be used directly for a lighter build. The key vendoring decision is whether to ship OSMD (~1.5 MB) alone or pair it with an audio player. The MIDI export and version-diff features are independent and reusable across the Guitar Pro type. The `.mxl` re-zip path reuses the existing JSZip vendor.
