# Editor Roadmap — Ebook (EPUB / MOBI / FB2 / DJVU / Comic CBZ)

## Current state

Five distinct sub-formats under `docs/types/ebook/`:

**EPUB** — JSZip unpacks the container; epublib.js parses OPF/NCX/XHTML spine. One chapter at a
time in `parentNode` mode (sandboxed iframe cannot reach blob: URLs). DOMPurify sanitization;
resource refs rewritten to in-book blob: URLs so zero off-origin requests. Sidebar TOC, prev/next,
reading prefs (font, size, theme, 1/2-column) persisted globally in localStorage. Per-file chapter
+ scroll position persisted via core/persistence.js.

**MOBI / AZW** — mobilib.js parses PalmDoc/MOBI container; `<img recindex="N">` rewritten to
inline data: URLs. DOMPurify + bodyHtml iframe path. Toolbar for size, font, theme, line,
margin. DRM and HUFF/CDIC compression show a clear error. Read-only.

**FB2** — DOMParser on XML; section nesting → heading levels; `<binary>` elements → data: URLs.
DOMPurify + bodyHtml iframe. CSS-radio-button toolbar (no JS needed for basic prefs). Read-only.

**DJVU** — djvu.js (RussCoder/djvujs) renders pages via canvas through a Blob-URL worker. Page
navigation, zoom, lazy rendering. Read-only.

**Comic / CBZ / CBR / CB7** — comiclib.js: CBZ via JSZip (always), CBR/CB7 via libarchive.wasm
(opt-in `enableArchiveWasm`). Pages natural-sorted; displayed as lazy-loaded images. Spread mode
toggle. Blob URLs revoked on teardown. Read-only.

## Viewer enhancements (no write-back needed)

### All ebook formats
- **TTS read-aloud (browser speech synthesis)** — Button in the toolbar triggers
  `window.speechSynthesis.speak()` on the visible text content (extracted from the current
  chapter / visible DOM). Play/pause, speed control (0.5×–2×), voice selector. No extra lib. — M
- **Highlight & bookmark** — Let the user select text; right-click (or toolbar button) to save
  a highlight with optional note. Persist highlights keyed by file fingerprint + chapter index +
  text range (xpath or offset) in localStorage. Render on load as `<mark>` overlays. — L —
  core/persistence.js (already used)
- **Font size / spacing persistence** — Reader prefs (size, font, theme) already global in EPUB;
  apply the same pattern to MOBI (uses CSS classes) and FB2 (uses radio inputs). Unify into a
  shared `ebook-prefs.js` module. — S

### EPUB
- **Search within book** — On search query, iterate all spine items, parse XHTML, extract text,
  check for match, collect results; display as a list of (chapter title, snippet) links. — L —
  pure JS text scan
- **Inline image zoom** — Click on a cover or illustration to open it full-screen in a lightbox
  (reuse the blob: URL already materialized). — S
- **Cover page display** — Extract `<item properties="cover-image">` from OPF; show it as a hero
  image above the first chapter. — S
- **Two-column reading improvement** — Currently a CSS toggle (`epub-twocol`). Add a wide-screen
  auto-enable option that kicks in above a configurable viewport width (saved in prefs). — S
- **Keyboard shortcuts** — Already have arrow-key chapter navigation; add Page Down / Page Up for
  scrolling, `t` to toggle TOC, `f` to toggle font. — S

### Comic / CBZ
- **Page counter + direct jump** — Show "Page N of M" in the info bar; add a number input or
  slider to jump to any page. — S
- **Keyboard navigation** — Left/Right arrow keys for prev/next page (already in EPUB; add here). — S
- **Zoom / fit modes** — Toggle between fit-width (current), fit-height, and 100% per-page
  display. — S
- **Double-page detection** — Detect landscape-orientation pages (width > height) and
  automatically render them full-width even in spread mode. — S

### DJVU
- **OCR text layer** — djvu.js exposes `getText()` per page; display as a copyable overlay panel
  alongside the canvas render. — M — djvu.js (already loaded)
- **Export current page as PNG** — `canvas.toBlob()` → download. — S

### MOBI / FB2
- **Reading progress persistence** — Save scroll position via core/persistence.js on scroll;
  resume on re-open. MOBI and FB2 render as a single long bodyHtml; fingerprint + scrollTop is
  enough. — S

## In-browser editing (download-on-save)

### EPUB (ZIP of XHTML — editable)
- **Chapter content edit** — After selecting a chapter, switch from read-only mode to an edit mode:
  render the sanitized XHTML chapter in a `contenteditable` div (or TipTap). On save, serialize
  innerHTML back to XHTML, update the zip entry via JSZip, download the new .epub. — L — JSZip
  (already used) + TipTap or contenteditable
- **Chapter metadata edit (OPF)** — Editable form for `<dc:title>`, `<dc:creator>`,
  `<dc:language>`, `<dc:description>` from the OPF manifest. Serialize changes back into the OPF
  XML string, update the zip entry, offer download. — M — JSZip + DOMParser/XMLSerializer
- **NCX / TOC edit** — Edit chapter titles and reorder TOC entries in a drag-sortable list; write
  back to NCX XML and update OPF spine order. — L — JSZip + Sortable.js (~30 KB) or native
  drag-and-drop
- **Add / remove chapters** — Add a blank chapter (new XHTML + OPF manifest item + spine entry);
  delete a chapter (remove from spine, optionally from manifest). — L — JSZip
- **Cover image replace** — Drop a new image; resize to standard cover proportions (2:3) via
  canvas; replace the OPF cover-image entry bytes; download. — M — JSZip + canvas

### Comic / CBZ (ZIP of images — editable)
- **Reorder pages** — Drag-and-drop page thumbnails into a new order; on save, rename files in the
  zip to preserve natural sort, write new CBZ. — M — JSZip + Sortable.js or native drag-and-drop
- **Delete pages** — Checkbox-select pages in the thumbnail grid; Delete button removes them from
  the zip; download new CBZ. — S — JSZip
- **Add pages** — File-picker for images (including multi-select); append to the end of the zip;
  download new CBZ. — S — JSZip
- **Rename / renumber pages** — Auto-renumber all page files to `001.jpg`, `002.jpg`, … for
  natural-sort safety; or let user type a custom prefix. — S — JSZip
- **Convert to CBZ** — If the archive is CBR/CB7 (opened via libarchive.wasm), extract all image
  pages and repack into a new CBZ (plain zip) for download. — M — libarchive.wasm (opt-in) + JSZip

### FB2 (plain XML — editable)
- **Metadata edit form** — Parse `<title-info>` block (author, book-title, genre, annotation,
  coverpage); render as a form; on save, `XMLSerializer.serializeToString()` the modified XML;
  offer download. — M — DOMParser / XMLSerializer
- **Chapter content edit** — Render body sections in a `contenteditable` div; re-serialize to FB2
  XML `<p>` elements on save. Lossy (HTML → FB2 mapping is approximate) but useful for corrections.
  — L

### MOBI / AZW
- Read-only. Re-encoding MOBI is not feasible without a native library (complex Huffman/CDIC
  compression, proprietary DRM handling). Export-to-EPUB via calibre (companion) is the practical
  path.

### DJVU
- Read-only in-browser. Export current page or full doc to PDF via companion (poppler/djvulibre).

## Full write-back editing (companion required)

- **EPUB auto-save** — After any in-browser edit, write the new .epub bytes back to the original
  file path via companion endpoint instead of (or alongside) the blob download. — M
- **MOBI → EPUB conversion** — Companion runs calibre-ebook-convert; result opens in the EPUB
  viewer. Enables editing of MOBI content via the EPUB editor path. — L — calibre (companion)
- **DJVU → PDF export** — Companion runs djvulibre / pdf2djvu; downloads the PDF. — M — djvulibre
- **TTS export (audiobook)** — Companion runs a TTS engine (coqui-tts, espeak, or cloud TTS) over
  each chapter; produces per-chapter MP3s and an M3U playlist; user downloads as a zip. — L

## Shared toolbar / modular note

Each sub-format has its own renderer; they share no toolbar code today. Common reading prefs
(size/font/theme/line/margin) are duplicated across EPUB (JS-driven), MOBI (CSS classes), and FB2
(CSS radio buttons). A shared `ebook-prefs.js` module (mirrors EPUB's approach: JS + localStorage)
would unify this and enable progress persistence for MOBI and FB2 too.

TTS (browser speech synthesis) can be wired identically across all formats via a shared
`ebook-tts.js`: extract visible text → feed to `SpeechSynthesisUtterance` → expose play/pause/seek.
No lib needed.

For CBZ editing, the drag-and-drop reorder UI should be a separate `comic-editor.js` module; it
enters when the user clicks an Edit button (same pattern as PDF). JSZip is already a vendor dep.

EPUB chapter editing is the most complex item here. Prototype with raw `contenteditable` + innerHTML
→ XMLSerializer before committing to TipTap, since the XHTML round-trip is tricky (void elements,
namespaces, existing inline styles).
