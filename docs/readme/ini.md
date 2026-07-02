# INI / Config

> Key-value pair table grouped by [sections]; tolerates `=` and `:` separators, masks likely secrets, and exports JSON.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.ini`, `.env`, `.cfg`, `.conf`, `.properties` |
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
| Secret masking | ✅ | Keys that look like secrets/tokens/passwords are redacted in preview and source summary |
| Source jumps | ✅ | Key labels link into the redacted source preview |
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
| Convert to JSON | ✅ | Export menu writes sections/global keys as JSON |

## Real-World Examples

- [`sample.ini`](../examples/sample.ini) — example INI config

## Known Limitations

- Multiline values (continuation lines with `\`) are not joined
- Duplicate key detection is per section+key; global duplicate count includes cross-section matches

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| `.env` specialized view | Med | Med | Dedicated env-focused layout and validation |
| Multiline value support | Low | Med | `key = value \` continuation lines |
