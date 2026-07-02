# Rich Text Format (RTF)

> Rich Text Format viewer/editor — extracts text and basic formatting into an editable document surface with an HTML download option.

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
| Plain text extraction | ✅ | RTF control words parsed into readable text |
| Windows-1252 decoding | ✅ | `\'XX` hex escapes decoded via W1252 code page |
| Special character mapping | ✅ | en/em dash, curly quotes, bullet, tab, page break |
| Skip destinations | ✅ | `fonttbl`, `colortbl`, `pict`, `info` groups silently dropped |
| Basic formatting | ✅ | Bold, italic, underline, strike, font size, and color runs rendered where parseable |
| WYSIWYG preview editing | ✅ | Contenteditable paper view with formatting toolbar |
| Partial-support banner | ✅ | Notice shown that images and tables are not rendered |
| Diff | ❌ | `diff: false` — binary-ish format not suitable for line diff |
| Screenshot | ❌ | Not registered |
| Metadata | ✅ | Title/author/subject/keywords/comment from `info`, plus estimated word/character counts |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Raw RTF source is available through the raw pane |
| Visual editing | ⚠️ Partial | Preview edits are in-browser HTML edits; they do not round-trip back to RTF syntax |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Download edited HTML | ✅ | Toolbar button downloads the edited preview as `.html` |
| Extract as plain text | ❌ | Not wired to the global export menu |

## Real-World Examples

- [`sample.rtf`](../examples/sample.rtf) — example RTF document

## Known Limitations

- Complex formatting, layout, and stylesheets are only partially interpreted
- Images (`\pict`) are silently skipped
- Tables are not reconstructed as editable tables
- Multi-codepage RTF (non-W1252) may show incorrect characters

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Export extracted text as `.txt` | Med | Easy | Wire `extractText` to export menu |
| RTF round-trip export | Med | Hard | Convert edited HTML back into valid RTF |
| Table rendering | Med | Hard | Parse cell/row controls into HTML tables |
| Table of contents extraction | Low | Med | `\outlinelevel` control word parsing |
