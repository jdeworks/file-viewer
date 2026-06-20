# Editor Roadmap — Font

## Current state
Full-featured type specimen viewer: FontFace API loads bytes directly in the parent document, interactive pangram input with live font-family preview, size slider (12–200px), text color picker, background toggle (white/black/transparent), alphabet block, digit/symbol block, size ramp (12–80px), weight ramp (100–900), and a name-table info card with linkified license URLs. Revoke hook cleans up the FontFace on close.

## Viewer enhancements (no write-back needed)
- **Glyph table browser** — render the full Unicode coverage of the font as a scrollable grid; clicking a glyph copies its character and code point. Use opentype.js (vendorable, ~200 KB) to walk the cmap table. — M — opentype.js
- **OpenType feature preview** — dropdown of available OT features (liga, smcp, frac, ordn, onum, …) parsed from the GSUB table; toggling a feature applies `font-feature-settings` to the preview pane. — M — opentype.js
- **Kerning pair explorer** — type two characters and display their kern value in units and pixels at the current size; pull from the kern table or GPOS via opentype.js. — S — opentype.js
- **Variable font axis sliders** — detect `fvar` table; render one range slider per axis (wght, wdth, ital, slnt, …) and wire them to `font-variation-settings` on the preview. — M — opentype.js
- **Italic / oblique specimen row** — add a "Styles" block that tries `font-style: italic` and `font-style: oblique` so the viewer shows what the browser synthesizes. — S
- **Line-height & letter-spacing controls** — two extra sliders in the controls bar, live-applied to the preview div. — S

## In-browser editing (download-on-save)
- **Subsetting (remove unused glyphs)** — accept a character-set string from the user, remove all glyphs outside it, and offer a trimmed font download. Reduces file size for web embedding. — L — opentype.js (`Font.download()` after deleting glyph slots)
- **Format conversion** — convert TTF ↔ OTF at the binary header level (limited), or produce WOFF2 via the `woff2` WASM encoder (google/woff2 compiled to WASM, ~120 KB). — L — woff2.wasm or opentype.js
- **Name Table metadata editor** — editable form for nameID fields (Family, Subfamily, Full Name, Version, Copyright, License, Vendor URL, …); serialize the modified name table back into the binary buffer and download. — M — opentype.js (`Font.names`, `Font.download()`)
- **Glyph outline export** — pick a glyph from the table, export its path as SVG. opentype.js exposes `Glyph.getPath()` with an SVG serializer. — S — opentype.js

## Full write-back editing (companion required)
- **Save converted/subsetted font back to original path** — write the modified bytes to the source file without a download dialog. Requires companion write-back API.
- **Batch rename font files from Name Table** — read the Family + Subfamily fields and rename the file on disk to match convention (e.g. `Inter-Bold.ttf`).

## Shared toolbar / modular note
The font renderer runs in `parentNode` mode (not an iframe) because FontFace must register on the host document. Any new controls should be appended inside the existing `.font-doc` host div. Glyph-table and feature-preview both need opentype.js — vendor it once at `docs/vendor/opentype/opentype.min.js` and import via `script-loader.js`.
