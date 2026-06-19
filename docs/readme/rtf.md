# Rich Text Format (RTF)

> Plain-text extraction from RTF — strips control words and decodes Windows-1252 characters; rendered as readable prose.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.rtf` |
| MIME type | `application/rtf`, `text/rtf` |
| Binary / Text | Text (binary-ish control codes) |
| Common use | Word processor documents, cross-platform formatted text |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Plain text extraction | ✅ | All RTF control words stripped; readable prose shown |
| Windows-1252 decoding | ✅ | `\'XX` hex escapes decoded via W1252 code page |
| Special character mapping | ✅ | en/em dash, curly quotes, bullet, tab, page break |
| Skip destinations | ✅ | `fonttbl`, `colortbl`, `pict`, `info` groups silently dropped |
| Partial-support banner | ✅ | Notice shown that only text is extracted |
| Diff | ❌ | `diff: false` — binary-ish format not suitable for line diff |
| Screenshot | ❌ | Not a static HTML body |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ❌ | RTF control syntax editing not supported |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Extract as plain text | ❌ | Not yet wired to export menu |

## Real-World Examples

- [`sample.rtf`](../examples/sample.rtf) — example RTF document

## Known Limitations

- Formatting (bold, italic, colors, tables) is not rendered — only plain text
- Images (`\pict`) are silently skipped
- Multi-codepage RTF (non-W1252) may show incorrect characters

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Export extracted text as `.txt` | Med | Easy | Wire `extractText` to export menu |
| Basic formatting (bold/italic) | Med | Hard | Would need partial RTF rendering |
| Table of contents extraction | Low | Med | `\outlinelevel` control word parsing |
