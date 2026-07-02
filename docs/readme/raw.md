# Plain Text (Raw Fallback)

> Universal plain-text fallback — shows any file as raw text when no specific type viewer matches.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | Any |
| MIME type | `text/plain` |
| Binary / Text | Text (fallback for unrecognised types) |
| Common use | Catch-all for unknown text files |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Raw text display | ✅ | Escaped `<pre>` preview with a per-view word-wrap toggle |
| Empty file indicator | ✅ | Shows "Empty text file" message |
| Source view | ✅ | Monaco editor (plaintext mode) |
| Text diff | ✅ | Standard line diff |
| Screenshot | ✅ | Available |
| Metadata | ✅ | Line, word, and character counts |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Full Monaco editor |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Real-World Examples

- [`sample.txt`](../examples/sample.txt) — plain text fallback sample

## Known Limitations

- No syntax highlighting in preview (Monaco source view does highlight if `syntaxLanguage` is set per-type)
- Binary files that fall through to this type show garbled content — use the hex viewer in raw pane

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Auto-detect encoding | Low | Med | Detect UTF-8 / Latin-1 / UTF-16 and display correctly |
