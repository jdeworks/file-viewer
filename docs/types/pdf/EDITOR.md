# Editor Roadmap — PDF

## Current state

pdf.js renders pages as rasterized canvas images (up to 50 pages, configurable scale). pdfedit.js
wraps pdf-lib (lazy-loaded on first Edit toggle) and tracks page-level mutations as an ordered item
list — original page refs plus inserted images. Operations available today: rotate left/right, move
up/down, delete page, add image as new page (rasterized via canvas → PNG → pdf-lib embed), merge
another PDF, diagonal text watermark with opacity, extract page range, split into multiple PDFs
(zip-downloaded via JSZip). Download-on-save via blob URL. Original bytes never mutated.

Passwords: inline overlay prompt with retry loop; password retained across re-renders.

## Viewer enhancements (no write-back needed)

- **Thumbnail strip** — Render first N pages as small canvases into a collapsible left sidebar; click
  to jump. Speeds navigation on long docs. — M — pdf.js (already loaded)
- **Text search** — Use pdf.js `getTextContent()` per page, highlight hit bounding boxes as overlay
  divs positioned on the page image. Show match count + prev/next controls. — M — pdf.js
- **Text layer / copy** — Render pdf.js TextLayer on top of each page canvas (invisible positioned
  spans) so native browser text selection and copy work without re-rendering. — M — pdf.js
  TextLayerBuilder
- **Annotation overlay display** — Use pdf.js AnnotationLayer to render existing PDF annotations
  (highlights, notes, links) as interactive HTML overlays on each page image. — M — pdf.js
  AnnotationLayerBuilder
- **Two-page spread improvements** — Already exists as a CSS toggle; add a cover-page offset option
  (first page alone, then pairs). — S
- **Page zoom controls** — Expose the `pdfScale` setting as inline +/− buttons in the toolbar
  (currently only in Settings). Store last-used zoom in localStorage per file fingerprint. — S
- **Outline / TOC sidebar** — Parse `doc.getOutline()` and render a collapsible tree; clicking an
  entry jumps to the matching page. — M — pdf.js
- **Reading progress persistence** — Save current scroll position and visible page number via
  core/persistence.js (already used by EPUB). Resume on re-open. — S

## In-browser editing (download-on-save)

All edits produce a new PDF downloaded as a blob URL; no server round-trip.

- **Annotation layer — text boxes** — After rasterizing a page to canvas, let the user place
  draggable text boxes via contenteditable divs; on "Apply", use pdf-lib to draw the text at the
  mapped PDF-space coordinates and rebuild. — L — pdf-lib (already loaded in edit mode)
- **Annotation layer — highlights** — Let user drag a selection rectangle over the page image;
  translate pixel coords back to PDF-space using page viewport, then draw a semi-transparent
  colored rectangle via pdf-lib `page.drawRectangle`. — L — pdf-lib
- **Annotation layer — freehand draw / shapes** — Canvas overlay per page; Fabric.js for object
  model (rect, ellipse, arrow, freehand). On save, serialize Fabric objects to pdf-lib draw calls
  (drawRectangle, drawEllipse, drawLine, drawSvgPath). — L — Fabric.js 5.x + pdf-lib
- **Sticky note / comment pins** — Click on a page to drop a numbered pin; type comment in a
  popover. Embed via pdf-lib as a text annotation (pdf-lib `doc.context.obj` + Annots array). — L
  — pdf-lib
- **Form filling** — When pdf.js reports AcroForm fields, render html inputs/selects overlaid on
  the canvas at matching bounding boxes; on download, write values into the AcroForm via pdf-lib
  `form.getTextField / getCheckBox / getDropdown`. — L — pdf-lib (already ships AcroForm API)
- **Signature pad** — Modal with a canvas-based signature pad (signature_pad.js or Fabric.js);
  export signature as PNG bytes, then embed via pdf-lib addImage + drawImage at user-chosen
  position (drag-to-place overlay). — M — signature_pad.js (~5 KB) + pdf-lib
- **Redaction (black-out)** — Let user draw rectangles on a page; rebuild with pdf-lib drawing
  solid black rectangles over those coordinates. True redaction requires re-rasterizing the page to
  strip the underlying text stream — currently not feasible without server; visual-only black
  rectangles are achievable in-browser. — M — pdf-lib
- **Page background color / white-out** — Draw a filled rectangle on a page before other content
  (useful for marking drafts). — S — pdf-lib
- **Crop page** — Show a drag-handle crop rectangle on the page image; write the new MediaBox /
  CropBox via pdf-lib `page.setMediaBox`. Does not delete content — PDF viewers honour the box. — M
  — pdf-lib
- **Insert blank page** — Add a blank page (A4 or matching current page size) at any position in
  the order array. — S — pdf-lib (already exists as addImage path)
- **Header / footer stamp** — Modal to configure text (with {{page}}, {{total}}, {{filename}} vars),
  font size, position (top/bottom, left/center/right); apply to all pages via pdf-lib drawText in a
  loop. — M — pdf-lib

## Full write-back editing (companion required)

Companion = Tauri + Axum local server (planned, not yet built).

- **Auto-save edited PDF** — On each "apply" action write the rebuilt bytes back to the original
  file path via companion write-back endpoint instead of (or alongside) the download blob. — M
- **OCR + searchable PDF** — Send page image bytes to companion; companion runs Tesseract-WASM or
  system Tesseract, returns hOCR; embed as invisible text layer via pdf-lib. Enables copy + real
  search. — L — Tesseract.js (client) or system Tesseract (companion)
- **True redaction** — Companion re-renders each page to image (poppler / pdfium), paints over
  redacted boxes, re-embeds; strips underlying stream. Not achievable safely in pure JS. — L

## Shared toolbar / modular note

The edit toolbar is built inline in renderer.js. When annotation tools (text, highlight, draw) are
added they should live in a separate `pdfannotate.js` module alongside `pdfedit.js`, keeping
renderer.js as a thin coordinator. Each annotation tool needs a per-page overlay `<canvas>` sized
and positioned over the page `<img>` via absolute CSS; the PDF-space coordinate transform is:
`pdfX = pixelX / (canvas.width / page.getViewport({scale}).width)`.
