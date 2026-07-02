# Game ROM Header

> Game ROM viewer — lightweight header summary for NES, SNES, Game Boy/Game Boy Color, and Nintendo 64 ROMs.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.nes`, `.sfc`, `.smc`, `.gb`, `.gbc`, `.n64`, `.z64`, `.v64` |
| MIME type | `application/octet-stream` |
| Binary / Text | Binary |
| Common use | Retro game preservation, emulators, ROM collections |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Console platform | ✅ | NES, SNES, Game Boy/Game Boy Color, and Nintendo 64 |
| Game title | ⚠️ | Header title for SNES, Game Boy, and N64; NES shows `iNES ROM` |
| Region | ⚠️ | SNES country code, Game Boy destination, and N64 country code; not present in iNES |
| ROM version | ❌ | Revision/version fields are not currently extracted |
| Mapper (NES) | ✅ | iNES mapper number with common mapper names where known |
| PRG/CHR banks | ✅ | NES program and character ROM bank counts |
| Checksum | ⚠️ | N64 CRC1/CRC2 only |
| Hardware flags | ✅ | NES mirroring/battery, Game Boy CGB/SGB/cartridge type, SNES SRAM/video mode |
| Screenshot | ✅ | Platform badge rendered |
| Source view | ❌ | Binary format |
| Diff | ❌ | Binary format |
| Metadata | ✅ | Format, title, and parsed header fields |

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
- GBA, NDS, Mega Drive / Genesis, and other console ROM headers are not implemented yet
- SNES detection uses header heuristics and may miss unusual dumps
- Multi-disc or split-ROM formats may not be fully detected

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| CRC32 / SHA1 hash | Low | Easy | Hash for No-Intro / Redump database lookup |
| DAT file matching | Low | Hard | Match against ROM preservation databases |
| More platforms | Med | Med | Add GBA, NDS, Mega Drive / Genesis, and other common ROM headers |
