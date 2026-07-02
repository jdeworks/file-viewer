# ASCII / ANSI Art

> ASCII and ANSI art viewer — renders colored terminal art with ANSI escape sequences, SAUCE metadata, and copy-to-clipboard.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.ans`, `.asc`, `.txt`, `.nfo` |
| MIME type | `text/plain` |
| Binary / Text | Text (ASCII or Latin-1/CP437) |
| Common use | BBS art, scene releases, NFO files, terminal art collections |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| ANSI color rendering | ✅ | Full 16-color + 256-color + RGB SGR support |
| Bold / dim attributes | ✅ | `\x1b[1m` bold, `\x1b[2m` dim rendered |
| SAUCE record | ✅ | Title, author, group, date, size extracted |
| Dimensions | ✅ | Column × row count shown in metadata |
| Encoding detection | ✅ | ASCII vs Latin-1/CP437 detected from high bytes |
| Char density | ✅ | % printable vs whitespace |
| Copy to clipboard | ✅ | Button in preview header |
| Source view | ✅ | Monaco editor (plaintext mode) |
| Diff | ❌ | Disabled — terminal escapes make diff unreliable |
| Metadata | ✅ | Dimensions, ANSI sequence count, encoding, SAUCE fields |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Monaco editor |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Export as PNG | ❌ | Screenshot mode available but no direct export |

## Real-World Examples

- [`sample.ans`](../examples/sample.ans) — ANSI art sample with color escape sequences

## Known Limitations

- CP437 block characters (▓▒░) may not render identically across fonts
- Cursor movement escape sequences (cursor-up, clear-screen) are ignored
- Animated ANSI (blink, cursor) is not animated

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Export rendered art as PNG | Med | Med | Canvas render of pre element |
| CP437 font rendering | Low | Hard | Load a CP437 bitmap font for authentic rendering |
| Blink / animation | Low | Hard | CSS animation for `\x1b[5m` blink sequences |
