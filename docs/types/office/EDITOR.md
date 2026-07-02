# Editor Roadmap — Office Formats (DOCX, XLSX, PPTX, ODF, iWork)

---

## Current state

| Format | Renderer | Library | Write support |
|--------|----------|---------|---------------|
| DOCX | mammoth.js → sanitized HTML → **editable parent pane** (read-only view + TipTap "Edit" toggle) | mammoth + TipTap + DOMPurify (vendored) | **EDIT → .docx export** (HTML-faithful, `docx/editor.js` → `core/docx-export.js`) |
| XLSX | SheetJS → **editable grid in the parent pane** (per-sheet tabs, contentEditable cells, delta buffer) | SheetJS xlsx.full.min (vendored) | **EDIT → .xlsx write-back** (`xlsx/editor.js`, `XLSX.write`; untouched sheets preserved) |
| PPTX | pptx-preview renders each slide to canvas → PNG dataURL (cap 50 slides) | pptxviewjs + Chart.js + JSZip (vendored) | none (deferred — no faithful slide-layout writer) |
| ODF (.odt/.odp) | JSZip → content.xml → custom XML walker (headings, lists, tables, images, ODP slides) → sanitized HTML; pictures inlined as data: URLs | JSZip + DOMPurify (vendored) | none |
| iWork (.pages/.numbers/.key) | JSZip thumbnail (multi-path fallback) + Snappy/IWA protobuf text extraction (scans Document.iwa + up to 3 more IWA files, dedup-filtered, word count); Thumbnail / Text-content tab UI | JSZip + SnappyJS (vendored) | none (proprietary) |

DOCX/XLSX now render in the parent pane (`{ parentNode }`) as interactive editors;
PPTX/ODF/iWork remain read-only (iframe or parent DOM). All libs run in the parent
(trusted, parse-only). Security model: zero off-origin at runtime; all vendor libs
pre-bundled.

**XLSX edit→write flow:** `xlsx/editor.js` renders each sheet as a `contentEditable`
grid; edits accumulate in a per-sheet delta `Map("r,c" → value)` (no re-serialize per
keystroke). "Download edited .xlsx" coerces edited strings (number/bool/text), patches
the cells back onto the originally-parsed worksheet objects, and `XLSX.write`s a fresh
.xlsx — sheets the user never touched are carried through unchanged. Cap: 2000×200
editable cells/sheet (larger sheets are shown truncated, with a note).

**DOCX edit→export flow:** mammoth → sanitized HTML (read-only view); an "Edit" toggle
mounts TipTap (ProseMirror) over that HTML. "Download .docx" serializes the edited HTML
via `core/docx-export.js` (minimal-OOXML writer, JSZip — no heavy writer lib).
**Fidelity:** this is an HTML-faithful round-trip, NOT byte-level. mammoth drops page
geometry/fonts/footnotes/comments/complex numbering on the way in; the exporter re-emits
text, headings (bold+sized runs), bold/italic, list items (bulleted) and table *text*
as fresh OOXML. Real Word tables/styles are not reconstructed. A note in the UI states
this. The same writer also backs the generic "Download as Word".

**Metadata:** DOCX (already rich: title/author/created/modified/word+char count/app);
XLSX gains per-sheet size (rows×cols), defined names (named ranges), and application;
PPTX surfaces slide count + author. All read from docProps/core.xml + app.xml (or
SheetJS `wb.Props`/`wb.Workbook.Names`).

**Shipped beyond the table:** XLSX still exposes an Export menu (`loadExports`) for CSV /
JSON / all-sheets-JSON (`xlsx/exports.js`). DOCX/XLSX dropped the `screenshot` capability
(parent-pane editors are not static sanitized bodies — same as the PDF editor).

**Deferred — PPTX editing:** out of scope. Faithful PPTX write-back needs slide-layout /
shape-geometry reconstruction (placeholders, masters, theme), which neither pptxviewjs nor
any lightweight vendored writer provides; an HTML→PPTX path would lose all layout. Not worth
shipping a low-fidelity result. iWork is proprietary (read-only by design). ODF write-back
(re-zip mutated content.xml) is tractable but lower-value than DOCX/XLSX — left for later.

---

## Architecture: intermediate layer / lazy-conversion pattern

The intended editing architecture decouples the editor from individual serialization formats:

```
File bytes
  └─► Parser (per-format)  ─►  Intermediate AST (HTML or ProseMirror JSON)
                                      │
                              In-browser Editor (TipTap / ProseMirror / grid)
                                      │
                         Delta buffer (accumulate ops, do NOT re-serialize on every keystroke)
                                      │
                              Export trigger (Save / Download)
                                      │
                         Serializer (per-format: docx.js / SheetJS / etc.)
                                      └─► Blob URL download  (or write-back via companion)
```

Key properties of this pattern:

- **Lazy conversion**: the intermediate AST is mutated in memory; re-serialization
  to the native format happens only on explicit export. No round-trip on every
  keystroke.
- **Shared editor surface**: a single ProseMirror / TipTap instance handles DOCX,
  ODF, and RTF (already live for RTF in rawpane.js). Format differences are
  absorbed in the parser and serializer, not the editor.
- **Delta list**: for spreadsheet work, an ordered list of cell-patch operations is
  accumulated; SheetJS re-writes the workbook from the original bytes + patches on
  export, preserving macros and styles that the editor does not touch.
- **Serializer isolation**: html-docx-js / docx.js converts the edited HTML back to
  DOCX; SheetJS writes XLSX; ODF repack re-zips mutated content.xml. Each
  serializer is a separate optional import, loaded only when the user triggers export.

---

## DOCX

### Viewer enhancements (no write-back needed)

- **Style passthrough** — Forward mammoth style-map config to expose heading classes,
  code blocks, and footnote markers in the rendered HTML — S
- **Inline comment display** — Extract `w:comment` nodes from document.xml and render
  as margin annotations beside the relevant paragraph — M
- **Track-changes overlay** — Parse `w:ins` / `w:del` runs from document.xml and render
  additions/deletions in green/red without needing a full editor — M
- **Page break markers** — Detect `w:pageBreak` and insert a visual divider with page
  number in the HTML output — S
- **Footnote / endnote panel** — Render `word/footnotes.xml` content as a collapsible
  section below the article — S

### In-browser editing (download-on-save)

- **Rich text editor** — Feed mammoth HTML into TipTap (ProseMirror-based, MIT) as
  the intermediate AST; serialize back to DOCX with html-docx-js (MIT) or docx.js
  (MIT) on export — M — key libs: **TipTap** (`@tiptap/core`), **html-docx-js** or
  **docx.js**
- **Bold / italic / underline / strikethrough** — TipTap built-in marks; map to
  `w:b`, `w:i`, `w:u`, `w:strike` in serializer — S (once TipTap is wired)
- **Headings (H1–H6)** — TipTap Heading extension; map to `w:style` in serializer — S
- **Ordered and unordered lists** — TipTap List extensions; serialize to `w:numPr` — S
- **Table insert / edit** — TipTap Table extension; serialize via docx.js Table API — M
- **Image insert** — Accept dropped or pasted images; embed as `r:embed` relationships
  in the repacked DOCX — M
- **Find & replace** — ProseMirror `prosemirror-search` or a simple regex scan over
  the text nodes — S
- **Spell-check** — Browser native `contenteditable` spell-check is automatic inside
  TipTap; no extra lib needed — S

### Full write-back editing (companion required)

- **Auto-save on change** — POST delta to companion Axum server; companion writes
  to disk; avoids blob-URL download loop — M
- **Live co-cursor** (stretch) — Yjs CRDT over companion WebSocket for
  same-file multi-tab editing — L

---

## XLSX

### Viewer enhancements (no write-back needed)

- **Column resize** — Drag column borders in the tabular renderer; store widths
  in sessionStorage per file — S
- **Freeze panes** — Read `sheetViews.pane` from SheetJS and render a CSS sticky
  header / first-column — M
- **Merged cell display** — SheetJS exposes `!merges`; apply `colspan`/`rowspan`
  in the HTML table — S
- **Cell type indicators** — Show formula vs. value vs. date with a faint icon
  in the cell — S
- **Conditional formatting preview** — Parse `conditionalFormatting` nodes and apply
  background colors to matching cells — M
- **Chart thumbnails** — Extract chart XML from `xl/charts/` and render a static
  SVG summary using a lightweight chart lib (e.g., Chart.js) — L

### In-browser editing (download-on-save)

- **Cell editing** — Replace the static `<table>` with Handsontable (MIT CE) or a
  minimal custom contenteditable grid; on export, apply accumulated cell patches
  to the original SheetJS workbook and trigger `XLSX.writeFile` — M — key lib:
  **Handsontable** (MIT community edition) or custom grid
- **Formula bar** — Single `<input>` above the grid; shows raw formula (`=SUM(A1:A3)`)
  for selected cell; writes back on Enter — S (once grid is wired)
- **Formula evaluation** — Pipe formula strings through HyperFormula (MIT) for
  live preview before export; SheetJS recalculates on write — M — key lib:
  **HyperFormula**
- **Add / delete rows and columns** — Toolbar buttons; tracked as delta ops
  (`insertRow`, `deleteCol`); applied to the SheetJS workbook on export — S
- **Sheet tab management** — Rename, add, reorder, delete sheets via the tab bar;
  delta tracks `renameSheet`, `addSheet`, `deleteSheet` — S
- **Basic cell formatting** — Bold, font size, fill color via SheetJS cell style
  object (`s.font`, `s.fill`); toolbar with color picker — M
- ✅ SHIPPED (partial) — **CSV / XLSX export choice** — Export button offers XLSX (SheetJS) or CSV
  (plain text) — S. *CSV and JSON export are live via `xlsx/exports.js` (`loadExports`); XLSX
  write-back is not yet wired (would need accumulated cell patches → `XLSX.writeFile`).*

### Full write-back editing (companion required)

- **Auto-save workbook** — Companion receives SheetJS-serialized buffer on each
  export; writes atomically to disk — M
- **Large file streaming** — For files > 5 MB: stream rows to companion rather
  than holding the full workbook in memory — L

---

## PPTX

Full PPTX round-trip editing is not feasible in-browser without a purpose-built
OOXML engine. The realistic scope is an **annotation layer** plus slide export.

### Viewer enhancements (no write-back needed)

- **Slide thumbnail strip** — Render all slides to canvas at low resolution
  and show a scrollable filmstrip sidebar for navigation — M
- **Speaker notes panel** — Extract `p:notes` XML from each slide entry in the
  ZIP and display below the current slide — M
- **Slide counter / progress bar** — Simple "3 / 24 slides" indicator with a
  thin progress bar — S
- **Keyboard navigation** — Arrow keys / PageUp/Down to move between slides — S
- **Full-screen mode** — Expand the slide canvas to viewport with Escape to exit — S

### In-browser editing (download-on-save)

- **Annotation layer** — Render a transparent `<canvas>` overlay on top of the
  slide PNG; allow freehand pen, text boxes, and arrow shapes using Fabric.js (MIT)
  or Konva.js (MIT); export as annotated PNG or PDF — M — key lib: **Fabric.js**
  or **Konva.js**
- **Text-only search** — Extract text runs from slide XML and build a searchable
  index; highlight matches in the rendered slide PNG (draw boxes at inferred
  positions) — M
- **Slide-to-PNG export** — "Download slide" button captures the current canvas
  dataURL and triggers a download — S
- **Deck-to-PDF export** — Render all slides to canvas sequentially and compose a
  multi-page PDF via jsPDF (MIT); download as blob — M — key lib: **jsPDF**
- **Slide reorder** (stretch) — Drag slide thumbnails to reorder; re-pack the ZIP
  with reordered slide XML entries; relies on careful slide-relationship patching — L

### Full write-back editing (companion required)

- **Annotation persistence** — Save Fabric.js annotation JSON to companion alongside
  the original PPTX; load on next open — M
- **Slide delete / duplicate** — Companion mutates the PPTX ZIP and writes to disk — M

---

## ODF (.odt, .odp)

ODF is a well-structured ZIP of XML and is the most round-trip-friendly format
after DOCX, since we already parse content.xml in-house.

### Viewer enhancements (no write-back needed)

- **Text style passthrough** — Read `styles.xml` to apply bold, italic, font size,
  and color from named paragraph styles in content.xml — M
- **Footnote / endnote rendering** — Parse `text:note` elements and render as
  superscript links to a footnotes section — S
- **Table cell borders and alignment** — Read `table-cell-properties` from styles.xml
  and apply inline CSS — S
- **Tracked changes** — Parse `text:tracked-changes` in content.xml; render
  insertions/deletions in color — M

### In-browser editing (download-on-save)

- **Rich text editor** — Parse content.xml to ProseMirror / TipTap JSON using
  the existing `convert()` walker (extended); serialize edited JSON back to ODF
  XML; re-zip with JSZip and download — M — key lib: **TipTap**, **JSZip** (already
  vendored)
- **Bold / italic / underline** — TipTap marks; serialize to `text:span` with
  `fo:font-weight` / `fo:font-style` style attributes — S (once TipTap wired)
- **Headings and lists** — TipTap Heading + List extensions; serialize to
  `text:h` and `text:list` — S
- **Image insert** — Add dropped images to `Pictures/` in the re-zipped ODF;
  update content.xml with a `draw:image` frame — M
- **ODP slide annotation** — Same Fabric.js annotation layer approach as PPTX;
  render per-slide overlays — M — key lib: **Fabric.js**

### Full write-back editing (companion required)

- **Auto-save** — Companion receives the re-zipped ODF buffer and writes to disk — M

---

## iWork (.pages, .numbers, .key)

iWork uses a proprietary Protobuf/IWA binary format (Snappy-compressed). Full
editing is not feasible. Scope is limited to improved extraction and PDF export.

### Viewer enhancements (no write-back needed)

- ✅ SHIPPED (partial) — **Improved text extraction** — Extend the current IWA protobuf walker to scan
  all IWA files in the archive (not just the first 4); deduplicate across
  field IDs to reduce noise — M. *The renderer already scans `Document.iwa` plus up to 3 more IWA
  files and dedup-filters the strings (drops UUIDs/identifiers); the remaining work is scanning
  ALL IWA files, not just the first four, and reporting a word count (word count is already shown).*
- **Table detection** — Heuristically identify repeated-field-number runs in the
  protobuf and render them as an HTML table — L
- **Numbers cell extraction** — .numbers archives contain per-sheet IWA files; walk
  each and reconstruct a row/column grid from numeric fields — L
- ✅ SHIPPED (partial) — **Better thumbnail fallback** — Try `QuickLook/Thumbnail.png`, then any `.jpg`/`.png`
  at the archive root before showing "no thumbnail" — S. *Renderer already tries `preview.jpg`,
  `preview-web.jpg`, `QuickLook/Thumbnail.jpg`, `preview.png` (case-insensitive) before the
  "no thumbnail" message; only the "any image at archive root" final fallback is unshipped.*

### In-browser editing (download-on-save)

Not feasible. The IWA protobuf schema is undocumented and not fully reverse-engineered.
Any write-back would corrupt the file for Pages/Keynote/Numbers.

- **PDF export via print** — "Print / Save as PDF" button that opens the thumbnail
  panel in a print-only layout and relies on the browser's native PDF printer — S
- **Text-only TXT export** — Download the extracted text content as a `.txt` file — S

### Full write-back editing (companion required)

Not planned. Only viable path would be invoking the iWork CLI tools (`pages`, `numbers`)
on macOS via the companion — out of scope for the current companion plan.

---

## Shared toolbar / modular note

The DOCX and ODF editors share the same TipTap instance and toolbar. The RTF editor
in `rawpane.js` is the existing proof-of-concept: it already implements bold, italic,
underline, lists, indent, and undo/redo using `document.execCommand` or a lightweight
equivalent. When the TipTap migration lands, the RTF toolbar and the DOCX/ODF toolbar
should unify into a single `docs/core/rich-toolbar.js` component.

Suggested toolbar module split:

| Module | Contents |
|--------|----------|
| `docs/core/rich-toolbar.js` | Bold, italic, underline, strikethrough, headings, lists, indent, undo/redo, find/replace |
| `docs/core/table-toolbar.js` | Insert table, add/delete row/col, merge cells |
| `docs/core/image-toolbar.js` | Insert image, alt text, resize handle |
| `docs/core/annotation-toolbar.js` | Pen, text box, arrow, color picker, clear — shared by PPTX and ODP annotation layers |
| `docs/core/spreadsheet-toolbar.js` | Formula bar, bold/color/fill, row/col ops, sheet tabs |

All toolbar modules are optional imports; the host renderer loads only the modules it
needs. This keeps the initial parse cost of the read-only viewer at zero.

### Dependency summary

| Lib | License | Formats | Already vendored? |
|-----|---------|---------|-------------------|
| SheetJS (xlsx.full.min) | Apache-2.0 | XLSX, ODS | yes |
| JSZip | MIT | ODF, iWork | yes |
| DOMPurify | Apache-2.0/MPL | DOCX, ODF | yes |
| mammoth.js | BSD-2 | DOCX | yes |
| TipTap / ProseMirror | MIT | DOCX, ODF, RTF | no — add on edit feature |
| html-docx-js | MIT | DOCX export | no |
| docx.js | MIT | DOCX export (richer) | no |
| HyperFormula | GPL-3 (CE) / commercial | XLSX formulas | no — check licence before adding |
| Handsontable CE | MIT | XLSX grid | no |
| Fabric.js | MIT | PPTX/ODP annotation | no |
| jsPDF | MIT | PPTX/ODP PDF export | no |
