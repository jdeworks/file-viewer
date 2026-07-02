# PDF

> Full PDF rendering via pdf.js with page-level editing, page extraction/splitting, watermarking, merge, and re-download via pdf-lib.

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
| Rich preview | ✅ | pdf.js rasterizes up to 50 pages at configurable scale (1×, 1.5×, 2×, 3×) |
| Multi-page navigation | ✅ | Continuous scroll, single-page mode, keyboard/touch page navigation, and two-page spread mode |
| Text layer | ❌ | Pages are rendered as images; selectable text is not layered into the preview |
| Metadata | ✅ | Title, author, subject, creator, page count, PDF version |
| Encrypted PDFs | ⚠️ Partial | Password prompt unlocks supported encrypted PDFs; editing may still be unavailable |
| Diff/compare | ❌ | Binary format; structural diff not available |

### Edit
| Feature | Status | Details |
|---------|--------|---------|
| Rotate pages | ✅ | 90° CW/CCW per page |
| Delete pages | ✅ | Remove individual pages, re-download remainder |
| Reorder pages | ✅ | Move page up/down with page controls |
| Insert image as page | ✅ | Add PNG/JPEG as a new A4 page |
| Merge PDFs | ✅ | Load second PDF and merge pages |
| Watermark | ✅ | Add or clear diagonal text watermark across pages |
| Extract pages | ✅ | Download a selected page range as a new PDF |
| Split PDF | ✅ | Download one or more page ranges, zipped when needed |
| Annotation / free text | ❌ | General annotations and positioned text stamps are not implemented |
| Form fill | ❌ | PDF form fields not supported |

### Export
| Feature | Status | Details |
|---------|--------|---------|
| Download original | ✅ | Always available |
| Download edited PDF | ✅ | pdf-lib re-assembles modified pages, rotations, insertions, merges, and watermarks |
| Extract text / images export menu | ✅ | Export menu offers "Extract text (.txt)" and "Export pages as PNG images" (zipped) |
| Save as PDF | ❌ | Edited PDFs download from the preview; Companion write-back is not wired for PDF edits |

## Example Files
- [`sample.pdf`](../examples/sample.pdf) — basic PDF document
- [`sample-pages.pdf`](../examples/sample-pages.pdf) — multi-page PDF

## Gaps / Planned Improvements
| Feature | Priority | Notes |
|---------|----------|-------|
| Annotation / highlight | High | Text highlight, sticky note, freehand draw on pages |
| Form field fill | High | PDF AcroForm fields — fill in values, download |
| Table extraction | Medium | Detect and export tables as CSV |
| OCR support | Low | Run Tesseract.wasm on scanned pages |
