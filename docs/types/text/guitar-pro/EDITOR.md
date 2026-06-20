# Editor Roadmap — Guitar Pro

## Current state

Binary parser for GP3/4/5 (`.gp3`, `.gp4`, `.gp5`) and ZIP-based GPX for GP6/7 (`.gpx`/`.gp`). Reads title, artist, album, tempo, measure count, and track names from the `score.gpif` XML inside the GPX container. Uses JSZip (already vendored). Renders a static metadata card — no score rendering, no audio playback.

No alphaTab, no VexFlow, no MIDI output. No editing capability.

## Viewer enhancements (no write-back needed)

- **Score rendering via alphaTab** — Load [alphaTab](https://alphatab.net/) (MIT, ~2 MB UMD build) and render the full staff notation + tablature for GPX files. AlphaTab accepts a `.gp` file buffer directly. Display one track at a time with a track selector. — L
- **MIDI playback** — alphaTab ships a built-in synthesiser (`AlphaSynth`) that plays the parsed score using SoundFont2. Wire up a transport bar (play/pause/stop, position scrubber, BPM display). Requires bundling a small GM SoundFont (~1–4 MB). — M (bundled with alphaTab)
- **Tempo control** — Expose alphaTab's `masterVolume` and `playbackSpeed` API as a tempo multiplier slider (0.5×–2×). — S
- **Loop region** — alphaTab supports `loopStart` / `loopEnd` beat positions. Add a drag-to-select region on the position bar or measure ruler. — M
- **Track mute / solo** — AlphaSynth has per-track mute/solo. Render one toggle row per track in the track list already shown. — S
- **Part zoom / scroll** — alphaTab's layout setting (`horizontal` vs `page`) and zoom level are CSS-controllable. Add zoom buttons and a layout toggle to the toolbar. — S

## In-browser editing (download-on-save)

Guitar Pro binary format (.gp3/.gp4/.gp5) is not trivially re-serialisable in JS. GPX, however, is a ZIP whose `Content/score.gpif` is plain XML — this enables targeted editing.

- **Tuning change (GPX only)** — Parse `<Tuning>` elements per track in `score.gpif`. Present a string-by-string tuning picker (MIDI note or note-name). Re-zip with JSZip and offer the modified `.gpx` as a download. — M
- **Export MIDI** — Parse `score.gpif` beat/note data and emit a standard Type-1 `.mid` file using a hand-rolled MIDI writer (no new lib needed; MIDI is a simple binary protocol). One track per GP track. — L
- **Export MusicXML** — Traverse `score.gpif` and emit `score-partwise` MusicXML 4.0 XML. Covers pitch, duration, ties, dynamics. Useful for importing into Sibelius/MuseScore. — L
- **Print / export PDF** — Call `window.print()` against the alphaTab canvas or use html2canvas (already vendored) to rasterise pages and pack them into a PDF via pdf-lib (already vendored). — M

## Full write-back editing (companion required)

- **Note-level editing** — Click a notehead in alphaTab to select it; change pitch, duration, articulation, bend via a floating panel. Requires round-tripping the edited `score.gpif` XML back to disk.
- **Add / remove measures** — Insert or delete `<MasterBar>` elements and keep all part bars in sync. Complex because bar references are by numeric ID, not position.
- **Lyrics editor** — Edit `<Lyric>` elements in `score.gpif` with an inline text field aligned to the note grid.
- **Track reorder / rename** — Drag tracks in the sidebar to reorder `<Track>` elements and rename via double-click.

## Shared toolbar / modular note

AlphaTab is the right single dependency for this format — it handles parsing, rendering, and synthesis for GPX. For GP3–5 binary files the same alphaTab API works; alphaTab includes its own binary parser. The key vendoring task is bundling the UMD build (`alphaTab.min.js`, ~2 MB) and a GM SoundFont. Both are distributable offline. The export paths (MIDI, MusicXML, PDF) can be implemented independently of alphaTab and reused across the music types.
