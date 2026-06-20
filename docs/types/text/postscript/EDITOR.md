# Editor Roadmap — PostScript / EPS

## Current state

Metadata-only viewer: parses DSC (Document Structuring Conventions) comments (`%%Title`, `%%Creator`, `%%BoundingBox`, etc.) from the first 8 KB; shows kind badge (PostScript / EPS / DSC), version, page count, bounding box in mm, fonts, and code line count. Explicitly notes that execution is not supported. Returns `{ bodyHtml }`.

## Viewer enhancements (no write-back needed)

- **Ruffle/Ghostscript WASM render** — Ghostscript.js (GPL WASM build, ~6 MB) can rasterise PostScript client-side; render to a `<canvas>` with a page-scrubbing control for multi-page files; add a lazy-load gate ("Render preview — may take a moment") — L (gs.js WASM, needs vendoring and CSP audit)
- **Page thumbnail strip** — once rasterised via Ghostscript.js, generate thumbnails for each page and show a horizontal strip navigator — M (depends on rasteriser above)
- **Font list enrichment** — cross-reference `%%DocumentFonts` against the 35 standard PostScript fonts and flag any non-standard fonts as "may not render on all devices" — S
- **BoundingBox visualiser** — draw the bounding box as a to-scale SVG rectangle with labelled dimensions (mm and pt), giving a sense of the page geometry without rendering — S
- **DSC comment explorer** — show all `%%` DSC comments as a collapsible tree, not just the curated subset; useful for EPS files with extended metadata — S
- **Monaco syntax highlight** — register a minimal Monaco token provider for PostScript keywords (`def`, `begin`, `end`, `ifelse`, `loop`, `/name`, `%` comment), string literals, and numeric literals — M

## In-browser editing (download-on-save)

- **Monaco editor mode** — mount Monaco with the custom PostScript token provider; Ctrl+S downloads the edited `.ps`/`.eps`; re-parse DSC header on each change to update the metadata sidebar — M (Monaco already vendored)
- **DSC header editor** — form fields for Title, Creator, BoundingBox; edits are written back into the DSC comment block in the text buffer — M
- **EPS bounding box recalculator** — parse `%%BoundingBox` and offer a toolbar button to re-emit a user-entered bounding box (useful when the declared box is wrong) — S

## Full write-back editing (companion required)

- **Round-trip save** — POST to companion `/write`; re-trigger DSC parse — S
- **Convert to PDF** — companion invokes `gs -sDEVICE=pdfwrite` and serves the result as a download — M

## Shared toolbar / modular note

The Ghostscript WASM render is the most impactful single feature but also the heaviest dependency (~6 MB). Vendor it conditionally — only load when the user clicks "Render". The Monaco PostScript token provider is small enough to inline in a `postscript-lang.js` file (~1 KB). BoundingBox visualiser and DSC explorer are zero-dependency quick wins that significantly improve the current metadata-only experience.
