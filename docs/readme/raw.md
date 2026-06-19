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
| Raw text display | ✅ | Plain `<pre>` with proper HTML escaping |
| Empty file indicator | ✅ | Shows "Empty text file" message |
| Source view | ✅ | Monaco editor (plaintext mode) |
| Text diff | ✅ | Standard line diff |
| Screenshot | ✅ | Available |
| Metadata | ⚠️ | Minimal — no type-specific metadata |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Full Monaco editor |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- No syntax highlighting in preview (Monaco source view does highlight if `syntaxLanguage` is set per-type)
- Binary files that fall through to this type show garbled content — use the hex viewer in raw pane

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Auto-detect encoding | Low | Med | Detect UTF-8 / Latin-1 / UTF-16 and display correctly |
| Line count / word count stats | Low | Easy | Add minimal metadata stats |
