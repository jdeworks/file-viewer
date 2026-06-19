# INI / Config

> Key-value pair table grouped by [sections]; tolerates `=` and `:` separators, `#`/`;` comments, and quoted values.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.ini`, `.cfg`, `.conf`, `.properties` |
| MIME type | `text/plain` |
| Binary / Text | Text |
| Common use | Application configuration, Windows registry exports, Java properties, pip/git config |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Section-grouped key-value tables | ✅ | Each `[section]` rendered as its own table |
| Comment stripping | ✅ | `#` and `;` comment lines ignored |
| Quoted value unescaping | ✅ | Single and double quotes stripped from values |
| Both `=` and `:` separators | ✅ | Both assignment styles supported |
| Source view | ✅ | Monaco editor with INI syntax highlighting |
| Text diff | ✅ | Standard line diff |
| Metadata | ✅ | Key count, section count, comment count, duplicate key count |

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

## Real-World Examples

- [`sample.ini`](../examples/sample.ini) — example INI config

## Known Limitations

- Multiline values (continuation lines with `\`) are not joined
- Duplicate key detection is per section+key; global duplicate count includes cross-section matches

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Export to JSON | Med | Easy | section → object, keys as fields |
| `.env` specialized view | Med | Med | Redact SECRET/TOKEN/PASSWORD keys (security) |
| Multiline value support | Low | Med | `key = value \` continuation lines |
