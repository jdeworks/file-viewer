# Windows Registry (REG)

> Registry export viewer with collapsible hive tree, typed value badges, autorun security warnings, and value type display.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.reg` |
| MIME type | `text/plain` |
| Binary / Text | Text |
| Common use | Windows registry exports, system configuration backup, software installation scripts |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Registry key tree | ✅ | Hierarchical hive path display |
| Value types | ✅ | REG_SZ, REG_DWORD, REG_BINARY, REG_MULTI_SZ, REG_EXPAND_SZ badges |
| Hive color-coding | ✅ | HKLM / HKCU / HKCR / HKU distinguished by color |
| Delete markers | ✅ | `[-HKEY_...]` delete-key entries flagged |
| Default values | ✅ | `@` (default value) shown |
| Autorun warnings | ✅ | Keys under `Run` / `RunOnce` / startup locations flagged as security-sensitive |
| REGEDIT4 support | ✅ | Both modern and legacy registry export formats |
| Line continuation | ✅ | Multi-line values with `\` continuation joined |
| Source view | ✅ | Monaco editor (plaintext mode) |
| Text diff | ✅ | Standard line diff |
| Metadata | ⚠️ Partial | Version, key count, and quoted-value count; delete/warning counts are preview-only |

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

- [`sample.reg`](../examples/sample.reg) — example registry export

## Known Limitations

- Binary values (`hex:`) are shown as hex bytes, not decoded further
- Importing/applying the registry file is not supported (read-only viewer)

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Hex value decoder | Low | Easy | Decode DWORD hex to decimal; BINARY to readable types |
| Export keys as JSON | Low | Med | Flatten the tree to a JSON object |
