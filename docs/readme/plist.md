# Property List (plist)

> Apple plist viewer — parses XML plist and renders a collapsible key-value tree with typed value display.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.plist` |
| MIME type | `application/x-plist`, `text/xml` |
| Binary / Text | Text (XML) or binary |
| Common use | macOS/iOS application preferences, configuration, Info.plist, launch agents |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Collapsible tree | ✅ | dict/array with typed leaves |
| Type display | ✅ | string, integer, real, boolean (true/false), date (formatted), data (truncated hex) |
| Date formatting | ✅ | ISO 8601 → locale date/time display |
| Data fields | ✅ | Base64 `<data>` shown as `[data: ...]` placeholder |
| Source view | ✅ | Monaco editor with XML syntax highlighting |
| Text diff | ✅ | Standard line diff |
| Metadata | ✅ | Key count, nesting depth, type breakdown |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Full Monaco editor |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Convert to JSON | ❌ | Not yet implemented |
| Binary plist | ❌ | Only XML plist format is parsed |

## Real-World Examples

- [`sample.plist`](../examples/sample.plist) — example XML property list

## Known Limitations

- Binary plist format (bplist00 magic) is not decoded — only XML plist
- `NSData` / `<data>` content is shown as a truncated placeholder, not decoded

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Binary plist decoding | Med | Med | Parse bplist00 binary format |
| Export to JSON | Med | Easy | Map plist types to JSON equivalents |
| Data field hex viewer | Low | Easy | Show full base64-decoded hex for data nodes |
