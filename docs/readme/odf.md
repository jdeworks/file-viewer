# ODF — OpenDocument Format

> LibreOffice's open-standard documents — rendered text, spreadsheet tables, and presentation slides with raw XML access.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.odt`, `.ods`, `.odp`, `.odg`, `.odf` |
| MIME type | `application/vnd.oasis.opendocument.text` (ODT); `application/vnd.oasis.opendocument.spreadsheet` (ODS); `application/vnd.oasis.opendocument.presentation` (ODP) |
| Binary / Text | Binary (ZIP + XML) |
| Created by | OASIS / LibreOffice Foundation |
| Common use | LibreOffice and OpenOffice documents; open-standard alternative to DOCX/XLSX/PPTX |
| Spec / Docs | [OASIS ODF spec](https://docs.oasis-open.org/office/OpenDocument/v1.3/OpenDocument-v1.3-part1-introduction.html) |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Text document rendering | ✅ | Paragraphs, headings, tables, lists (ODT) |
| Spreadsheet table rendering | ✅ | Rows, columns, cell values (ODS) |
| Presentation slide rendering | ✅ | Slide content and layout (ODP) |
| Metadata extraction | ✅ | Title, author, creation date from `meta.xml` |
| Complex formatting (macros, charts) | ⚠️ Partial | Best-effort; embedded charts shown as placeholders |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Raw XML editing | ✅ | Internal XML parts editable via archive tree |
| Visual editing | ❌ | No WYSIWYG editor |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known-File Enhancement

No known-file plugin — all ODF subtypes use the same content renderer.

## Real-World Examples

- [`sample.odt`](../examples/sample.odt) — text document demonstrating paragraph and table rendering
- [`sample.ods`](../examples/sample.ods) — spreadsheet demonstrating table cell display

## Known Limitations

- ODS pivot tables and named ranges are not rendered
- ODP slide transitions and animations are not played
- Font substitution may cause layout differences from LibreOffice
- Macros (Basic/Python) are not executed

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| ODP slide transitions | Med | Hard | Requires CSS/JS animation mapping |
| ODS chart rendering | Med | Hard | Charts stored as Draw objects; need SVG rendering |
| Better font substitution | Low | Med | Use CSS font-face or Google Fonts matching |
