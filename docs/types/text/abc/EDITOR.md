# Editor Roadmap — ABC Notation

## Current state

Hand-rolled header parser: splits multi-tune files on `X:` fields, extracts title, composer, key, meter, rhythm, and tempo for each tune, and renders a list of tune cards with info pills. Supports multi-tune `.abc` files (shows up to 30). No rendering library, no audio, no staff output.

No abc.js, no MIDI output. No editing capability.

## Viewer enhancements (no write-back needed)

- **Score rendering via abcjs** — Load [abcjs](https://paulrosen.github.io/abcjs/) (MIT, ~500 KB UMD). Call `ABCJS.renderAbc(container, tuneText)` per tune card. For multi-tune files add a tune selector; render one at a time to keep the DOM lean. — M
- **MIDI playback** — abcjs ships `ABCJS.synth.CreateSynth()` which generates audio via Web Audio API from the parsed tune model. No external SoundFont required for basic synthesis (uses a built-in oscillator model); optionally supply a SoundFont for richer timbre. Wire a play/pause/stop bar and position highlight in the rendered score. — M (bundled with abcjs)
- **Transpose** — abcjs accepts a `transpose` integer in its render options. Expose a semitone picker (−12 to +12) in the toolbar; re-render live without touching the source. — S
- **Tempo slider** — abcjs synth exposes `speed` as a ratio multiplier at play-time. Add a 0.5×–2× slider. — S

## In-browser editing (download-on-save)

ABC is plain UTF-8 text, so editing = text manipulation + live re-render.

- **Monaco editor with ABC syntax highlighting** — Load Monaco (already vendored at `docs/vendor/monaco/`). Define a minimal TextMate-style ABC language grammar: field lines (`T:`, `K:`, `M:`, etc.) in one colour, note tokens in another, bar lines and repeat signs highlighted. Wire `onChange` to re-render the abcjs preview panel. — M (key lib: Monaco, already vendored)
- **Live preview split-pane** — Render a two-column layout: Monaco editor on the left, abcjs staff output on the right. Debounce re-render at ~300 ms. Mirror this pattern from the YAML form editor in `rawpane.js`. — M
- **Export score as PNG** — `ABCJS.renderAbc` targets an SVG element. Serialise the SVG, draw it onto an `<canvas>`, and call `canvas.toBlob()` to download a PNG. No extra lib. — S
- **Export MIDI** — abcjs can call `ABCJS.synth.getMidiFile()` on the parsed tune object and returns a MIDI Uint8Array. Download as `.mid`. — S (bundled with abcjs)
- **Export PDF (print)** — Apply `@media print` CSS that hides the editor pane and renders all abcjs SVGs full-width. Call `window.print()`. Alternatively, use html2canvas (already vendored) + pdf-lib (already vendored) for a true PDF binary. — S/M

## Full write-back editing (companion required)

- **Auto-format / normalize** — Re-emit parsed tune headers in canonical order (`X`, `T`, `C`, `M`, `L`, `Q`, `K`), normalise whitespace, and write back. Needs companion for save-to-disk without download prompt.
- **Multi-tune reorder** — Drag-to-reorder tune cards and persist the new `X:` index sequence back to the file.
- **Tune split / merge** — Extract a single tune to a new file, or append a tune from another file. Companion required so both source and destination can be written atomically.

## Shared toolbar / modular note

abcjs is the only dependency needed for both rendering and MIDI export — it is compact (~500 KB), well-maintained, and MIT-licensed. Monaco is already vendored, so the split-pane editor requires no new libs. The PNG/PDF export paths reuse html2canvas and pdf-lib already used in the image and PDF viewers. The live-preview pattern mirrors the YAML editor in `rawpane.js` and should share a common two-pane shell component if one is extracted.
