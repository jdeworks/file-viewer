# Office Documents

> Word, Excel, PowerPoint, and OpenDocument files previewed client-side — no upload, no server, all in-browser.

## Format Details

| Format | Extensions | MIME type |
|--------|-----------|-----------|
| Word | `.docx`, `.doc` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| Excel | `.xlsx`, `.xls` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| PowerPoint | `.pptx`, `.ppt` | `application/vnd.openxmlformats-officedocument.presentationml.presentation` |
| OpenDocument | `.odt`, `.ods`, `.odp`, `.odg` | `application/vnd.oasis.opendocument.*` |

## Capabilities Matrix

### View — Word (DOCX)
| Capability | Status | Notes |
|------------|--------|-------|
| Document body rendering | ✅ | Via mammoth.js — paragraphs, headings, lists, tables |
| Inline images | ✅ | Embedded images rendered |
| Styles (bold/italic/underline) | ✅ | Basic formatting preserved |
| DOMPurify sanitization | ✅ | Output HTML sanitized before display |
| Source / diff | ❌ | Binary format |
| Comments / tracked changes | ❌ | Not rendered by mammoth |

### View — Excel (XLSX)
| Capability | Status | Notes |
|------------|--------|-------|
| Multi-sheet workbook | ✅ | Sheet tabs; each sheet as a scrollable table |
| First-row-as-header | ✅ | Configurable setting |
| Cell values | ✅ | Numbers, strings, dates |
| Formulas | ⚠️ Partial | Formula text shown; values shown from saved results only |
| Source / diff | ❌ | Binary format |

### View — PowerPoint (PPTX)
| Capability | Status | Notes |
|------------|--------|-------|
| Slide-by-slide rendering | ✅ | Each slide rendered to canvas |
| Render scale | ✅ | 1× / 1.5× / 2× / 3× setting |
| Text and shapes | ✅ | Basic slide content rendered |
| Animations | ❌ | Not replayed |
| Source / diff | ❌ | Binary format |

### View — OpenDocument (ODF)
| Capability | Status | Notes |
|------------|--------|-------|
| Document body rendering | ✅ | ODT text documents rendered |
| Spreadsheet / presentation | ⚠️ Partial | ODS/ODP preview may be limited |
| Source / diff | ❌ | Binary format |

### Export — Excel
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Download first sheet as CSV | ✅ | Via SheetJS |
| Download first sheet as JSON | ✅ | Array-of-objects via SheetJS |
| Download all sheets as JSON | ✅ | Object keyed by sheet name; multi-sheet workbooks |

### Export — Word / PowerPoint / OpenDocument
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Convert to other format | ❌ | Not yet implemented |

## Real-World Examples

- [`sample.docx`](../examples/sample.docx) — example Word document
- [`sample.xlsx`](../examples/sample.xlsx) — example Excel workbook
- [`sample.pptx`](../examples/sample.pptx) — example PowerPoint presentation

## Known Limitations

- Macros (VBA) are never executed — safe by design
- Complex DOCX layouts (columns, text boxes) may not render faithfully
- PPTX slide rendering uses an in-browser PPTX parser, not a full Office renderer

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| DOCX export to HTML | Med | Easy | mammoth already produces HTML — wire to export menu |
| Excel formula calculation | Med | Hard | Requires a full spreadsheet engine |
| Track changes display | Low | Hard | mammoth has partial support |
| PDF export of slide deck | Low | Hard | Requires print layout |
