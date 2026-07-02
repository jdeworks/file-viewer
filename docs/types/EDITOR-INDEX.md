# Editor Feature Index

Quick reference across all EDITOR.md files. Pick tasks top-down within each
priority section. Effort labels: **S** = small (hours), **M** = medium (days),
**L** = large (week+).

> **Staleness note (2026-07-02):** this is a planning snapshot, not a live status
> board — items get checked off in `docs/types/**/EDITOR.md` / shipped in code
> without always being removed here. Before starting an item, verify it isn't
> already done (grep the type's `renderer.js` / `exports.js`, or check
> `docs/readme/<type>.md` and `docs/readme/MATRIX.md`). The former "Quick wins"
> table below was found to be **100% shipped** and has been removed accordingly.

---

## Quick wins (S effort) — all shipped

The original ten-item quick-wins list (Code Monaco edit mode, Image BMP/GIF in
`EDITABLE_MIME`, SQLite query history/EXPLAIN/CSV+JSON export, PDF inline zoom
buttons, OFX/QIF CSV export, vCard QR codes, ABC score PNG export) has all
shipped:

- Code Monaco edit mode + Ctrl+S download: generic `docs/core/editor-mode.js`
  (`applyEditorMode`), wired in `docs/core/rawpane.js`.
- Image BMP/GIF editing: `EDITABLE_MIME` in `docs/types/image/renderer.js`
  already includes `image/bmp` and `image/gif`.
- SQLite history / EXPLAIN QUERY PLAN / CSV+JSON export:
  `docs/types/sqlite/renderer.js` (`historyLoad`/`historySave`, `.sq-explain`,
  `exportCsv`/`exportJson`).
- PDF inline zoom buttons: `.pdf-zoom-in`/`.pdf-zoom-out` in
  `docs/types/pdf/renderer.js`.
- OFX / QIF CSV export: `docs/types/text/ofx/exports.js`,
  `docs/types/text/qif/exports.js`.
- vCard QR code: `docs/types/vcard/renderer.js` (`.vcf-qr-btn`, lazy
  `qrcodejs`).
- ABC score PNG export: `docs/types/text/abc/renderer.js`
  (`.abc-export-png`, `canvas.toBlob(...,'image/png')`).

Pick the next batch of quick wins from the per-type `EDITOR.md` files directly.

---

## Image

**PNG / JPG / WebP / BMP / GIF / AVIF / TIFF / HEIF · ICO · SVG · Procreate · Sketch · ORA · PSD/XCF/KRA**

File: `docs/types/image/EDITOR.md`

| Sub-type | Top 3 planned features |
|----------|------------------------|
| Raster (PNG/JPG/WebP) | Shape tools (rect/ellipse/line/arrow) — M; Color adjustments panel (levels, curves, hue) — M per item; Layers panel via Konva.js — L |
| BMP / GIF | Add to `EDITABLE_MIME` for free toolbar — S; GIF frame strip + delay table — M |
| TIFF | Cross-browser pixel decode via UTIF.js → shared raster editor — M |
| HEIF | EXIF panel from existing libheif bytes (no new lib) — S |
| ICO | Per-size PNG download button — S; ICO composer (JS-only, ~150 lines) — M |
| SVG | Element tree panel (click to select in Monaco) — M; Path node drag editor — L |
| Procreate | Canvas size/layer count via bplist-parser — M |
| ORA | Re-composite from layer PNGs + ORA re-export via JSZip — M |
| PSD/XCF/KRA | PSD layer save via ag-psd `writePsd()` — L |

**Shared toolbar note:** All raster types route through `renderer.js` via `EDITABLE_MIME`. Sub-renderers should decode to a canvas/blob and re-enter the main flow. SVG stays text-based and separate. `ctx.onBinaryEdit` is the companion write-back hook — already wired in every destructive op.

---

## Media

**Audio (MP3/FLAC/AAC/OGG/WAV) · Video (MP4/MKV/WebM/AVI/MOV)**

File: `docs/types/media/EDITOR.md`

| Sub-type | Top 3 planned features |
|----------|------------------------|
| Audio | Full waveform decode via OffscreenCanvas + Worker — M; Drag-select trim region on waveform — M; 3-band EQ via Web Audio BiquadFilterNode (real-time, no lib) — M |
| Audio editing | Multi-track mixer (`mixer.js`, 3 lanes, Konva-free, canvas draw) — L; Export WAV (hand-written header, no lib) — S; ffmpeg fade-in/out (already have infra) — S |
| Video | Frame-step buttons (`currentTime += 1/fps`) — S; Picture-in-picture (`requestPictureInPicture`) — S; Speed presets (0.5×–2×) — S |
| Video editing | Trim with visual dual-handle range on thumbnail strip — M; Add music/audio track (two-lane canvas timeline) — M; Subtitle burn-in via ffmpeg subtitles filter — M |

**Shared toolbar note:** `mixer.js` lazy-imported behind `enableMixer` flag; reuses `waveform.js` `connectGain` for per-lane gain. Two-lane video timeline is a simpler subset of the audio mixer.

---

## Office

**DOCX · XLSX · PPTX · ODF (.odt/.odp) · iWork (.pages/.numbers/.keynote)**

File: `docs/types/office/EDITOR.md`

| Sub-type | Top 3 planned features |
|----------|------------------------|
| DOCX | Rich text editor via TipTap → html-docx-js serializer — M; Table insert/edit (TipTap Table extension) — M; Inline comment display (`w:comment` nodes) — M |
| XLSX | Cell editing via Handsontable CE or custom grid + SheetJS delta export — M; Formula bar (raw formula input) — S (after grid); Formula evaluation via HyperFormula — M |
| PPTX | Speaker notes panel — M; Slide-to-PNG export — S; Annotation layer via Fabric.js/Konva.js — M |
| ODF | Rich text editor (same TipTap instance as DOCX) + re-zip via JSZip — M; Tracked-changes overlay — M; ODP annotation layer — M |
| iWork | Better thumbnail fallback (try multiple paths) — S; Text-only TXT export — S; PDF export via print — S |

**Shared toolbar note:** DOCX and ODF share one TipTap instance and `docs/core/rich-toolbar.js`. Separate modules: `table-toolbar.js`, `annotation-toolbar.js` (PPTX/ODP), `spreadsheet-toolbar.js`. All optional imports so the read-only viewer pays zero cost.

---

## Documents

**PDF · Markdown · HTML · EPUB/MOBI/FB2/DJVU/CBZ (Ebook)**

| Type | Top 3 planned features | File |
|------|------------------------|------|
| PDF | Text search via `getTextContent()` — M; Signature pad + pdf-lib embed — M; Header/footer stamp with `{{page}}` vars — M | `pdf/EDITOR.md` |
| Markdown | Mermaid diagram rendering (lazy-load mermaid.js) — M; Math rendering via KaTeX — M; Table editor UI (grid overlay serializes back to pipe syntax) — M | `markdown/EDITOR.md` |
| HTML | Source/preview split view (Monaco + sandboxed iframe) — M; Responsive breakpoint preview buttons — S; WYSIWYG toolbar row (bold/italic/headings/lists) — S | `html/EDITOR.md` |
| EPUB | Cover page display — S; Chapter content edit (contenteditable → JSZip repack) — L; Chapter metadata edit via OPF form — M | `ebook/EDITOR.md` |
| CBZ | Delete pages (checkbox + JSZip) — S; Add pages (file-picker + JSZip) — S; Reorder pages (drag-and-drop + JSZip) — M | `ebook/EDITOR.md` |
| MOBI/FB2 | Reading progress persistence via core/persistence.js — S; FB2 metadata edit form — M | `ebook/EDITOR.md` |

---

## Data

**CSV · JSON · SQLite · ZIP · Archive (7z/RAR/TAR)**

| Type | Top 3 planned features | File |
|------|------------------------|------|
| CSV | Column statistics panel (count/min/max/mean/sparkline) — M; Export to XLSX via SheetJS — M; Freeze header row + column resize in TableEditor — M | `text/csv/EDITOR.md` |
| JSON | JSONPath filter input — S; Schema validation overlay via ajv — M; Add/edit/delete tree nodes with inline popover — L | `text/json/EDITOR.md` |
| SQLite | Inline row editor (click-to-edit, type-aware inputs) — M; Add-row form from `PRAGMA table_info` — M; Full Monaco SQL editor (replace single-line input) — M | `sqlite/EDITOR.md` |
| ZIP | Recursive folder tree view — M; Delete files + repack (JSZip already vendored) — M; Add files via drag-and-drop — M | `zip/EDITOR.md` |
| Archive | Entry preview on click (libarchive.wasm → type pipeline) — M; File search/filter input — S; Delete entries + repack as ZIP — L | `archive/EDITOR.md` |

---

## Code

**Generic source code · Jupyter Notebook (.ipynb) · Docker/Dockerfile · YAML · TOML · INI · JSON (see Data) · Protobuf · various**

| Type | Top 3 planned features | File |
|------|------------------------|------|
| Code | Monaco edit mode (readOnly: false) + Ctrl+S download — S; Prettier WASM format button — M; Codelens complexity badges via existing `codelens.js` — M | `text/code/EDITOR.md` |
| Jupyter (.ipynb) | Cell source editing via Monaco (switch to parentNode mode) — M; Add/delete/reorder cells — M; Execute cells via Pyodide in a Worker — L | `ipynb/EDITOR.md` |
| Dockerfile/docker-compose | Monaco edit mode is universal; format/lint via hadolint WASM (if available) — M | `text/dockerfile/EDITOR.md` |

---

## Science

**FITS · GFF/GTF · CIF/mmCIF · PDB**

| Type | Top 3 planned features | File |
|------|------------------------|------|
| FITS | Image rendering (grayscale canvas, BITPIX decode) — S; Stretch modes (linear/log/sqrt LUT) — S; Colormap selector (viridis/plasma/heat) — S | `text/fits/EDITOR.md` |
| GFF/GTF | Genome browser canvas (features as horizontal bars with strand arrows) — M; Filter by feature type (checkboxes) — S; Attribute tooltip on hover — S | `text/gff/EDITOR.md` |
| CIF/mmCIF | 3D structure viewer via 3Dmol.js (shared with PDB) — L; Loop_ table browser (collapsible per block) — M; Space group info card (static 230-entry lookup) — S | `text/cif/EDITOR.md` |
| PDB | 3D viewer via 3Dmol.js (blocking dep for all PDB features) — L; Color by chain/B-factor — S (after 3Dmol); Sequence strip with click-to-zoom — M | `text/pdb/EDITOR.md` |

**Note:** 3Dmol.js (~1.5 MB) is shared between PDB and CIF — vendor once at `docs/vendor/3dmol/3dmol-min.js`.

---

## Music

**ABC · MusicXML · Guitar Pro · ALS (Ableton Live)**

| Type | Top 3 planned features | File |
|------|------------------------|------|
| ABC | Score rendering via abcjs (~500 KB) — M; MIDI playback (bundled with abcjs) — M; Monaco split-pane live preview — M | `text/abc/EDITOR.md` |
| MusicXML | Score rendering via OSMD (~1.5 MB) — L; MIDI playback via osmd-audio-player — M; Transpose view (in-memory DOM transform, no lib) — M | `text/musicxml/EDITOR.md` |
| Guitar Pro | Score + tablature via alphaTab (~2 MB) — L; MIDI playback via AlphaSynth (bundled) — M; Tuning change editor (GPX only, JSZip repack) — M | `text/guitar-pro/EDITOR.md` |
| ALS | Edit BPM / time signature via `CompressionStream` round-trip (no lib) — M; Rename tracks — M; Toggle track mute/solo — S | `text/als/EDITOR.md` |

---

## Finance

**OFX/QFX · QIF · MT940**

| Type | Top 3 planned features | File |
|------|------------------------|------|
| OFX | Running balance line chart (Chart.js pre-bundle) — S; Date range filter — S; Add/edit memo per transaction (string-replace, no lib) — M | `text/ofx/EDITOR.md` |
| QIF | Running balance chart — S; Full paginated/sorted transaction table — M; Categorize transactions + export CSV — M | `text/qif/EDITOR.md` |
| MT940 | Field `:86:` narrative display — S; IBAN MOD-97 validator badge (pure JS) — S; Edit `:86:` narrative + re-export MT940 — M | `text/mt940/EDITOR.md` |

---

## Email / Calendar

**EML · MBOX · ICS · vCard**

| Type | Top 3 planned features | File |
|------|------------------------|------|
| EML | Full header inspector (collapsible `<details>`) — S; Authentication badges (DKIM/SPF/DMARC string parsing, no DNS) — M; Reply/forward composer → .eml blob download — M | `eml/EDITOR.md` |
| MBOX | Click-to-expand via EML renderer — S; Search/filter bar (debounced, client-side) — S; Delete messages + export reduced .mbox — M | `mbox/EDITOR.md` |
| ICS | Event detail modal — S; Monthly/weekly grid via FullCalendar (~200 KB pre-bundle) — M; Add/edit/delete events + RFC 5545 serializer (`ics-write.js`) — L | `ics/EDITOR.md` |
| vCard | QR code per card (qrcode.js ~20 KB) — S; Photo display (extend vcardlib.js to retain base64) — M; Inline field editing + `vcf-write.js` serializer — M | `vcard/EDITOR.md` |

---

## Database

**SQLite** (see also Data section above)

File: `docs/types/sqlite/EDITOR.md`

ER diagram via vis-network or d3-force — M; Schema browser (expand table to show columns/indices) — S; Inline row editor + add-row form (shared `RowEditor` widget) — M.

---

## Special

**3D Models · Geo · Font · Emulator · Binary/Hex · Archive**

| Type | Top 3 planned features | File |
|------|------------------------|------|
| 3D | Wireframe overlay toggle (thin `ctx.stroke()` after fill pass) — S; Export format matrix (STL/OBJ/PLY buttons, already have `mesh-export.js`) — S; 3MF interactive 3D render (parse `<mesh>`, hand to `mountMeshView()`) — M | `3d/EDITOR.md` |
| Geo | Feature hover tooltip (SVG `data-props` + floating div) — M; KML parser (`parseKml()` via DOMParser) — M; Export as GeoJSON (always available once in-memory edits land) — S | `geo/EDITOR.md` |
| Font | Glyph table browser via opentype.js (~200 KB, one-time vendor) — M; Variable font axis sliders (`fvar` → `font-variation-settings`) — M; Glyph outline export as SVG — S | `font/EDITOR.md` |
| Emulator | Save/load state buttons (EmulatorJS / v86 API) — M; Cheat code entry (regex validation per platform) — S; ROM hex editor (shared `core/hex-editor.js`) — M | `emulator/EDITOR.md` |
| Binary/Hex | Virtual-scroll hex view (fixed-row DOM recycling, 16 B/row) — L; Jump-to-offset input (decimal or `0x`) — S; Byte frequency histogram (256-bucket canvas bar chart) — M | `binary/EDITOR.md` |

---

## Heavy lifts (L effort)

Items that require Pyodide, ffmpeg.wasm, or companion before they can ship.

### Requires ffmpeg.wasm (~23 MB, already opt-in)

| Type | Item |
|------|------|
| Audio | Multi-track mixer with canvas lanes — L |
| Video | Trim + visual dual-handle range UI — M (infra present) |
| Video | Subtitle burn-in via `ffmpeg -vf subtitles` — M |
| Audio | Fade in/out via `-af afade` — S (args only, infra present) |

### Requires Pyodide (~15 MB WASM, opt-in like `enableArchiveWasm`)

| Type | Item |
|------|------|
| Jupyter | Execute cells via Pyodide Worker (pure Python only; gate behind `enablePyodide`) |
| Jupyter | Run all cells + save outputs — depends on Pyodide + companion |

### Requires Tauri + Axum companion (planned, not yet built)

| Type | Item |
|------|------|
| All | Auto-save on edit — currently every type uses blob download |
| Image | TIFF round-trip save (UTIF encode) |
| Image | PSD layer save via ag-psd `writePsd()` |
| PDF | OCR + searchable PDF (Tesseract) |
| PDF | True redaction (poppler page re-render) |
| DOCX/ODF | Live co-cursor via Yjs CRDT |
| SQLite | Save in place; live file watch |
| Markdown | Wiki-link resolution (companion reads directory) |
| MBOX | In-place message delete without full re-export |
| GFF | Feature drag-to-resize (canvas → coordinate write-back) |
| 3D | Vertex editing (ray-cast unproject + file write) |

### Requires large rendering library (vendor first)

| Type | Lib | Size | Items gated on it |
|------|-----|------|-------------------|
| Guitar Pro | alphaTab | ~2 MB + SoundFont | Score render, MIDI playback, loop region |
| MusicXML | OSMD | ~1.5 MB | Score render, part mute/solo |
| PDB | 3Dmol.js | ~1.5 MB | All 3D features; also used by CIF |
| 3D (layers) | Konva.js | ~480 KB | Layers panel for raster editor |
| ICS | FullCalendar | ~200 KB | Monthly/weekly grid |
| HTML | TipTap | ~100 KB | Replace execCommand WYSIWYG |
| DOCX/ODF | TipTap + html-docx-js | ~150 KB | Full rich-text editing |

---

## Shared infrastructure

### Intermediate editor layer (WYSIWYG → format serializer)

The intended pattern (documented in `office/EDITOR.md`) applies across DOCX, ODF,
HTML, RTF, and Markdown:

```
File bytes → per-format parser → ProseMirror/TipTap JSON AST
                                      │
                              Single TipTap editor instance
                                      │
                         Delta buffer (mutate in memory, no per-keystroke serialize)
                                      │
                              Export trigger → per-format serializer → blob download
```

Proposed shared module: `docs/core/rich-toolbar.js` — bold, italic, underline,
headings, lists, indent, undo/redo, find/replace. Format differences live entirely
in the parser and serializer; the editor surface and toolbar are identical.

- RTF already has a working proof-of-concept in `rawpane.js`.
- DOCX serializer: html-docx-js (MIT) or docx.js (MIT).
- ODF serializer: XMLSerializer + JSZip re-zip (JSZip already vendored).
- HTML: `innerHTML` → source sync (two-pane; desync on invalid HTML is
  acceptable).
- Markdown: EasyMDE/Milkdown sits alongside this flow rather than using TipTap
  (Markdown has its own editor path in `wysiwyg.js`).

### Shared toolbar component — image types

`renderer.js` already enforces a single toolbar for all raster types via the
`EDITABLE_MIME` set. Extension path:

1. Add TIFF (after UTIF decode), BMP, GIF to `EDITABLE_MIME`. Each sub-renderer
   decodes to canvas/blob and re-enters the main flow.
2. SVG stays separate (`svg/renderer.js` edits text, not pixels); shares CSS
   custom properties and `exports.js`.
3. ICO, Procreate, Sketch remain sub-renderers with their own toolbar slices.
4. Konva.js layers panel → `docs/types/image/layers.js`, lazy-imported by
   `renderer.js`. Keeps initial bundle small.
5. `ctx.onBinaryEdit` is the companion write-back extension point — already wired
   in every destructive operation; no toolbar changes needed when companion ships.

### Shared table grid widget

Three types independently display and edit tabular row data:

| Type | Current state |
|------|---------------|
| CSV | `table-editor.js` (~6 KB, contenteditable cells, Tab/Enter nav) |
| SQLite | Static `<table>` (read-only); inline row editor planned |
| OFX / QIF / MT940 | Static transaction tables; memo editing planned |

These should converge on a single `RowEditor` widget (interface: `{columns,
rows, onCellChange, onRowAdd, onRowDelete}`). `table-editor.js` is the closest
to done; the SQLite row editor and OFX memo editor should import and extend it
rather than reinventing it. The SheetJS-based XLSX grid (Handsontable CE or
custom) is heavier and separate.

### Web Worker pattern for heavy libs

All libs that block the UI thread must run in a Worker:

| Lib | Size | Worker path |
|-----|------|-------------|
| ffmpeg.wasm | ~23 MB | Already runs in a Worker via `transcoder.js` |
| Pyodide | ~15 MB | `docs/vendor/pyodide/`; SharedWorker so multiple cells share one instance |
| SheetJS (xlsx.full) | ~1 MB | Wrap `XLSX.read` / `XLSX.write` in a Worker for files > 2 MB |
| UTIF.js (TIFF decode) | ~60 KB | Decode in Worker for large multi-page TIFFs; transfer ImageData back via `postMessage` |
| libarchive.wasm | ~1 MB | Already behind `enableArchiveWasm`; extraction is synchronous today — move to Worker for large archives |

Pattern: post `{op, payload}` message; worker responds with `{result}` or
`{error}`. All heavy libs should follow the `enableXxx` opt-in gate and cache
their WASM payload in `caches.open('fv-wasm')` after first load so repeat opens
are instant.
