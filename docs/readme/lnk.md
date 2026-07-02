# Windows Shortcut (.lnk)

> Windows Shell Link viewer — target path, working directory, arguments, hotkey, icon, and timestamps.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.lnk` |
| MIME type | `application/x-ms-shortcut` |
| Binary / Text | Binary (Windows Shell Link format) |
| Common use | Windows shortcuts on the Desktop, Start Menu, and Quick Launch |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Target path | ✅ | Local or UNC path from LinkInfo |
| Working directory | ✅ | From StringData |
| Command arguments | ✅ | From StringData |
| Icon location | ✅ | Icon file path and index |
| Hotkey | ✅ | Virtual key code decoded |
| Window state | ✅ | Normal / Minimized / Maximized |
| Drive type | ✅ | Fixed / Removable / Network / CD-ROM |
| Shell link flags | ❌ | Parsed internally to locate sections, but not displayed as a flag list |
| Drive serial number | ❌ | Volume serial is not currently extracted |
| Timestamps | ✅ | Target file creation / modified / accessed |
| Source view | ❌ | Binary format |
| Diff | ❌ | Binary format |
| Metadata | ✅ | Target, working dir, arguments, relative path, icon, target size, timestamps |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Editing | ❌ | Binary format |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- Environment variable expansion in paths is not resolved
- Network share targets (UNC) shown as-is

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Shell link flag list | Low | Easy | Display parsed LinkFlags in a diagnostics section |
| Drive serial number | Low | Easy | Decode VolumeID serial alongside drive type |
| ExtraData block decoding | Low | Med | Decode distributed link tracking, special folder IDs |
