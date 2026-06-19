# PDF

> Full PDF rendering via pdf.js with page-level editing (rotate, delete, reorder, insert image) and re-download via pdf-lib.

## Format Details
| Field | Value |
|-------|-------|
| Extensions | `.pdf` |
| MIME type | `application/pdf` |
| Binary/Text | Binary |
| Common use | Documents, reports, forms, books, invoices |

## Capabilities

### View
| Feature | Status | Details |
|---------|--------|---------|
| Rich preview | ✅ | pdf.js renders all pages at configurable scale (1×, 1.5×, 2×, 3×) |
| Multi-page navigation | ✅ | Scroll through all pages |
| Text layer | ✅ | Selectable text (where embedded) |
| Metadata | ✅ | Title, author, subject, creator, page count, PDF version |
| Encrypted PDFs | ⚠️ Partial | Listing metadata only; content blocked by encryption |
| Diff/compare | ❌ | Binary format; structural diff not available |

### Edit
| Feature | Status | Details |
|---------|--------|---------|
| Rotate pages | ✅ | 90° CW/CCW per page or all pages |
| Delete pages | ✅ | Remove individual pages, re-download remainder |
| Reorder pages | ✅ | Drag-and-drop page reordering |
| Insert image as page | ✅ | Add PNG/JPEG as a new A4 page |
| Merge PDFs | ✅ | Load second PDF and merge pages |
| Annotation / text stamp | ❌ | Not yet implemented |
| Form fill | ❌ | PDF form fields not supported |

### Export
| Feature | Status | Details |
|---------|--------|---------|
| Download original | ✅ | Always available |
| Download edited PDF | ✅ | pdf-lib re-assembles modified page order/rotation |
| Save as PDF | ✅ | Via Companion local server (optional) |
| Print/save-as-PDF | ✅ | Browser print dialog |

## Example Files
- [`sample.pdf`](../examples/sample.pdf) — basic PDF document
- [`sample-pages.pdf`](../examples/sample-pages.pdf) — multi-page PDF

## Gaps / Planned Improvements
| Feature | Priority | Notes |
|---------|----------|-------|
| Annotation / highlight | High | Text highlight, sticky note, freehand draw on pages |
| Form field fill | High | PDF AcroForm fields — fill in values, download |
| Text extraction | Medium | Copy all text to clipboard or download as .txt |
| Table extraction | Medium | Detect and export tables as CSV |
| OCR support | Low | Run Tesseract.wasm on scanned pages |
| Split PDF | Medium | Split at specified page ranges, download each part |
