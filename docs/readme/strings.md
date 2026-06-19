# Apple Strings

> Apple `.strings` localization file viewer — parses key/value pairs and comments, displays as a table.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.strings` |
| MIME type | `text/plain` |
| Binary / Text | Text |
| Common use | iOS/macOS localization string tables, Xcode string resources |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Key/value table | ✅ | Each `"key" = "value";` shown as a row |
| Comment display | ✅ | Block `/* ... */` and line `//` comments shown |
| Unicode string display | ✅ | UTF-16/UTF-8 content rendered correctly |
| Source view | ✅ | Monaco editor (plaintext mode) |
| Text diff | ✅ | Standard line diff |
| Metadata | ✅ | Key count, comment count, unique key count |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Full Monaco editor |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Export as JSON | ❌ | Not yet implemented |

## Real-World Examples

- [`Localizable.strings`](../examples/Localizable.strings) — example iOS localization file

## Known Limitations

- Binary `.strings` format (old NeXTSTEP style) is not decoded — only text format
- Stringsdict (`.stringsdict`) plural rules are not supported

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Export as JSON | Med | Easy | `{key: value}` JSON object |
| Side-by-side localization compare | Low | Med | Compare two `.strings` files for the same resource |
| Missing key detection | Low | Med | Compare against base language to find untranslated keys |
