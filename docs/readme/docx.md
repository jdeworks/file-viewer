# DOCX — Word Document

> Microsoft Word's Open XML format — rendered document view with headings, tables, lists, inline images, and an HTML-based edit/download flow.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.docx`, `.dotx` |
| MIME type | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| Binary / Text | Binary (ZIP + XML) |
| Created by | Microsoft |
| Common use | Word processing documents, reports, letters |
| Spec / Docs | [OOXML ECMA-376](https://www.ecma-international.org/publications-and-standards/standards/ecma-376/) |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Rendered document | ✅ | Paragraphs, headings, tables, lists |
| Inline images | ✅ | Embedded images extracted and displayed |
| Outline / heading navigation | ❌ | No heading sidebar is mounted for DOCX |
| SmartArt / equations | ⚠️ Partial | Best-effort Mammoth conversion; advanced Word features may be dropped |
| Complex layout (columns, floats) | ⚠️ Partial | Best-effort; may differ from Word |
| Metadata | ✅ | Title, author, dates, application, word/paragraph/character counts, read time when available |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Visual editing | ✅ | Edit toggle mounts TipTap over the sanitized HTML view |
| DOCX download from edits | ✅ | Re-creates a Word file from edited headings, bold/italic text, lists, and tables |
| Byte-faithful round trip | ❌ | Export writes fresh minimal OOXML; page layout, fonts, footnotes, comments, and complex numbering are not preserved |
| Raw XML editing | ❌ | DOCX opens through the document renderer/editor, not an archive XML tree |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known-File Enhancement

No known-file plugin — all DOCX files use the same generic document renderer.

## Real-World Examples

- [`sample.docx`](../examples/sample.docx) — document with headings, table, and embedded image

## Known Limitations

- Editing is HTML-faithful, not a byte-level DOCX round trip
- SmartArt diagrams and math equations are not rendered accurately
- Track changes markup is not displayed; accepted/rejected state not resolved
- Comments pane not shown
- Font rendering uses system/web fonts which may differ from original

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Track changes display | High | Hard | Requires parsing revision markup |
| Comments pane | Med | Med | Extract comment annotations alongside content |
| Preserve advanced Word layout on export | Med | Hard | Needs deeper OOXML round-trip support |
| Accurate font rendering | Low | Hard | Would need font embedding or matching |
