# DOCX — Word Document

> Microsoft Word's open XML format — rendered document view with headings, tables, lists, and inline images.

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
| Outline / heading navigation | ✅ | Structured heading tree in sidebar |
| SmartArt / equations | ⚠️ Partial | Rendered as fallback text or placeholder |
| Complex layout (columns, floats) | ⚠️ Partial | Best-effort; may differ from Word |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Visual editing | ❌ | No WYSIWYG editor |
| Raw XML editing | ✅ | Internal XML parts editable via archive tree |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known-File Enhancement

No known-file plugin — all DOCX files use the same generic document renderer.

## Real-World Examples

- [`sample.docx`](../examples/sample.docx) — document with headings, table, and embedded image

## Known Limitations

- SmartArt diagrams and math equations are not rendered accurately
- Track changes markup is not displayed; accepted/rejected state not resolved
- Comments pane not shown
- Font rendering uses system/web fonts which may differ from original

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Track changes display | High | Hard | Requires parsing revision markup |
| Comments pane | Med | Med | Extract comment annotations alongside content |
| Accurate font rendering | Low | Hard | Would need font embedding or matching |
