# Editor Roadmap — FITS (Flexible Image Transport System)

## Current state
Header-only viewer. Parses the fixed-width 80-char card records from both binary
and text FITS files. Displays a stats bar (dimensions, NAXIS, data type, card
count), a table of interesting keywords, and a collapsible full card dump.
No image data is decoded or rendered.

## Viewer enhancements (no write-back needed)

- **Image rendering (grayscale)** — Decode the raw pixel array from the first
  image HDU using BITPIX/BZERO/BSCALE and render it onto a `<canvas>` element.
  Start with 8-bit and 16-bit integer types; float32 is a stretch goal — S
- **Stretch modes** — Toolbar buttons (linear / log / sqrt) to remap pixel
  values before display. Log/sqrt are critical for astronomy images with wide
  dynamic ranges; implement as a pre-canvas LUT pass — S
- **Colormap selector** — Drop-down for viridis, plasma, inferno, grayscale, and
  heat colormaps. Pre-compute a 256-entry RGB LUT and apply during the canvas
  fill loop — S
- **WCS coordinate overlay** — Parse CD/CDELT/CRPIX/CRVAL header cards and
  annotate the canvas with RA/Dec tick marks at the edges. Requires basic WCS
  affine math only (no projection libs needed for small fields) — M
- **Pixel value inspector** — On mousemove over the canvas, show the raw ADU
  value (un-stretched), plus the WCS coordinate if available, in a floating
  tooltip — S
- **Multi-HDU browser** — Parse the full HDU sequence (each 2880-byte block
  boundary) and show a sidebar listing HDU name/type/size for navigation. Most
  science FITS have 2–10 HDUs — M
- **Header search** — Instant filter on the full card dump table. Useful for
  files with hundreds of header cards (complex instruments) — S
- **Export as PNG** — Button to `canvas.toBlob()` and trigger a download of the
  current view with current stretch and colormap applied — S

## In-browser editing (download-on-save)

- **Header card editor** — Render the card table with inline editable cells for
  value/comment fields. Serialize back to fixed-width 80-char format and
  reconstruct the 2880-byte block; wrap with the original binary data tail to
  produce a valid output FITS — M
- **Keyword add / delete** — Buttons to append a new card before END or remove
  an existing one, keeping block padding correct — M

## Full write-back editing (companion required)

- **Live header edit round-trip** — Same as above but saves directly to the
  source file via the companion Axum endpoint. Particularly useful for telescope
  pipeline scripts that loop over FITS headers — S (given companion)

## Shared toolbar / modular note
Image canvas and stretch controls are self-contained; extract them as
`fits-canvas.js` so the multi-HDU browser can swap frames by swapping the data
pointer. fitsjs (npm: fitsjs, ~60 KB) provides a ready-made HDU parser and
pixel decoder if the hand-rolled binary reader proves fragile on compressed
tiles or mosaic extensions.
