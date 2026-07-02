# ODF — OpenDocument Format

> LibreOffice's open-standard documents — rendered ODT text documents and ODP presentations from `content.xml`.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.odt`, `.odp`, `.fodt`, `.fodp` |
| MIME type | `application/vnd.oasis.opendocument.text` (ODT); `application/vnd.oasis.opendocument.presentation` (ODP) |
| Binary / Text | Binary (ZIP + XML) |
| Created by | OASIS / LibreOffice Foundation |
| Common use | LibreOffice and OpenOffice documents; open-standard alternative to DOCX/XLSX/PPTX |
| Spec / Docs | [OASIS ODF spec](https://docs.oasis-open.org/office/OpenDocument/v1.3/OpenDocument-v1.3-part1-introduction.html) |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Text document rendering | ✅ | Paragraphs, headings, tables, lists, links, and inline images (ODT) |
| Spreadsheet table rendering | ❌ | `.ods` is not claimed by this ODF renderer |
| Presentation slide rendering | ✅ | ODP slides render as one block per `draw:page` |
| Metadata extraction | ✅ | Kind, title, creator, language, generator, dates, counts, tables, images |
| Complex formatting (macros, charts) | ⚠️ Partial | Best-effort XML-to-HTML conversion; charts/transitions are not interpreted |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Raw XML editing | ❌ | ODF preview is read-only |
| Visual editing | ❌ | No WYSIWYG editor |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known-File Enhancement

No known-file plugin — all ODF subtypes use the same content renderer.

## Real-World Examples

- [`sample.odt`](../examples/sample.odt) — text document demonstrating paragraph and table rendering

## Known Limitations

- ODS spreadsheets, ODG drawings, and formula-only `.odf` files are not handled by this renderer
- ODP slide transitions and animations are not played
- Font substitution may cause layout differences from LibreOffice
- Macros (Basic/Python) are not executed

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| ODS / ODG support | Med | Med | Add spreadsheet/drawing routing or delegate to specialized renderers |
| ODP slide transitions | Med | Hard | Requires CSS/JS animation mapping |
| ODS chart rendering | Med | Hard | Charts stored as Draw objects; need SVG rendering |
| Better font substitution | Low | Med | Use CSS font-face or Google Fonts matching |
