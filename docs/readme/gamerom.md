# Game ROM Header

> Game ROM viewer — console platform, title, region, version, and hardware flags from ROM header.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.nes`, `.snes`, `.sfc`, `.gb`, `.gbc`, `.gba`, `.n64`, `.z64`, `.v64`, `.nds`, `.md`, `.smd`, `.gen` |
| MIME type | `application/octet-stream` |
| Binary / Text | Binary |
| Common use | Retro game preservation, emulators, ROM collections |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Console platform | ✅ | NES, SNES, Game Boy, GBA, N64, NDS, Mega Drive, etc. |
| Game title | ✅ | From ROM header title field |
| Region | ✅ | USA, Japan, Europe, World, etc. |
| ROM version | ✅ | Revision number from header |
| Mapper (NES) | ✅ | iNES mapper number |
| PRG/CHR banks | ✅ | NES program and character ROM bank counts |
| Checksum | ✅ | Shown for platforms that include it |
| Hardware flags | ✅ | Battery, timer, rumble, SGB enhancement, etc. |
| Screenshot | ✅ | Platform badge rendered |
| Source view | ❌ | Binary format |
| Diff | ❌ | Binary format |
| Metadata | ✅ | Platform, title, region, version |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Editing | ❌ | Binary format |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- Game code / instructions are not disassembled
- Multi-disc or split-ROM formats may not be fully detected

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| CRC32 / SHA1 hash | Low | Easy | Hash for No-Intro / Redump database lookup |
| DAT file matching | Low | Hard | Match against ROM preservation databases |
